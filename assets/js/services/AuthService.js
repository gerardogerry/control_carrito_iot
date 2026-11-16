import { API_CONFIG } from '../config/api.config.js';

const STORAGE_KEY = 'iot_hud_session_v1';

export class AuthService {
  constructor(restClient) {
    this.restClient = restClient;
    this.session = this.#loadFromStorage();
    if (this.session?.token) {
      this.restClient.setToken(this.session.token);
    }
  }

  #loadFromStorage() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  #saveToStorage(sessionData) {
    this.session = sessionData;
    this.restClient.setToken(sessionData?.token || null);
    if (sessionData) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  isAuthenticated() {
    return Boolean(this.session?.token);
  }

  getSession() {
    return this.session;
  }

  async login(email, password) {
    const res = await this.restClient.post(API_CONFIG.ENDPOINTS.AUTH_LOGIN, { email, password });
    const sessionData = {
      token: res.access_token,
      rol: res.usuario.rol,
      usuario: res.usuario,
      vehiculos: res.vehiculos || [],
      selectedVehicleId: res.vehiculos?.[0]?.id_vehiculo || API_CONFIG.VEHICLE_ID,
      expiresAt: null
    };
    this.#saveToStorage(sessionData);
    return sessionData;
  }

  async startGuestSession(idVehiculo, nombreProspecto = 'Visitante') {
    const res = await this.restClient.post(API_CONFIG.ENDPOINTS.INVITADO_INICIAR, {
      id_vehiculo: Number(idVehiculo),
      nombre_prospecto: nombreProspecto || 'Visitante'
    });
    const sessionData = {
      token: res.token_sesion,
      rol: 'INVITADO',
      usuario: { nombre: res.nombre_prospecto, rol: 'INVITADO' },
      vehiculos: [{ id_vehiculo: res.id_vehiculo, nombre: res.vehiculo_nombre }],
      selectedVehicleId: res.id_vehiculo,
      expiresAt: res.fecha_expiracion,
      duracionSegundos: res.duracion_segundos
    };
    this.#saveToStorage(sessionData);
    return sessionData;
  }

  setSelectedVehicle(idVehiculo) {
    if (!this.session) return;
    this.session.selectedVehicleId = Number(idVehiculo);
    this.#saveToStorage(this.session);
  }

  async logout() {
    try {
      if (this.session?.rol === 'INVITADO') {
        await this.restClient.post(API_CONFIG.ENDPOINTS.INVITADO_FINALIZAR, { motivo: 'Cierre manual por usuario' });
      } else if (this.session?.token) {
        await this.restClient.post(API_CONFIG.ENDPOINTS.AUTH_LOGOUT, {});
      }
    } catch {
      // Continuar con limpieza local aunque expire el token
    } finally {
      this.#saveToStorage(null);
    }
  }
}