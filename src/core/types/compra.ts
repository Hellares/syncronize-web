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
}

export interface CompraDetalle extends CompraListItem {
  subtotal: number | string;
  descuento: number | string;
  impuestos: number | string;
  serieDocumentoProveedor?: string | null;
  numeroDocumentoProveedor?: string | null;
  detalles: CompraDetalleItem[];
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

export interface CrearCompraInput {
  sedeId: string;
  proveedorId: string;
  moneda: string;
  terminosPago?: string;
  fechaRecepcion?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  detalles: CrearCompraLinea[];
}
