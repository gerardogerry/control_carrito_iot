export const API_CONFIG = {
  VEHICLE_ID: 1,
  ORIGIN_HEADER: "WEB_CONTROL",
  TIMEZONE: "America/Mexico_City",
  HISTORY_MAX_ROWS: 10,
  BASE_URL: "https://50-19-210-179.nip.io",
  WS_BASE_URL: "wss://50-19-210-179.nip.io/ws/vehiculo",
  ENDPOINTS: {
    HEALTH_API: "/api/health",
    HEALTH_RDS: "/api/health/rds",
    AUTH_LOGIN: "/api/auth/login",
    AUTH_LOGOUT: "/api/auth/logout",
    AUTH_ME: "/api/auth/me",

    VEHICULO: (id) => `/api/vehiculos/${id}`,
    COMANDOS: (id) => `/api/vehiculos/${id}/comandos`,
    DEMOS: (id) => `/api/vehiculos/${id}/demos`,
    ESTADO: (id) => `/api/vehiculos/${id}/estado`,
    HISTORIAL: (id) => `/api/vehiculos/${id}/historial`,
    POST_MOVIMIENTO: "/api/vehiculos/movimiento",
    POST_DEMO: "/api/vehiculos/demo",

    PUBLIC_CATALOGO: "/api/publico/catalogo",
    INVITADO_INICIAR: "/api/publico/sesiones/iniciar",
    INVITADO_FINALIZAR: "/api/publico/sesiones/finalizar",

    // Endpoints reales de Administración Comercial
    ADMIN_DASHBOARD: "/api/admin/dashboard",
    ADMIN_MODELOS: "/api/admin/modelos",
    ADMIN_CLIENTES: "/api/admin/clientes",
    ADMIN_ASIGNACIONES: "/api/admin/asignaciones",
    ADMIN_SOPORTE: "/api/admin/soporte/autorizar",
    ADMIN_AUDITORIA: "/api/admin/auditoria"
  },
  TIMEOUT_MS: 6000,
  RECONNECT_INTERVAL_MS: 3000,
  HEALTH_CHECK_INTERVAL_MS: 25000
};