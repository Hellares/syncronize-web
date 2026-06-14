import { apiClient } from '@/core/api/client';
import type {
  Tercerizacion, TercerizacionesListResponse, TercerizacionNota, TipoTercerizacion,
  ResponderTercerizacionDto, CompletarTercerizacionDto, AgregarNotaDto,
} from '@/core/types/tercerizacion';

const BASE = '/tercerizacion';

export async function listar(params?: { tipo?: TipoTercerizacion; estado?: string; page?: number; limit?: number }): Promise<TercerizacionesListResponse> {
  const q = new URLSearchParams();
  if (params?.tipo) q.set('tipo', params.tipo);
  if (params?.estado) q.set('estado', params.estado);
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 20));
  const res = await apiClient.get(`${BASE}?${q.toString()}`);
  const d = res.data;
  // Normaliza: el backend devuelve { data, meta }.
  if (Array.isArray(d)) return { data: d, meta: { total: d.length, page: 1, limit: d.length, totalPages: 1 } };
  return { data: d.data ?? [], meta: d.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 } };
}

export async function getById(id: string): Promise<Tercerizacion> {
  const res = await apiClient.get<Tercerizacion>(`${BASE}/${id}`);
  return res.data;
}

export async function responder(id: string, data: ResponderTercerizacionDto): Promise<Tercerizacion> {
  const res = await apiClient.patch<Tercerizacion>(`${BASE}/${id}/responder`, data);
  return res.data;
}

export async function completar(id: string, data: CompletarTercerizacionDto): Promise<Tercerizacion> {
  const res = await apiClient.patch<Tercerizacion>(`${BASE}/${id}/completar`, data);
  return res.data;
}

export async function cancelar(id: string): Promise<Tercerizacion> {
  const res = await apiClient.patch<Tercerizacion>(`${BASE}/${id}/cancelar`, {});
  return res.data;
}

/** Registra el pago al tercero (egreso en caja). Solo empresa origen, COMPLETADO. */
export async function pagarTercero(id: string, metodoPago: string): Promise<Tercerizacion> {
  const res = await apiClient.patch<Tercerizacion>(`${BASE}/${id}/pagar-tercero`, { metodoPago });
  return res.data;
}

export async function getNotas(id: string): Promise<TercerizacionNota[]> {
  const res = await apiClient.get(`${BASE}/${id}/notas`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function agregarNota(id: string, data: AgregarNotaDto): Promise<TercerizacionNota> {
  const res = await apiClient.post<TercerizacionNota>(`${BASE}/${id}/notas`, data);
  return res.data;
}
