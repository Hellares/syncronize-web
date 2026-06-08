import { apiClient } from '@/core/api/client';
import type { Servicio, CreateServicioDto, PlantillaServicio, CampoServicio } from '@/core/types/servicio-catalogo';

export async function getServicios(params: { search?: string; page?: number; limit?: number } = {}): Promise<Servicio[]> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 100));
  const res = await apiClient.get(`/servicios?${q.toString()}`);
  const body = res.data as { data?: Servicio[] } | Servicio[];
  return Array.isArray(body) ? body : body.data ?? [];
}

export async function getServicio(id: string): Promise<Servicio> {
  const res = await apiClient.get<Servicio>(`/servicios/${id}`);
  return res.data;
}

export async function createServicio(data: CreateServicioDto): Promise<Servicio> {
  const res = await apiClient.post<Servicio>('/servicios', data);
  return res.data;
}

export async function updateServicio(id: string, data: Partial<CreateServicioDto>): Promise<Servicio> {
  const res = await apiClient.put<Servicio>(`/servicios/${id}`, data);
  return res.data;
}

export async function deleteServicio(id: string): Promise<void> {
  await apiClient.delete(`/servicios/${id}`);
}

export async function getPlantillas(): Promise<PlantillaServicio[]> {
  const res = await apiClient.get('/plantillas-servicio');
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Campos de la plantilla vinculada a un servicio (para renderizar datosPersonalizados). */
export async function getCamposPorServicio(servicioId: string): Promise<CampoServicio[]> {
  const res = await apiClient.get(`/plantillas-servicio/por-servicio/${servicioId}`);
  const body = res.data as { campos?: CampoServicio[]; data?: CampoServicio[] } | CampoServicio[];
  if (Array.isArray(body)) return body;
  return body.campos ?? body.data ?? [];
}
