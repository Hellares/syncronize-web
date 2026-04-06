import { apiClient } from '@/core/api/client';
import type { Cotizacion, CotizacionFiltros, CreateCotizacionDto, UpdateCotizacionDto, PaginatedResponse } from '@/core/types/cotizacion';

// Helper to build query params from filtros
function buildQueryParams(filtros: CotizacionFiltros): string {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('limit', String(filtros.limit));
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros.clienteId) params.set('clienteId', filtros.clienteId);
  if (filtros.search) params.set('search', filtros.search);
  return params.toString();
}

export async function getCotizaciones(filtros: CotizacionFiltros): Promise<Cotizacion[]> {
  const query = buildQueryParams(filtros);
  const res = await apiClient.get<Cotizacion[]>(`/cotizaciones?${query}`);
  return res.data;
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
