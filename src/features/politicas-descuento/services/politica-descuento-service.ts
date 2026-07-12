import { apiClient } from '@/core/api/client';
import type {
  PoliticaDescuento,
  CreatePoliticaDescuentoDto,
  UpdatePoliticaDescuentoDto,
  ClienteAsignado,
  AsignarClientesDto,
  UsoHistorialItem,
  TipoDescuento,
} from '@/core/types/politica-descuento';

const BASE = '/politicas-descuento';

// --- CRUD de políticas ---

export async function getPoliticas(filtros: { tipoDescuento?: TipoDescuento; isActive?: boolean; page?: number; limit?: number } = {}):
  Promise<{ data: PoliticaDescuento[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (filtros.tipoDescuento) q.set('tipoDescuento', filtros.tipoDescuento);
  if (filtros.isActive !== undefined) q.set('isActive', String(filtros.isActive));
  q.set('page', String(filtros.page ?? 1));
  q.set('limit', String(filtros.limit ?? 20));
  const res = await apiClient.get(`${BASE}?${q.toString()}`);
  return res.data;
}

export async function getPolitica(id: string): Promise<PoliticaDescuento> {
  const res = await apiClient.get<PoliticaDescuento>(`${BASE}/${id}`);
  return res.data;
}

export async function crearPolitica(dto: CreatePoliticaDescuentoDto): Promise<PoliticaDescuento> {
  const res = await apiClient.post<PoliticaDescuento>(BASE, dto);
  return res.data;
}

export async function actualizarPolitica(id: string, dto: UpdatePoliticaDescuentoDto): Promise<PoliticaDescuento> {
  const res = await apiClient.put<PoliticaDescuento>(`${BASE}/${id}`, dto);
  return res.data;
}

export async function eliminarPolitica(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// --- Clientes VIP asignados (B2C + B2B) ---

export async function getClientesAsignados(politicaId: string): Promise<ClienteAsignado[]> {
  const res = await apiClient.get(`${BASE}/${politicaId}/clientes`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function asignarClientes(politicaId: string, dto: AsignarClientesDto): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${politicaId}/clientes`, dto);
  return res.data;
}

export async function removerCliente(politicaId: string, asignacionId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${politicaId}/clientes/${asignacionId}`);
}

// --- Productos / categorías de la política (cuando NO aplica a todos) ---

export async function asignarProductos(politicaId: string, productos: Array<{ productoId: string; descuentoOverride?: number }>): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${politicaId}/productos`, { productos });
  return res.data;
}

export async function removerProducto(politicaId: string, productoId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${politicaId}/productos/${productoId}`);
}

export async function asignarCategorias(politicaId: string, categorias: Array<{ categoriaId: string; descuentoOverride?: number }>): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${politicaId}/categorias`, { categorias });
  return res.data;
}

export async function removerCategoria(politicaId: string, categoriaId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${politicaId}/categorias/${categoriaId}`);
}

// --- Historial de uso ---

export async function getHistorialUso(politicaId: string): Promise<UsoHistorialItem[]> {
  const res = await apiClient.get(`${BASE}/${politicaId}/historial-uso`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}
