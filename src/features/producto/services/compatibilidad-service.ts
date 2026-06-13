import { apiClient } from '@/core/api/client';

// Reglas de compatibilidad entre productos (paridad reglas_compatibilidad de Flutter).
// Backend: /compatibilidad/reglas (CRUD) — perm MANAGE_PRODUCTS para escribir.

export type TipoValidacionCompatibilidad = 'IGUAL' | 'INCLUYE_EN';

export interface CategoriaRef {
  id: string;
  nombrePersonalizado?: string | null;
  nombreLocal?: string | null;
}

export interface ReglaCompatibilidad {
  id: string;
  nombre: string;
  descripcion?: string | null;
  atributoOrigenClave: string;
  categoriaOrigenId: string;
  atributoDestinoClave: string;
  categoriaDestinoId: string;
  tipoValidacion: TipoValidacionCompatibilidad;
  /** JSON-string de Record<string, string[]> cuando tipoValidacion = INCLUYE_EN. */
  mapeoValores?: string | null;
  isActive?: boolean;
  creadoEn?: string;
  categoriaOrigen?: CategoriaRef | null;
  categoriaDestino?: CategoriaRef | null;
}

export interface CreateReglaCompatibilidadDto {
  nombre: string;
  descripcion?: string;
  atributoOrigenClave: string;
  categoriaOrigenId: string;
  atributoDestinoClave: string;
  categoriaDestinoId: string;
  tipoValidacion?: TipoValidacionCompatibilidad;
  mapeoValores?: Record<string, string[]>;
}

const BASE = '/compatibilidad/reglas';

export async function getReglas(categoriaId?: string): Promise<ReglaCompatibilidad[]> {
  const q = categoriaId ? `?categoriaId=${encodeURIComponent(categoriaId)}` : '';
  const res = await apiClient.get(`${BASE}${q}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function createRegla(dto: CreateReglaCompatibilidadDto): Promise<ReglaCompatibilidad> {
  const res = await apiClient.post<ReglaCompatibilidad>(BASE, dto);
  return res.data;
}

export async function updateRegla(id: string, dto: Partial<CreateReglaCompatibilidadDto>): Promise<ReglaCompatibilidad> {
  const res = await apiClient.put<ReglaCompatibilidad>(`${BASE}/${id}`, dto);
  return res.data;
}

export async function deleteRegla(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Nombre legible de la categoría embebida en la regla. */
export function nombreCategoria(c?: CategoriaRef | null): string {
  if (!c) return '—';
  return c.nombreLocal || c.nombrePersonalizado || c.id;
}

/** Parsea mapeoValores (JSON-string) a Record<string,string[]>. */
export function parseMapeo(raw?: string | null): Record<string, string[]> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj as Record<string, string[]> : {};
  } catch { return {}; }
}
