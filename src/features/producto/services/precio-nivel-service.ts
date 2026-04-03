import { apiClient } from '@/core/api/client';
import { PRECIO_NIVEL_ENDPOINTS } from '@/core/api/endpoints';
import type { PrecioNivel, CreatePrecioNivelDto, UpdatePrecioNivelDto } from '@/core/types/precio';

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
