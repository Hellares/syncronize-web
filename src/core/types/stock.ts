import type { PaginatedResponse } from './producto';

export type { PaginatedResponse };

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

export function precioEfectivo(s: ProductoStock): number | undefined {
  if (s.enOferta && s.precioOferta != null) return s.precioOferta;
  return s.precio ?? undefined;
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

export interface UpdatePreciosStockDto {
  precio?: number | null;
  precioCosto?: number | null;
  precioOferta?: number | null;
  enOferta?: boolean;
  fechaInicioOferta?: string | null;
  fechaFinOferta?: string | null;
  precioIncluyeIgv?: boolean;
  ubicacion?: string;
  stockMinimo?: number;
  stockMaximo?: number;
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
  tipo?: TipoMovimientoStock;
  fechaDesde?: string;
  fechaHasta?: string;
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
