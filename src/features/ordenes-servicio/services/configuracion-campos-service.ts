import { apiClient } from '@/core/api/client';
import type { CampoServicio, ConfiguracionCampoDto } from '@/core/types/servicio-catalogo';

const BASE = '/configuracion-campos-servicio';

/** Lista los campos de servicio de la empresa (plantilla global de órdenes). */
export async function getCampos(params?: { categoria?: string; activo?: boolean }): Promise<CampoServicio[]> {
  const q = new URLSearchParams();
  if (params?.categoria) q.set('categoria', params.categoria);
  if (params?.activo != null) q.set('activo', String(params.activo));
  const qs = q.toString();
  const res = await apiClient.get(`${BASE}${qs ? `?${qs}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function crearCampo(data: ConfiguracionCampoDto): Promise<CampoServicio> {
  const res = await apiClient.post<CampoServicio>(BASE, data);
  return res.data;
}

export async function actualizarCampo(id: string, data: Partial<ConfiguracionCampoDto>): Promise<CampoServicio> {
  const res = await apiClient.put<CampoServicio>(`${BASE}/${id}`, data);
  return res.data;
}

export async function eliminarCampo(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Reordena los campos (drag & drop). Devuelve la lista reordenada. */
export async function reordenarCampos(orderedIds: string[]): Promise<CampoServicio[]> {
  const res = await apiClient.patch(`${BASE}/reorder`, { orderedIds });
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}
