// --- Cotizacion Types ---

export type EstadoCotizacion = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA' | 'CONVERTIDA';

/** Estado de la reserva de stock por línea (null = nunca reservó) */
export type ReservaCotizacionEstado = 'ACTIVA' | 'LIBERADA' | 'CONVERTIDA';

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
  /** Precio antes de nivel por mayor / VIP (informativo, para "Cliente ahorra") */
  precioRegular?: number | null;
  /** Precio antes de oferta pública (chip "En oferta") */
  precioAntesOferta?: number | null;
  /** ACTIVA = stock apartado; en CONVERTIDA, LIBERADA = línea excluida de la venta */
  reservaEstado?: ReservaCotizacionEstado | null;
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
  /** Solo en el LISTADO: cuantas lineas tiene, sin traerlas. El detalle se
   *  pide con `getCotizacion` al desplegar la fila. */
  _count?: { detalles?: number };
  sede?: { id: string; nombre: string };
  vendedor?: { id: string; aliasTicket?: string | null; persona?: { nombres: string; apellidos: string } };
  cliente?: { id: string; persona?: { nombres: string; apellidos: string } };
  // Campos nuevos (paridad Flutter 2026-06)
  sedeNombre?: string;
  vendedorNombre?: string;
  /** Alias del vendedor para el ticket/PDF (prioridad sobre vendedorNombre) */
  vendedorAlias?: string | null;
  /** Stock apartado para el cliente (badge Reservado verde) */
  tieneReservaActiva?: boolean;
  /** Pago adelantado registrado en caja (categoría ADELANTO_COTIZACION); Yape marketplace acumula aquí */
  adelantoMonto?: number | null;
  movimientoCajaId?: string | null;
  /** Adelanto que la empresa PIDE para separar en marketplace (se paga con Yape al aceptar) */
  adelantoRequerido?: number | null;
  clienteEmpresaId?: string | null;
  comprobanteId?: string | null;
  /** Venta resultante (estado CONVERTIDA) */
  venta?: { id: string; codigo?: string; total?: number } | null;
  /** Origen marketplace (respuesta a una solicitud de cotización) */
  solicitudOrigen?: Array<{ id: string; codigo?: string }> | null;
}

/** Vendedor para el ticket: alias si existe, si no el nombre (paridad Cotizacion.vendedorParaTicket Flutter) */
export function vendedorParaTicket(c: Cotizacion): string {
  if (c.vendedorAlias && c.vendedorAlias.trim()) return c.vendedorAlias;
  // 🔴 El backend NO manda `vendedorAlias` plano: el alias viene anidado en
  // `vendedor.aliasTicket`. Sin este caso el alias no se veia nunca y siempre
  // salia el nombre completo, que es justo lo que el alias evita.
  const alias = c.vendedor?.aliasTicket;
  if (alias && alias.trim()) return alias;
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
  /** Precio antes de nivel por mayor / VIP (se envía cuando hubo rebaja por nivel) */
  precioRegular?: number;
  /** Precio antes de oferta pública (informativo) */
  precioAntesOferta?: number;
}

export interface CreateCotizacionDto {
  sedeId: string;
  vendedorId: string;
  /** Cliente PERSONA (EmpresaPersona). Excluyente con `clienteEmpresaId`. */
  clienteId?: string;
  /**
   * Cliente EMPRESA (ClienteEmpresa).
   *
   * 🔴 Son tablas distintas con su propia FK: mandar el id de una empresa como
   * `clienteId` hace fallar el create con 500
   * (`Cotizacion_clienteId_fkey`).
   */
  clienteEmpresaId?: string;
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
  /** Apartar stock del catálogo (incrementa ProductoStock.stockReservadoCotizacion, detalles ACTIVA) */
  reservarStock?: boolean;
  /** Adelanto que deja el cliente (>0 crea MovimientoCaja ADELANTO_COTIZACION — requiere cajaId) */
  adelantoMonto?: number;
  /** Caja abierta donde se registra el adelanto */
  cajaId?: string;
  /** Adelanto que se pedirá en marketplace para separar (pago Yape al aceptar) */
  adelantoRequerido?: number;
}

export type UpdateCotizacionDto = Partial<CreateCotizacionDto>;

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
  /** Badge verde Reservado (stock apartado) */
  tieneReservaActiva?: boolean;
  /** Badge rojo VENCIDA (cobrable pero fuera de vigencia) */
  vencida?: boolean;
  adelantoMonto?: number | null;
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

export interface ItemAdicionalDto {
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeIGV?: number;
  precioIncluyeIgv?: boolean;
  tipoAfectacion?: string;
  icbper?: number;
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
  /** Ajuste de descuento por línea al cobrar (detalleId → monto) */
  ajustarDescuentos?: Record<string, number>;
  itemsAdicionales?: ItemAdicionalDto[];
  // Descuento global con autorización (admin se auto-autoriza; otros roles vía /auth/autorizar-operacion)
  descuentoGlobal?: number;
  descuentoGlobalPorcentaje?: number;
  descuentoAutorizadoPorId?: string;
  /** Requerido si alguna línea queda con margen negativo y NO está en liquidación */
  ventaBajoCostoAutorizadaPorId?: string;
  // Override de cliente al cobrar (ej. FACTURA con RUC)
  clienteId?: string;
  clienteEmpresaId?: string;
  nombreCliente?: string;
  documentoCliente?: string;
  direccionCliente?: string;
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
