export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  GOOGLE: '/auth/google',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  UPDATE_PROFILE: '/auth/profile',
  CHECK_METHODS: '/auth/methods',
  VALIDATE_SESSION: '/auth/validate-session',
  SWITCH_TENANT: '/auth/switch-tenant',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  SET_PASSWORD: '/auth/set-password',
  LINK_ACCOUNT: '/auth/link-account',
  SESSIONS: '/auth/sessions',
} as const;

export const PRODUCTO_ENDPOINTS = {
  VARIANTES: (productoId: string) => `/productos/${productoId}/variantes`,
  VARIANTE: (varianteId: string) => `/productos/variantes/${varianteId}`,
  GENERAR_COMBINACIONES: (productoId: string) => `/productos/${productoId}/variantes/generar-combinaciones`,
  VARIANTE_ATRIBUTOS: (varianteId: string) => `/productos/variantes/${varianteId}/atributos`,
  PRODUCTO_ATRIBUTOS: '/producto-atributos',
  PRODUCTO_ATRIBUTO: (id: string) => `/producto-atributos/${id}`,
  BULK_TEMPLATE: '/productos/bulk-upload/template',
  BULK_UPLOAD: '/productos/bulk-upload',
  PLANTILLAS: '/producto-atributo-plantillas',
  PLANTILLA: (id: string) => `/producto-atributo-plantillas/${id}`,
  PLANTILLA_APLICAR: '/producto-atributo-plantillas/aplicar',
} as const;

export const PRECIO_NIVEL_ENDPOINTS = {
  BY_PRODUCTO: (productoId: string) => `/productos/${productoId}/precios-nivel`,
  BY_VARIANTE: (varianteId: string) => `/productos/variantes/${varianteId}/precios-nivel`,
  SINGLE: (nivelId: string) => `/productos/precios-nivel/${nivelId}`,
} as const;

export const CONFIGURACION_PRECIO_ENDPOINTS = {
  LIST: '/configuraciones-precio',
  SINGLE: (id: string) => `/configuraciones-precio/${id}`,
} as const;

export const COMBO_ENDPOINTS = {
  LIST: '/combos',
  COMPONENTES: (comboId: string) => `/combos/${comboId}/componentes`,
  COMPONENTES_BATCH: (comboId: string) => `/combos/${comboId}/componentes/batch`,
  COMPONENTE: (componenteId: string) => `/combos/componentes/${componenteId}`,
  COMBO_COMPLETO: (comboId: string) => `/combos/${comboId}/combo-completo`,
  STOCK_DISPONIBLE: (comboId: string) => `/combos/${comboId}/stock-disponible-combo`,
} as const;

export const STOCK_ENDPOINTS = {
  CREATE: '/producto-stock',
  LIST_BY_SEDE: (sedeId: string) => `/producto-stock/sede/${sedeId}`,
  BY_PRODUCTO_SEDE: (productoId: string, sedeId: string) => `/producto-stock/producto/${productoId}/sede/${sedeId}`,
  BY_VARIANTE_SEDE: (varianteId: string, sedeId: string) => `/producto-stock/variante/${varianteId}/sede/${sedeId}`,
  TODAS_SEDES: (productoId: string) => `/producto-stock/producto/${productoId}/todas-sedes`,
  AJUSTAR: (id: string) => `/producto-stock/${id}/ajustar`,
  UPDATE_PRECIOS: (id: string) => `/producto-stock/${id}/precios`,
  MOVIMIENTOS: (id: string) => `/producto-stock/${id}/movimientos`,
  ALERTAS_BAJO_MINIMO: '/producto-stock/alertas/bajo-minimo',
  UBICACIONES: (sedeId: string) => `/producto-stock/sede/${sedeId}/ubicaciones`,
  BULK_MIN_MAX: (sedeId: string) => `/producto-stock/sede/${sedeId}/stock-minmax-bulk`,
  REPORTE_MERMAS: '/producto-stock/reportes/mermas',
  REPORTE_VALORIZACION: '/producto-stock/reportes/valorizacion',
  REPORTE_SUGERENCIAS: '/producto-stock/reportes/sugerencias-reorden',
  REPORTE_ROTACION: '/producto-stock/reportes/rotacion',
  HISTORIAL_PRECIOS: '/producto-stock/historial-precios',
} as const;

export const TRANSFERENCIA_ENDPOINTS = {
  CREATE: '/transferencias-stock',
  CREATE_MULTIPLES: '/transferencias-stock/multiples',
  LIST: '/transferencias-stock',
  DETAIL: (id: string) => `/transferencias-stock/${id}`,
  APROBAR: (id: string) => `/transferencias-stock/${id}/aprobar`,
  ENVIAR: (id: string) => `/transferencias-stock/${id}/enviar`,
  RECIBIR: (id: string) => `/transferencias-stock/${id}/recibir`,
  RECHAZAR: (id: string) => `/transferencias-stock/${id}/rechazar`,
  CANCELAR: (id: string) => `/transferencias-stock/${id}/cancelar`,
  PROCESAR_COMPLETO: (id: string) => `/transferencias-stock/${id}/procesar-completo`,
} as const;
