import { apiClient } from '@/core/api/client';
import { getTenantId } from '@/core/auth/token-service';
import type {
  OrdenCompra,
  OrdenCompraDetalle,
  CrearOrdenCompraInput,
  CrearCompraDesdeOcInput,
  CompraDetalle,
  EstadoOrdenCompra,
} from '@/core/types/compra';

const emp = () => getTenantId() ?? '';
const BASE = () => `/empresas/${emp()}/ordenes-compra`;

export interface OrdenesCompraFiltros {
  estado?: EstadoOrdenCompra;
  proveedorId?: string;
  sedeId?: string;
  search?: string;
  limit?: number;
}

export async function listarOrdenesCompra(filtros: OrdenesCompraFiltros = {}): Promise<OrdenCompra[]> {
  const q = new URLSearchParams();
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.proveedorId) q.set('proveedorId', filtros.proveedorId);
  if (filtros.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros.search) q.set('search', filtros.search);
  q.set('limit', String(filtros.limit ?? 50));
  const res = await apiClient.get(`${BASE()}?${q.toString()}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getOrdenCompra(id: string): Promise<OrdenCompra> {
  const res = await apiClient.get(`${BASE()}/${id}`);
  return res.data;
}

export async function crearOrdenCompra(dto: CrearOrdenCompraInput): Promise<OrdenCompra> {
  const res = await apiClient.post(BASE(), dto);
  return res.data;
}

export async function actualizarOrdenCompra(id: string, dto: Partial<CrearOrdenCompraInput>): Promise<OrdenCompra> {
  const res = await apiClient.put(`${BASE()}/${id}`, dto);
  return res.data;
}

/** Transiciones válidas: BORRADOR→PENDIENTE/CANCELADA; PENDIENTE→APROBADA/CANCELADA.
 *  PARCIAL/COMPLETADA las setea el backend al recibir. */
export async function cambiarEstadoOrdenCompra(id: string, estado: EstadoOrdenCompra): Promise<OrdenCompra> {
  const res = await apiClient.patch(`${BASE()}/${id}/estado`, { estado });
  return res.data;
}

export async function eliminarOrdenCompra(id: string): Promise<void> {
  await apiClient.delete(`${BASE()}/${id}`);
}

export async function duplicarOrdenCompra(id: string): Promise<OrdenCompra> {
  const res = await apiClient.post(`${BASE()}/${id}/duplicar`, {});
  return res.data;
}

/** Líneas con cantidadPendiente > 0 (para el diálogo de recepción) */
export async function getLineasPendientes(id: string): Promise<OrdenCompraDetalle[]> {
  const res = await apiClient.get(`${BASE()}/${id}/lineas-pendientes`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** RECEPCIÓN: crea una Compra (BORRADOR) desde la OC con las líneas/cantidades recibidas.
 *  La OC pasa a PARCIAL o COMPLETADA según lo pendiente. */
export async function crearCompraDesdeOrden(dto: CrearCompraDesdeOcInput): Promise<CompraDetalle> {
  const res = await apiClient.post(`/empresas/${emp()}/compras/desde-orden-compra`, dto);
  return res.data;
}
