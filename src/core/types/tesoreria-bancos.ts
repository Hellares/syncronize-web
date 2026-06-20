import type { BancoEmpresa } from '@/core/types/compra';

export interface BovedaSede {
  sedeId: string;
  sedeNombre: string | null;
  cajaId: string;
  saldoEfectivo: number;
  saldoDigitalHistorico: number;
}

export interface ConsolidadoBanco extends BancoEmpresa {
  metodos: string[];
  recaudadoPorMetodo: Record<string, number>;
}

export interface ConsolidadoTesoreria {
  bovedas: BovedaSede[];
  totalEfectivo: number;
  totalDigitalHistorico: number;
  bancos: ConsolidadoBanco[];
  bancosPorMoneda: Record<string, number>;
  recaudadoPorMetodo: Record<string, number>;
}

export interface MovimientoBanco {
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  detalle?: string | null;
  monto: number;
  origen: string; // RECAUDACION | PAGO_COMPRA | PAGO_GASTO | CONCILIACION | AJUSTE_MANUAL
}

export interface EstadoCuentaBanco {
  cuenta: { id: string; nombreBanco: string; numeroCuenta: string; moneda: string; saldoActual: number };
  resumen: { totalIngresos: number; totalEgresos: number; neto: number; cantidad?: number };
  recaudadoPorMetodo: Record<string, number>;
  movimientos: MovimientoBanco[];
}

export interface AjusteBancoItem {
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  motivo: string;
  origen: string;
  creadoEn: string;
  saldoAnterior?: number;
  saldoNuevo?: number;
}

export interface CrearBancoDto {
  nombreBanco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  moneda?: string;
}

export interface CuentaRecaudacion {
  metodoPago: string;
  metodoLabel?: string;
  bancoId?: string | null;
  banco?: { id: string; nombreBanco: string; numeroCuenta: string; moneda: string } | null;
}

export type { BancoEmpresa };
