import { apiClient } from '@/core/api/client';
import { STOCK_ENDPOINTS } from '@/core/api/endpoints';
import type {
  ProductoStock,
  MovimientoStock,
  KardexResponse,
  AlertasResponse,
  AjustarStockDto,
  UpdatePreciosStockDto,
  StockMinMaxBulkItem,
  StockFiltros,
  MovimientoFiltros,
  ReporteFiltros,
  ReporteMerma,
  ReporteValorizacion,
  SugerenciaReorden,
  ReporteRotacion,
  PaginatedResponse,
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
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  return params.toString();
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
