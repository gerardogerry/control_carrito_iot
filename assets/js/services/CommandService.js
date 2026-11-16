import { API_CONFIG } from '../config/api.config.js';

/**
 * Servicio de Negocio POO para envio y deduplicación de Comandos.
 */
export class CommandService {
  constructor(restClient, feedbackElement) {
    this.restClient = restClient;
    this.feedbackElement = feedbackElement;
    this.currentCommandId = null;
    this.isPending = false;
    this.isDemoRunning = false;
  }

  setDemoRunning(status) {
    this.isDemoRunning = status;
  }

  async executeCommand(comandoId, forceStop = false, allowRepeat = false) {
    if (this.isDemoRunning && !forceStop) {
      this.updateFeedback("DEMO en ejecución - Bloqueado", "bg-warning text-dark");
      return false;
    }

    if (this.currentCommandId === comandoId && !forceStop && !allowRepeat) {
      return false; // Evita peticiones duplicadas consecutivas
    }

    this.currentCommandId = comandoId;
    this.isPending = true;
    this.updateFeedback(`Enviando id:${comandoId}...`, "bg-info text-dark");

    try {
      const payload = {
        vehiculo_id: API_CONFIG.VEHICLE_ID,
        comando_id: Number(comandoId),
        origen: API_CONFIG.ORIGIN_HEADER
      };

      const result = await this.restClient.post(API_CONFIG.ENDPOINTS.POST_MOVIMIENTO, payload);
      this.updateFeedback(`Aceptado: id:${comandoId}`, "bg-success");
      this.isPending = false;
      return result;
    } catch (error) {
      this.updateFeedback(`Error: ${error.message}`, "bg-danger");
      this.isPending = false;
      throw error;
    }
  }

  updateFeedback(message, badgeClass) {
    if (this.feedbackElement) {
      this.feedbackElement.textContent = message;
      this.feedbackElement.className = `badge ${badgeClass} text-truncate style-feedback`;
    }
  }
}