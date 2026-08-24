import { apiClient } from '@/core/api/client';
import type {
  Cotizacion,
  CotizacionFiltros,
  CreateCotizacionDto,
  UpdateCotizacionDto,
  StockValidationResult,
  CompatibilidadResult,
  ColaPOSItem,
  CreateVentaDesdeCotizacionDto,
  CreateCotizacionDetalleDto,
} from '@/core/types/cotizacion';

// Helper to build query params from filtros
function buildQueryParams(filtros: CotizacionFiltros, cursor?: string | null): string {
  const params = new URLSearchParams();
  params.set('limit', String(filtros.limit));
  if (cursor) params.set('cursor', cursor);
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros.clienteId) params.set('clienteId', filtros.clienteId);
  if (filtros.search) params.set('search', filtros.search);
  return params.toString();
}

/** Una tanda de cotizaciones y por dónde sigue la próxima. */
export interface CotizacionesPagina {
  items: Cotizacion[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * 🔴 El endpoint responde de DOS formas y hay que aguantar las dos: sin
 * `limit` devuelve el array pelado de siempre, y con `limit` devuelve
 * `{ data, hasMore, nextCursor }` (paginación por cursor, cotizacion.service.ts).
 *
 * La web mandaba `limit` y seguía tratando la respuesta como un array: el
 * `.map()` de la tabla reventaba y la pantalla entera caía en el error
 * boundary con "Algo salió mal". Normalizar acá es lo que evita que el próximo
 * cambio de forma del backend tumbe la página.
 */
export async function getCotizaciones(
  filtros: CotizacionFiltros,
  cursor?: string | null,
): Promise<CotizacionesPagina> {
  const query = buildQueryParams(filtros, cursor);
  const res = await apiClient.get<Cotizacion[] | { data?: Cotizacion[]; hasMore?: boolean; nextCursor?: string | null }>(
    `/cotizaciones?${query}`,
  );
  const body = res.data;
  if (Array.isArray(body)) return { items: body, hasMore: false, nextCursor: null };
  return {
    items: Array.isArray(body?.data) ? body.data : [],
    hasMore: !!body?.hasMore,
    nextCursor: body?.nextCursor ?? null,
  };
}

export async function getCotizacion(id: string): Promise<Cotizacion> {
  const res = await apiClient.get<Cotizacion>(`/cotizaciones/${id}`);
  return res.data;
}

export async function createCotizacion(data: CreateCotizacionDto): Promise<Cotizacion> {
  const res = await apiClient.post<Cotizacion>('/cotizaciones', data);
  return res.data;
}

export async function updateCotizacion(id: string, data: UpdateCotizacionDto): Promise<Cotizacion> {
  const res = await apiClient.put<Cotizacion>(`/cotizaciones/${id}`, data);
  return res.data;
}

export async function cambiarEstado(id: string, estado: string, comprobanteId?: string): Promise<Cotizacion> {
  const res = await apiClient.patch<Cotizacion>(`/cotizaciones/${id}/estado`, { estado, comprobanteId });
  return res.data;
}

export async function duplicarCotizacion(id: string): Promise<Cotizacion> {
  const res = await apiClient.post<Cotizacion>(`/cotizaciones/${id}/duplicar`);
  return res.data;
}

export async function deleteCotizacion(id: string): Promise<void> {
  await apiClient.delete(`/cotizaciones/${id}`);
}

export async function validarStock(id: string): Promise<StockValidationResult> {
  const res = await apiClient.get<StockValidationResult>(`/cotizaciones/${id}/validar-stock`);
  return res.data;
}

export async function validarCompatibilidad(detalles: CreateCotizacionDetalleDto[]): Promise<CompatibilidadResult> {
  const res = await apiClient.post<CompatibilidadResult>('/cotizaciones/validar-compatibilidad', detalles);
  return res.data;
}

export async function getColaPOS(sedeId?: string): Promise<ColaPOSItem[]> {
  const params = new URLSearchParams();
  if (sedeId) params.set('sedeId', sedeId);
  const query = params.toString();
  const res = await apiClient.get<ColaPOSItem[]>(`/cotizaciones/cola-pos${query ? `?${query}` : ''}`);
  return res.data;
}

export async function convertirAVenta(cotizacionId: string, dto: CreateVentaDesdeCotizacionDto): Promise<Record<string, unknown>> {
  const res = await apiClient.post(`/ventas/desde-cotizacion/${cotizacionId}`, dto);
  return res.data;
}
