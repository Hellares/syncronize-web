import { apiClient } from '@/core/api/client';
import type {
  OrdenServicio,
  OrdenesListResponse,
  OrdenesFiltros,
  CreateOrdenServicioDto,
  TransitionEstadoDto,
  HistorialOS,
} from '@/core/types/orden-servicio';

const BASE = '/ordenes-servicio';

export async function getOrdenes(filtros: OrdenesFiltros = {}): Promise<OrdenesListResponse> {
  const q = new URLSearchParams();
  q.set('page', String(filtros.page ?? 1));
  q.set('limit', String(filtros.limit ?? 15));
  if (filtros.search) q.set('search', filtros.search);
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.tipoServicio) q.set('tipoServicio', filtros.tipoServicio);
  if (filtros.prioridad) q.set('prioridad', filtros.prioridad);
  if (filtros.clienteId) q.set('clienteId', filtros.clienteId);
  if (filtros.clienteEmpresaId) q.set('clienteEmpresaId', filtros.clienteEmpresaId);
  if (filtros.tecnicoId) q.set('tecnicoId', filtros.tecnicoId);
  if (filtros.fechaDesde) q.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) q.set('fechaHasta', filtros.fechaHasta);
  const res = await apiClient.get<OrdenesListResponse>(`${BASE}?${q.toString()}`);
  return res.data;
}

export async function getOrden(id: string): Promise<OrdenServicio> {
  const res = await apiClient.get<OrdenServicio>(`${BASE}/${id}`);
  return res.data;
}

export async function crearOrden(data: CreateOrdenServicioDto): Promise<OrdenServicio> {
  const res = await apiClient.post<OrdenServicio>(BASE, data);
  return res.data;
}

export async function actualizarOrden(id: string, data: Partial<CreateOrdenServicioDto>): Promise<OrdenServicio> {
  const res = await apiClient.put<OrdenServicio>(`${BASE}/${id}`, data);
  return res.data;
}

export async function transicionarEstado(id: string, data: TransitionEstadoDto): Promise<OrdenServicio> {
  const res = await apiClient.patch<OrdenServicio>(`${BASE}/${id}/estado`, data);
  return res.data;
}

export async function asignarTecnico(id: string, tecnicoId: string): Promise<OrdenServicio> {
  const res = await apiClient.patch<OrdenServicio>(`${BASE}/${id}/tecnico`, { tecnicoId });
  return res.data;
}

export async function getHistorial(id: string): Promise<HistorialOS[]> {
  const res = await apiClient.get(`${BASE}/${id}/historial`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}
