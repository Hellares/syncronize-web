import { AxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

/**
 * Plantillas de VARIANTES ("Edredones", "Peluches"): la estructura de una
 * colección —sus combinaciones y precios sugeridos— para crear otra igual
 * (DINOSAURIO) de una vez. ≠ plantillas de ATRIBUTOS. Paridad con el app
 * (`variante_plantilla_api.dart`); backend `/variante-plantillas`.
 */

const BASE = '/variante-plantillas';

export interface ValorPlantilla {
  atributoId: string;
  valor: string;
}

export interface NivelPlantilla {
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number | null;
  tipoPrecio: 'PRECIO_FIJO' | 'PORCENTAJE_DESCUENTO';
  precio?: number | null;
  porcentajeDesc?: number | null;
}

export interface CombinacionPlantilla {
  id?: string;
  /** Sin el atributo de colección. */
  valores: ValorPlantilla[];
  precio: number | null;
  precioCosto: number | null;
  /** Precios por mayor sugeridos: se conservan al editar. */
  niveles: NivelPlantilla[];
}

export interface AtributoDePlantilla {
  id: string;
  nombre: string;
  clave: string | null;
  activo: boolean;
}

export interface VariantePlantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  atributoColeccion: AtributoDePlantilla;
  /** En el orden del NOMBRE: puede incluir la colección en su lugar. */
  atributos: AtributoDePlantilla[];
  combinaciones: CombinacionPlantilla[];
}

export interface ResultadoAplicar {
  creadas: { id: string; nombre: string }[];
  /** Nombres de las que ya existían: no se duplican. */
  omitidas: string[];
}

/** "TELA · 3 PZS · HOMBRE" */
export const etiquetaCombinacion = (c: CombinacionPlantilla) =>
  c.valores.map((v) => v.valor).join(' · ');

export async function listarPlantillas(): Promise<VariantePlantilla[]> {
  const res = await apiClient.get<VariantePlantilla[]>(BASE);
  return res.data;
}

export async function guardarPlantilla(
  data: {
    nombre: string;
    atributoColeccionId: string;
    atributoIds: string[];
    combinaciones: CombinacionPlantilla[];
  },
  id?: string,
): Promise<VariantePlantilla> {
  const body = {
    ...data,
    combinaciones: data.combinaciones.map((c) => ({
      valores: c.valores,
      precio: c.precio,
      precioCosto: c.precioCosto,
      niveles: c.niveles,
    })),
  };
  const res = id
    ? await apiClient.put<VariantePlantilla>(`${BASE}/${id}`, body)
    : await apiClient.post<VariantePlantilla>(BASE, body);
  return res.data;
}

export async function eliminarPlantilla(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** "Guardar como plantilla" una colección existente (ej. CRISTAL). */
export async function plantillaDesdeColeccion(data: {
  nombre: string;
  productoId: string;
  atributoColeccionId: string;
  valorColeccion: string;
}): Promise<VariantePlantilla> {
  const res = await apiClient.post<VariantePlantilla>(`${BASE}/desde-coleccion`, data);
  return res.data;
}

/** Crea la colección nueva en el producto: en 0, con sus precios. */
export async function aplicarPlantilla(
  plantillaId: string,
  data: {
    productoId: string;
    valorColeccion: string;
    combinaciones: { combinacionId: string; precio: number | null; precioCosto: number | null }[];
  },
): Promise<ResultadoAplicar> {
  const res = await apiClient.post<ResultadoAplicar>(`${BASE}/${plantillaId}/aplicar`, data);
  return res.data;
}

/** El mensaje del backend, o el de respaldo. */
export function mensajeDeError(e: unknown, respaldo: string): string {
  const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
  if (Array.isArray(msg)) return msg.join(' · ');
  return typeof msg === 'string' ? msg : respaldo;
}
