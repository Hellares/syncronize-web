import { apiClient } from '@/core/api/client';
import type { Devolucion, CreateDevolucionDto, DevolucionFiltros } from '@/core/types/devolucion';

const BASE = '/devoluciones-venta';

export async function getDevoluciones(filtros: DevolucionFiltros = {}): Promise<Devolucion[]> {
  const q = new URLSearchParams();
  if (filtros.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.ventaId) q.set('ventaId', filtros.ventaId);
  if (filtros.fechaDesde) q.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) q.set('fechaHasta', filtros.fechaHasta);
  if (filtros.search) q.set('search', filtros.search);
  const query = q.toString();
  const res = await apiClient.get(`${BASE}${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getDevolucion(id: string): Promise<Devolucion> {
  const res = await apiClient.get<Devolucion>(`${BASE}/${id}`);
  return res.data;
}

export async function crearDevolucion(data: CreateDevolucionDto): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(BASE, data);
  return res.data;
}

export async function aprobarDevolucion(id: string): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(`${BASE}/${id}/aprobar`, {});
  return res.data;
}

export async function procesarDevolucion(id: string): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(`${BASE}/${id}/procesar`, {});
  return res.data;
}

export async function rechazarDevolucion(id: string, motivo?: string): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(`${BASE}/${id}/rechazar`, { motivo });
  return res.data;
}

export async function cancelarDevolucion(id: string): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(`${BASE}/${id}/cancelar`, {});
  return res.data;
}

// ── Reversión total post-anulación ──

/** Devuelve la reversión total existente para la venta (null si no hay). */
export async function getReversionTotal(ventaId: string): Promise<Devolucion | null> {
  const res = await apiClient.get(`${BASE}/venta/${ventaId}/reversion-total`);
  return res.data ?? null;
}

export async function crearReversionTotal(ventaId: string, motivo?: string): Promise<Devolucion> {
  const res = await apiClient.post<Devolucion>(`${BASE}/venta/${ventaId}/reversion-total`, { motivo });
  return res.data;
}
