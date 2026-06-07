// --- Cotizacion Types ---

export type EstadoCotizacion = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA' | 'CONVERTIDA';

export interface CotizacionDetalle {
  id: string;
  cotizacionId: string;
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoAfectacion: string;
  porcentajeIGV: number;
  igv: number;
  icbper: number;
  subtotal: number;
  total: number;
  orden: number;
  producto?: { id: string; nombre: string; codigoEmpresa?: string; sku?: string };
  variante?: { id: string; nombre: string; sku?: string };
  servicio?: { id: string; nombre: string };
}

export interface Cotizacion {
  id: string;
  empresaId: string;
  sedeId: string;
  clienteId?: string;
  vendedorId: string;
  codigo: string;
  nombre?: string;
  nombreCliente: string;
  documentoCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  moneda: string;
  tipoCambio?: number;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  estado: EstadoCotizacion;
  observaciones?: string;
  condiciones?: string;
  ventaId?: string;
  creadoEn: string;
  actualizadoEn: string;
  detalles?: CotizacionDetalle[];
  sede?: { id: string; nombre: string };
  vendedor?: { id: string; persona?: { nombres: string; apellidos: string } };
  cliente?: { id: string; persona?: { nombres: string; apellidos: string } };
  // Campos nuevos (paridad Flutter 2026-06)
  sedeNombre?: string;
  vendedorNombre?: string;
  /** Alias del vendedor para el ticket/PDF (prioridad sobre vendedorNombre) */
  vendedorAlias?: string | null;
  /** Stock apartado para el cliente (badge Reservado verde) */
  tieneReservaActiva?: boolean;
  /** Pago adelantado registrado en caja (categoría ADELANTO_COTIZACION) */
  adelantoMonto?: number | null;
  movimientoCajaId?: string | null;
}

/** Vendedor para el ticket: alias si existe, si no el nombre (paridad Cotizacion.vendedorParaTicket Flutter) */
export function vendedorParaTicket(c: Cotizacion): string {
  if (c.vendedorAlias && c.vendedorAlias.trim()) return c.vendedorAlias;
  if (c.vendedorNombre) return c.vendedorNombre;
  const p = c.vendedor?.persona;
  return p ? `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim() : '';
}

/** Saldo pendiente considerando adelanto */
export function saldoPendienteCotizacion(c: Cotizacion): number {
  return Number(c.total) - Number(c.adelantoMonto ?? 0);
}

/** VENCIDA es computada en el front (paridad Flutter): fechaVencimiento < hoy y aún cotizable */
export function estadoEfectivoCotizacion(c: Cotizacion): EstadoCotizacion {
  if (
    (c.estado === 'BORRADOR' || c.estado === 'PENDIENTE' || c.estado === 'APROBADA') &&
    c.fechaVencimiento && new Date(c.fechaVencimiento) < new Date()
  ) {
    return 'VENCIDA';
  }
  return c.estado;
}

export interface CotizacionFiltros {
  page: number;
  limit: number;
  sedeId?: string;
  estado?: EstadoCotizacion;
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: string;
  search?: string;
}

export interface CreateCotizacionDetalleDto {
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeIGV?: number;
  /** El precio ya incluye IGV (estilo POS: S/50 → total S/50). El backend extrae el IGV en vez de sumarlo */
  precioIncluyeIgv?: boolean;
  tipoAfectacion?: string;
  icbper?: number;
}

export interface CreateCotizacionDto {
  sedeId: string;
  vendedorId: string;
  clienteId?: string;
  nombre?: string;
  nombreCliente: string;
  documentoCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  moneda?: string;
  tipoCambio?: number;
  observaciones?: string;
  condiciones?: string;
  fechaVencimiento?: string;
  detalles: CreateCotizacionDetalleDto[];
}

export interface UpdateCotizacionDto extends Partial<CreateCotizacionDto> {}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Stock validation ---
export interface StockValidationItem {
  detalleId: string;
  descripcion: string;
  productoNombre?: string;
  cantidad: number;
  stockDisponible: number;
  sinStock: boolean;
  esServicio: boolean;
}

export interface StockValidationResult {
  cotizacionId: string;
  todosConStock: boolean;
  items: StockValidationItem[];
}

// --- Compatibilidad ---
export interface CompatibilidadResult {
  compatible: boolean;
  conflictos: string[];
}

// --- Cola POS ---
export interface ColaPOSItem {
  id: string;
  codigo: string;
  estado: EstadoCotizacion;
  nombreCliente: string;
  vendedor: string;
  sede: string;
  total: number;
  moneda: string;
  totalItems: number;
  creadoEn: string;
}

// --- Convertir a Venta ---
export interface PagoDto {
  metodoPago: string;
  monto: number;
  referencia?: string;
  monedaOriginal?: string;
  montoOriginal?: number;
  tipoCambio?: number;
}

export interface CreateVentaDesdeCotizacionDto {
  metodoPago?: string;
  montoRecibido?: number;
  esCredito?: boolean;
  plazoCredito?: number;
  numeroCuotas?: number;
  fechaVencimientoPago?: string;
  observaciones?: string;
  tipoComprobante?: string;
  tipoDocumentoCliente?: string;
  condicionPago?: string;
  pagos?: PagoDto[];
  excluirDetalleIds?: string[];
  ajustarCantidades?: Record<string, number>;
}

// Estado colors/labels
export const ESTADO_COTIZACION_CONFIG: Record<EstadoCotizacion, { label: string; color: string; bg: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100' },
  PENDIENTE: { label: 'Pendiente', color: 'text-orange-600', bg: 'bg-orange-100' },
  APROBADA: { label: 'Aprobada', color: 'text-green-600', bg: 'bg-green-100' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-600', bg: 'bg-red-100' },
  VENCIDA: { label: 'Vencida', color: 'text-gray-500', bg: 'bg-gray-200' },
  CONVERTIDA: { label: 'Convertida', color: 'text-blue-600', bg: 'bg-blue-100' },
};
