import { API_CONFIG } from '../config/api.config.js';

/**
 * Valida la respuesta de GET /api/vehiculos/{id}/estado
 */
export function validateEstadoPayload(data) {
  if (!data || typeof data !== 'object') return null;
  const vehiculoId = Number(data.id_vehiculo ?? data.vehiculo_id);
  if (vehiculoId !== API_CONFIG.VEHICLE_ID) return null;

  return {
    id_estado: Number(data.id_estado ?? 0),
    id_vehiculo: vehiculoId,
    id_comando: Number(data.id_comando ?? 0),
    comando: typeof data.comando === 'string' && data.comando.trim() ? data.comando.trim() : null,
    codigo_comando: data.codigo_comando !== undefined && data.codigo_comando !== null ? Number(data.codigo_comando) : null,
    fecha_actualizacion: typeof data.fecha_actualizacion === 'string' ? data.fecha_actualizacion : null,
    conectado: Number(data.conectado ?? 0)
  };
}

/**
 * Valida y ordena el arreglo de GET /api/vehiculos/{id}/historial (máximo 10 registros reales)
 */
export function validateHistorialPayload(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.historial)) {
    return [];
  }

  const seenIds = new Set();
  const validItems = [];

  for (const item of data.historial) {
    if (!item || typeof item !== 'object') continue;
    const vehiculoId = Number(item.id_vehiculo);
    const idHistorial = Number(item.id_historial);

    if (vehiculoId !== API_CONFIG.VEHICLE_ID) continue;
    if (!Number.isFinite(idHistorial) || idHistorial <= 0) continue;
    if (seenIds.has(idHistorial)) continue;

    seenIds.add(idHistorial);
    validItems.push({
      id_historial: idHistorial,
      id_vehiculo: vehiculoId,
      id_comando: Number(item.id_comando ?? 0),
      comando: typeof item.comando === 'string' && item.comando.trim()
        ? item.comando.trim()
        : `COMANDO #${item.id_comando ?? '?'}`,
      codigo_comando: item.codigo_comando !== undefined && item.codigo_comando !== null
        ? Number(item.codigo_comando)
        : null,
      fecha_hora: typeof item.fecha_hora === 'string' ? item.fecha_hora : null,
      origen: typeof item.origen === 'string' ? item.origen : ''
    });
  }

  // Ordenar descendente por id_historial real (más reciente primero) y acotar a 10
  validItems.sort((a, b) => b.id_historial - a.id_historial);
  return validItems.slice(0, API_CONFIG.HISTORY_MAX_ROWS);
}

/**
 * Valida eventos WebSocket reales según el contrato del servidor FastAPI:
 * - CONEXION_ESTABLECIDA: { evento, vehiculo_id, mensaje }
 * - NUEVO_MOVIMIENTO: { evento, vehiculo_id, comando_id }
 * - INICIO_DEMO: { evento, demo_id, total_movimientos }
 * - MOVIMIENTO_DEMO: { evento, orden, comando_id, duracion_ms }
 * - FIN_DEMO: { evento, demo_id }
 */
export function validateWebSocketEvent(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.evento !== 'string') {
    return null;
  }

  const evento = raw.evento.trim();

  // Si el evento especifica vehiculo_id, filtrar estrictamente los de otro vehículo
  if (raw.vehiculo_id !== undefined && raw.vehiculo_id !== null) {
    if (Number(raw.vehiculo_id) !== API_CONFIG.VEHICLE_ID) {
      return null;
    }
  }

  switch (evento) {
    case 'CONEXION_ESTABLECIDA':
      return {
        evento,
        vehiculo_id: API_CONFIG.VEHICLE_ID,
        mensaje: typeof raw.mensaje === 'string' ? raw.mensaje : 'Sesión WSS activa'
      };

    case 'NUEVO_MOVIMIENTO': {
      const comandoId = Number(raw.comando_id);
      if (!Number.isFinite(comandoId) || comandoId <= 0) return null;
      return {
        evento,
        vehiculo_id: API_CONFIG.VEHICLE_ID,
        comando_id: comandoId
      };
    }

    case 'INICIO_DEMO':
      return {
        evento,
        demo_id: Number(raw.demo_id ?? 0),
        total_movimientos: Number(raw.total_movimientos ?? 0)
      };

    case 'MOVIMIENTO_DEMO': {
      const comandoId = Number(raw.comando_id);
      if (!Number.isFinite(comandoId) || comandoId <= 0) return null;
      return {
        evento,
        orden: Number(raw.orden ?? 0),
        comando_id: comandoId,
        duracion_ms: Number(raw.duracion_ms ?? 0)
      };
    }

    case 'FIN_DEMO':
      return {
        evento,
        demo_id: Number(raw.demo_id ?? 0)
      };

    default:
      return null;
  }
}