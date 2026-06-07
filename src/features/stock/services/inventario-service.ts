import { apiClient } from '@/core/api/client';
import type { Inventario, CrearInventarioDto, RegistrarConteoDto, EstadoInventario, TipoInventario } from '@/core/types/inventario';

const BASE = '/inventarios';

export async function crearInventario(data: CrearInventarioDto): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(BASE, data);
  return res.data;
}

export async function getInventarios(filtros?: {
  sedeId?: string;
  estado?: EstadoInventario;
  tipoInventario?: TipoInventario;
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<Inventario[]> {
  const params = new URLSearchParams();
  if (filtros?.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.tipoInventario) params.set('tipoInventario', filtros.tipoInventario);
  if (filtros?.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros?.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  const q = params.toString();
  const res = await apiClient.get(`${BASE}${q ? `?${q}` : ''}`);
  // El backend puede devolver array directo o paginado {data}
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getInventario(id: string): Promise<Inventario> {
  const res = await apiClient.get<Inventario>(`${BASE}/${id}`);
  return res.data;
}

export async function iniciarInventario(id: string): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(`${BASE}/${id}/iniciar`);
  return res.data;
}

export async function registrarConteo(id: string, itemId: string, data: RegistrarConteoDto): Promise<void> {
  await apiClient.post(`${BASE}/${id}/items/${itemId}/contar`, data);
}

export async function finalizarConteo(id: string): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(`${BASE}/${id}/finalizar-conteo`);
  return res.data;
}

export async function aprobarInventario(id: string): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(`${BASE}/${id}/aprobar`);
  return res.data;
}

/** Genera movimientos AJUSTE_ENTRADA/AJUSTE_SALIDA por cada diferencia y pasa a AJUSTADO */
export async function aplicarAjustes(id: string): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(`${BASE}/${id}/aplicar-ajustes`);
  return res.data;
}

export async function cancelarInventario(id: string): Promise<Inventario> {
  const res = await apiClient.post<Inventario>(`${BASE}/${id}/cancelar`);
  return res.data;
}
