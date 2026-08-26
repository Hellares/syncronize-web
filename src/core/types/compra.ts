import type { UnidadMedidaRef } from './producto';

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

/** Lo que el detalle trae del producto/variante de la linea. Alcanza para
 *  REABRIR la linea en el formulario en la unidad en que se escribio. */
export interface DetalleProductoRef {
  id?: string;
  nombre?: string;
  factorCompra?: number | string | null;
  unidadCompra?: UnidadMedidaRef | null;
  factorPresentacion?: number | string | null;
  unidadPresentacion?: UnidadMedidaRef | null;
  unidadMedida?: UnidadMedidaRef | null;
}

export interface CompraDetalleItem {
  id: string;
  productoId?: string | null;
  varianteId?: string | null;
  /** Linea que vino de una orden de compra. Viaja de vuelta al editar o
   *  confirmar deja de descontar lo recibido de la orden. */
  ordenCompraDetalleId?: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  descuento?: number | string;
  porcentajeIGV?: number | string;
  subtotal: number | string;
  total: number | string;
  producto?: DetalleProductoRef | null;
  variante?: DetalleProductoRef | null;
  // Snapshot empaque variable (cantidad/precio SIEMPRE en unidad atómica; esto es la doble vista)
  usaUnidadCompra?: boolean;
  cantidadOriginal?: number | string | null;
  unidadOriginalSimbolo?: string | null;
  factorAplicado?: number | string | null;
  nuevoPrecioVenta?: number | string | null;
  loteId?: string | null;
  /** Flete/gastos que le tocaron a ESTA linea al confirmar. Ya esta sumado al
   *  costo del lote: se muestra para explicar por que el costo subio. */
  gastoProrrateado?: number | string | null;
}

/** Gasto de la factura que no es un producto: flete, movilidad, embalaje. */
export interface CompraGastoItem {
  id: string;
  concepto: string;
  monto: number | string;
  porcentajeIGV: number | string;
  igv: number | string;
  base: number | string;
  /** false = solo suma al total (interes, multa): NO toca el costo. */
  prorratea: boolean;
  criterio: 'VALOR' | 'CANTIDAD';
  /** Categoria del catalogo de gastos (la misma de caja chica). 🔴 Viaja de
   *  vuelta al editar: guardar REEMPLAZA la lista de gastos, y un gasto que
   *  vuelve sin categoria deja de sumar en el reporte. */
  categoriaGastoId?: string | null;
  categoriaGasto?: { id: string; nombre: string; icono?: string | null; color?: string | null } | null;
  orden: number;
}

export const TIPOS_DOC_PROVEEDOR = ['FACTURA', 'BOLETA', 'GUIA', 'TICKET'] as const;
export type TipoDocProveedor = typeof TIPOS_DOC_PROVEEDOR[number];

export interface CompraDetalle extends CompraListItem {
  /** El detalle si los trae (el listado no siempre): son los que necesita el
   *  formulario para reabrir el borrador en el proveedor y la sede correctos. */
  proveedorId?: string;
  sedeId?: string;
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
  /** Suma de los gastos, prorrateen o no. Ya viene dentro de `total`. */
  totalGastos?: number | string;
  gastos?: CompraGastoItem[];
}

/** GET /productos/:id/historial-compras — shape exacto de producto-trazabilidad.service */
export interface HistorialCompraRow {
  compraId: string;
  codigo: string;
  fecha: string;
  proveedorId?: string | null;
  proveedor: string;
  moneda: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  /** total/cantidad — el costo real por unidad base */
  costoUnitario: number;
  usaUnidadCompra?: boolean;
  cantidadOriginal?: number | null;
  unidadOriginalSimbolo?: string | null;
}

export interface HistorialProveedorAgg {
  proveedorId?: string | null;
  proveedor: string;
  veces: number;
  cantidadAcum: number;
  costoPromedio: number;
  ultimoCosto?: number | null;
  ultimaFecha?: string | null;
}

export interface HistorialComprasProducto {
  compras: HistorialCompraRow[];
  proveedores: HistorialProveedorAgg[];
  ultimoCosto?: number | null;
  mejorProveedorId?: string | null;
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
  descuento?: number;
  /** Solo al EDITAR: sin el, el backend recalcula con el 18 por defecto y una
   *  linea exonerada cambia sola de impuesto. */
  porcentajeIGV?: number;
  /** Solo al EDITAR: conserva el vinculo con la linea de la orden de compra. */
  ordenCompraDetalleId?: string;
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
  gastos?: CrearCompraGasto[];
}

/** Edicion de una compra en BORRADOR. El backend hace MERGE: lo que no va,
 *  se conserva; `detalles` y `gastos` se reemplazan ENTEROS si vienen. */
export type ActualizarCompraInput = Partial<CrearCompraInput>;

export interface CrearCompraGasto {
  concepto: string;
  monto: number;
  /** 0 = el monto es todo base (el caso normal: el flete viene sin IGV). */
  porcentajeIGV?: number;
  /** default true: se reparte entre las lineas y sube su costo. */
  prorratea?: boolean;
  criterio?: 'VALOR' | 'CANTIDAD';
  categoriaGastoId?: string | null;
  orden?: number;
}
