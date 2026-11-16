import { API_CONFIG } from '../config/api.config.js';
import { validateEstadoPayload, validateHistorialPayload } from '../utils/validators.util.js';
import { parseBackendDate } from '../utils/datetime.util.js';

/**
 * Servicio de Monitoreo:
 * - Resuelve catálogo de comandos reales para traducir comando_id en eventos WSS.
 * - Consulta y reconcilia /estado e /historial protegiendo contra respuestas fuera de orden.
 */
export class MonitoringService {
  constructor(restClient) {
    this.restClient = restClient;
    this.commandCatalog = new Map();
    this.activeSyncController = null;
    this.syncSequence = 0;
    this.latestConfirmedHistoryId = 0;
    this.latestConfirmedEpochMs = 0;
  }

  /**
   * Carga el catálogo real de comandos del vehículo (GET /api/vehiculos/1/comandos)
   * y sirve como verificación de salud de la API REST.
   */
  async loadCommandCatalog() {
    const data = await this.restClient.get(API_CONFIG.ENDPOINTS.GET_COMANDOS);
    const list = Array.isArray(data) ? data : (Array.isArray(data?.comandos) ? data.comandos : []);
    this.commandCatalog.clear();

    for (const cmd of list) {
      if (!cmd || typeof cmd !== 'object') continue;
      const id = Number(cmd.id_comando);
      if (Number.isFinite(id) && id > 0) {
        this.commandCatalog.set(id, {
          id_comando: id,
          nombre: String(cmd.nombre || `COMANDO #${id}`),
          codigo: cmd.codigo !== undefined && cmd.codigo !== null ? Number(cmd.codigo) : null
        });
      }
    }
    return this.commandCatalog;
  }

  resolveCommandInfo(comandoId) {
    const id = Number(comandoId);
    if (this.commandCatalog.has(id)) {
      return this.commandCatalog.get(id);
    }
    return {
      id_comando: id,
      nombre: `COMANDO #${id}`,
      codigo: null
    };
  }

  /**
   * Consulta los datos del vehículo (GET /api/vehiculos/1) para mostrar su nombre real.
   */
  async fetchVehicleInfo() {
    const data = await this.restClient.get(API_CONFIG.ENDPOINTS.GET_VEHICULO);
    if (data && typeof data === 'object') {
      if (data.vehiculo && typeof data.vehiculo === 'object') return data.vehiculo;
      return data;
    }
    return null;
  }

  /**
   * Sincroniza último estado + últimos 10 movimientos individuales persistidos.
   * Cancela solicitudes previas en curso para evitar condiciones de carrera.
   */
  async syncAll() {
    if (this.activeSyncController) {
      this.activeSyncController.abort(new Error('Nueva sincronización en curso'));
    }

    const controller = new AbortController();
    this.activeSyncController = controller;
    const currentSeq = ++this.syncSequence;

    try {
      const [rawEstado, rawHistorial] = await Promise.all([
        this.restClient.get(API_CONFIG.ENDPOINTS.GET_ESTADO, controller.signal),
        this.restClient.get(API_CONFIG.ENDPOINTS.GET_HISTORIAL, controller.signal)
      ]);

      // Ignorar si ya existe una petición más reciente
      if (currentSeq !== this.syncSequence) return null;

      const estado = validateEstadoPayload(rawEstado);
      const historial = validateHistorialPayload(rawHistorial);

      const topHistoryId = historial.length > 0 ? historial[0].id_historial : 0;
      const estadoEpoch = estado?.fecha_actualizacion ? (parseBackendDate(estado.fecha_actualizacion)?.getTime() ?? 0) : 0;

      // Evitar que una lectura retrasada sobreescriba un historial o estado más nuevo
      const isStaleHistory = topHistoryId > 0 && topHistoryId < this.latestConfirmedHistoryId;
      if (!isStaleHistory && topHistoryId > 0) {
        this.latestConfirmedHistoryId = topHistoryId;
      }

      if (estadoEpoch > this.latestConfirmedEpochMs) {
        this.latestConfirmedEpochMs = estadoEpoch;
      }

      return {
        estado,
        historial: isStaleHistory ? null : historial
      };
    } catch (err) {
      if (err?.name === 'AbortError' || String(err?.message).includes('Nueva sincronización')) {
        return null;
      }
      throw err;
    } finally {
      if (this.activeSyncController === controller) {
        this.activeSyncController = null;
      }
    }
  }
}