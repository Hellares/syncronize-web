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
  monto: number;
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
}

export interface RegistrarPagoDto {
  metodoPago: MetodoPago;
  monto: number;
  fuente?: FuentePagoCompra;
  bancoId?: string;
  referencia?: string;
}
