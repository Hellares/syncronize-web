import type { PaginatedResponse, MotivoLiquidacion } from './producto';

export type { PaginatedResponse, MotivoLiquidacion };

// --- Enums ---

export type TipoMovimientoStock =
  | 'ENTRADA_COMPRA' | 'SALIDA_DEVOLUCION_PROVEEDOR' | 'AJUSTE_ENTRADA_COMPRA'
  | 'SALIDA_VENTA' | 'ENTRADA_DEVOLUCION_CLIENTE' | 'AJUSTE_SALIDA_VENTA'
  | 'RESERVA_VENTA' | 'LIBERAR_RESERVA_VENTA' | 'RESERVA_COMBO' | 'LIBERAR_RESERVA_COMBO'
  | 'ENTRADA_TRANSFERENCIA' | 'SALIDA_TRANSFERENCIA'
  | 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA' | 'AJUSTE_MERMA' | 'AJUSTE_REPARACION'
  | 'AJUSTE_PERDIDA' | 'AJUSTE_ENCONTRADO' | 'SALIDA_BAJA'
  | 'ENTRADA_GARANTIA' | 'SALIDA_GARANTIA' | 'RETORNO_GARANTIA'
  | 'ENTRADA_AJUSTE' | 'SALIDA_AJUSTE'
  | 'ENTRADA_DEVOLUCION' | 'SALIDA_MERMA' | 'SALIDA_ROBO' | 'SALIDA_DONACION';

export type EstadoTransferencia =
  | 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'EN_TRANSITO'
  | 'RECIBIDA' | 'RECHAZADA' | 'CANCELADA';

export type EstadoItemTransferencia =
  | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ENVIADO'
  | 'RECIBIDO' | 'RECIBIDO_PARCIAL';

// --- Producto Stock ---

export interface ProductoStockProducto {
  id: string;
  nombre: string;
  sku?: string;
  codigoEmpresa: string;
  codigoBarras?: string;
  imagenes?: string[];
  archivos?: Array<{ id: string; url: string; urlThumbnail?: string }>;
  categoria?: { id: string; nombre: string };
  marca?: { id: string; nombre: string };
}

export interface ProductoStockVariante {
  id: string;
  nombre: string;
  sku: string;
  codigoEmpresa: string;
}

export interface ProductoStock {
  id: string;
  sedeId: string;
  productoId?: string;
  varianteId?: string;
  empresaId: string;
  // Stock
  stockActual: number;
  stockReservado: number;
  stockReservadoVenta: number;
  stockReservadoCombo: number;
  stockDanado: number;
  stockEnGarantia: number;
  // Config
  stockMinimo?: number;
  stockMaximo?: number;
  ubicacion?: string;
  // Precios
  precio?: number;
  precioCosto?: number;
  precioOferta?: number;
  enOferta: boolean;
  fechaInicioOferta?: string;
  fechaFinOferta?: string;
  // Liquidación (remate bajo costo, requiere autorización gerencial)
  enLiquidacion?: boolean;
  precioLiquidacion?: number;
  motivoLiquidacion?: MotivoLiquidacion;
  observacionesLiquidacion?: string;
  fechaInicioLiquidacion?: string;
  fechaFinLiquidacion?: string;
  liquidacionAutorizadaPorId?: string;
  precioConfigurado: boolean;
  precioIncluyeIgv: boolean;
  // Relaciones
  producto?: ProductoStockProducto;
  variante?: ProductoStockVariante;
  sede?: { id: string; nombre: string; codigo: string };
  // Timestamps
  creadoEn: string;
  actualizadoEn: string;
}

// Computed helpers
export function stockDisponible(s: ProductoStock): number {
  return s.stockActual - s.stockReservado;
}

export function stockDisponibleVenta(s: ProductoStock): number {
  return s.stockActual - s.stockReservado - s.stockReservadoVenta - s.stockReservadoCombo - s.stockDanado - s.stockEnGarantia;
}

export function stockComprometido(s: ProductoStock): number {
  return s.stockReservado + s.stockReservadoVenta + s.stockReservadoCombo;
}

export function stockNoVendible(s: ProductoStock): number {
  return s.stockDanado + s.stockEnGarantia;
}

export function esBajoMinimo(s: ProductoStock): boolean {
  return s.stockMinimo != null && s.stockMinimo > 0 && stockDisponibleVenta(s) <= s.stockMinimo && stockDisponibleVenta(s) > 0;
}

export function esCritico(s: ProductoStock): boolean {
  return stockDisponibleVenta(s) <= 0;
}

// Semántica idéntica a Flutter (producto_stock.dart:234-268):
// inicio inclusivo, fin exclusivo; fecha fin null = sin vencimiento.
export function isOfertaActiva(s: ProductoStock): boolean {
  if (!s.enOferta || s.precioOferta == null) return false;
  const now = new Date();
  if (s.fechaInicioOferta && now < new Date(s.fechaInicioOferta)) return false;
  if (s.fechaFinOferta && now > new Date(s.fechaFinOferta)) return false;
  return true;
}

export function isLiquidacionActiva(s: ProductoStock): boolean {
  if (!s.enLiquidacion || s.precioLiquidacion == null) return false;
  const now = new Date();
  if (s.fechaInicioLiquidacion && now < new Date(s.fechaInicioLiquidacion)) return false;
  if (s.fechaFinLiquidacion && now > new Date(s.fechaFinLiquidacion)) return false;
  return true;
}

// Prioridad: liquidación > oferta > precio base (niveles aplican por cantidad en la venta, no aquí)
export function precioEfectivo(s: ProductoStock): number | undefined {
  if (!s.precioConfigurado || s.precio == null) return undefined;
  if (isLiquidacionActiva(s) && s.precioLiquidacion != null) return s.precioLiquidacion;
  if (isOfertaActiva(s) && s.precioOferta != null) return s.precioOferta;
  return s.precio;
}

export function nombreProductoStock(s: ProductoStock): string {
  if (s.variante) return s.variante.nombre;
  return s.producto?.nombre ?? 'Producto desconocido';
}

export function skuProductoStock(s: ProductoStock): string {
  if (s.variante) return s.variante.sku;
  return s.producto?.sku ?? s.producto?.codigoEmpresa ?? '';
}

// --- Movimiento Stock (Kardex) ---

export interface MovimientoStock {
  id: string;
  sedeId: string;
  productoStockId: string;
  empresaId: string;
  tipo: TipoMovimientoStock;
  tipoDocumento?: string;
  numeroDocumento?: string;
  cantidadAnterior: number;
  cantidad: number;
  cantidadNueva: number;
  motivo?: string;
  observaciones?: string;
  transferenciaId?: string;
  usuarioId?: string;
  usuarioNombre?: string;
  ventaCodigo?: string;
  compraCodigo?: string;
  transferenciaCodigo?: string;
  devolucionCodigo?: string;
  // Valoración (snapshot al momento del movimiento; null en movs previos a la mig de valoración)
  precioCostoUnitario?: number | null;
  valorMovimiento?: number | null;
  costoManoObra?: number | null;
  creadoEn: string;
}

export interface ResumenMovimiento {
  tipo: TipoMovimientoStock;
  totalEntradas: number;
  totalSalidas: number;
  cantidadMovimientos: number;
}

export interface KardexResponse {
  movimientos: MovimientoStock[];
  resumen: ResumenMovimiento[];
}

// --- Transferencia Stock ---

export interface TransferenciaItem {
  id: string;
  transferenciaId: string;
  empresaId: string;
  productoId?: string;
  varianteId?: string;
  productoNombre?: string;
  varianteNombre?: string;
  cantidadSolicitada: number;
  cantidadAprobada: number;
  cantidadEnviada: number;
  cantidadRecibida: number;
  estado: EstadoItemTransferencia;
  motivo?: string;
  observaciones?: string;
}

export interface TransferenciaStock {
  id: string;
  empresaId: string;
  sedeOrigenId: string;
  sedeDestinoId: string;
  codigo: string;
  estado: EstadoTransferencia;
  totalItems: number;
  itemsAprobados: number;
  itemsRechazados: number;
  itemsRecibidos: number;
  motivo?: string;
  observaciones?: string;
  solicitadoPorId?: string;
  solicitadoPorNombre?: string;
  aprobadoPorId?: string;
  aprobadoPorNombre?: string;
  recibidoPorId?: string;
  recibidoPorNombre?: string;
  fechaSolicitud?: string;
  fechaAprobacion?: string;
  fechaEnvio?: string;
  fechaRecepcion?: string;
  creadoEn: string;
  actualizadoEn: string;
  sedeOrigen?: { id: string; nombre: string; codigo: string };
  sedeDestino?: { id: string; nombre: string; codigo: string };
  items?: TransferenciaItem[];
}

// --- Monitor de productos (F5) ---

export interface MonitorEstadisticas {
  totalProductos: number;
  totalProductoStock: number;
  conStock: number;
  sinStock: number;
  bajoMinimo: number;
  conPrecio: number;
  sinPrecio: number;
  conPrecioCosto: number;
  sinPrecioCosto: number;
  conUbicacion: number;
  sinUbicacion: number;
  visibleMarketplace: number;
  noVisibleMarketplace: number;
  precioIncluyeIgv: number;
  precioNoIncluyeIgv: number;
  enOferta: number;
  conImagen: number;
  sinImagen: number;
  conBarcode: number;
  sinBarcode: number;
  porcentajeCatalogoCompleto: number;
  listosParaVenta: number;
}

export interface MonitorProductoAlerta {
  /** productoStock ID */
  id: string;
  productoId: string;
  nombre: string;
  codigoEmpresa?: string;
  sedeNombre?: string;
  ubicacion?: string;
  stockActual: number;
  precio?: number;
}

export interface MonitorResponse {
  estadisticas: MonitorEstadisticas;
  alertas: Record<string, MonitorProductoAlerta[]>;
}

// --- Incidencias de transferencias (F5) ---

export type TipoIncidenciaTransferencia =
  | 'FALTANTE' | 'DANADO' | 'CALIDAD_RECHAZADA' | 'EXCEDENTE' | 'EMPAQUE_DANADO' | 'PRODUCTO_INCORRECTO';

export type AccionResolucionIncidencia =
  | 'DEVOLVER_ORIGEN' | 'DAR_DE_BAJA' | 'REPARAR' | 'ACEPTAR_CON_DESCUENTO' | 'RECLAMAR_PROVEEDOR';

export interface TransferenciaIncidencia {
  id: string;
  empresaId: string;
  transferenciaId: string;
  transferenciaItemId: string;
  tipo: TipoIncidenciaTransferencia;
  cantidadAfectada: number;
  descripcion?: string | null;
  evidenciasUrls?: string[];
  observaciones?: string | null;
  resuelto: boolean;
  fechaResolucion?: string | null;
  accionTomada?: string | null;
  reportadoPor?: string;
  reportadoPorNombre?: string;
  resueltoPorNombre?: string;
  creadoEn: string;
  transferencia?: { id: string; codigo: string; sedeOrigen?: { nombre: string }; sedeDestino?: { nombre: string } };
  item?: { id: string; productoId?: string; varianteId?: string; producto?: { nombre: string }; variante?: { nombre: string } };
}

export interface IncidenciaItemDto {
  tipo: TipoIncidenciaTransferencia;
  cantidadAfectada: number;
  descripcion?: string;
  evidenciasUrls?: string[];
}

export interface RecibirItemConIncidenciasDto {
  itemId: string;
  /** Cantidad recibida en buen estado (vendible). + suma(incidencias) debe ser ≤ enviada */
  cantidadRecibidaBuenEstado: number;
  incidencias?: IncidenciaItemDto[];
  ubicacion?: string;
  observaciones?: string;
}

export interface RecibirTransferenciaConIncidenciasDto {
  items: RecibirItemConIncidenciasDto[];
  observacionesGenerales?: string;
  /** true = marca la transferencia como completamente recibida */
  marcarComoCompletada?: boolean;
}

export interface ResolverIncidenciaDto {
  accion: AccionResolucionIncidencia;
  observaciones?: string;
}

export const TIPO_INCIDENCIA_LABEL: Record<TipoIncidenciaTransferencia, string> = {
  FALTANTE: 'Faltante',
  DANADO: 'Dañado',
  CALIDAD_RECHAZADA: 'Calidad rechazada',
  EXCEDENTE: 'Excedente',
  EMPAQUE_DANADO: 'Empaque dañado',
  PRODUCTO_INCORRECTO: 'Producto incorrecto',
};

export const ACCION_RESOLUCION_LABEL: Record<AccionResolucionIncidencia, string> = {
  DEVOLVER_ORIGEN: 'Devolver a origen (transferencia inversa)',
  DAR_DE_BAJA: 'Dar de baja (eliminar del inventario)',
  REPARAR: 'Reparar (mover a garantía)',
  ACEPTAR_CON_DESCUENTO: 'Aceptar con descuento (mover a vendible)',
  RECLAMAR_PROVEEDOR: 'Reclamar a proveedor (gestión externa)',
};

// --- Alertas ---

export interface AlertasResponse {
  total: number;
  criticos: number;
  productos: ProductoStock[];
}

// --- Reportes ---

export interface ReporteMerma {
  resumen: { totalDanado: number; totalPerdido: number };
  movimientos: MovimientoStock[];
}

export interface ReporteValorizacion {
  valorTotal: number;
  stockTotal: number;
  porSede: Array<{ sedeId: string; sedeNombre: string; valor: number; stock: number }>;
  topProductos: Array<{ nombre: string; stock: number; costo: number; valorTotal: number }>;
}

export interface SugerenciaReorden {
  productoNombre: string;
  productoId: string;
  varianteId?: string;
  stockActual: number;
  stockMinimo: number;
  cantidadSugerida: number;
  valorEstimado: number;
  sedeNombre: string;
}

export interface ReporteRotacion {
  totalProductos: number;
  resumen: { altaRotacion: number; mediaRotacion: number; bajaRotacion: number; sinMovimiento: number };
  productos: Array<{
    nombre: string;
    productoId: string;
    clasificacion: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_MOVIMIENTO';
    unidadesVendidas: number;
    rotacionIndex: number;
  }>;
}

// --- DTOs ---

export interface AjustarStockDto {
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
  observaciones?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

// Auditoría de cambios de precio (enum TipoCambioPrecioSede del backend)
export type TipoCambioPrecioSede =
  | 'MANUAL' | 'OFERTA' | 'COSTO' | 'MASIVO'
  | 'AJUSTE_MERCADO' | 'COMPETENCIA' | 'CORRECCION';

export interface UpdatePreciosStockDto {
  precio?: number | null;
  precioCosto?: number | null;
  precioOferta?: number | null;
  enOferta?: boolean;
  fechaInicioOferta?: string | null;
  fechaFinOferta?: string | null;
  precioIncluyeIgv?: boolean;
  tipoCambio?: TipoCambioPrecioSede;
  razon?: string;
  ubicacion?: string;
  stockMinimo?: number;
  stockMaximo?: number;
}

// --- Liquidación (F2) ---

export interface ActivarLiquidacionDto {
  precioLiquidacion: number;
  motivoLiquidacion: MotivoLiquidacion;
  /** ID del usuario que autoriza (de /auth/autorizar-operacion o el propio si es admin/gerente) */
  autorizadoPorId: string;
  /** ISO. Si se omite, vigente hasta desactivación manual */
  fechaFin?: string;
  /** Obligatorio si motivo = OTRO */
  observaciones?: string;
}

export interface AutorizarOperacionDto {
  dni: string;
  password: string;
  operacion: string;
  motivo?: string;
}

export interface AutorizacionResponse {
  authorized: boolean;
  autorizadoPorId: string;
  autorizadoPorNombre: string;
}

// --- Historial de precios (F2) ---

export type TipoCambioPrecio =
  | 'MANUAL' | 'OFERTA' | 'OFERTA_ACTIVADA' | 'OFERTA_DESACTIVADA'
  | 'COSTO' | 'COSTO_ACTUALIZADO' | 'MASIVO' | 'AJUSTE_MASIVO'
  | 'AJUSTE_MERCADO' | 'COMPETENCIA' | 'CORRECCION' | 'LIQUIDACION';

// Registro de ProductoPrecioHistorialSede (pares anterior/nuevo + auditoría)
export interface HistorialPrecioSede {
  id: string;
  productoStockId: string;
  sedeId: string;
  precioAnterior?: number | null;
  precioNuevo?: number | null;
  precioCostoAnterior?: number | null;
  precioCostoNuevo?: number | null;
  precioOfertaAnterior?: number | null;
  precioOfertaNuevo?: number | null;
  tipoCambio: TipoCambioPrecio;
  razon?: string | null;
  origenModulo?: string | null;
  usuarioId: string;
  creadoEn: string;
  sede?: { id: string; nombre: string };
  usuario?: { id: string; email?: string; persona?: { nombres?: string; apellidos?: string } };
  productoStock?: {
    id: string;
    productoId?: string;
    varianteId?: string;
    producto?: { id: string; nombre: string; codigoEmpresa: string };
    variante?: { id: string; nombre: string; sku: string };
  };
}

export interface HistorialGlobalResponse {
  data: HistorialPrecioSede[];
  meta: { limit: number; hasNext: boolean; nextCursor: string | null };
}

export interface HistorialGlobalFiltros {
  sedeId?: string;
  productoId?: string;
  fechaInicio?: string; // YYYY-MM-DD
  fechaFin?: string;    // YYYY-MM-DD
  tipoCambio?: TipoCambioPrecio;
  search?: string;
  cursor?: string;
  limit?: number;
}

// --- Ajuste masivo de precios (F2, contrato = AjusteMasivoPreciosDto backend) ---

export interface AjusteMasivoPreciosDto {
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  aplicarA: 'PRECIO' | 'PRECIO_COSTO';
  operacion: 'AUMENTAR' | 'DISMINUIR';
  /** Si se omite, aplica a todos los productos de la sede */
  productoIds?: string[];
  excluirCombos?: boolean;
  soloCombos?: boolean;
}

// --- Verificación de precios (F2) ---

export type CampoPrecioVerificacion = 'PRECIO' | 'COSTO' | 'OFERTA' | 'LIQUIDACION';
export type ModoVerificacion = 'RANGO' | 'EXACTO' | 'SIN_VALOR';
export type ComparacionPrecio = 'PERDIDA' | 'SIN_MARGEN' | 'MARGEN_BAJO' | 'SIN_COSTO';

export interface VerificacionPrecioItem {
  id: string;
  productoId?: string | null;
  varianteId?: string | null;
  codigoEmpresa?: string | null;
  nombre: string;
  sedeId: string;
  sedeNombre: string;
  stockActual: number;
  precio?: number | null;
  precioCosto?: number | null;
  precioOferta?: number | null;
  precioLiquidacion?: number | null;
  enOferta: boolean;
  enLiquidacion?: boolean;
  precioConfigurado: boolean;
}

export interface VerificacionPreciosResponse {
  total: number;
  limitAlcanzado: boolean;
  items: VerificacionPrecioItem[];
}

export interface VerificacionPreciosFiltros {
  sedeId?: string;
  campo?: CampoPrecioVerificacion;
  modo?: ModoVerificacion;
  min?: number;
  max?: number;
  exacto?: number;
  empresaCategoriaId?: string;
  empresaMarcaId?: string;
  stock?: 'CON' | 'SIN' | 'AMBOS';
  soloActivos?: boolean;
  /** Si se setea, ignora campo/modo/min/max/exacto */
  comparacion?: ComparacionPrecio;
  margenMinimo?: number;
  limit?: number;
}

export interface CreateTransferenciaDto {
  sedeOrigenId: string;
  sedeDestinoId: string;
  productoId?: string;
  varianteId?: string;
  cantidad: number;
  motivo?: string;
  observaciones?: string;
}

export interface CreateTransferenciasMultiplesDto {
  sedeOrigenId: string;
  sedeDestinoId: string;
  productos: Array<{ productoId?: string; varianteId?: string; cantidad: number; motivo?: string }>;
  motivoGeneral?: string;
  observaciones?: string;
}

export interface StockMinMaxBulkItem {
  productoStockId: string;
  stockMinimo?: number;
  stockMaximo?: number;
}

// --- Filtros ---

export interface StockFiltros {
  page: number;
  limit: number;
  search?: string;
}

export interface MovimientoFiltros {
  limit?: number;
  offset?: number;
  tipo?: TipoMovimientoStock;
  fechaDesde?: string;
  fechaHasta?: string;
  /** Búsqueda parcial por número de documento */
  documento?: string;
}

export interface TransferenciaFiltros {
  page: number;
  limit: number;
  estado?: EstadoTransferencia;
  sedeId?: string;
}

export interface ReporteFiltros {
  sedeId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  dias?: number;
}
