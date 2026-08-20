import { apiClient } from '@/core/api/client';
import { PRECIO_NIVEL_ENDPOINTS } from '@/core/api/endpoints';
import type { PrecioNivel, CreatePrecioNivelDto, UpdatePrecioNivelDto } from '@/core/types/precio';
import type { GruposMayoreoResumen, VarianteMayoreo } from '@/core/types/mayoreo';

export async function getNivelesByProducto(productoId: string): Promise<PrecioNivel[]> {
  const res = await apiClient.get<PrecioNivel[]>(PRECIO_NIVEL_ENDPOINTS.BY_PRODUCTO(productoId));
  return res.data;
}

export async function getNivelesByVariante(varianteId: string): Promise<PrecioNivel[]> {
  const res = await apiClient.get<PrecioNivel[]>(PRECIO_NIVEL_ENDPOINTS.BY_VARIANTE(varianteId));
  return res.data;
}

export async function createNivelProducto(productoId: string, data: CreatePrecioNivelDto): Promise<PrecioNivel> {
  const res = await apiClient.post<PrecioNivel>(PRECIO_NIVEL_ENDPOINTS.BY_PRODUCTO(productoId), data);
  return res.data;
}

export async function createNivelVariante(varianteId: string, data: CreatePrecioNivelDto): Promise<PrecioNivel> {
  const res = await apiClient.post<PrecioNivel>(PRECIO_NIVEL_ENDPOINTS.BY_VARIANTE(varianteId), data);
  return res.data;
}

export async function updateNivel(nivelId: string, data: UpdatePrecioNivelDto): Promise<PrecioNivel> {
  const res = await apiClient.patch<PrecioNivel>(PRECIO_NIVEL_ENDPOINTS.SINGLE(nivelId), data);
  return res.data;
}

export async function deleteNivel(nivelId: string): Promise<void> {
  await apiClient.delete(PRECIO_NIVEL_ENDPOINTS.SINGLE(nivelId));
}

/**
 * MONITOR DE MAYOREO: cómo quedan agrupadas las variantes de un producto según
 * sus niveles.
 *
 * Va en UNA llamada a propósito. Pidiendo los niveles variante por variante
 * serían 91 requests en un producto como EDREDONES, y encima la web tendría que
 * reagrupar por su cuenta — con el riesgo de mostrar algo distinto de lo que el
 * backend termina cobrando.
 *
 * `sedeId` solo trae precio de lista y stock (que sí son por sede); la
 * agrupación no depende de la sede.
 */
export async function getGruposMayoreo(
  productoId: string,
  sedeId?: string | null,
): Promise<GruposMayoreoResumen> {
  const query = sedeId ? `?sedeId=${sedeId}` : '';
  const res = await apiClient.get<GruposMayoreoResumen>(
    `${PRECIO_NIVEL_ENDPOINTS.GRUPOS_MAYOREO(productoId)}${query}`,
  );
  return normalizarResumen(res.data);
}

/**
 * Los `Decimal` de Prisma viajan como String si el backend no los fuerza a
 * Number, y un `precio.toFixed(2)` sobre un String revienta. El endpoint hoy
 * los convierte, pero la conversión es de ellos y este es el único lugar donde
 * la web puede blindarse sin repetirlo en cada componente.
 */
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizarVariante(v: VarianteMayoreo): VarianteMayoreo {
  return {
    ...v,
    precioVenta: num(v.precioVenta),
    stockActual: num(v.stockActual),
    precioConNivel: num(v.precioConNivel),
    ahorroUnitario: num(v.ahorroUnitario),
    factorPresentacion: num(v.factorPresentacion),
  };
}

function normalizarResumen(r: GruposMayoreoResumen): GruposMayoreoResumen {
  return {
    ...r,
    grupos: (r.grupos ?? []).map((g) => ({
      ...g,
      precio: num(g.precio),
      porcentajeDesc: num(g.porcentajeDesc),
      variantes: (g.variantes ?? []).map(normalizarVariante),
    })),
    sinNivel: (r.sinNivel ?? []).map(normalizarVariante),
  };
}
