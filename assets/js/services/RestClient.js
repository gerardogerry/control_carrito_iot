/**
 * Cliente HTTP centralizado con Fetch, async/await, timeout, autenticación Bearer
 * y soporte de AbortController externo para cancelar solicitudes obsoletas y prevenir condiciones de carrera.
 */
export class RestClient {
  constructor(baseUrl, timeoutMs = 6000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.token = null;
  }

  setToken(token) {
    this.token = token || null;
  }

  async get(endpoint, externalSignal = null) {
    return this.#request('GET', endpoint, null, externalSignal);
  }

  async post(endpoint, body = {}, externalSignal = null) {
    return this.#request('POST', endpoint, body, externalSignal);
  }

  async put(endpoint, body = {}, externalSignal = null) {
    return this.#request('PUT', endpoint, body, externalSignal);
  }

  async delete(endpoint, externalSignal = null) {
    return this.#request('DELETE', endpoint, null, externalSignal);
  }

  async #request(method, endpoint, body, externalSignal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new Error('Tiempo de espera agotado (timeout)')),
      this.timeoutMs
    );

    const onExternalAbort = () =>
      controller.abort(externalSignal.reason || new Error('Solicitud cancelada'));

    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw externalSignal.reason || new DOMException('Aborted', 'AbortError');
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const options = {
        method,
        headers,
        signal: controller.signal
      };

      if (body !== null) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }
}