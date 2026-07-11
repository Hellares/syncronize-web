// Catálogo de servicios + plantillas de campos — alineado con backend src/servicio.
import type { TipoServicio } from './orden-servicio';

export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  precioPorHora?: number | null;
  duracionMinutos?: number | null;
  tipoServicio?: TipoServicio | null;
  plantillaServicioId?: string | null;
  impuestoPorcentaje?: number | null;
  isActive?: boolean;
  plantillaServicio?: { id: string; nombre: string } | null;
  [key: string]: unknown;
}

export interface CreateServicioDto {
  nombre: string;
  descripcion?: string;
  precio?: number;
  precioPorHora?: number;
  duracionMinutos?: number;
  tipoServicio?: TipoServicio;
  /** null = desvincular la plantilla al editar; undefined = sin cambio */
  plantillaServicioId?: string | null;
  impuestoPorcentaje?: number;
}

export interface PlantillaServicio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  isActive?: boolean;
  serviciosCount?: number;
  campos?: CampoServicio[];
  [key: string]: unknown;
}

export interface CreatePlantillaServicioDto {
  nombre: string;
  descripcion?: string | null;
  campos?: ConfiguracionCampoDto[];
}

/** Plantilla predefinida del catálogo (hardcodeada, reutilizable). */
export interface CatalogoPlantilla {
  nombre: string;
  descripcion: string;
  icon: string;
  campos: ConfiguracionCampoDto[];
}

export type TipoCampoServicio =
  | 'TEXTO' | 'NUMERO' | 'EMAIL' | 'FECHA' | 'HORA' | 'TEXTO_AREA'
  | 'OPCION_SIMPLES' | 'OPCION_MULTIPLE' | 'CHECKBOX' | 'CHECKBOX_MULTIPLE'
  | 'ARCHIVO' | 'TELEFONO' | 'URL' | 'OBJETO' | 'PATRON_DESBLOQUEO' | 'INSPECCION_VISUAL';

/** 16 tipos de campo (paridad con configuracion_campos_page.dart de Flutter). */
export const TIPOS_CAMPO: TipoCampoServicio[] = [
  'TEXTO', 'NUMERO', 'EMAIL', 'FECHA', 'HORA', 'TEXTO_AREA',
  'OPCION_SIMPLES', 'OPCION_MULTIPLE', 'CHECKBOX', 'CHECKBOX_MULTIPLE',
  'ARCHIVO', 'TELEFONO', 'URL', 'OBJETO', 'PATRON_DESBLOQUEO', 'INSPECCION_VISUAL',
];
export const TIPO_CAMPO_LABEL: Record<TipoCampoServicio, string> = {
  TEXTO: 'Texto', NUMERO: 'Número', EMAIL: 'Email', FECHA: 'Fecha', HORA: 'Hora',
  TEXTO_AREA: 'Texto largo', OPCION_SIMPLES: 'Selección simple', OPCION_MULTIPLE: 'Selección múltiple',
  CHECKBOX: 'Checkbox', CHECKBOX_MULTIPLE: 'Checkbox múltiple', ARCHIVO: 'Archivo',
  TELEFONO: 'Teléfono', URL: 'URL', OBJETO: 'Objeto (sub-campos)',
  PATRON_DESBLOQUEO: 'Patrón desbloqueo', INSPECCION_VISUAL: 'Inspección visual',
};
/** Tipos que usan la lista `opciones` (selección). */
export const TIPOS_CAMPO_CON_OPCIONES: TipoCampoServicio[] = ['OPCION_SIMPLES', 'OPCION_MULTIPLE', 'CHECKBOX_MULTIPLE'];

export type CategoriaCampo = 'DIAGNOSTICO' | 'CLIENTE' | 'TECNICO' | 'COMPONENTE' | 'COSTOS' | 'TIEMPOS' | 'EQUIPO_CLIENTE';
export const CATEGORIAS_CAMPO: CategoriaCampo[] = ['DIAGNOSTICO', 'CLIENTE', 'TECNICO', 'COMPONENTE', 'COSTOS', 'TIEMPOS', 'EQUIPO_CLIENTE'];
export const CATEGORIA_CAMPO_LABEL: Record<CategoriaCampo, string> = {
  DIAGNOSTICO: 'Diagnóstico', CLIENTE: 'Cliente', TECNICO: 'Técnico', COMPONENTE: 'Componente',
  COSTOS: 'Costos', TIEMPOS: 'Tiempos', EQUIPO_CLIENTE: 'Equipo del Cliente',
};

/** Sub-campos para el tipo OBJETO. */
export type SubCampoTipo = 'TEXTO' | 'NUMERO' | 'CHECKBOX' | 'OPCION_SIMPLES';
export const SUB_CAMPO_TIPO_LABEL: Record<SubCampoTipo, string> = {
  TEXTO: 'Texto', NUMERO: 'Número', CHECKBOX: 'Sí/No', OPCION_SIMPLES: 'Selección',
};
export interface SubCampoObjeto { nombre: string; tipo: SubCampoTipo; opciones?: string[] }

/** Body POST/PUT /configuracion-campos-servicio */
export interface ConfiguracionCampoDto {
  nombre: string;
  tipoCampo: TipoCampoServicio;
  categoria?: string | null;
  descripcion?: string | null;
  placeholder?: string | null;
  esRequerido?: boolean;
  defaultValue?: string | null;
  opciones?: unknown;
  permiteOtro?: boolean;
  orden?: number;
}

export interface CampoServicio {
  id: string;
  nombre: string;
  tipoCampo: TipoCampoServicio;
  categoria?: string;
  descripcion?: string | null;
  placeholder?: string | null;
  esRequerido?: boolean;
  defaultValue?: string | null;
  /** JSON: array de strings o de { valor/label }. Se normaliza en la UI. */
  opciones?: unknown;
  permiteOtro?: boolean;
  orden?: number;
  [key: string]: unknown;
}

/** Normaliza opciones (string[] o {valor/value/label}[]) a strings. */
export function opcionesAStrings(opciones: unknown): string[] {
  if (!Array.isArray(opciones)) return [];
  return opciones.map((o) => {
    if (typeof o === 'string') return o;
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      return String(r.valor ?? r.value ?? r.label ?? r.nombre ?? '');
    }
    return String(o);
  }).filter(Boolean);
}
