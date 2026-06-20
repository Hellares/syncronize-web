import { apiClient } from '@/core/api/client';
import { getTenantId } from '@/core/auth/token-service';
import type {
  Proveedor,
  CreateProveedorDto,
  EstadoCuentaTercero,
  RegistrarComoClienteResult,
} from '@/core/types/proveedor';

const emp = () => getTenantId() ?? '';
const BASE = () => `/empresas/${emp()}/proveedores`;

export async function listarProveedores(includeInactive = false): Promise<Proveedor[]> {
  const res = await apiClient.get(`${BASE()}${includeInactive ? '?includeInactive=true' : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getProveedor(id: string): Promise<Proveedor> {
  const res = await apiClient.get(`${BASE()}/${id}`);
  return res.data;
}

export async function crearProveedor(dto: CreateProveedorDto): Promise<Proveedor> {
  const res = await apiClient.post(BASE(), dto);
  return res.data;
}

export async function actualizarProveedor(id: string, dto: Partial<CreateProveedorDto>): Promise<Proveedor> {
  const res = await apiClient.put(`${BASE()}/${id}`, dto);
  return res.data;
}

export async function eliminarProveedor(id: string): Promise<void> {
  await apiClient.delete(`${BASE()}/${id}`);
}

/** Vincula/registra el proveedor como cliente (mismo tercero). Idempotente. */
export async function registrarComoCliente(id: string): Promise<RegistrarComoClienteResult> {
  const res = await apiClient.post(`${BASE()}/${id}/registrar-como-cliente`);
  return res.data;
}

/** Estado de cuenta del tercero (compras + ventas + neto por moneda). */
export async function estadoCuentaTercero(
  id: string,
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<EstadoCuentaTercero> {
  const q = new URLSearchParams();
  if (fechaDesde) q.set('fechaDesde', fechaDesde);
  if (fechaHasta) q.set('fechaHasta', fechaHasta);
  const query = q.toString();
  const res = await apiClient.get(`${BASE()}/${id}/estado-cuenta${query ? `?${query}` : ''}`);
  return res.data;
}
