/**
 * Modelo de Comando en POO conforme a los contratos del Backend.
 */
export class Command {
  constructor(id_comando, id_vehiculo, nombre, codigo, descripcion = "", activo = 1) {
    this.id_comando = Number(id_comando);
    this.id_vehiculo = Number(id_vehiculo);
    this.nombre = String(nombre);
    this.codigo = Number(codigo);
    this.descripcion = String(descripcion);
    this.activo = Boolean(activo);
  }

  toPostPayload(origen = "WEB_CONTROL") {
    return {
      vehiculo_id: this.id_vehiculo,
      comando_id: this.id_comando,
      origen: origen
    };
  }
}