/**
 * Configuración de los controles: qué comando hace cada dirección de cada
 * joystick y qué texto se muestra al usuario. Los IDs son los del catálogo real:
 * 1 DETENER · 2 ADELANTE · 3 ATRÁS · 4 GIRAR IZQ · 5 GIRAR DER
 * 6/7 TORRETA IZQ/DER · 8/9 SUBIR/BAJAR PLUMA · 10/11 EXTENDER/RETRAER PLUMA
 * 12/13 SUBIR/BAJAR GANCHO
 */
export const STOP_COMMAND_ID = 1;

export const CONTROL_CONFIG = {
  drive: {
    defaultMode: 'drive',
    modes: {
      drive: {
        commands: { up: 2, down: 3, left: 4, right: 5 },
        labels: {
          up: 'ADELANTE',
          down: 'ATRÁS',
          left: 'GIRAR IZQ.',
          right: 'GIRAR DER.'
        }
      }
    }
  },
  crane: {
    defaultMode: 'boom',
    modes: {
      boom: {
        commands: { up: 8, down: 9, left: 6, right: 7 },
        labels: {
          up: 'SUBIR PLUMA',
          down: 'BAJAR PLUMA',
          left: 'TORRETA IZQ.',
          right: 'TORRETA DER.'
        }
      },
      hook: {
        commands: { up: 12, down: 13, left: 11, right: 10 },
        labels: {
          up: 'SUBIR GANCHO',
          down: 'BAJAR GANCHO',
          left: 'RETRAER PLUMA',
          right: 'EXTENDER PLUMA'
        }
      }
    }
  }
};
