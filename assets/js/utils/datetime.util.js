import { API_CONFIG } from '../config/api.config.js';

/**
 * Parsea de forma segura un timestamp ISO recibido del backend (ej. "2026-11-09T01:10:34").
 * Si no incluye zona horaria explícita, se interpreta como hora local del servidor/ciudad configurada.
 */
export function parseBackendDate(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;
  const trimmed = isoString.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatea fecha y hora separadas para la tabla de historial y la tarjeta principal.
 */
export function formatDateTimeParts(isoString, timeZone = API_CONFIG.TIMEZONE) {
  const dateObj = parseBackendDate(isoString);
  if (!dateObj) {
    return {
      date: 'Sin fecha',
      time: 'Sin hora',
      full: 'Fecha/hora no disponible',
      epochMs: 0
    };
  }

  try {
    const dateFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const timeFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const date = dateFormatter.format(dateObj);
    const time = timeFormatter.format(dateObj);

    return {
      date,
      time,
      full: `${date} · ${time}`,
      epochMs: dateObj.getTime()
    };
  } catch {
    return {
      date: isoString.slice(0, 10),
      time: isoString.slice(11, 19) || '00:00:00',
      full: isoString.replace('T', ' '),
      epochMs: dateObj.getTime()
    };
  }
}

/**
 * Devuelve la hora actual formateada únicamente cuando un evento WSS en vivo
 * (como MOVIMIENTO_DEMO) no incluye timestamp propio en su contrato JSON.
 */
export function formatCurrentLiveTime(timeZone = API_CONFIG.TIMEZONE) {
  return formatDateTimeParts(new Date().toISOString(), timeZone);
}