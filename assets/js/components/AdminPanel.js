import { API_CONFIG } from '../config/api.config.js';

export class AdminPanel {
  constructor(restClient, onDataChangedCallback = null) {
    this.restClient = restClient;
    this.onDataChanged = onDataChangedCallback;
    this.root = document.getElementById('view-admin');
    this.role = null;
    this.vehiculos = [];
    this.clientes = [];
    this.modelos = [];
    this.comandos = [];
    this._bound = false;
  }

  configureForRole(session) {
    this.role = session?.rol || null;
    this.vehiculos = Array.isArray(session?.vehiculos) ? session.vehiculos : [];
    if (!this.root) return;

    const isAdmin = this.role === 'ADMIN';
    const isOwner = this.role === 'USUARIO';

    this.root.querySelectorAll('[data-admin-only]').forEach(el => {
      el.hidden = !isAdmin;
    });

    if (isAdmin || isOwner) {
      this.bindEventsOnce();
    }
  }

  bindEventsOnce() {
    if (this._bound) return;
    this._bound = true;

    // 1. Registrar Modelo Comercial
    document.getElementById('form-create-modelo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        await this.restClient.post(API_CONFIG.ENDPOINTS.ADMIN_MODELOS, {
          nombre_modelo: fd.get('nombre_modelo'),
          descripcion: fd.get('descripcion')
        });
        e.target.reset();
        alert('Modelo registrado correctamente.');
        await this.refreshAll();
      } catch (err) {
        alert(`Error al registrar modelo: ${err.message}`);
      }
    });

    // 2. Alta de Unidad IoT
    document.getElementById('form-create-vehiculo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        await this.restClient.post('/api/admin/vehiculos', {
          codigo_serie: fd.get('codigo_serie'),
          nombre: fd.get('nombre'),
          id_modelo: Number(fd.get('id_modelo')),
          estado_comercial: fd.get('estado_comercial')
        });
        e.target.reset();
        alert('Unidad IoT creada correctamente.');
        await this.refreshAll();
        if (this.onDataChanged) this.onDataChanged();
      } catch (err) {
        alert(`Error al crear unidad: ${err.message}`);
      }
    });

    // 3. Alta de Cliente Propietario
    document.getElementById('form-create-cliente')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        await this.restClient.post(API_CONFIG.ENDPOINTS.ADMIN_CLIENTES, {
          nombre: fd.get('nombre'),
          email: fd.get('email'),
          password: fd.get('password')
        });
        e.target.reset();
        alert('Cliente propietario creado correctamente.');
        await this.refreshAll();
      } catch (err) {
        alert(`Error al crear cliente: ${err.message}`);
      }
    });

    // 4. Asignar Unidad a Propietario o Liberar a Exhibición
    document.getElementById('form-asignar-unidad')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const valUsuario = fd.get('id_usuario');
        const esExhibicion = valUsuario === 'EXHIBICION';

        await this.restClient.post(API_CONFIG.ENDPOINTS.ADMIN_ASIGNACIONES, {
          id_vehiculo: Number(fd.get('id_vehiculo')),
          id_usuario: esExhibicion ? null : Number(valUsuario),
          estado_comercial: esExhibicion ? 'EXHIBICION' : 'VENDIDO'
        });
        alert(esExhibicion ? 'Unidad liberada a EXHIBICIÓN pública.' : 'Unidad asignada correctamente al propietario.');
        await this.refreshAll();
        if (this.onDataChanged) this.onDataChanged();
      } catch (err) {
        alert(`Error al asignar unidad: ${err.message}`);
      }
    });

    // 5. Interruptor de Soporte Técnico
    document.getElementById('btn-toggle-soporte')?.addEventListener('click', async () => {
      try {
        const idVehiculo = Number(document.getElementById('soporte-vehiculo-select').value);
        const autorizado = document.getElementById('soporte-estado-select').value === '1';
        if (!idVehiculo) return;
        await this.restClient.post(API_CONFIG.ENDPOINTS.ADMIN_SOPORTE, {
          id_vehiculo: idVehiculo,
          autorizado
        });
        alert(`Soporte técnico ${autorizado ? 'AUTORIZADO' : 'REVOCADO'} correctamente.`);
        await this.refreshAll();
        if (this.onDataChanged) this.onDataChanged();
      } catch (err) {
        alert(`Error en soporte técnico: ${err.message}`);
      }
    });

    // Editor de Demos: Agregar paso
    document.getElementById('btn-add-demo-step')?.addEventListener('click', () => {
      this.#appendDemoStepRow();
    });

    // Editor de Demos: Guardar secuencia
    document.getElementById('form-create-demo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const idVehiculo = Number(document.getElementById('demo-owner-vehiculo').value);
        const nombre = document.getElementById('demo-owner-nombre').value.trim();
        const descripcion = document.getElementById('demo-owner-desc').value.trim();

        const rows = Array.from(document.querySelectorAll('#demo-steps-container .demo-step-row'));
        const movimientos = rows.map((row, idx) => ({
          orden: idx + 1,
          id_comando: Number(row.querySelector('.step-cmd').value),
          duracion_ms: Number(row.querySelector('.step-ms').value) || 800
        }));

        if (!idVehiculo || !nombre || movimientos.length === 0) return;

        await this.restClient.post(API_CONFIG.ENDPOINTS.DEMOS(idVehiculo), {
          nombre,
          descripcion,
          movimientos
        });
        e.target.reset();
        document.getElementById('demo-steps-container').innerHTML = '';
        this.#appendDemoStepRow();
        alert('DEMO guardada correctamente.');
        await this.loadOwnerDemos(idVehiculo);
        if (this.onDataChanged) this.onDataChanged();
      } catch (err) {
        alert(`Error guardando DEMO: ${err.message}`);
      }
    });

    document.getElementById('demo-owner-vehiculo')?.addEventListener('change', (e) => {
      this.loadOwnerDemos(Number(e.target.value));
    });
  }

  async refreshAll() {
    if (!this.role || this.role === 'INVITADO') return;

    try {
      if (this.role === 'ADMIN') {
        const [vehRes, modRes, cliRes, audRes] = await Promise.all([
          this.restClient.get('/api/admin/vehiculos').catch(() => ({ vehiculos: [] })),
          this.restClient.get(API_CONFIG.ENDPOINTS.ADMIN_MODELOS).catch(() => ({ modelos: [] })),
          this.restClient.get(API_CONFIG.ENDPOINTS.ADMIN_CLIENTES).catch(() => ({ clientes: [] })),
          this.restClient.get(API_CONFIG.ENDPOINTS.ADMIN_AUDITORIA).catch(() => ({ eventos: [] }))
        ]);

        if (Array.isArray(vehRes.vehiculos) && vehRes.vehiculos.length > 0) {
          this.vehiculos = vehRes.vehiculos;
        }
        this.modelos = modRes.modelos || [];
        this.clientes = cliRes.clientes || [];
        this.#populateVehicleSelects();
        this.#renderAdminTables(audRes.eventos || audRes.auditoria || []);
      } else {
        const me = await this.restClient.get(API_CONFIG.ENDPOINTS.AUTH_ME).catch(() => ({}));
        if (Array.isArray(me.vehiculos) && me.vehiculos.length > 0) {
          this.vehiculos = me.vehiculos;
        }
        this.#populateVehicleSelects();
      }

      if (this.vehiculos.length > 0) {
        const firstId = this.vehiculos[0].id_vehiculo;
        const cmdRes = await this.restClient.get(API_CONFIG.ENDPOINTS.COMANDOS(firstId));
        this.comandos = Array.isArray(cmdRes) ? cmdRes : (cmdRes.comandos || []);
        if (!document.querySelector('#demo-steps-container .demo-step-row')) {
          this.#appendDemoStepRow();
        }
        await this.loadOwnerDemos(firstId);
      }
    } catch (err) {
      console.error('Error cargando panel administrativo:', err);
    }
  }

  #populateVehicleSelects() {
    const selects = [
      document.getElementById('asig-vehiculo-select'),
      document.getElementById('soporte-vehiculo-select'),
      document.getElementById('demo-owner-vehiculo')
    ].filter(Boolean);

    selects.forEach(sel => {
      sel.innerHTML = '';
      this.vehiculos.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id_vehiculo;
        opt.textContent = `${v.codigo_serie || 'UNIT-' + v.id_vehiculo} · ${v.nombre} (${v.estado_comercial || 'ACTIVO'})`;
        sel.appendChild(opt);
      });
    });
  }

  #renderAdminTables(auditoria) {
    const modSelect = document.getElementById('vehiculo-modelo-select');
    if (modSelect) {
      modSelect.innerHTML = '';
      this.modelos.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id_modelo;
        opt.textContent = m.nombre_modelo;
        modSelect.appendChild(opt);
      });
    }

    const cliSelect = document.getElementById('asig-cliente-select');
    if (cliSelect) {
      cliSelect.innerHTML = '<option value="EXHIBICION">-- Liberar a EXHIBICIÓN (Pública Invitados) --</option>';
      this.clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id_usuario;
        opt.textContent = `${c.nombre} (${c.email})`;
        cliSelect.appendChild(opt);
      });
    }

    const tbodyVeh = document.getElementById('admin-vehiculos-tbody');
    if (tbodyVeh) {
      tbodyVeh.innerHTML = '';
      this.vehiculos.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${v.codigo_serie || 'UNIT-' + v.id_vehiculo}</strong></td>
          <td>${v.nombre}</td>
          <td>${v.nombre_modelo || v.modelo || '-'}</td>
          <td><span class="badge bg-info text-dark">${v.estado_comercial || 'DISPONIBLE'}</span></td>
          <td>${v.propietario_nombre || '<span class="text-light opacity-75">Sin asignar</span>'}</td>
          <td>${v.soporte_autorizado ? '<span class="badge bg-warning text-dark">AUTORIZADO</span>' : '<span class="badge bg-secondary">BLOQUEADO</span>'}</td>
        `;
        tbodyVeh.appendChild(tr);
      });
    }

    const tbodyAud = document.getElementById('admin-auditoria-tbody');
    if (tbodyAud) {
      tbodyAud.innerHTML = '';
      auditoria.slice(0, 15).forEach(a => {
        const tr = document.createElement('tr');
        const resultado = a.resultado || 'EXITO';
        const badge = resultado === 'EXITO' ? 'bg-success' : 'bg-danger';
        tr.innerHTML = `
          <td><small>${a.fecha_hora || a.created_at || '-'}</small></td>
          <td><span class="badge bg-secondary">${a.rol_actor || 'ADMIN'}</span></td>
          <td><strong>${a.accion || '-'}</strong></td>
          <td>${a.detalle || a.entidad_id || ''}</td>
          <td><span class="badge ${badge}">${resultado}</span></td>
        `;
        tbodyAud.appendChild(tr);
      });
    }
  }

  #appendDemoStepRow() {
    const container = document.getElementById('demo-steps-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'demo-step-row d-flex gap-2 mb-2 align-items-center';

    const sel = document.createElement('select');
    sel.className = 'hud-select step-cmd flex-grow-1';
    this.comandos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_comando;
      opt.textContent = `${c.nombre} (Cód. ${c.codigo})`;
      sel.appendChild(opt);
    });

    const inputMs = document.createElement('input');
    inputMs.type = 'number';
    inputMs.className = 'hud-select step-ms';
    inputMs.style.width = '110px';
    inputMs.value = '800';
    inputMs.min = '200';
    inputMs.max = '10000';
    inputMs.step = '100';

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'hud-btn hud-btn-sm hud-btn-amber';
    btnDel.textContent = '✕';
    btnDel.onclick = () => row.remove();

    row.append(sel, inputMs, btnDel);
    container.appendChild(row);
  }

  async loadOwnerDemos(idVehiculo) {
    const listEl = document.getElementById('owner-demos-list');
    if (!listEl || !idVehiculo) return;
    try {
      const data = await this.restClient.get(API_CONFIG.ENDPOINTS.DEMOS(idVehiculo));
      const demos = data.demos || [];
      listEl.innerHTML = '';
      if (demos.length === 0) {
        listEl.innerHTML = '<li class="text-light opacity-75 small">Sin demos registradas en esta unidad.</li>';
        return;
      }
      demos.forEach(d => {
        const li = document.createElement('li');
        li.className = 'd-flex justify-content-between align-items-center py-1 border-bottom border-secondary';
        const isPrivada = d.tipo_demo === 'PRIVADA';
        li.innerHTML = `
          <span>
            <strong>${d.nombre}</strong>
            <span class="badge ${isPrivada ? 'bg-info text-dark' : 'bg-secondary'} ms-1">${d.tipo_demo || 'FABRICA'}</span>
            <small class="text-light opacity-75 d-block">${d.descripcion || ''}</small>
          </span>
        `;
        if (isPrivada) {
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'hud-btn hud-btn-sm hud-btn-amber';
          btnDel.textContent = 'Eliminar';
          btnDel.onclick = async () => {
            await this.restClient.delete(`/api/vehiculos/${idVehiculo}/demos/${d.id_demo}`);
            await this.loadOwnerDemos(idVehiculo);
            if (this.onDataChanged) this.onDataChanged();
          };
          li.appendChild(btnDel);
        }
        listEl.appendChild(li);
      });
    } catch {
      listEl.innerHTML = '<li class="text-danger small">Error cargando demos.</li>';
    }
  }
}