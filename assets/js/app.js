import { API_CONFIG } from './config/api.config.js';
import { ConnectionState } from './models/ConnectionState.js';
import { RestClient } from './services/RestClient.js';
import { WebSocketClient } from './services/WebSocketClient.js';
import { CommandService } from './services/CommandService.js';
import { MonitoringService } from './services/MonitoringService.js';
import { AuthService } from './services/AuthService.js';
import { JoystickPanel } from './components/JoystickPanel.js';
import { STOP_COMMAND_ID } from './config/controls.config.js';
import { ConnectivityPanel } from './components/ConnectivityPanel.js';
import { DemoController } from './components/DemoController.js';
import { NavigationTabs } from './components/NavigationTabs.js';
import { LastMovementCard } from './components/LastMovementCard.js';
import { HistoryTable } from './components/HistoryTable.js';
import { AdminPanel } from './components/AdminPanel.js';
import { validateWebSocketEvent } from './utils/validators.util.js';

class App {
  constructor() {
    this.connectivityPanel = new ConnectivityPanel();
    this.restClient = new RestClient(API_CONFIG.BASE_URL, API_CONFIG.TIMEOUT_MS);
    this.authService = new AuthService(this.restClient);
    this.monitoringService = new MonitoringService(this.restClient);
    this.lastMovementCard = new LastMovementCard();
    this.historyTable = new HistoryTable();
    this.adminPanel = new AdminPanel(this.restClient, () => this.reloadVehicleContext());

    this.wsClient = null;
    this.commandService = new CommandService(
      this.restClient,
      document.getElementById('action-feedback')
    );

    this.navigationTabs = new NavigationTabs((activeView) => {
      if (activeView === 'monitoring') {
        this.syncMonitoringData(false);
      } else if (activeView === 'admin') {
        this.adminPanel.refreshAll();
      }
    });

    this.driveJoystick = null;
    this.craneJoystick = null;
    this.demoController = null;
    this.healthTimer = null;
    this.guestTimer = null;
    this.isSyncingMonitoring = false;
  }

  async init() {
    this.connectivityPanel.init();
    this.navigationTabs.init();
    this.initJoystick();
    this.initSecondaryButtons();
    this.initMonitoringControls();
    this.initAuthScreens();

    this.demoController = new DemoController(
      this.restClient,
      this.commandService,
      'demo-select',
      'btn-run-demo'
    );

    await this.checkSystemHealth();
    this.healthTimer = setInterval(
      () => this.checkSystemHealth(),
      API_CONFIG.HEALTH_CHECK_INTERVAL_MS
    );

    if (this.authService.isAuthenticated()) {
      await this.enterHudSession(this.authService.getSession());
    } else {
      await this.showAuthGate();
    }
  }

  async checkSystemHealth() {
    this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.CHECKING);
    try {
      await this.restClient.get(API_CONFIG.ENDPOINTS.HEALTH_API);
      this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.AVAILABLE);
    } catch {
      this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.UNAVAILABLE);
    }

    try {
      const rds = await this.restClient.get(API_CONFIG.ENDPOINTS.HEALTH_RDS);
      if (rds?.status === 'disponible') {
        this.connectivityPanel.updateRdsStatus(ConnectionState.STATES.AVAILABLE);
      } else {
        this.connectivityPanel.updateRdsStatus(ConnectionState.STATES.UNAVAILABLE);
      }
    } catch {
      this.connectivityPanel.updateRdsStatus(ConnectionState.STATES.UNAVAILABLE);
    }
  }

  initAuthScreens() {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-error-msg');
      if (errEl) errEl.hidden = true;

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      try {
        const session = await this.authService.login(email, password);
        await this.enterHudSession(session);
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Credenciales inválidas';
          errEl.hidden = false;
        }
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await this.exitHudSession();
    });

    document.getElementById('active-vehicle-select')?.addEventListener('change', async (e) => {
      const newId = Number(e.target.value);
      API_CONFIG.VEHICLE_ID = newId;
      this.authService.setSelectedVehicle(newId);
      await this.reloadVehicleContext();
    });
  }

  async showAuthGate() {
    document.getElementById('auth-gate').hidden = false;
    document.getElementById('app-viewport').hidden = true;
    await this.loadPublicCatalog();
  }

  async loadPublicCatalog() {
    const container = document.getElementById('public-catalog-list');
    if (!container) return;
    container.innerHTML = '<div class="text-light opacity-75 small">Consultando unidades en exhibición...</div>';
    try {
      const data = await this.restClient.get(API_CONFIG.ENDPOINTS.PUBLIC_CATALOGO);
      const unidades = data.unidades_exhibicion || data.unidades || [];
      container.innerHTML = '';
      if (unidades.length === 0) {
        container.innerHTML =
          '<div class="text-light opacity-75 small">No hay unidades en exhibición disponibles en este momento.</div>';
        return;
      }
      unidades.forEach((u) => {
        const ocupada = Boolean(u.ocupado ?? u.ocupada);
        const card = document.createElement('div');
        card.className =
          'p-2 mb-2 rounded border border-info bg-dark d-flex justify-content-between align-items-center gap-2';
        card.innerHTML = `
          <div>
            <strong class="text-white d-block">${u.nombre} <small class="text-info">(${u.codigo_serie || 'DEMO'})</small></strong>
            <small class="text-light opacity-75">${u.nombre_modelo || u.modelo} · ${ocupada ? 'Ocupada por otro invitado' : 'Disponible para prueba'}</small>
          </div>
        `;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = ocupada ? 'hud-btn hud-btn-sm' : 'hud-btn hud-btn-sm hud-btn-green';
        btn.disabled = ocupada;
        btn.textContent = ocupada ? 'En uso' : 'Probar Ahora';
        btn.onclick = async () => {
          const prospecto = document.getElementById('guest-name-input')?.value.trim() || 'Visitante';
          try {
            const session = await this.authService.startGuestSession(u.id_vehiculo, prospecto);
            await this.enterHudSession(session);
          } catch (err) {
            const errEl = document.getElementById('auth-error-msg');
            if (errEl) {
              errEl.textContent = err.message;
              errEl.hidden = false;
            }
          }
        };
        card.appendChild(btn);
        container.appendChild(card);
      });
    } catch {
      container.innerHTML =
        '<div class="text-danger small">No se pudo cargar el catálogo público.</div>';
    }
  }

  async enterHudSession(session) {
    document.getElementById('auth-gate').hidden = true;
    document.getElementById('app-viewport').hidden = false;

    const roleBadge = document.getElementById('session-role-badge');
    const userLabel = document.getElementById('session-user-name');
    if (roleBadge) roleBadge.textContent = session.rol;
    if (userLabel) userLabel.textContent = session.usuario?.nombre || session.rol;

    // Selector de unidades disponibles para este usuario
    const vehSelect = document.getElementById('active-vehicle-select');
    if (vehSelect) {
      vehSelect.innerHTML = '';
      (session.vehiculos || []).forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.id_vehiculo;
        opt.textContent = `${v.codigo_serie ? v.codigo_serie + ' · ' : ''}${v.nombre}`;
        vehSelect.appendChild(opt);
      });
      vehSelect.value = String(session.selectedVehicleId);
      vehSelect.hidden = (session.vehiculos || []).length <= 1;
    }

    API_CONFIG.VEHICLE_ID = Number(session.selectedVehicleId || 1);

    // Visibilidad de pestaña Administración según rol
    const canAdmin = session.rol === 'ADMIN' || session.rol === 'USUARIO';
    this.navigationTabs.setAdminTabVisible(canAdmin);
    this.adminPanel.configureForRole(session);

    // Temporizador si es Invitado
    this.#setupGuestTimer(session);

    await this.reloadVehicleContext();
  }

  #setupGuestTimer(session) {
    if (this.guestTimer) {
      clearInterval(this.guestTimer);
      this.guestTimer = null;
    }
    const timerEl = document.getElementById('guest-timer-badge');
    if (session.rol !== 'INVITADO' || !session.expiresAt) {
      if (timerEl) timerEl.hidden = true;
      return;
    }
    if (timerEl) timerEl.hidden = false;
    const expMs = new Date(session.expiresAt).getTime();

    this.guestTimer = setInterval(async () => {
      const remSec = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
      const min = String(Math.floor(remSec / 60)).padStart(2, '0');
      const sec = String(remSec % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `Tiempo invitado: ${min}:${sec}`;
      if (remSec <= 0) {
        clearInterval(this.guestTimer);
        this.guestTimer = null;
        await this.exitHudSession();
      }
    }, 1000);
  }

  async reloadVehicleContext() {
    const id = API_CONFIG.VEHICLE_ID;
    API_CONFIG.ENDPOINTS.GET_VEHICULO = API_CONFIG.ENDPOINTS.VEHICULO(id);
    API_CONFIG.ENDPOINTS.GET_COMANDOS = API_CONFIG.ENDPOINTS.COMANDOS(id);
    API_CONFIG.ENDPOINTS.GET_DEMOS = API_CONFIG.ENDPOINTS.DEMOS(id);
    API_CONFIG.ENDPOINTS.GET_ESTADO = API_CONFIG.ENDPOINTS.ESTADO(id);
    API_CONFIG.ENDPOINTS.GET_HISTORIAL = API_CONFIG.ENDPOINTS.HISTORIAL(id);

    try {
      await this.monitoringService.loadCommandCatalog();
      this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.AVAILABLE);

      const vehicle = await this.monitoringService.fetchVehicleInfo();
      const nameEl = document.getElementById('vehicle-name');
      if (nameEl && vehicle && typeof vehicle.nombre === 'string' && vehicle.nombre.trim()) {
        nameEl.textContent = vehicle.nombre.trim();
      }

      await this.demoController.loadDemos();
      await this.syncMonitoringData(true);
    } catch (err) {
      console.error('Error cargando contexto del vehículo:', err);
      this.connectivityPanel.setFeedback(`Acceso restringido: ${err.message}`);
    }

    // Reconectar WebSocket con token y vehículo seleccionado
    if (this.wsClient) this.wsClient.close();
    const token = this.authService.getSession()?.token || '';
    const wsUrl = `${API_CONFIG.WS_BASE_URL}/${id}?token=${encodeURIComponent(token)}`;
    this.wsClient = new WebSocketClient(
      wsUrl,
      (state) => this.handleWssStateChange(state),
      (data) => this.handleWebSocketMessage(data),
      () => this.syncMonitoringData(true)
    );
    this.wsClient.connect();
  }

  async exitHudSession() {
    if (this.guestTimer) {
      clearInterval(this.guestTimer);
      this.guestTimer = null;
    }
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
    await this.authService.logout();
    await this.showAuthGate();
  }

  initJoystick() {
    const send = (commandId) => {
      this.commandService
        .executeCommand(commandId, commandId === STOP_COMMAND_ID)
        .catch(() => {});
    };

    this.driveJoystick = new JoystickPanel(
      'joy-drive',
      'drive',
      'joystick-base',
      'joystick-stick',
      send
    );
    this.craneJoystick = new JoystickPanel(
      'joy-crane',
      'crane',
      'joystick2-base',
      'joystick2-stick',
      send
    );
  }

  initSecondaryButtons() {
    document.getElementById('btn-stop')?.addEventListener('click', () => {
      this.commandService.executeCommand(STOP_COMMAND_ID, true).catch(() => {});
    });

    document.querySelectorAll('.cmd-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cmdId = parseInt(e.currentTarget.getAttribute('data-cmd-id'), 10);
        if (!isNaN(cmdId)) {
          this.commandService.executeCommand(cmdId, false, true).catch(() => {});
        }
      });
    });
  }

  initMonitoringControls() {
    document.getElementById('btn-refresh-monitoring')?.addEventListener('click', () => {
      this.syncMonitoringData(true);
    });
  }

  async syncMonitoringData(showLoadingState = false) {
    if (this.isSyncingMonitoring) return;
    this.isSyncingMonitoring = true;

    const btnRefresh = document.getElementById('btn-refresh-monitoring');
    if (btnRefresh) btnRefresh.disabled = true;

    if (showLoadingState) {
      this.lastMovementCard.setLoading();
      this.historyTable.setLoading();
    }

    try {
      const result = await this.monitoringService.syncAll();
      if (!result) return;

      this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.AVAILABLE);

      if (result.estado) {
        this.lastMovementCard.renderFromRestEstado(result.estado, showLoadingState);
      } else {
        this.lastMovementCard.setEmpty();
      }

      if (result.historial !== null) {
        this.historyTable.renderRows(result.historial);
      }
    } catch (err) {
      console.error('Error sincronizando monitoreo REST:', err);
      this.connectivityPanel.updateAwsStatus(ConnectionState.STATES.UNAVAILABLE);
      if (showLoadingState) {
        this.lastMovementCard.setError(`Error de red (${err.message})`);
        this.historyTable.setError(`Error al sincronizar historial (${err.message})`);
      }
    } finally {
      this.isSyncingMonitoring = false;
      if (btnRefresh) btnRefresh.disabled = false;
    }
  }

  handleWssStateChange(state) {
    this.connectivityPanel.updateWssStatus(state);
    if (
      state === ConnectionState.STATES.DISCONNECTED &&
      this.navigationTabs.activeView === 'monitoring'
    ) {
      this.historyTable.setDisconnectedNotice();
    }
  }

  handleWebSocketMessage(rawData) {
    const event = validateWebSocketEvent(rawData);
    if (!event) return;

    switch (event.evento) {
      case 'CONEXION_ESTABLECIDA':
        this.connectivityPanel.setFeedback('WSS en línea');
        break;

      case 'NUEVO_MOVIMIENTO': {
        const cmdInfo = this.monitoringService.resolveCommandInfo(event.comando_id);
        this.connectivityPanel.setFeedback(`WSS: ${cmdInfo.nombre}`);

        this.lastMovementCard.renderFromWssMovement(cmdInfo);
        this.syncMonitoringData(false);
        break;
      }

      case 'INICIO_DEMO':
        this.connectivityPanel.setFeedback(`DEMO #${event.demo_id} iniciada`);
        this.lastMovementCard.renderFromWssDemo(event);
        break;

      case 'MOVIMIENTO_DEMO': {
        const cmdInfo = this.monitoringService.resolveCommandInfo(event.comando_id);
        this.connectivityPanel.setFeedback(`DEMO paso ${event.orden}: ${cmdInfo.nombre}`);
        this.lastMovementCard.renderFromWssDemo(event, cmdInfo);
        break;
      }

      case 'FIN_DEMO':
        this.connectivityPanel.setFeedback(`DEMO #${event.demo_id} finalizada`);
        this.lastMovementCard.renderFromWssDemo(event);
        break;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});