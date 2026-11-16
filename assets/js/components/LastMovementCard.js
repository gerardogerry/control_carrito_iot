import { formatDateTimeParts, formatCurrentLiveTime } from '../utils/datetime.util.js';

/**
 * Componente visual de la tarjeta "Último Movimiento Reportado".
 * Diferencia explícitamente entre:
 * - Estado persistido/confirmado por REST (GET /estado)
 * - Evento publicado por WSS (NUEVO_MOVIMIENTO)
 * - Ejecución en curso de DEMO (INICIO_DEMO, MOVIMIENTO_DEMO, FIN_DEMO)
 */
export class LastMovementCard {
  constructor() {
    this.bodyEl = document.getElementById('last-move-body');
    this.commandEl = document.getElementById('last-move-command');
    this.metaEl = document.getElementById('last-move-meta');
    this.codeEl = document.getElementById('last-move-code');
    this.datetimeEl = document.getElementById('last-move-datetime');
    this.traceEl = document.getElementById('last-move-trace');
    this.sourceBadgeEl = document.getElementById('last-move-source-badge');
    this.lastRenderedEpochMs = 0;
  }

  setLoading() {
    if (this.commandEl) this.commandEl.textContent = 'Cargando...';
    if (this.metaEl) this.metaEl.textContent = 'Consultando último estado reportado en AWS...';
    if (this.sourceBadgeEl) {
      this.sourceBadgeEl.textContent = 'Cargando';
      this.sourceBadgeEl.className = 'badge bg-warning text-dark';
    }
  }

  setEmpty() {
    if (this.commandEl) this.commandEl.textContent = 'Sin movimientos';
    if (this.metaEl) this.metaEl.textContent = 'El vehículo aún no reporta movimientos en el servidor.';
    if (this.codeEl) this.codeEl.textContent = '—';
    if (this.datetimeEl) this.datetimeEl.textContent = '—';
    if (this.traceEl) this.traceEl.textContent = 'Sin registros';
    if (this.sourceBadgeEl) {
      this.sourceBadgeEl.textContent = 'Sin movimientos';
      this.sourceBadgeEl.className = 'badge bg-secondary';
    }
  }

  setError(message) {
    if (this.commandEl) this.commandEl.textContent = 'Error de consulta';
    if (this.metaEl) this.metaEl.textContent = message || 'No se pudo obtener el último estado desde la API.';
    if (this.sourceBadgeEl) {
      this.sourceBadgeEl.textContent = 'Error';
      this.sourceBadgeEl.className = 'badge bg-danger';
    }
  }

  /**
   * Renderiza el estado obtenido por REST (GET /api/vehiculos/1/estado)
   */
  renderFromRestEstado(estado, forceUpdate = false) {
    if (!estado || !estado.comando) {
      this.setEmpty();
      return;
    }

    const formatted = formatDateTimeParts(estado.fecha_actualizacion);
    if (!forceUpdate && formatted.epochMs > 0 && formatted.epochMs < this.lastRenderedEpochMs) {
      return; // Evita que una respuesta REST vieja reemplace un evento WSS más reciente
    }
    if (formatted.epochMs > 0) {
      this.lastRenderedEpochMs = formatted.epochMs;
    }

    this.commandEl.textContent = estado.comando;
    this.metaEl.textContent = `Estado reportado por el backend (ID estado #${estado.id_estado})`;

    const codeParts = [];
    if (estado.codigo_comando !== null) codeParts.push(`Código: ${estado.codigo_comando}`);
    if (estado.id_comando > 0) codeParts.push(`ID: ${estado.id_comando}`);
    this.codeEl.textContent = codeParts.length > 0 ? codeParts.join(' · ') : '—';

    this.datetimeEl.textContent = formatted.full;
    this.traceEl.textContent = 'Confirmado vía REST (backend AWS)';

    this.sourceBadgeEl.textContent = 'Estado REST';
    this.sourceBadgeEl.className = 'badge bg-success';
  }

  /**
   * Renderiza actualización inmediata al recibir NUEVO_MOVIMIENTO por WSS
   * mientras se sincroniza la confirmación de persistencia con REST.
   */
  renderFromWssMovement(cmdInfo) {
    const nowParts = formatCurrentLiveTime();
    this.lastRenderedEpochMs = nowParts.epochMs;

    this.commandEl.textContent = cmdInfo.nombre;
    this.metaEl.textContent = 'Evento recibido en tiempo real por WebSocket WSS';

    const codeParts = [];
    if (cmdInfo.codigo !== null) codeParts.push(`Código: ${cmdInfo.codigo}`);
    if (cmdInfo.id_comando > 0) codeParts.push(`ID: ${cmdInfo.id_comando}`);
    this.codeEl.textContent = codeParts.length > 0 ? codeParts.join(' · ') : '—';

    this.datetimeEl.textContent = nowParts.full;
    this.traceEl.textContent = 'Publicado por WSS · Sincronizando RDS...';

    this.sourceBadgeEl.textContent = 'WSS En Vivo';
    this.sourceBadgeEl.className = 'badge bg-info text-dark';
    this.#triggerFlash();
  }

  /**
   * Renderiza eventos en vivo de una secuencia DEMO sin contaminar el historial persistido.
   */
  renderFromWssDemo(demoEvent, cmdInfo = null) {
    const nowParts = formatCurrentLiveTime();
    this.lastRenderedEpochMs = nowParts.epochMs;

    if (demoEvent.evento === 'INICIO_DEMO') {
      this.commandEl.textContent = `INICIO DEMO #${demoEvent.demo_id}`;
      this.metaEl.textContent = `Secuencia automática iniciada (${demoEvent.total_movimientos} pasos)`;
      this.codeEl.textContent = `Demo ID: ${demoEvent.demo_id}`;
      this.datetimeEl.textContent = nowParts.full;
      this.traceEl.textContent = 'Rutina DEMO en curso (no se guarda en historial)';
      this.sourceBadgeEl.textContent = 'DEMO Activa';
      this.sourceBadgeEl.className = 'badge bg-warning text-dark';
    } else if (demoEvent.evento === 'MOVIMIENTO_DEMO') {
      const label = cmdInfo ? cmdInfo.nombre : `COMANDO #${demoEvent.comando_id}`;
      this.commandEl.textContent = `${label} (DEMO)`;
      this.metaEl.textContent = `Paso #${demoEvent.orden} · Duración programada: ${demoEvent.duracion_ms} ms`;

      const codeParts = [];
      if (cmdInfo && cmdInfo.codigo !== null) codeParts.push(`Código: ${cmdInfo.codigo}`);
      codeParts.push(`ID: ${demoEvent.comando_id}`);
      this.codeEl.textContent = codeParts.join(' · ');

      this.datetimeEl.textContent = nowParts.full;
      this.traceEl.textContent = 'Paso interno DEMO vía WSS (sin registro en historial)';
      this.sourceBadgeEl.textContent = 'DEMO Paso';
      this.sourceBadgeEl.className = 'badge bg-warning text-dark';
    } else if (demoEvent.evento === 'FIN_DEMO') {
      this.commandEl.textContent = `FIN DEMO #${demoEvent.demo_id}`;
      this.metaEl.textContent = 'Secuencia DEMO finalizada; esperando comando de cierre';
      this.codeEl.textContent = `Demo ID: ${demoEvent.demo_id}`;
      this.datetimeEl.textContent = nowParts.full;
      this.traceEl.textContent = 'Fin de rutina DEMO vía WSS';
      this.sourceBadgeEl.textContent = 'DEMO Fin';
      this.sourceBadgeEl.className = 'badge bg-secondary';
    }

    this.#triggerFlash();
  }

  #triggerFlash() {
    if (!this.bodyEl) return;
    this.bodyEl.classList.remove('is-flash');
    void this.bodyEl.offsetWidth;
    this.bodyEl.classList.add('is-flash');
  }
}