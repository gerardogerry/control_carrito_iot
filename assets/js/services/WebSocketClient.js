import { API_CONFIG } from '../config/api.config.js';
import { ConnectionState } from '../models/ConnectionState.js';

/**
 * Cliente WebSocket POO con sesión única compartida, auto-reconexión controlada
 * y aviso explícito al reconectar para resincronizar estado/historial vía REST.
 */
export class WebSocketClient {
  constructor(wsUrl = API_CONFIG.WS_URL, onStateChangeCallback = null, onMessageCallback = null, onReconnectCallback = null) {
    this.wsUrl = wsUrl;
    this.socket = null;
    this.onStateChange = onStateChangeCallback;
    this.onMessage = onMessageCallback;
    this.onReconnect = onReconnectCallback;
    this.isExplicitlyClosed = false;
    this.hasConnectedOnce = false;
    this.reconnectTimer = null;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isExplicitlyClosed = false;
    if (this.onStateChange) this.onStateChange(ConnectionState.STATES.CONNECTING);

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        if (this.onStateChange) this.onStateChange(ConnectionState.STATES.ONLINE);
        if (this.hasConnectedOnce && typeof this.onReconnect === 'function') {
          this.onReconnect();
        }
        this.hasConnectedOnce = true;
      };

      this.socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(parsedData);
        } catch (err) {
          console.error('Error parseando evento WSS:', err);
        }
      };

      this.socket.onerror = (error) => {
        console.warn('Error en sesión WebSocket WSS:', error);
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (this.onStateChange) this.onStateChange(ConnectionState.STATES.DISCONNECTED);
        if (!this.isExplicitlyClosed) {
          this.reconnectTimer = setTimeout(() => this.connect(), API_CONFIG.RECONNECT_INTERVAL_MS);
        }
      };
    } catch (err) {
      this.socket = null;
      if (this.onStateChange) this.onStateChange(ConnectionState.STATES.DISCONNECTED);
      if (!this.isExplicitlyClosed) {
        this.reconnectTimer = setTimeout(() => this.connect(), API_CONFIG.RECONNECT_INTERVAL_MS);
      }
    }
  }

  close() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}