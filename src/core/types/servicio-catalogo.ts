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
  plantillaServicioId?: string;
  impuestoPorcentaje?: number;
}

export interface PlantillaServicio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  serviciosCount?: number;
  [key: string]: unknown;
}

export type TipoCampoServicio =
  | 'TEXTO' | 'NUMERO' | 'EMAIL' | 'FECHA' | 'HORA' | 'TEXTO_AREA'
  | 'OPCION_SIMPLES' | 'OPCION_MULTIPLE' | 'CHECKBOX' | 'CHECKBOX_MULTIPLE'
  | 'ARCHIVO' | 'TELEFONO' | 'URL' | 'OBJETO' | 'PATRON_DESBLOQUEO' | 'INSPECCION_VISUAL';

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
