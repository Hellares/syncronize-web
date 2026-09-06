import { apiClient } from '@/core/api/client';
import { STOCK_ENDPOINTS } from '@/core/api/endpoints';
import type {
  ProductoStock,
  KardexResponse,
  AlertasResponse,
  AjustarStockDto,
  UpdatePreciosStockDto,
  StockMinMaxBulkItem,
  BulkEditarStockPreciosDto,
  StockFiltros,
  MovimientoFiltros,
  ReporteFiltros,
  ReporteMerma,
  ReporteValorizacion,
  SugerenciaReorden,
  ReporteRotacion,
  PaginatedResponse,
  ActivarLiquidacionDto,
  AutorizarOperacionDto,
  AutorizacionResponse,
  HistorialPrecioSede,
  HistorialGlobalResponse,
  HistorialGlobalFiltros,
  AjusteMasivoPreciosDto,
  VerificacionPreciosFiltros,
  VerificacionPreciosResponse,
  MonitorResponse,
} from '@/core/types/stock';

function buildStockParams(filtros: StockFiltros): string {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('limit', String(filtros.limit));
  if (filtros.search) params.set('search', filtros.search);
  return params.toString();
}

function buildMovimientoParams(filtros: MovimientoFiltros): string {
  const params = new URLSearchParams();
  if (filtros.limit) params.set('limit', String(filtros.limit));
  if (filtros.offset) params.set('offset', String(filtros.offset));
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros.documento) params.set('documento', filtros.documento);
  return params.toString();
}

/** Export Excel del kardex (mismos filtros que el listado) */
export async function exportMovimientos(id: string, filtros: MovimientoFiltros): Promise<Blob> {
  const query = buildMovimientoParams(filtros);
  const res = await apiClient.get(`${STOCK_ENDPOINTS.MOVIMIENTOS(id)}/export?${query}`, { responseType: 'blob' });
  return res.data;
}

function buildReporteParams(filtros: ReporteFiltros): string {
  const params = new URLSearchParams();
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros.dias) params.set('dias', String(filtros.dias));
  return params.toString();
}

// --- Stock CRUD ---

export async function getStockBySede(sedeId: string, filtros: StockFiltros): Promise<PaginatedResponse<ProductoStock>> {
  const query = buildStockParams(filtros);
  const res = await apiClient.get<PaginatedResponse<ProductoStock>>(`${STOCK_ENDPOINTS.LIST_BY_SEDE(sedeId)}?${query}`);
  return res.data;
}

export async function getStockByProductoSede(productoId: string, sedeId: string): Promise<ProductoStock> {
  const res = await apiClient.get<ProductoStock>(STOCK_ENDPOINTS.BY_PRODUCTO_SEDE(productoId, sedeId));
  return res.data;
}

export async function getStockByVarianteSede(varianteId: string, sedeId: string): Promise<ProductoStock> {
  const res = await apiClient.get<ProductoStock>(STOCK_ENDPOINTS.BY_VARIANTE_SEDE(varianteId, sedeId));
  return res.data;
}

export async function getStockTodasSedes(productoId: string, varianteId?: string): Promise<ProductoStock[]> {
  const params = varianteId ? `?varianteId=${varianteId}` : '';
  const res = await apiClient.get<ProductoStock[]>(`${STOCK_ENDPOINTS.TODAS_SEDES(productoId)}${params}`);
  return res.data;
}

export async function ajustarStock(id: string, data: AjustarStockDto): Promise<ProductoStock> {
  const res = await apiClient.put<ProductoStock>(STOCK_ENDPOINTS.AJUSTAR(id), data);
  return res.data;
}

export async function updatePrecios(id: string, data: UpdatePreciosStockDto): Promise<ProductoStock> {
  const res = await apiClient.patch<ProductoStock>(STOCK_ENDPOINTS.UPDATE_PRECIOS(id), data);
  return res.data;
}

export async function getMovimientos(id: string, filtros: MovimientoFiltros): Promise<KardexResponse> {
  const query = buildMovimientoParams(filtros);
  const res = await apiClient.get<KardexResponse>(`${STOCK_ENDPOINTS.MOVIMIENTOS(id)}?${query}`);
  return res.data;
}

export async function getAlertasBajoMinimo(sedeId?: string): Promise<AlertasResponse> {
  const params = sedeId ? `?sedeId=${sedeId}` : '';
  const res = await apiClient.get<AlertasResponse>(`${STOCK_ENDPOINTS.ALERTAS_BAJO_MINIMO}${params}`);
  return res.data;
}

export async function getUbicaciones(sedeId: string): Promise<string[]> {
  const res = await apiClient.get<string[]>(STOCK_ENDPOINTS.UBICACIONES(sedeId));
  return res.data;
}

export async function updateStockMinMaxBulk(sedeId: string, items: StockMinMaxBulkItem[]): Promise<void> {
  await apiClient.patch(STOCK_ENDPOINTS.BULK_MIN_MAX(sedeId), { items });
}

// --- Liquidación (F2) ---

/** Autoriza una operación privilegiada con DNI+password de un admin/gerente */
export async function autorizarOperacion(data: AutorizarOperacionDto): Promise<AutorizacionResponse> {
  const res = await apiClient.post<AutorizacionResponse>('/auth/autorizar-operacion', data);
  return res.data;
}

export async function activarLiquidacion(id: string, data: ActivarLiquidacionDto): Promise<ProductoStock> {
  const res = await apiClient.patch<ProductoStock>(STOCK_ENDPOINTS.LIQUIDACION_ACTIVAR(id), data);
  return res.data;
}

export async function desactivarLiquidacion(id: string, razon?: string): Promise<ProductoStock> {
  const res = await apiClient.patch<ProductoStock>(STOCK_ENDPOINTS.LIQUIDACION_DESACTIVAR(id), razon ? { razon } : {});
  return res.data;
}

export async function getLiquidaciones(params: { sedeId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<ProductoStock>> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 100));
  if (params.sedeId) q.set('sedeId', params.sedeId);
  const res = await apiClient.get<PaginatedResponse<ProductoStock>>(`${STOCK_ENDPOINTS.LIQUIDACIONES}?${q.toString()}`);
  return res.data;
}

// --- Historial de precios (F2) ---

export async function getHistorialPreciosStock(id: string, limit = 100): Promise<HistorialPrecioSede[]> {
  const res = await apiClient.get<HistorialPrecioSede[]>(`${STOCK_ENDPOINTS.HISTORIAL_PRECIOS_STOCK(id)}?limit=${limit}`);
  return res.data;
}

function buildHistorialGlobalParams(filtros: HistorialGlobalFiltros): string {
  const params = new URLSearchParams();
  if (filtros.limit) params.set('limit', String(filtros.limit));
  if (filtros.cursor) params.set('cursor', filtros.cursor);
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.productoId) params.set('productoId', filtros.productoId);
  if (filtros.fechaInicio) params.set('fechaInicio', filtros.fechaInicio);
  if (filtros.fechaFin) params.set('fechaFin', filtros.fechaFin);
  if (filtros.tipoCambio) params.set('tipoCambio', filtros.tipoCambio);
  if (filtros.search) params.set('search', filtros.search);
  return params.toString();
}

export async function getHistorialPreciosGlobal(filtros: HistorialGlobalFiltros): Promise<HistorialGlobalResponse> {
  const res = await apiClient.get<HistorialGlobalResponse>(`${STOCK_ENDPOINTS.HISTORIAL_PRECIOS}?${buildHistorialGlobalParams(filtros)}`);
  return res.data;
}

/** Export Excel del historial global. Rango máximo: 3 meses */
export async function exportHistorialPrecios(fechaInicio: string, fechaFin: string, sedeId?: string): Promise<Blob> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  if (sedeId) params.set('sedeId', sedeId);
  const res = await apiClient.get(`${STOCK_ENDPOINTS.HISTORIAL_PRECIOS_EXPORT}?${params.toString()}`, { responseType: 'blob' });
  return res.data;
}

// --- Herramientas masivas de precios (F2) ---

export async function ajusteMasivoPrecios(sedeId: string, data: AjusteMasivoPreciosDto): Promise<{ actualizados: number }> {
  const res = await apiClient.post(STOCK_ENDPOINTS.AJUSTE_MASIVO_PRECIOS(sedeId), data);
  return res.data;
}

function buildVerificacionParams(filtros: VerificacionPreciosFiltros): string {
  const params = new URLSearchParams();
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.campo) params.set('campo', filtros.campo);
  if (filtros.modo) params.set('modo', filtros.modo);
  if (filtros.min !== undefined) params.set('min', String(filtros.min));
  if (filtros.max !== undefined) params.set('max', String(filtros.max));
  if (filtros.exacto !== undefined) params.set('exacto', String(filtros.exacto));
  if (filtros.empresaCategoriaId) params.set('empresaCategoriaId', filtros.empresaCategoriaId);
  if (filtros.empresaMarcaId) params.set('empresaMarcaId', filtros.empresaMarcaId);
  if (filtros.stock) params.set('stock', filtros.stock);
  if (filtros.soloActivos !== undefined) params.set('soloActivos', String(filtros.soloActivos));
  if (filtros.comparacion) params.set('comparacion', filtros.comparacion);
  if (filtros.margenMinimo !== undefined) params.set('margenMinimo', String(filtros.margenMinimo));
  if (filtros.limit) params.set('limit', String(filtros.limit));
  return params.toString();
}

export async function verificacionPrecios(filtros: VerificacionPreciosFiltros): Promise<VerificacionPreciosResponse> {
  const res = await apiClient.get<VerificacionPreciosResponse>(`${STOCK_ENDPOINTS.VERIFICACION_PRECIOS}?${buildVerificacionParams(filtros)}`);
  return res.data;
}

export async function exportVerificacionPrecios(filtros: VerificacionPreciosFiltros): Promise<Blob> {
  const res = await apiClient.get(`${STOCK_ENDPOINTS.VERIFICACION_PRECIOS_EXPORT}?${buildVerificacionParams(filtros)}`, { responseType: 'blob' });
  return res.data;
}

export async function getPendientesPrecio(sedeId: string, page = 1, limit = 20): Promise<PaginatedResponse<ProductoStock>> {
  const res = await apiClient.get(`${STOCK_ENDPOINTS.PENDIENTES_PRECIO(sedeId)}?page=${page}&limit=${limit}`);
  return res.data;
}

export async function getListosVenta(sedeId: string, page = 1, limit = 20): Promise<PaginatedResponse<ProductoStock>> {
  const res = await apiClient.get(`${STOCK_ENDPOINTS.LISTOS_VENTA(sedeId)}?page=${page}&limit=${limit}`);
  return res.data;
}

// --- Monitor + bulk ops (F5) ---

export async function getMonitor(sedeId?: string): Promise<MonitorResponse> {
  const params = sedeId ? `?sedeId=${sedeId}` : '';
  const res = await apiClient.get<MonitorResponse>(`${STOCK_ENDPOINTS.MONITOR}${params}`);
  return res.data;
}

/** OJO: marketplace usa productoIds (IDs de Producto); ubicación e IGV usan productoStockIds */
export async function bulkMarketplace(productoIds: string[], visible: boolean): Promise<void> {
  await apiClient.patch(STOCK_ENDPOINTS.BULK_MARKETPLACE, { productoIds, visible });
}

export async function bulkUbicacion(productoStockIds: string[], ubicacion: string): Promise<void> {
  await apiClient.patch(STOCK_ENDPOINTS.BULK_UBICACION, { productoStockIds, ubicacion });
}

export async function bulkPrecioIgv(productoStockIds: string[], precioIncluyeIgv: boolean): Promise<void> {
  await apiClient.patch(STOCK_ENDPOINTS.BULK_PRECIO_IGV, { productoStockIds, precioIncluyeIgv });
}

// --- Reportes ---

export async function getReporteMermas(filtros: ReporteFiltros): Promise<ReporteMerma> {
  const query = buildReporteParams(filtros);
  const res = await apiClient.get<ReporteMerma>(`${STOCK_ENDPOINTS.REPORTE_MERMAS}?${query}`);
  return res.data;
}

export async function getReporteValorizacion(filtros: ReporteFiltros): Promise<ReporteValorizacion> {
  const query = buildReporteParams(filtros);
  const res = await apiClient.get<ReporteValorizacion>(`${STOCK_ENDPOINTS.REPORTE_VALORIZACION}?${query}`);
  return res.data;
}

export async function getReporteSugerencias(filtros: ReporteFiltros): Promise<SugerenciaReorden[]> {
  const query = buildReporteParams(filtros);
  const res = await apiClient.get<SugerenciaReorden[]>(`${STOCK_ENDPOINTS.REPORTE_SUGERENCIAS}?${query}`);
  return res.data;
}

export async function getReporteRotacion(filtros: ReporteFiltros): Promise<ReporteRotacion> {
  const query = buildReporteParams(filtros);
  const res = await apiClient.get<ReporteRotacion>(`${STOCK_ENDPOINTS.REPORTE_ROTACION}?${query}`);
  return res.data;
}

/**
 * Stock, precios y mayoreo de varias variantes de una sola vez.
 *
 * Todo pasa en UNA transaccion del lado del backend, incluido el upsert del
 * nivel por mayor y el guard de bajo costo. Tope: 500 items.
 */
export async function bulkEditarStockPrecios(
  sedeId: string,
  data: BulkEditarStockPreciosDto,
): Promise<{ actualizados: number } & Record<string, unknown>> {
  const res = await apiClient.patch(STOCK_ENDPOINTS.BULK_EDITAR(sedeId), data);
  return res.data;
}
