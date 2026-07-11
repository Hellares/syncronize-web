// --- Caja (V1) — contratos del backend /caja/* ---

export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO';
export type TipoArqueoCaja = 'RUTINARIO' | 'SORPRESIVO' | 'RELEVO';

export type MetodoPagoVenta =
  | 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'CREDITO' | 'MIXTO';

export type CategoriaMovimientoCaja =
  | 'VENTA' | 'PEDIDO_MARKETPLACE' | 'COMPRA' | 'DEVOLUCION'
  | 'ADELANTO_SERVICIO' | 'ADELANTO_COTIZACION' | 'DEVOLUCION_ADELANTO_COTIZACION'
  | 'OTRO_INGRESO' | 'PAGO_PROVEEDOR' | 'GASTO_OPERATIVO' | 'OTRO_EGRESO'
  | 'REPOSICION_CAJA_CHICA' | 'DEPOSITO_AGENTE' | 'RETIRO_AGENTE' | 'COMISION_AGENTE'
  | 'PAGO_PLANILLA' | 'ADELANTO_EMPLEADO' | 'BONIFICACION_EMPLEADO'
  | 'DEPOSITO_TESORERIA' | 'RETIRO_TESORERIA' | 'REVERSO_CAJA_CERRADA' | 'AJUSTE_TESORERIA';

export const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
  MIXTO: 'Mixto',
};

export const CATEGORIA_MOVIMIENTO_LABEL: Record<string, string> = {
  VENTA: 'Venta',
  PEDIDO_MARKETPLACE: 'Pedido Marketplace',
  COMPRA: 'Compra',
  DEVOLUCION: 'Devolución',
  ADELANTO_SERVICIO: 'Adelanto de servicio',
  ADELANTO_COTIZACION: 'Adelanto de cotización',
  DEVOLUCION_ADELANTO_COTIZACION: 'Dev. adelanto cotización',
  OTRO_INGRESO: 'Otro ingreso',
  PAGO_PROVEEDOR: 'Pago a proveedor',
  GASTO_OPERATIVO: 'Gasto operativo',
  OTRO_EGRESO: 'Otro egreso',
  REPOSICION_CAJA_CHICA: 'Reposición caja chica',
  DEPOSITO_AGENTE: 'Depósito agente',
  RETIRO_AGENTE: 'Retiro agente',
  COMISION_AGENTE: 'Comisión agente',
  PAGO_PLANILLA: 'Pago planilla',
  ADELANTO_EMPLEADO: 'Adelanto empleado',
  BONIFICACION_EMPLEADO: 'Bonificación empleado',
  DEPOSITO_TESORERIA: 'Depósito tesorería',
  RETIRO_TESORERIA: 'Retiro tesorería',
  REVERSO_CAJA_CERRADA: 'Reverso caja cerrada',
  AJUSTE_TESORERIA: 'Ajuste tesorería',
};

/** Categorías que el cajero puede usar en movimientos MANUALES
 *  (paridad CategoriaMovimientoCaja.porTipo de Flutter: todo lo no-tesorería;
 *  el backend valida polaridad y rechaza las solo-sistema) */
export const CATEGORIAS_INGRESO_MANUAL: CategoriaMovimientoCaja[] = [
  'VENTA', 'PEDIDO_MARKETPLACE', 'ADELANTO_SERVICIO', 'ADELANTO_COTIZACION', 'OTRO_INGRESO',
];
export const CATEGORIAS_EGRESO_MANUAL: CategoriaMovimientoCaja[] = [
  'COMPRA', 'DEVOLUCION', 'DEVOLUCION_ADELANTO_COTIZACION', 'PAGO_PROVEEDOR',
  'GASTO_OPERATIVO', 'OTRO_EGRESO', 'REPOSICION_CAJA_CHICA', 'ADELANTO_EMPLEADO', 'PAGO_PLANILLA',
];

/** Categorías que permiten una categoría de gasto personalizada (dropdown condicional) */
export const CATEGORIAS_CON_GASTO_PERSONALIZADO: CategoriaMovimientoCaja[] = [
  'GASTO_OPERATIVO', 'OTRO_EGRESO', 'OTRO_INGRESO',
];

/** Categoría de gasto personalizada (GET /categorias-gasto?tipo=) */
export interface CategoriaGasto {
  id: string;
  nombre: string;
  tipo: TipoMovimientoCaja;
  isActive?: boolean;
}

/** Denominaciones de billetes/monedas para el desglose de efectivo (S/) */
export const DENOMINACIONES_PEN = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1] as const;

// --- Entidades ---

export interface Caja {
  id: string;
  empresaId: string;
  sedeId: string;
  codigo?: string;
  usuarioId?: string;
  cajeroId?: string;
  estado: EstadoCaja;
  montoApertura: number;
  fechaApertura: string;
  fechaCierre?: string | null;
  observaciones?: string | null;
  observacionesCierre?: string | null;
  sedeFacturacionId?: string | null;
  sede?: { id: string; nombre: string };
  usuario?: { id: string; email?: string; persona?: { nombres?: string; apellidos?: string } };
  cajeroNombre?: string;
  // Totales (presentes en historial/monitor según endpoint)
  totalIngresos?: number;
  totalEgresos?: number;
  saldoEsperado?: number;
  diferencia?: number;
  [key: string]: unknown;
}

export interface MovimientoCaja {
  id: string;
  cajaId: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  metodoPago: MetodoPagoVenta;
  monto: number;
  descripcion?: string | null;
  categoriaGastoId?: string | null;
  categoriaGastoNombre?: string | null;
  esManual?: boolean;
  fechaMovimiento: string;
  // Referencias cruzadas
  ventaId?: string | null;
  ventaCodigo?: string | null;
  pedidoCodigo?: string | null;
  devolucionId?: string | null;
  devolucionCodigo?: string | null;
  compraId?: string | null;
  compraCodigo?: string | null;
  cotizacionId?: string | null;
  cotizacionCodigo?: string | null;
  ordenServicioId?: string | null;
  ordenServicioCodigo?: string | null;
  registradoPorNombre?: string | null;
  anulado?: boolean;
  motivoAnulacion?: string | null;
  /** Contrapartida EGRESO autogenerada al anular una venta (nace anulada — no filtrar por anulado al sumar) */
  esContrapartida?: boolean;
  anuladoPorNombre?: string | null;
  metadata?: { cierreId?: string; movimientoEspejoId?: string; esReversoCajaCerrada?: boolean } | null;
  [key: string]: unknown;
}

/** GET /caja/:id/resumen (shape exacto del backend) */
export interface ResumenCaja {
  totalIngresos: number;
  totalEgresos: number;
  /** ingresos − egresos, TODOS los métodos */
  saldo: number;
  /** Solo EFECTIVO + apertura */
  saldoEfectivo: number;
  detalles: Array<{
    metodoPago: MetodoPagoVenta;
    totalIngresos: number;
    totalEgresos: number;
    saldo: number;
  }>;
  /** Informativo (no suma): egresos por anulación de venta */
  egresoAnulacionVenta?: number;
  cantidadAnulaciones?: number;
  egresosPorCategoria?: Array<{
    categoria: CategoriaMovimientoCaja;
    label?: string;
    total: number;
    cantidad: number;
  }>;
  [key: string]: unknown;
}

export interface DetalleCierreMetodo {
  apertura?: number;
  ingresos: number;
  egresos: number;
  esperado: number;
  conteoFisico: number;
  diferencia: number;
}

/** Cierre devuelto por POST /caja/:id/cerrar → { caja, cierre } */
export interface CierreCaja {
  totalIngresos: number;
  totalEgresos: number;
  totalEsperado: number;
  totalConteoFisico: number;
  diferencia: number;
  observaciones?: string | null;
  creadoEn?: string;
  detallePorMetodoPago?: Record<string, DetalleCierreMetodo>;
}

export interface ArqueoCaja {
  id: string;
  cajaId: string;
  tipo: TipoArqueoCaja;
  montoApertura?: number;
  totalIngresos?: number;
  totalEgresos?: number;
  totalEsperado?: number;
  totalConteoFisico?: number;
  diferencia?: number;
  detalles?: Array<DetalleCierreMetodo & { metodoPago?: MetodoPagoVenta }>;
  observaciones?: string | null;
  desgloseEfectivo?: Record<string, number> | null;
  realizadoPorId?: string;
  realizadoPorNombre?: string;
  autorizadoPorId?: string | null;
  autorizadoPorNombre?: string | null;
  turnoEntregadoAId?: string | null;
  turnoEntregadoANombre?: string | null;
  alertaEnviada?: boolean;
  fechaArqueo: string;
  [key: string]: unknown;
}

/** GET /caja/monitor (admin) */
export interface CajaMonitorData {
  resumen: {
    totalCajasAbiertas: number;
    totalIngresos: number;
    totalEgresos: number;
    totalSaldo: number;
    totalSaldoEfectivo: number;
  };
  cajas: Array<{
    id: string;
    codigo?: string;
    sedeId: string;
    sedeNombre?: string;
    usuarioNombre?: string;
    montoApertura: number;
    fechaApertura: string;
    totalIngresos: number;
    totalEgresos: number;
    saldoActual: number;
    saldoEfectivo: number;
    totalMovimientos: number;
    ultimoMovimiento?: {
      tipo: TipoMovimientoCaja;
      categoria: string;
      monto: number;
      descripcion?: string | null;
      fechaMovimiento: string;
    } | null;
  }>;
}

/** GET /caja/:id/auditoria */
export interface CajaAuditoria {
  caja: Caja;
  resumenActual?: ResumenCaja & { saldoActual?: number; detallesPorMetodo?: ResumenCaja['detalles'] };
  cierre?: CierreCaja | null;
  arqueos?: ArqueoCaja[];
  movimientos?: MovimientoCaja[];
  [key: string]: unknown;
}

// --- DTOs (contratos exactos del backend) ---

export interface AbrirCajaDto {
  sedeId: string;
  montoApertura: number;
  observaciones?: string;
  /** Sede/RUC emisor por defecto para facturación */
  sedeFacturacionId?: string;
}

export interface CrearMovimientoCajaDto {
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  metodoPago: MetodoPagoVenta;
  monto: number;
  descripcion?: string;
  /** Categoría de gasto personalizada */
  categoriaGastoId?: string;
}

export interface ConteoMetodoPagoDto {
  metodoPago: MetodoPagoVenta;
  conteoFisico: number;
}

export interface CerrarCajaDto {
  conteos: ConteoMetodoPagoDto[];
  observaciones?: string;
  /** Desglose de billetes/monedas (denominación → cantidad); su suma debe cuadrar con el conteo EFECTIVO (tolerancia 1 centavo) */
  desgloseEfectivo?: Record<string, number>;
}

export interface AnularMovimientoCajaDto {
  /** De /auth/autorizar-operacion (o el propio usuario si es admin/gerente) */
  autorizadoPorId: string;
  motivo: string;
}

/** Threshold del fix floating-point: diferencias menores se consideran cuadre exacto */
export const DIFERENCIA_THRESHOLD = 0.005;
