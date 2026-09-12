import { apiClient } from '@/core/api/client';
import type { Lote, LotesFiltros, LotesPagina } from '@/core/types/lote';

/**
 * 🔴 La ruta lleva el `empresaId` en el path Y el tenant en el header. Es como
 * está declarado el controller (`empresas/:empresaId/lotes`); el que manda para
 * el filtrado es el header.
 */
const base = (empresaId: string) => `/empresas/${empresaId}/lotes`;

export async function getLotes(
  empresaId: string,
  filtros: LotesFiltros = {},
): Promise<LotesPagina> {
  const p = new URLSearchParams();
  p.set('limit', String(filtros.limit ?? 25));
  if (filtros.cursor) p.set('cursor', filtros.cursor);
  if (filtros.sedeId) p.set('sedeId', filtros.sedeId);
  if (filtros.productoStockId) p.set('productoStockId', filtros.productoStockId);
  if (filtros.proveedorId) p.set('proveedorId', filtros.proveedorId);
  if (filtros.estado) p.set('estado', filtros.estado);
  if (filtros.search) p.set('search', filtros.search);
  const res = await apiClient.get<LotesPagina>(`${base(empresaId)}?${p.toString()}`);
  return res.data;
}

/** Los que vencen dentro de N días. Devuelve una lista, no una página. */
export async function getLotesProximosVencer(
  empresaId: string,
  dias = 30,
): Promise<Lote[]> {
  const res = await apiClient.get<Lote[]>(`${base(empresaId)}/proximos-vencer?dias=${dias}`);
  return res.data;
}

/**
 * Saca las unidades del inventario: baja el lote Y el stock.
 *
 * 🔴 Es la ÚNICA salida cuando un producto de CADUCIDAD vence: la venta lo
 * bloquea sin autorización posible, y como FEFO pone lo vencido primero en la
 * fila, ese lote frena toda venta de ese producto hasta que se dé de baja.
 *
 * Sin `cantidad` se da de baja todo lo que queda, que es el caso normal.
 */
export async function darDeBajaLote(
  empresaId: string,
  loteId: string,
  data: { cantidad?: number; motivo: string },
): Promise<{ dadasDeBaja: number; quedanEnLote: number; stockActual: number }> {
  const res = await apiClient.post(`${base(empresaId)}/${loteId}/baja`, data);
  return res.data;
}

/**
 * Corrige una fecha de vencimiento mal cargada — la otra salida del bloqueo.
 *
 * `fechaVencimiento: null` deja el lote sin vencimiento. Queda rastro en las
 * observaciones: qué decía antes, qué dice ahora, quién y por qué.
 */
export async function corregirVencimientoLote(
  empresaId: string,
  loteId: string,
  data: { fechaVencimiento: string | null; motivo: string },
): Promise<Lote> {
  const res = await apiClient.patch(`${base(empresaId)}/${loteId}/vencimiento`, data);
  return res.data;
}
