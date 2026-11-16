import { VirtualJoystick } from './VirtualJoystick.js';
import { CONTROL_CONFIG, STOP_COMMAND_ID } from '../config/controls.config.js';

/**
 * Tarjeta de joystick: une el joystick, sus rótulos de dirección y,
 * si existe, el selector de modo (p. ej. PLUMA/TORRETA ↔ GANCHO/EXTENSIÓN).
 */
export class JoystickPanel {
  constructor(rootId, configKey, baseId, stickId, onCommand) {
    this.root = document.getElementById(rootId);
    this.config = CONTROL_CONFIG[configKey];
    this.mode = this.config.defaultMode;
    if (!this.root) return;

    this.labelEls = {};
    this.root.querySelectorAll('.joy-label[data-dir]').forEach((el) => {
      this.labelEls[el.dataset.dir] = el.querySelector('.joy-label-text');
    });

    this.joystick = new VirtualJoystick(baseId, stickId, onCommand, {
      commands: { ...this.config.modes[this.mode].commands, stop: STOP_COMMAND_ID },
      onDirectionChange: (dir) => { this.root.dataset.dir = dir; },
      onActiveChange: (active) => {
        this.root.classList.toggle('is-active', active);
        document.body.classList.toggle('joy-in-use', active);
        // No se permite cambiar de modo mientras se está usando el joystick
        this.root.querySelectorAll('.mode-btn').forEach((b) => { b.disabled = active; });
      }
    });

    this.modeButtons = this.root.querySelectorAll('.mode-btn[data-mode]');
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    this.setMode(this.mode);
  }

  setMode(modeId) {
    const mode = this.config.modes[modeId];
    if (!mode) return;
    this.mode = modeId;
    this.joystick.setCommands({ ...mode.commands, stop: STOP_COMMAND_ID });

    Object.entries(mode.labels).forEach(([dir, text]) => {
      if (this.labelEls[dir]) this.labelEls[dir].textContent = text;
    });

    this.modeButtons.forEach((btn) => {
      const selected = btn.dataset.mode === modeId;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }
}
