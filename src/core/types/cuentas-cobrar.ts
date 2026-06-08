// Cuentas por Cobrar (accounts receivable) — alineado 1:1 con backend
// (src/cuentas-por-cobrar: controller + service). Pago vía /ventas/:id/pago (venta-service).

export type EstadoCuenta = 'PENDIENTE' | 'VENCIDA' | 'PAGADA';

export interface CuotaCxC {
  id: string;
  numero: number;
  monto: number;
  montoPagado: number;
  saldoPendiente: number;
  fechaVencimiento: string;
  estado: string; // PENDIENTE | PAGADA_PARCIAL | VENCIDA | PAGADA | COMPLETADO
  montoMora: number;
  diasVencido?: number;
  montoInteres?: number;
  montoPrincipal?: number;
  montoPagadoPrincipal?: number;
  montoPagadoInteres?: number;
  montoPagadoMora?: number;
  [key: string]: unknown;
}

export interface ProximaCuota {
  id: string;
  numero: number;
  monto: number;
  saldoPendiente: number;
  fechaVencimiento: string;
  estado: string;
}

export interface CuentaPorCobrar {
  ventaId: string;
  codigo: string;
  nombreCliente: string;
  documentoCliente?: string | null;
  telefonoCliente?: string | null;
  sedeNombre?: string | null;
  moneda?: string;
  totalVenta: number;
  totalPagado: number;
  saldoPendiente: number;
  plazoCredito?: number;
  fechaVenta?: string;
  fechaVencimiento?: string | null;
  diasVencimiento?: number | null;
  estado: EstadoCuenta;
  pagos?: Array<{ id: string; monto: number; metodoPago: string; fechaPago: string }>;
  numeroCuotas?: number;
  totalMora: number;
  cuotas?: CuotaCxC[];
  proximaCuota?: ProximaCuota | null;
}

export interface TopDeudor {
  nombre: string;
  total: number;
  cantidad: number;
}

export interface ResumenCuentasCobrar {
  totalPendiente: number;
  totalVencido: number;
  totalMora: number;
  totalInteres: number;
  cantidadPendientes: number;
  cantidadVencidas: number;
  cantidadPagadas: number;
  totalCuentas: number;
  topDeudores: TopDeudor[];
  proximasVencer: CuentaPorCobrar[];
}

export interface ConfiguracionMora {
  moraHabilitada: boolean;
  porcentajeMoraDiario: number; // ej. 0.05 = 5% diario
  moraMaximaPorcentaje: number; // tope, ej. 30
  diasGraciaMora: number;
}

export interface CuentasCobrarFiltros {
  estado?: EstadoCuenta;
  clienteId?: string;
  sedeId?: string;
  search?: string;
}

export const ESTADO_CUENTA_CONFIG: Record<EstadoCuenta, { label: string; text: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', text: 'text-amber-700', bg: 'bg-amber-100' },
  VENCIDA: { label: 'Vencida', text: 'text-red-700', bg: 'bg-red-100' },
  PAGADA: { label: 'Pagada', text: 'text-green-700', bg: 'bg-green-100' },
};
