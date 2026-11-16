import { API_CONFIG } from '../config/api.config.js';
import { formatDateTimeParts } from '../utils/datetime.util.js';

/**
 * Tabla semántica de los últimos 10 movimientos individuales persistidos.
 * Utiliza exclusivamente createElement y textContent para prevenir XSS.
 */
export class HistoryTable {
  constructor() {
    this.tbodyEl = document.getElementById('history-table-body');
    this.bannerEl = document.getElementById('history-status-banner');
    this.countBadgeEl = document.getElementById('history-count-badge');
  }

  setLoading() {
    this.#setBanner('Cargando últimos 10 movimientos individuales...', false);
    if (this.tbodyEl) {
      this.#renderSingleMessageRow('Cargando...');
    }
  }

  setError(message) {
    this.#setBanner(message || 'Error al consultar el historial en el servidor.', true);
  }

  setDisconnectedNotice() {
    this.#setBanner('Desconectado de WSS: mostrando últimos registros sincronizados.', true);
  }

  renderRows(records) {
    if (!this.tbodyEl) return;

    const safeList = Array.isArray(records) ? records.slice(0, API_CONFIG.HISTORY_MAX_ROWS) : [];
    if (this.countBadgeEl) {
      this.countBadgeEl.textContent = `${safeList.length} / ${API_CONFIG.HISTORY_MAX_ROWS}`;
    }

    if (safeList.length === 0) {
      this.#setBanner('Sin movimientos individuales persistidos para este vehículo.', false);
      this.#renderSingleMessageRow('Sin registros');
      return;
    }

    this.#setBanner(`Mostrando los ${safeList.length} movimientos individuales más recientes (orden descendente).`, false);

    const fragment = document.createDocumentFragment();
    safeList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.dataset.idHistorial = String(item.id_historial);

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = String(index + 1);
      tdNum.title = `ID real en RDS: #${item.id_historial}`;

      const tdMove = document.createElement('td');
      const strongName = document.createElement('strong');
      strongName.textContent = item.comando;
      tdMove.appendChild(strongName);

      if (item.codigo_comando !== null) {
        const smallCode = document.createElement('small');
        smallCode.className = 'text-muted ms-2';
        smallCode.textContent = `(Cód. ${item.codigo_comando})`;
        tdMove.appendChild(smallCode);
      }

      const { date, time } = formatDateTimeParts(item.fecha_hora);

      const tdDate = document.createElement('td');
      tdDate.textContent = date;

      const tdTime = document.createElement('td');
      tdTime.textContent = time;

      tr.append(tdNum, tdMove, tdDate, tdTime);
      fragment.appendChild(tr);
    });

    this.tbodyEl.replaceChildren(fragment);
  }

  #renderSingleMessageRow(text) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'text-center text-muted py-4';
    td.textContent = text;
    tr.appendChild(td);
    this.tbodyEl.replaceChildren(tr);
  }

  #setBanner(text, isError) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.toggle('is-error', Boolean(isError));
  }
}