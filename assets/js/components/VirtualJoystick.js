/**
 * Controlador POO de Joystick Circular Táctil / Pointer Events.
 *
 * Uso compatible con la versión anterior:
 *   new VirtualJoystick('base-id', 'stick-id', (commandId) => {...});
 *
 * Opciones (4.º parámetro, opcionales):
 *   commands: { up, down, left, right, stop } → IDs de comando por dirección
 *   onDirectionChange(dir)  → 'up' | 'down' | 'left' | 'right' | 'none'
 *   onActiveChange(bool)    → true al tocar, false al soltar
 */
export class VirtualJoystick {
  // Solo un joystick puede estar activo a la vez (el vehículo ejecuta un comando por vez)
  static activeInstance = null;

  constructor(baseId, stickId, onCommandCallback, options = {}) {
    this.base = document.getElementById(baseId);
    this.stick = document.getElementById(stickId);
    this.onCommand = onCommandCallback;
    this.onDirectionChange = options.onDirectionChange || null;
    this.onActiveChange = options.onActiveChange || null;
    this.activePointerId = null;

    this.COMMAND_MAP = { FORWARD: 2, BACKWARD: 3, LEFT: 4, RIGHT: 5, STOP: 1 };
    this.setCommands(options.commands || {});

    this.currentDirectionCommand = this.COMMAND_MAP.STOP;
    this.currentDirection = 'none';
    this.maxRadius = 60;
    this.deadZoneRatio = 0.33;
    this.initEvents();
  }

  /** Cambia el mapa de comandos (p. ej. al cambiar de modo en el joystick de la grúa). */
  setCommands({ up, down, left, right, stop } = {}) {
    if (up !== undefined) this.COMMAND_MAP.FORWARD = up;
    if (down !== undefined) this.COMMAND_MAP.BACKWARD = down;
    if (left !== undefined) this.COMMAND_MAP.LEFT = left;
    if (right !== undefined) this.COMMAND_MAP.RIGHT = right;
    if (stop !== undefined) this.COMMAND_MAP.STOP = stop;
  }

  initEvents() {
    this.base.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerEnd(e));
    window.addEventListener('pointercancel', (e) => this.onPointerEnd(e));
  }

  onPointerDown(e) {
    if (this.activePointerId !== null) return;
    if (VirtualJoystick.activeInstance && VirtualJoystick.activeInstance !== this) return;
    VirtualJoystick.activeInstance = this;
    this.activePointerId = e.pointerId;
    this.base.setPointerCapture(e.pointerId);
    if (this.onActiveChange) this.onActiveChange(true);
    this.processPointerPosition(e);
  }

  onPointerMove(e) {
    if (e.pointerId !== this.activePointerId) return;
    this.processPointerPosition(e);
  }

  onPointerEnd(e) {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    if (VirtualJoystick.activeInstance === this) VirtualJoystick.activeInstance = null;
    this.resetStick();
    this.setDirection('none');
    if (this.onActiveChange) this.onActiveChange(false);
    this.triggerCommand(this.COMMAND_MAP.STOP);
  }

  resetStick() {
    this.stick.style.transform = `translate(-50%, -50%)`;
    this.currentDirectionCommand = this.COMMAND_MAP.STOP;
  }

  setDirection(dir) {
    if (dir === this.currentDirection) return;
    this.currentDirection = dir;
    this.base.dataset.dir = dir;
    if (this.onDirectionChange) this.onDirectionChange(dir);
  }

  /** El radio máximo se calcula con el tamaño real, para que sea responsivo. */
  updateRadius() {
    const baseRect = this.base.getBoundingClientRect();
    const stickRect = this.stick.getBoundingClientRect();
    const radius = (baseRect.width - stickRect.width) / 2;
    if (radius > 10) this.maxRadius = radius;
  }

  processPointerPosition(e) {
    this.updateRadius();
    const rect = this.base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = e.clientX - centerX;
    let deltaY = e.clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    if (distance > this.maxRadius) {
      deltaX = Math.cos(angle) * this.maxRadius;
      deltaY = Math.sin(angle) * this.maxRadius;
    }

    this.stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

    // Zona muerta central proporcional al tamaño
    if (distance < this.maxRadius * this.deadZoneRatio) {
      this.setDirection('none');
      if (this.currentDirectionCommand !== this.COMMAND_MAP.STOP) {
        this.currentDirectionCommand = this.COMMAND_MAP.STOP;
        this.triggerCommand(this.COMMAND_MAP.STOP);
      }
      return;
    }

    // Dirección por sectores angulares
    let nextCommand;
    let dir;
    const deg = angle * (180 / Math.PI);

    if (deg >= -135 && deg < -45) { nextCommand = this.COMMAND_MAP.FORWARD; dir = 'up'; }
    else if (deg >= 45 && deg < 135) { nextCommand = this.COMMAND_MAP.BACKWARD; dir = 'down'; }
    else if (deg >= -45 && deg < 45) { nextCommand = this.COMMAND_MAP.RIGHT; dir = 'right'; }
    else { nextCommand = this.COMMAND_MAP.LEFT; dir = 'left'; }

    this.setDirection(dir);

    if (nextCommand !== this.currentDirectionCommand) {
      this.currentDirectionCommand = nextCommand;
      this.triggerCommand(nextCommand);
    }
  }

  triggerCommand(commandId) {
    if (this.onCommand) {
      this.onCommand(commandId);
    }
  }
}
