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
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
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
  pagos?: Array<{ id: string; monto: number; metodoPago: string; fechaPago: string; anulado?: boolean; fuente?: string | null }>;
  numeroCuotas?: number;
  totalMora: number;
  cuotas?: CuotaCxC[];
  proximaCuota?: ProximaCuota | null;
}

/** Fuente del INGRESO del abono (espejo de FuentePagoCompra): a dónde entra el dinero */
export type FuenteIngreso = 'TESORERIA' | 'CAJA' | 'BANCO';

/** POST /cuentas-por-cobrar/:ventaId/abono — imputación en cascada mora → interés → principal */
export interface RegistrarAbonoDto {
  metodoPago: string;
  monto: number;
  referencia?: string;
  banco?: string;
  /** Default backend: EFECTIVO→TESORERIA, digital→BANCO */
  fuente?: FuenteIngreso;
  /** Obligatorio si fuente=BANCO */
  bancoId?: string;
}

/** GET /cuentas-por-cobrar/por-cliente — shape real del backend (getPorCliente):
 *  agrupa por documento/nombre, separa deuda por moneda y NO trae IDs de cliente. */
export interface DeudaCliente {
  nombre: string;
  documento: string | null;
  deudaPorMoneda: Record<string, number>;
  cantidad: number;
  cantidadVencidas: number;
}

/** GET /cuentas-por-cobrar/estado-cuenta-cliente (espejo estado_cuenta_cliente.dart) */
export interface EstadoCuentaCliente {
  cliente: {
    id?: string | null;
    tipo: 'PERSONA' | 'EMPRESA';
    nombre: string | null;
    documento: string | null;
  };
  resumen: {
    saldoPendiente: number;
    totalVendido: number;
    totalAbonado: number;
    totalMora: number;
    cantidadVentas: number;
    ventasConSaldo: number;
  };
  ventas: VentaCreditoEC[];
  abonos: AbonoEC[];
}

export interface VentaCreditoEC {
  ventaId: string;
  codigo: string;
  fechaVenta?: string | null;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoCuenta;
  fechaVencimiento?: string | null;
  diasVencimiento?: number | null;
  numeroCuotas?: number;
  totalMora: number;
}

export interface AbonoEC {
  id: string;
  monto: number;
  metodoPago: string;
  fuente?: string | null;
  fechaPago?: string | null;
  ventaCodigo?: string | null;
}

export interface TopDeudor {
  nombre: string;
  /** Suma de los saldos pendientes, no el total facturado. */
  total: number;
  /** Cuántas ventas a crédito sin saldar tiene. */
  cantidad: number;
  /** Para abrir su estado de cuenta. Nulo en ventas a público general. */
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
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
