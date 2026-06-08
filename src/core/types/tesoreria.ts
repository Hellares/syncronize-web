// Tesorería (Caja Central por sede) — alineado 1:1 con backend (caja module).
// Endpoints: GET /caja/tesoreria/:sedeId, /movimientos, POST /ajuste.

import type { TipoMovimientoCaja, MetodoPagoVenta, CategoriaMovimientoCaja } from './caja';

export interface TesoreriaResumen {
  caja: {
    id: string;
    codigo: string;
    sedeId: string;
    esCajaCentral?: boolean;
    fechaApertura?: string;
  };
  sede: { id: string; nombre: string; codigo?: string };
  saldoEfectivo: number;
  saldoDigital: number;
  saldoTotal: number;
  totalIngresos: number;
  totalEgresos: number;
  totalMovimientos: number;
  ultimoMovimiento?: TesoreriaMovimiento | null;
}

export interface TesoreriaMovimiento {
  id: string;
  cajaId?: string;
  empresaId?: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja | string;
  metodoPago: MetodoPagoVenta;
  monto: number;
  descripcion?: string | null;
  fechaMovimiento: string;
  anulado?: boolean;
  registradoPor?: { id: string; persona?: { nombres?: string; apellidos?: string } } | null;
  registradoPorNombre?: string | null;
  metadata?: Record<string, unknown> | null;
  venta?: { id: string; codigo: string } | null;
  compra?: { id: string; codigo: string } | null;
  devolucion?: { id: string; codigo: string } | null;
  cotizacion?: { id: string; codigo: string; estado?: string } | null;
  [key: string]: unknown;
}

export interface TesoreriaMovimientosResponse {
  items: TesoreriaMovimiento[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TesoreriaFiltros {
  tipo?: TipoMovimientoCaja;
  metodoPago?: MetodoPagoVenta;
  categoria?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface AjusteTesoreriaDto {
  tipo: TipoMovimientoCaja;
  metodoPago: MetodoPagoVenta;
  monto: number;
  descripcion: string;
  categoriaGastoId?: string;
}
