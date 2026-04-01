import { apiClient } from '@/core/api/client';
import { getTenantId } from '@/core/auth/token-service';
import type {
  CategoriaMaestra, MarcaMaestra, UnidadMedidaMaestra,
  EmpresaCategoria, EmpresaMarca, EmpresaUnidadMedida,
  ActivarCategoriaDto, ActivarMarcaDto, ActivarUnidadDto,
  CategoriaUnidad,
} from '@/core/types/catalogo';

function empresaId(): string {
  return getTenantId() || '';
}

// --- Categorías ---

export async function getCategoriasMaestras(): Promise<CategoriaMaestra[]> {
  const res = await apiClient.get<CategoriaMaestra[]>('/catalogos/categorias-maestras');
  return res.data;
}

export async function getCategoriasEmpresa(): Promise<EmpresaCategoria[]> {
  const res = await apiClient.get<EmpresaCategoria[]>(`/catalogos/categorias/empresa/${empresaId()}`);
  return res.data;
}

export async function activarCategoria(data: ActivarCategoriaDto): Promise<EmpresaCategoria> {
  const res = await apiClient.post<EmpresaCategoria>('/catalogos/categorias/activar', data);
  return res.data;
}

export async function desactivarCategoria(empresaCategoriaId: string): Promise<void> {
  await apiClient.delete(`/catalogos/categorias/empresa/${empresaId()}/${empresaCategoriaId}`);
}

// --- Marcas ---

export async function getMarcasMaestras(): Promise<MarcaMaestra[]> {
  const res = await apiClient.get<MarcaMaestra[]>('/catalogos/marcas-maestras');
  return res.data;
}

export async function getMarcasEmpresa(): Promise<EmpresaMarca[]> {
  const res = await apiClient.get<EmpresaMarca[]>(`/catalogos/marcas/empresa/${empresaId()}`);
  return res.data;
}

export async function activarMarca(data: ActivarMarcaDto): Promise<EmpresaMarca> {
  const res = await apiClient.post<EmpresaMarca>('/catalogos/marcas/activar', data);
  return res.data;
}

export async function desactivarMarca(empresaMarcaId: string): Promise<void> {
  await apiClient.delete(`/catalogos/marcas/empresa/${empresaId()}/${empresaMarcaId}`);
}

// --- Unidades de Medida ---

export async function getUnidadesMaestras(categoria?: CategoriaUnidad): Promise<UnidadMedidaMaestra[]> {
  const params = categoria ? `?categoria=${categoria}` : '';
  const res = await apiClient.get<UnidadMedidaMaestra[]>(`/catalogos/unidades-maestras${params}`);
  return res.data;
}

export async function getUnidadesEmpresa(): Promise<EmpresaUnidadMedida[]> {
  const res = await apiClient.get<EmpresaUnidadMedida[]>(`/catalogos/unidades/empresa/${empresaId()}`);
  return res.data;
}

export async function activarUnidad(data: ActivarUnidadDto): Promise<EmpresaUnidadMedida> {
  const res = await apiClient.post<EmpresaUnidadMedida>('/catalogos/unidades/activar', data);
  return res.data;
}

export async function desactivarUnidad(unidadId: string): Promise<void> {
  await apiClient.delete(`/catalogos/unidades/empresa/${empresaId()}/${unidadId}`);
}

// --- Simple types for backward compatibility (ProductoFilters, ProductoForm) ---

export interface CatalogoItem {
  id: string;
  nombre: string;
  slug?: string;
  logo?: string;
}

export interface UnidadMedida {
  id: string;
  nombre: string;
  abreviatura?: string;
}

// Simple getters
export async function getCategorias(): Promise<CatalogoItem[]> {
  const items = await getCategoriasEmpresa();
  return items.map((c) => ({
    id: c.id,
    nombre: c.nombreLocal || c.categoriaMaestra?.nombre || c.nombrePersonalizado || '',
    slug: c.categoriaMaestra?.slug,
  }));
}

export async function getMarcas(): Promise<CatalogoItem[]> {
  const items = await getMarcasEmpresa();
  return items.map((m) => ({
    id: m.id,
    nombre: m.nombreLocal || m.marcaMaestra?.nombre || m.nombrePersonalizado || '',
    slug: m.marcaMaestra?.slug,
    logo: m.logoPersonalizado || m.marcaMaestra?.logo,
  }));
}

export async function getUnidadesMedida(): Promise<UnidadMedida[]> {
  const items = await getUnidadesEmpresa();
  return items.map((u) => ({
    id: u.id,
    nombre: u.nombreLocal || u.unidadMaestra?.nombre || u.nombrePersonalizado || '',
    abreviatura: u.simboloLocal || u.unidadMaestra?.simbolo || u.simboloPersonalizado,
  }));
}
