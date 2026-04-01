// --- Maestros ---

export interface CategoriaMaestra {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  imagen?: string;
  padreId?: string;
  nivel: number;
  orden?: number;
  esPopular: boolean;
  isActive: boolean;
}

export interface MarcaMaestra {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  logo?: string;
  sitioWeb?: string;
  paisOrigen?: string;
  esPopular: boolean;
  isActive: boolean;
}

export type CategoriaUnidad = 'CANTIDAD' | 'MASA' | 'LONGITUD' | 'AREA' | 'VOLUMEN' | 'TIEMPO' | 'SERVICIO';

export interface UnidadMedidaMaestra {
  id: string;
  codigo: string;
  nombre: string;
  simbolo?: string;
  descripcion?: string;
  categoria: CategoriaUnidad;
  esPopular: boolean;
  orden?: number;
  isActive: boolean;
}

// --- Empresa (activados) ---

export interface EmpresaCategoria {
  id: string;
  empresaId: string;
  categoriaMaestraId?: string;
  nombrePersonalizado?: string;
  descripcionPersonalizada?: string;
  nombreLocal?: string;
  orden?: number;
  isVisible: boolean;
  isActive: boolean;
  categoriaMaestra?: CategoriaMaestra;
}

export interface EmpresaMarca {
  id: string;
  empresaId: string;
  marcaMaestraId?: string;
  nombrePersonalizado?: string;
  descripcionPersonalizada?: string;
  logoPersonalizado?: string;
  nombreLocal?: string;
  orden?: number;
  isVisible: boolean;
  isActive: boolean;
  marcaMaestra?: MarcaMaestra;
}

export interface EmpresaUnidadMedida {
  id: string;
  empresaId: string;
  unidadMaestraId?: string;
  nombrePersonalizado?: string;
  simboloPersonalizado?: string;
  codigoPersonalizado?: string;
  descripcion?: string;
  nombreLocal?: string;
  simboloLocal?: string;
  orden?: number;
  isVisible: boolean;
  isActive: boolean;
  unidadMaestra?: UnidadMedidaMaestra;
}

// --- DTOs ---

export interface ActivarCategoriaDto {
  empresaId: string;
  categoriaMaestraId?: string;
  nombrePersonalizado?: string;
  descripcionPersonalizada?: string;
  nombreLocal?: string;
  orden?: number;
}

export interface ActivarMarcaDto {
  empresaId: string;
  marcaMaestraId?: string;
  nombrePersonalizado?: string;
  descripcionPersonalizada?: string;
  nombreLocal?: string;
  orden?: number;
}

export interface ActivarUnidadDto {
  empresaId: string;
  unidadMaestraId?: string;
  nombrePersonalizado?: string;
  simboloPersonalizado?: string;
  codigoPersonalizado?: string;
  descripcion?: string;
  nombreLocal?: string;
  simboloLocal?: string;
  orden?: number;
}

// --- Helpers ---

export function getNombreDisplay(item: EmpresaCategoria): string {
  return item.nombreLocal || item.categoriaMaestra?.nombre || item.nombrePersonalizado || '';
}

export function getMarcaNombreDisplay(item: EmpresaMarca): string {
  return item.nombreLocal || item.marcaMaestra?.nombre || item.nombrePersonalizado || '';
}

export function getUnidadNombreDisplay(item: EmpresaUnidadMedida): string {
  return item.nombreLocal || item.unidadMaestra?.nombre || item.nombrePersonalizado || '';
}

export function getUnidadSimboloDisplay(item: EmpresaUnidadMedida): string {
  return item.simboloLocal || item.unidadMaestra?.simbolo || item.simboloPersonalizado || '';
}
