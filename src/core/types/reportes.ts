// Reportes / analytics — alineado con backend (ventas/analytics + resumen-financiero).

export type PeriodoAgrupacion = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

export interface AnalyticsFiltros {
  sedeId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  periodo?: PeriodoAgrupacion;
}

export interface ResumenVentas {
  totalVentas: number;
  montoTotal: number;
  promedioPorVenta: number;
  ventasBorrador: number;
  ventasPagadasCompleta: number;
  ticketPromedio: number;
}

export interface VentaPeriodo {
  periodo: string;
  total: number;
  cantidad: number;
}

export interface TopProducto {
  productoId: string;
  nombre: string;
  codigo: string;
  cantidadVendida: number;
  ingresoTotal: number;
  precioPromedio: number;
}

export interface TopCliente {
  clienteId: string | null;
  nombre: string;
  totalCompras: number;
  montoTotal: number;
}

// ── Resumen financiero ──

export interface ResumenFinancieroBloque {
  cantidad: number;
  totalVentas?: number;
  totalCobrado?: number;
  pendienteCobro?: number;
  ventasContado?: number;
  ventasCredito?: number;
  totalCompras?: number;
  totalPagado?: number;
  pendientePago?: number;
  [key: string]: unknown;
}

export interface ResumenFinanciero {
  periodo: { desde: string; hasta: string };
  resumen: { totalIngresos: number; totalEgresos: number; flujoNeto: number };
  ventas: ResumenFinancieroBloque;
  compras: ResumenFinancieroBloque;
  cuentasPorCobrar?: Record<string, unknown>;
  cuentasPorPagar?: Record<string, unknown>;
  caja?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Punto diario de ingresos vs egresos (claves flexibles según backend). */
export interface PuntoGraficoDiario {
  fecha?: string;
  date?: string;
  ingresos: number;
  egresos: number;
  [key: string]: unknown;
}
