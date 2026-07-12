export type EstadoCompra = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'TARJETA';
export type FuentePagoCompra = 'TESORERIA' | 'CAJA' | 'BANCO';

export interface CompraListItem {
  id: string;
  codigo: string;
  nombreProveedor: string;
  documentoProveedor?: string | null;
  total: number | string;
  moneda: string;
  estado: EstadoCompra;
  terminosPago?: string | null;
  pagoPendiente: boolean;
  fechaRecepcion: string;
  sede?: { id: string; nombre: string } | null;
  proveedor?: { id: string; nombre: string; codigo: string } | null;
}

export interface CompraDetalleItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
  total: number | string;
  // Snapshot empaque variable (cantidad/precio SIEMPRE en unidad atómica; esto es la doble vista)
  usaUnidadCompra?: boolean;
  cantidadOriginal?: number | string | null;
  unidadOriginalSimbolo?: string | null;
  factorAplicado?: number | string | null;
  nuevoPrecioVenta?: number | string | null;
  loteId?: string | null;
}

export const TIPOS_DOC_PROVEEDOR = ['FACTURA', 'BOLETA', 'GUIA', 'TICKET'] as const;
export type TipoDocProveedor = typeof TIPOS_DOC_PROVEEDOR[number];

export interface CompraDetalle extends CompraListItem {
  subtotal: number | string;
  descuento: number | string;
  impuestos: number | string;
  tipoDocumentoProveedor?: string | null;
  serieDocumentoProveedor?: string | null;
  numeroDocumentoProveedor?: string | null;
  diasCredito?: number | null;
  fechaVencimientoPago?: string | null;
  observaciones?: string | null;
  /** true (default backend): los precios de las líneas YA incluyen IGV (se extrae, no se suma) */
  precioIncluyeIgv?: boolean;
  detalles: CompraDetalleItem[];
}

/** GET /productos/:id/historial-compras — última(s) compras del producto (hint de costo) */
export interface HistorialCompraProducto {
  compraId?: string;
  compraCodigo?: string;
  proveedorNombre?: string | null;
  cantidad?: number;
  precioUnitario?: number | string;
  fechaRecepcion?: string;
  [key: string]: unknown;
}

export interface PagoContadoCompra {
  metodoPago: MetodoPago;
  fuente?: FuentePagoCompra;
  bancoId?: string;
  monto?: number;
  referencia?: string;
}

export interface BancoEmpresa {
  id: string;
  nombreBanco: string;
  numeroCuenta: string;
  moneda?: string | null;
  saldoActual?: number | null;
  esPrincipal?: boolean;
  isActive?: boolean;
}

export interface ComprasFiltros {
  estado?: EstadoCompra;
  proveedorId?: string;
  sedeId?: string;
  search?: string;
  limit?: number;
}

export interface CrearCompraLinea {
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Empaque variable: cantidad/precio vienen en unidad de COMPRA; el backend convierte con el factor */
  usaUnidadCompra?: boolean;
  /** Override puntual del factor solo para esta compra (ej: saco de 40 en vez de 50) */
  factorCompra?: number;
  /** Ajusta el precio de venta del producto al confirmar la compra (+ historial) */
  nuevoPrecioVenta?: number;
}

// ─── Órdenes de Compra (PO) + recepción ─────────────────────────────────────

export type EstadoOrdenCompra = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';

export const ESTADO_OC_CONFIG: Record<EstadoOrdenCompra, { label: string; style: string }> = {
  BORRADOR: { label: 'Borrador', style: 'bg-gray-100 text-gray-600' },
  PENDIENTE: { label: 'Pendiente', style: 'bg-amber-50 text-amber-700' },
  APROBADA: { label: 'Aprobada', style: 'bg-blue-50 text-blue-700' },
  PARCIAL: { label: 'Recibida parcial', style: 'bg-indigo-50 text-indigo-700' },
  COMPLETADA: { label: 'Completada', style: 'bg-green-50 text-green-700' },
  CANCELADA: { label: 'Cancelada', style: 'bg-red-50 text-red-500' },
};

export interface OrdenCompraDetalle {
  id: string;
  productoId?: string | null;
  varianteId?: string | null;
  descripcion: string;
  /** Unidad atómica (el backend convierte si se envió usaUnidadCompra) */
  cantidad: number;
  precioUnitario: number | string;
  descuento?: number | string;
  porcentajeIGV?: number | string;
  igv?: number | string;
  subtotal?: number | string;
  total?: number | string;
  // Empaque variable (snapshots)
  usaUnidadCompra?: boolean;
  cantidadOriginal?: number | string | null;
  unidadOriginalSimbolo?: string | null;
  factorAplicado?: number | string | null;
  // Tracking de recepción
  cantidadRecibida?: number;
  cantidadPendiente?: number;
  orden?: number;
  producto?: { id: string; nombre: string; codigoEmpresa?: string } | null;
  variante?: { id: string; nombre: string; sku?: string } | null;
}

export interface OrdenCompra {
  id: string;
  codigo: string;
  empresaId: string;
  sedeId: string;
  proveedorId: string;
  nombreProveedor: string;
  documentoProveedor?: string | null;
  terminosPago?: string | null;
  diasCredito?: number | null;
  moneda: string;
  tipoCambio?: number | null;
  subtotal: number | string;
  descuento: number | string;
  impuestos: number | string;
  total: number | string;
  fechaEmision: string;
  fechaEntregaEsperada?: string | null;
  fechaAprobacion?: string | null;
  estado: EstadoOrdenCompra;
  observaciones?: string | null;
  condiciones?: string | null;
  detalles?: OrdenCompraDetalle[];
  sede?: { id: string; nombre: string } | null;
  compras?: Array<{ id: string; codigo: string; estado: EstadoCompra }>;
  [key: string]: unknown;
}

export interface CrearOrdenCompraLinea {
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeIGV?: number;
  /** cantidad/precio en unidad de COMPRA — el backend convierte a atómica */
  usaUnidadCompra?: boolean;
}

export interface CrearOrdenCompraInput {
  sedeId: string;
  proveedorId: string;
  terminosPago?: string;
  diasCredito?: number;
  moneda?: string;
  tipoCambio?: number;
  fechaEntregaEsperada?: string;
  observaciones?: string;
  condiciones?: string;
  detalles: CrearOrdenCompraLinea[];
}

/** POST /compras/desde-orden-compra — recepción (parcial o total) de una OC */
export interface LineaRecepcionOc {
  ordenCompraDetalleId: string;
  cantidad: number;
  /** Si difiere del precio de la OC */
  precioUnitario?: number;
  nuevoPrecioVenta?: number;
}

export interface CrearCompraDesdeOcInput {
  ordenCompraId: string;
  tipoDocumentoProveedor?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  terminosPago?: string;
  diasCredito?: number;
  fechaVencimientoPago?: string;
  fechaRecepcion?: string;
  moneda?: string;
  tipoCambio?: number;
  observaciones?: string;
  lineas: LineaRecepcionOc[];
}

export interface CrearCompraInput {
  sedeId: string;
  proveedorId: string;
  moneda: string;
  terminosPago?: string;
  /** Días de crédito (términos PERSONALIZADO) */
  diasCredito?: number;
  fechaRecepcion?: string;
  tipoDocumentoProveedor?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  observaciones?: string;
  /** default backend true: los precios YA incluyen IGV (se extrae en vez de sumarse) */
  precioIncluyeIgv?: boolean;
  detalles: CrearCompraLinea[];
}
