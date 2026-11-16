import { API_CONFIG } from '../config/api.config.js';

/**
 * Controlador de Selección y Ejecución de DEMOs POO.
 */
export class DemoController {
  constructor(restClient, commandService, selectId, runBtnId) {
    this.restClient = restClient;
    this.commandService = commandService;
    this.selectEl = document.getElementById(selectId);
    this.runBtnEl = document.getElementById(runBtnId);
    this.initEvents();
  }

  initEvents() {
    this.runBtnEl.addEventListener('click', () => this.runSelectedDemo());
  }

  async loadDemos() {
    try {
      const data = await this.restClient.get(API_CONFIG.ENDPOINTS.GET_DEMOS);
      this.selectEl.innerHTML = '<option value="" selected disabled>Seleccione una DEMO</option>';
      
      if (data.demos && Array.isArray(data.demos)) {
        data.demos.forEach(demo => {
          const opt = document.createElement('option');
          opt.value = demo.id_demo;
          opt.textContent = `${demo.nombre} (${demo.descripcion || 'Sin desc.'})`;
          this.selectEl.appendChild(opt);
        });
      }
    } catch (err) {
      this.selectEl.innerHTML = '<option value="" selected disabled>Error al cargar DEMOs</option>';
    }
  }

  async runSelectedDemo() {
    const demoId = this.selectEl.value;
    if (!demoId) return;

    this.runBtnEl.disabled = true;
    this.commandService.setDemoRunning(true);
    this.commandService.updateFeedback(`Iniciando DEMO #${demoId}...`, "bg-info text-dark");

    try {
      const payload = {
        vehiculo_id: API_CONFIG.VEHICLE_ID,
        demo_id: Number(demoId)
      };

      await this.restClient.post(API_CONFIG.ENDPOINTS.POST_DEMO, payload);
      this.commandService.updateFeedback(`DEMO #${demoId} finalizada`, "bg-success");
    } catch (error) {
      this.commandService.updateFeedback(`Error DEMO: ${error.message}`, "bg-danger");
    } finally {
      this.runBtnEl.disabled = false;
      this.commandService.setDemoRunning(false);
    }
  }
}