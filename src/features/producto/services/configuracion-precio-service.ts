import { apiClient } from '@/core/api/client';
import { CONFIGURACION_PRECIO_ENDPOINTS } from '@/core/api/endpoints';
import type { ConfiguracionPrecio, CreateConfiguracionPrecioDto, UpdateConfiguracionPrecioDto } from '@/core/types/precio';

export async function getConfiguraciones(): Promise<ConfiguracionPrecio[]> {
  const res = await apiClient.get<ConfiguracionPrecio[]>(CONFIGURACION_PRECIO_ENDPOINTS.LIST);
  return res.data;
}

export async function getConfiguracion(id: string): Promise<ConfiguracionPrecio> {
  const res = await apiClient.get<ConfiguracionPrecio>(CONFIGURACION_PRECIO_ENDPOINTS.SINGLE(id));
  return res.data;
}

export async function createConfiguracion(data: CreateConfiguracionPrecioDto): Promise<ConfiguracionPrecio> {
  const res = await apiClient.post<ConfiguracionPrecio>(CONFIGURACION_PRECIO_ENDPOINTS.LIST, data);
  return res.data;
}

export async function updateConfiguracion(id: string, data: UpdateConfiguracionPrecioDto): Promise<ConfiguracionPrecio> {
  const res = await apiClient.patch<ConfiguracionPrecio>(CONFIGURACION_PRECIO_ENDPOINTS.SINGLE(id), data);
  return res.data;
}

export async function deleteConfiguracion(id: string): Promise<void> {
  await apiClient.delete(CONFIGURACION_PRECIO_ENDPOINTS.SINGLE(id));
}
