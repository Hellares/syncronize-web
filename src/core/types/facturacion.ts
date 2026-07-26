// Tipos de Facturación Electrónica (SUNAT) — paridad Flutter, alineado 1:1 con backend.
// Verificado contra: src/sunat/sunat.controller.ts, comunicacion-baja.controller.ts,
// resumen-diario.controller.ts y facturacion.service.ts.

// ── Proveedor / entorno ──

export type ProveedorFacturacion = 'NUBEFACT' | 'SYNCROFACT';
export type EntornoFacturacion = 'BETA' | 'PRODUCCION';

export const PROVEEDOR_LABEL: Record<ProveedorFacturacion, string> = {
  NUBEFACT: 'Nubefact',
  SYNCROFACT: 'Syncrofact',
};

/** Nubefact quedó archivado: read-only, no emite nuevos comprobantes. */
export const PROVEEDOR_ARCHIVADO: Record<ProveedorFacturacion, boolean> = {
  NUBEFACT: true,
  SYNCROFACT: false,
};

/** Sólo Syncrofact requiere companyId/branchId en proveedorConfig. */
export const PROVEEDOR_REQUIERE_COMPANY_BRANCH: Record<ProveedorFacturacion, boolean> = {
  NUBEFACT: false,
  SYNCROFACT: true,
};

// ── Configuración efectiva (GET /sunat/configuracion) ──

export interface ConfiguracionFacturacion {
  ruc: string | null;
  razonSocial: string | null;
  direccionFiscal: string | null;
  nombreComercial: string | null;
  logo: string | null;
  telefono: string | null;
  email: string | null;
  emailFacturacion: string | null;
  proveedorActivo: ProveedorFacturacion;
  proveedorRuta: string | null;
  proveedorToken: string | null;
  proveedorConfig: Record<string, unknown> | null;
  facturacionActiva: boolean;
  resolucionSunat: string | null;
  entorno: EntornoFacturacion;
  porcentajeIGV: number;
  textoPiePagina: string;
}

/** Body de PUT /sunat/configuracion — todos opcionales (parche). */
export interface UpdateConfiguracionFacturacionDto {
  proveedorActivo?: ProveedorFacturacion;
  proveedorRuta?: string;
  proveedorToken?: string;
  proveedorConfig?: Record<string, unknown>;
  facturacionActiva?: boolean;
  emailFacturacion?: string;
  entorno?: EntornoFacturacion;
  resolucionSunat?: string;
}

/** Body de POST /sunat/configuracion/probar (no persiste, no requiere auth previa). */
export interface ProbarConexionDto {
  proveedorActivo: ProveedorFacturacion;
  proveedorRuta: string;
  proveedorToken: string;
  proveedorConfig?: Record<string, unknown>;
}

export interface BranchProbado {
  branchIdProveedor: number | string;
  codigo: string;
  nombre: string;
  totalSeries: number;
}

export interface ProbarConexionResponse {
  ok: boolean;
  proveedor: ProveedorFacturacion;
  mensaje: string;
  branches?: BranchProbado[];
  error?: string;
}

// ── Emisores (GET /sunat/emisores) ──

export interface Emisor {
  id: string | null; // null = emisor principal (empresa), id = EmisorFacturacion socio
  tipo: 'EMPRESA' | 'EMISOR';
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  sedeNombre: string | null;
  activo: boolean;
  /** Sede cuyas series representan al emisor PRINCIPAL (los socios no la usan). */
  sedeIdSeries: string | null;
}

// ── Comprobantes (GET /sunat/comprobantes) ──

export type TipoComprobante = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'GUIA_REMISION';

/** Estado SUNAT. PENDIENTE/ERROR_COMUNICACION = re-enviables. PROCESANDO = consultables. */
export type SunatStatus =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'ERROR_COMUNICACION'
  | string;

export interface ComprobanteItem {
  id: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  correlativo: string;
  codigoGenerado: string; // "F001-00000001"
  nombreCliente: string | null;
  numeroDocumento: string | null;
  fechaEmision: string;
  moneda: string;
  total: number;
  estado: string; // BORRADOR|REGISTRADO|ACEPTADO|RECHAZADO|ANULADO
  sunatStatus: SunatStatus;
  sunatHash: string | null;
  enviadoAProveedor: boolean;
  errorProveedor: string | null;
  intentosEnvio: number;
  enlaceProveedor: string | null;
  sunatPdfUrl: string | null;
  anulado: boolean;
  motivoNota: string | null;
  tipoNotaCredito: number | null;
  tipoNotaDebito: number | null;
  comprobanteOrigenId: string | null;
  ventaId: string | null;
  sedeId: string | null;
  /** RUC con el que se emitió (multi-RUC: principal o socio) */
  rucEmisor: string | null;
  proveedorEmisor: ProveedorFacturacion | null;
}

export interface ListarComprobantesParams {
  tipo?: TipoComprobante;
  sunatStatus?: SunatStatus;
  /** Multi-RUC: filtra por el RUC emisor del comprobante */
  rucEmisor?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface ListarComprobantesResponse {
  data: ComprobanteItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EnviarPendientesResponse {
  total: number;
  enviados: number;
  errores: number;
}

export interface ConsultarPendientesResponse {
  total: number;
  procesados: number;
  pendientesRestantes: number;
  truncado: boolean;
  actualizados: number;
  aunProcesando: number;
  noEncontrados: number;
  errores: { comprobanteId: string; error: string }[];
}

export const TIPO_COMPROBANTE_LABEL: Record<string, string> = {
  FACTURA: 'Factura',
  BOLETA: 'Boleta',
  NOTA_CREDITO: 'Nota de Crédito',
  NOTA_DEBITO: 'Nota de Débito',
  GUIA_REMISION: 'Guía de Remisión',
};

/** Colores de badge por estado SUNAT (Tailwind text/bg). */
export const SUNAT_STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  ACEPTADO: { label: 'Aceptado', text: 'text-green-700', bg: 'bg-green-100' },
  PROCESANDO: { label: 'Procesando', text: 'text-blue-700', bg: 'bg-blue-100' },
  PENDIENTE: { label: 'Sin enviar', text: 'text-amber-700', bg: 'bg-amber-100' },
  ERROR_COMUNICACION: { label: 'Error', text: 'text-red-700', bg: 'bg-red-100' },
  RECHAZADO: { label: 'Rechazado', text: 'text-red-700', bg: 'bg-red-100' },
};

// ── Notas de crédito / débito ──

export type TipoNota = 'NOTA_CREDITO' | 'NOTA_DEBITO';

/** GET /sunat/catalogos/motivos-nota?tipo= */
export interface MotivoNota {
  codigo: number;       // 1..12 (lo que va en CrearNotaDto.tipoNota)
  codigoString: string; // "01".."12"
  descripcion: string;
}

export interface CrearNotaItem {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  precioUnitario: number;
  tipoAfectacion?: string;
  igv?: number;
  icbper?: number;
  subtotal?: number;
  total?: number;
}

/** Body POST /sunat/comprobantes/:id/nota-credito|nota-debito */
export interface CrearNotaDto {
  sedeId: string;
  tipoNota: number; // codigo del motivo
  motivo: string;   // 3..250
  items?: CrearNotaItem[]; // vacío = copia todos los del original
}

// ── Anulación: CDB (facturas) / RC (boletas) ──

export type EstadoSunatBaja = 'PENDIENTE' | 'ENVIADO' | 'PROCESANDO' | 'ACEPTADO' | 'RECHAZADO' | string;

export interface ComunicacionBaja {
  id: string;
  numeroCompleto: string; // "RA-20260426-001"
  serie?: string;
  correlativo?: string | number;
  fechaEmision: string;
  fechaReferencia: string;
  motivoBaja?: string;
  estadoSunat: EstadoSunatBaja;
  ticket?: string | null;
  errorProveedor?: string | null;
  cdrUrl?: string | null;
  xmlUrl?: string | null;
}

/** Body POST /sunat/comunicaciones-baja */
export interface CrearComunicacionBajaDto {
  sedeId: string;
  fechaReferencia: string; // YYYY-MM-DD, máx 7 días atrás
  motivoBaja: string;      // 3..500
  detalles: { comprobanteId: string; motivoEspecifico: string }[];
}

export interface ResumenDiario {
  id: string;
  numeroCompleto: string; // "RC-20260429-001"
  serie?: string;
  correlativo?: string | number;
  fechaEmision: string;
  fechaReferencia: string;
  motivoAnulacion?: string;
  estadoSunat: EstadoSunatBaja;
  ticket?: string | null;
  errorProveedor?: string | null;
  cdrUrl?: string | null;
  xmlUrl?: string | null;
}

/** Body POST /sunat/resumenes-diarios */
export interface CrearResumenDiarioDto {
  sedeId: string;
  motivoAnulacion: string; // 3..500
  detalles: { comprobanteId: string; motivoEspecifico: string }[];
}

// ── Sincronización de series (GET /sunat/series/preview) ──

export type AccionDiff =
  | 'EN_SINCRONIA'
  | 'ACTUALIZAR_CORRELATIVO'
  | 'REEMPLAZAR_SERIE'
  | 'CREAR_NUEVA'
  | 'CONFLICTO'
  | 'NO_EMITIBLE';

export interface DiffSerie {
  tipoDocumento: string;       // "01", "03", ...
  tipoDocumentoNombre: string; // "Factura", ...
  serieLocal: string | null;
  correlativoLocal: number | null;
  serieProveedor: string | null;
  correlativoProveedor: number | null;
  proximoNumeroProveedor: string | null;
  accion: AccionDiff;
  mensaje?: string;
  comprobantesEmitidosLocalmente: number;
}

export interface BranchPreviewInfo {
  branchIdProveedor: string | number;
  codigo: string;
  nombre: string;
  esActualDeLaSede: boolean;
  diffs: DiffSerie[];
}

export interface SincronizacionPreview {
  empresaId: string;
  sedeId: string;
  sedeNombre: string;
  rucEmpresa: string | null;
  proveedorActivo: string;
  seriesSincronizadasEn: string | null;
  branches: BranchPreviewInfo[];
  metadata?: Record<string, unknown>;
}

export interface SeleccionSerie {
  tipoDocumento: string;
  serieProveedor: string;
  correlativoProveedor: number;
  accion: 'APLICAR' | 'OMITIR';
}

/** Body POST /sunat/series/sincronizar */
export interface AplicarSincronizacionDto {
  sedeId: string;
  selecciones: SeleccionSerie[];
  branchIdProveedor?: string | number;
}

export interface ResultadoSincronizacion {
  aplicados: number;
  omitidos: number;
  rechazados: number;
  sedeId: string;
  branchIdProveedor?: string | number | null;
  cambios: {
    tipoDocumento: string;
    campoSerie: string;
    campoContador: string;
    serieAntes: string | null;
    serieDespues: string;
    correlativoAntes: number | null;
    correlativoDespues: number;
    accion: AccionDiff;
  }[];
  errores: string[];
}

/** Etiquetas + estilo por acción de diff (para la UI de sincronización). */
export const ACCION_DIFF_CONFIG: Record<AccionDiff, { label: string; text: string; bg: string; aplicable: boolean }> = {
  EN_SINCRONIA: { label: 'En sincronía', text: 'text-green-700', bg: 'bg-green-50', aplicable: false },
  ACTUALIZAR_CORRELATIVO: { label: 'Actualizar correlativo', text: 'text-blue-700', bg: 'bg-blue-50', aplicable: true },
  REEMPLAZAR_SERIE: { label: 'Reemplazar serie', text: 'text-amber-700', bg: 'bg-amber-50', aplicable: true },
  CREAR_NUEVA: { label: 'Crear nueva', text: 'text-indigo-700', bg: 'bg-indigo-50', aplicable: true },
  CONFLICTO: { label: 'Conflicto', text: 'text-red-700', bg: 'bg-red-50', aplicable: false },
  NO_EMITIBLE: { label: 'No emitible', text: 'text-gray-500', bg: 'bg-gray-50', aplicable: false },
};

// ── Reporte de correlativos (GET /sunat/reporte-correlativos) ──

export interface SerieCorrelativo {
  serie: string;
  tipoComprobante: string;
  sedeId: string | null;
  sedeNombre: string;
  primerCorrelativo: number;
  ultimoCorrelativo: number;
  contadorSede: number;
  totalEmitidos: number;
  totalAnulados: number;
  duplicados: number;
  faltantes: number[];
  totalFaltantes: number;
  desincronizado: boolean;
  estado: 'OK' | 'GAPS' | 'DESINCRONIZADO' | string;
}

export interface ReporteCorrelativos {
  series: SerieCorrelativo[];
  resumen: {
    totalSeries: number;
    seriesOk: number;
    seriesConGaps: number;
    seriesDesincronizadas: number;
    totalFaltantes: number;
  };
}
