import type { MetodoPago, FuentePagoCompra } from '@/core/types/compra';

export type EstadoCxP = 'PENDIENTE' | 'VENCIDA' | 'PAGADA';

export interface CuentaPorPagar {
  compraId: string;
  codigo: string;
  nombreProveedor: string;
  documentoProveedor?: string | null;
  moneda: string;
  totalCompra: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaCompra: string;
  fechaVencimiento?: string | null;
  diasVencimiento?: number | null;
  estado: EstadoCxP;
  terminosPago?: string | null;
}

export interface ResumenCxP {
  totalPendiente: number;
  totalVencido: number;
  pendientePorMoneda: Record<string, number>;
  vencidoPorMoneda: Record<string, number>;
  cantidadPendientes: number;
  cantidadVencidas: number;
  totalCuentas: number;
}

export interface DeudaProveedor {
  proveedorId: string;
  nombreProveedor: string;
  documentoProveedor?: string | null;
  totalDeuda: number;
  totalVencido: number;
  cantidadCompras: number;
  cantidadVencidas: number;
  deudaPorMoneda: Record<string, number>;
}

export interface PagoRealizado {
  id: string;
  metodoPago: string;
  /** Los soles que salieron de la caja o el banco. */
  monto: number;
  /** Lo que canceló de la deuda, en la moneda de la compra. null = misma moneda. */
  montoAplicado?: number | null;
  tipoCambio?: number | null;
  fuente?: FuentePagoCompra | null;
  referencia?: string | null;
  fechaPago: string;
  comprobanteUrl?: string | null;
}

export interface CuentaPagarDetalleItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface CuentaPagarDetalle extends CuentaPorPagar {
  detalles: CuentaPagarDetalleItem[];
  pagos: PagoRealizado[];
  /** `total` × el TC de la compra, congelado: a cuánto se reconoció en soles. */
  totalSoles?: number;
  /** El TC de la FACTURA. null en una compra en soles. */
  tipoCambio?: number | null;
  /** Soles que realmente salieron de caja o banco por esta compra. */
  pagadoSoles?: number;
  /** `pagadoSoles − totalSoles`, y solo con la deuda saldada. Positivo =
   *  se pagó más caro en soles que el día de la compra (pérdida). */
  diferenciaCambio?: number;
}

export interface RegistrarPagoDto {
  metodoPago: MetodoPago;
  /** Lo que SALE de la fuente, en la moneda de esa fuente (los soles de la caja). */
  monto: number;
  /** TC del día del pago. Obligatorio si la fuente y la deuda no comparten moneda. */
  tipoCambio?: number;
  /** Lo que CANCELA de la deuda, en la moneda de la COMPRA. */
  montoAplicado?: number;
  fuente?: FuentePagoCompra;
  bancoId?: string;
  referencia?: string;
}
