// Shapes 1:1 con los return de VentaAnalyticsService (backend
// src/venta/analytics/) — GET /ventas/analytics/dashboard consolidado.

export type PeriodoAgrupacion = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

export interface AnalyticsQuery {
  sedeId?: string;
  fechaInicio?: string; // YYYY-MM-DD
  fechaFin?: string;
  canalVenta?: string;
  conEnvio?: 'true' | 'false';
  categoriaId?: string;
  periodo?: PeriodoAgrupacion;
  limit?: string;
}

export interface AnalyticsResumen {
  totalVentas: number;
  montoTotal: number;
  promedioPorVenta: number;
  ventasBorrador: number;
  ventasPagadasCompleta: number;
  ticketPromedio: number;
  ventasAnuladas: number;
  montoAnulado: number;
  devoluciones: number;
  itemsDevueltos: number | string;
  utilidadBruta: number;
  margenPorcentaje: number;
}

export interface AnalyticsPeriodoRow { periodo: string; total: number; cantidad: number }

export interface AnalyticsVarianteRow { varianteId: string | null; nombre: string; cantidadVendida: number; ingresoTotal: number }

export interface AnalyticsProductoRow {
  productoId: string;
  nombre: string;
  codigo: string;
  categoriaId: string | null;
  categoria: string;
  cantidadVendida: number;
  ingresoTotal: number;
  margenTotal: number;
  margenPorcentaje: number;
  precioPromedio: number;
  variantes: AnalyticsVarianteRow[];
}

export interface AnalyticsClienteRow { clienteId: string | null; nombre: string; totalCompras: number; montoTotal: number }

export interface AnalyticsComparativo {
  periodoActual: { fechaInicio: string; fechaFin: string; totalVentas: number; montoTotal: number };
  periodoAnterior: { fechaInicio: string; fechaFin: string; totalVentas: number; montoTotal: number };
  diferencia: number;
  porcentajeCambio: number;
}

export interface AnalyticsAlerta { tipo: string; mensaje: string; datos: unknown }

export interface AnalyticsPorCanal {
  porCanal: Array<{ canal: string; cantidad: number; monto: number }>;
  porEnvio: Array<{ conEnvio: boolean; cantidad: number; monto: number }>;
}

export interface AnalyticsAgrupadoRow {
  cantidadVendida: number;
  ingresoTotal: number;
  productosDistintos: number;
}
export interface AnalyticsCategoriaRow extends AnalyticsAgrupadoRow { categoriaId: string | null; categoria: string }
export interface AnalyticsMarcaRow extends AnalyticsAgrupadoRow { marcaId: string | null; marca: string }
export interface AnalyticsProveedorRow extends AnalyticsAgrupadoRow { proveedorId: string | null; proveedor: string }

export interface AnalyticsEntregas {
  porTipoEntrega: Array<{ tipo: 'ENVIO' | 'DELIVERY' | 'RECOJO' | 'FISICA'; cantidad: number; monto: number }>;
  zonasEnvio: Array<{ zona: string; cantidad: number; monto: number }>;
  zonasDelivery: Array<{ zona: string; cantidad: number; monto: number }>;
}

export interface AnalyticsMetodoPagoRow { metodo: string; cantidad: number; monto: number }

export interface AnalyticsHorasPico {
  porHora: Array<{ hora: number; cantidad: number; monto: number }>;
  porDiaSemana: Array<{ dia: number; cantidad: number; monto: number }>; // 1=Lun … 7=Dom
}

export interface AnalyticsReposicionRow {
  productoId: string;
  varianteId: string | null;
  nombre: string;
  ventaDiaria: number;
  stockActual: number;
  diasCobertura: number;
  nivel: 'CRITICO' | 'BAJO' | 'OK';
  sugeridoComprar: number;
}

export interface AnalyticsProyeccion {
  suficiente: boolean;
  diasHistoria: number;
  ventasActual: number;
  diasTranscurridos?: number;
  diasEnMes?: number;
  proyeccionCierre?: number;
  proyeccionMin?: number;
  proyeccionMax?: number;
  mesAnterior?: number;
  variacionPct?: number | null;
}

export interface AnalyticsPorEmisor {
  emisores: Array<{ ruc: string; razonSocial: string; esPrincipal: boolean; ventas: number; monto: number }>;
  sinComprobante: { ventas: number; monto: number };
  multiEmisor: boolean;
}

/** GET /ventas/analytics/dashboard — las 17 secciones en una respuesta */
export interface VentaAnalyticsDashboard {
  resumen: AnalyticsResumen;
  ventasPeriodo: AnalyticsPeriodoRow[];
  topProductos: AnalyticsProductoRow[];
  menosVendidos: AnalyticsProductoRow[];
  topClientes: AnalyticsClienteRow[];
  comparativo: AnalyticsComparativo;
  alertas: AnalyticsAlerta[];
  porCanal: AnalyticsPorCanal;
  porCategoria: AnalyticsCategoriaRow[];
  porMarca: AnalyticsMarcaRow[];
  porProveedor: AnalyticsProveedorRow[];
  entregas: AnalyticsEntregas;
  metodosPago: AnalyticsMetodoPagoRow[];
  horasPico: AnalyticsHorasPico;
  reposicion: AnalyticsReposicionRow[];
  proyeccion: AnalyticsProyeccion;
  porEmisor: AnalyticsPorEmisor;
}

export const CANAL_LABEL: Record<string, string> = {
  POS: 'Mostrador',
  ONLINE: 'Marketplace',
  WHATSAPP_IA: 'Agente IA',
  COTIZACION: 'Cotización',
};

export const TIPO_ENTREGA_LABEL: Record<string, string> = {
  ENVIO: '🚚 Envío agencia',
  DELIVERY: '🛵 Delivery',
  RECOJO: '🏬 Recojo en tienda',
  FISICA: 'Venta física',
};
