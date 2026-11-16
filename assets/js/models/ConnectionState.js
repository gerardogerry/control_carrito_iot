/**
 * Modelo de estado para la gestión de conectividad POO.
 */
export class ConnectionState {
  static STATES = {
    DISCONNECTED: "Desconectado",
    CONNECTING: "Conectando/Reconectando",
    ONLINE: "En línea",
    AVAILABLE: "Disponible",
    CHECKING: "Comprobando",
    UNAVAILABLE: "No disponible",
    UNVERIFIED: "Sin verificar"
  };

  constructor(wss = ConnectionState.STATES.DISCONNECTED, aws = ConnectionState.STATES.CHECKING, rds = ConnectionState.STATES.UNVERIFIED) {
    this.wssState = wss;
    this.awsState = aws;
    this.rdsState = rds;
  }
}