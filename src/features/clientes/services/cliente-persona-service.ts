import { apiClient } from '@/core/api/client';
import type {
  ClientePersona,
  CreateClienteDto,
  UpdateClienteDto,
  RegistroClienteResponse,
  ClientesFiltros,
  PaginatedMeta,
} from '@/core/types/cliente';

const BASE = '/clientes';

export async function getClientes(filtros: ClientesFiltros = {}): Promise<{ data: ClientePersona[]; meta: PaginatedMeta }> {
  const q = new URLSearchParams();
  q.set('page', String(filtros.page ?? 1));
  q.set('limit', String(filtros.limit ?? 20));
  if (filtros.search) q.set('search', filtros.search);
  if (filtros.isActive !== undefined) q.set('isActive', String(filtros.isActive));
  if (filtros.orden) q.set('orden', filtros.orden);
  const res = await apiClient.get(`${BASE}?${q.toString()}`);
  const body = res.data as { data?: ClientePersona[]; meta?: PaginatedMeta } | ClientePersona[];
  if (Array.isArray(body)) {
    return { data: body, meta: { total: body.length, page: 1, limit: body.length, totalPages: 1 } };
  }
  return {
    data: body.data ?? [],
    meta: body.meta ?? { total: (body.data ?? []).length, page: 1, limit: 20, totalPages: 1 },
  };
}

export async function getCliente(id: string): Promise<ClientePersona> {
  const res = await apiClient.get<ClientePersona>(`${BASE}/${id}`);
  return res.data;
}

export async function createCliente(data: CreateClienteDto): Promise<RegistroClienteResponse> {
  const res = await apiClient.post<RegistroClienteResponse>(BASE, data);
  return res.data;
}

export async function updateCliente(id: string, data: UpdateClienteDto): Promise<ClientePersona> {
  const res = await apiClient.put<ClientePersona>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteCliente(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Crea acceso al app para el cliente (login=DNI, password=DNI con cambio obligatorio). Idempotente.
 *  No válido para el cliente genérico (DNI 00000000) ni clientes sin DNI. */
export async function crearAcceso(id: string): Promise<{ mensaje?: string;[key: string]: unknown }> {
  const res = await apiClient.post(`${BASE}/${id}/crear-acceso`);
  return res.data;
}
