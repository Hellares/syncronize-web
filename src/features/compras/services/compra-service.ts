import { apiClient } from '@/core/api/client';
import { getTenantId } from '@/core/auth/token-service';
import type {
  CompraListItem,
  CompraDetalle,
  ComprasFiltros,
  PagoContadoCompra,
  BancoEmpresa,
  CrearCompraInput,
  HistorialComprasProducto,
} from '@/core/types/compra';

const emp = () => getTenantId() ?? '';
const BASE = () => `/empresas/${emp()}/compras`;

export async function listarCompras(filtros: ComprasFiltros = {}): Promise<CompraListItem[]> {
  const q = new URLSearchParams();
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.proveedorId) q.set('proveedorId', filtros.proveedorId);
  if (filtros.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros.search) q.set('search', filtros.search);
  q.set('limit', String(filtros.limit ?? 50));
  const res = await apiClient.get(`${BASE()}?${q.toString()}`);
  // Cursor-paginado: { data, total, ... } o array directo.
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function crearCompra(dto: CrearCompraInput): Promise<CompraDetalle> {
  const res = await apiClient.post(BASE(), dto);
  return res.data;
}

export async function getCompra(id: string): Promise<CompraDetalle> {
  const res = await apiClient.get(`${BASE()}/${id}`);
  return res.data;
}

/** Confirma la compra. Si es contado y se manda `pago`, lo registra; si no,
 *  queda pendiente en CxP. */
export async function confirmarCompra(id: string, pago?: PagoContadoCompra): Promise<CompraDetalle> {
  const res = await apiClient.post(`${BASE()}/${id}/confirmar`, pago ? { pago } : {});
  return res.data;
}

export async function anularCompra(id: string): Promise<CompraDetalle> {
  const res = await apiClient.post(`${BASE()}/${id}/anular`, {});
  return res.data;
}

/** Elimina una compra en BORRADOR (única eliminable) */
export async function eliminarCompra(id: string): Promise<void> {
  await apiClient.delete(`${BASE()}/${id}`);
}

/** Historial de compras del producto: últimas compras + agregado por proveedor + mejor proveedor
 *  (paridad historial_compras_producto_panel de Flutter) */
export async function getHistorialComprasProducto(productoId: string, opts: { varianteId?: string; limit?: number } = {}): Promise<HistorialComprasProducto> {
  const q = new URLSearchParams();
  if (opts.varianteId) q.set('varianteId', opts.varianteId);
  q.set('limit', String(opts.limit ?? 10));
  const res = await apiClient.get(`/productos/${productoId}/historial-compras?${q.toString()}`);
  return res.data;
}

/** Cuentas bancarias de la empresa (para fuente=BANCO al pagar). */
export async function getBancos(): Promise<BancoEmpresa[]> {
  const res = await apiClient.get('/empresa-banco');
  const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return list.filter((b: BancoEmpresa) => b.isActive !== false);
}
