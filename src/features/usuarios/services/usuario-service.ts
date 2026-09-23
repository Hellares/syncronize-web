import { apiClient } from '@/core/api/client';
import type {
  ActualizarUsuarioDto,
  PermisosDeUsuario,
  PermisosPorRol,
  RegistrarUsuarioDto,
  RegistroUsuarioResponse,
  Usuario,
  UsuarioFiltros,
  UsuariosPaginados,
} from '@/core/types/usuario';

/** El tenant viaja en el header `x-tenant-id` que pone el cliente. */
const BASE = '/usuarios';

export async function listarUsuarios(filtros: UsuarioFiltros = {}): Promise<UsuariosPaginados> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const query = q.toString();
  const res = await apiClient.get(`${BASE}${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getUsuario(id: string): Promise<Usuario> {
  const res = await apiClient.get(`${BASE}/${id}`);
  return res.data;
}

/**
 * Da de alta a un trabajador. Si el DNI ya tiene cuenta (en otra empresa, o
 * acá como CLIENTE) el backend lo reutiliza y solo crea el vínculo.
 */
export async function registrarUsuario(dto: RegistrarUsuarioDto): Promise<RegistroUsuarioResponse> {
  const res = await apiClient.post(`${BASE}/registrar`, dto);
  return res.data;
}

export async function actualizarUsuario(id: string, dto: ActualizarUsuarioDto): Promise<Usuario> {
  const res = await apiClient.patch(`${BASE}/${id}`, dto);
  return res.data;
}

/** Soft delete en la empresa y en todas sus sedes. */
export async function desactivarUsuario(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function reactivarUsuario(id: string): Promise<void> {
  await apiClient.post(`${BASE}/${id}/reactivar`);
}

export async function getPermisosDeUsuario(id: string): Promise<PermisosDeUsuario> {
  const res = await apiClient.get(`${BASE}/${id}/permisos`);
  return res.data;
}

export async function getPermisosPorRol(): Promise<PermisosPorRol> {
  const res = await apiClient.get(`${BASE}/permisos-por-rol`);
  return res.data;
}
