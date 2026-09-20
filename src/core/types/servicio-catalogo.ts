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
  | 'ARCHIVO' | 'TELEFONO' | 'URL' | 'OBJETO' | 'PATRON_DESBLOQUEO' | 'INSPECCION_VISUAL'
  | 'CODIGO_BARRAS' | 'PIN_CLAVE' | 'MONEDA' | 'FIRMA' | 'DOCUMENTO_IDENTIDAD'
  | 'TABLA' | 'PLACA_VEHICULO' | 'LICENCIA_CONDUCIR' | 'FOTO'
  | 'PRODUCTO_CATALOGO' | 'OPCION_DEPENDIENTE';

/** 27 tipos de campo (paridad con el catálogo de tipos de Flutter). */
export const TIPOS_CAMPO: TipoCampoServicio[] = [
  'TEXTO', 'NUMERO', 'EMAIL', 'FECHA', 'HORA', 'TEXTO_AREA',
  'OPCION_SIMPLES', 'OPCION_MULTIPLE', 'CHECKBOX', 'CHECKBOX_MULTIPLE',
  'ARCHIVO', 'TELEFONO', 'URL', 'OBJETO', 'PATRON_DESBLOQUEO', 'INSPECCION_VISUAL',
  'CODIGO_BARRAS', 'PIN_CLAVE', 'MONEDA', 'FIRMA', 'DOCUMENTO_IDENTIDAD',
  'TABLA', 'PLACA_VEHICULO', 'LICENCIA_CONDUCIR', 'FOTO', 'PRODUCTO_CATALOGO',
  'OPCION_DEPENDIENTE',
];
export const TIPO_CAMPO_LABEL: Record<TipoCampoServicio, string> = {
  TEXTO: 'Texto', NUMERO: 'Número', EMAIL: 'Email', FECHA: 'Fecha', HORA: 'Hora',
  TEXTO_AREA: 'Texto largo', OPCION_SIMPLES: 'Selección simple', OPCION_MULTIPLE: 'Selección múltiple',
  CHECKBOX: 'Checkbox', CHECKBOX_MULTIPLE: 'Checkbox múltiple', ARCHIVO: 'Archivo',
  TELEFONO: 'Teléfono', URL: 'URL', OBJETO: 'Objeto (sub-campos)',
  PATRON_DESBLOQUEO: 'Patrón desbloqueo', INSPECCION_VISUAL: 'Inspección visual',
  // En web no hay cámara: el default del renderer lo pinta como input de
  // texto, que es justo lo que necesita un lector USB (teclea el código).
  CODIGO_BARRAS: 'Código de barras (IMEI, serie)',
  PIN_CLAVE: 'PIN / clave de desbloqueo',
  MONEDA: 'Monto (S/)',
  FIRMA: 'Firma del cliente',
  DOCUMENTO_IDENTIDAD: 'DNI / RUC (con autocompletado)',
  TABLA: 'Tabla (columnas y filas)',
  PLACA_VEHICULO: 'Placa (con autocompletado)',
  LICENCIA_CONDUCIR: 'Licencia de conducir',
  FOTO: 'Foto',
  PRODUCTO_CATALOGO: 'Producto del catálogo',
  OPCION_DEPENDIENTE: 'Selección en cascada (Fabricante → Modelo)',
};
/**
 * Campo con selección en CASCADA: el árbol vive en `opciones`.
 *
 *     { "niveles": ["Fabricante","Familia","Modelo"],
 *       "arbol": [ { "valor": "QUALCOMM",
 *                    "hijos": [ { "valor": "SNAPDRAGON",
 *                                 "hijos": [ { "valor": "8 Gen 3" } ] } ] } ] }
 *
 * El VALOR guardado es la ruta unida por " / " ("QUALCOMM / SNAPDRAGON /
 * 8 Gen 3"). 🔴 Separador ASCII: sale impreso en tickets térmicos.
 */
export interface NodoOpcion {
  valor: string;
  hijos?: NodoOpcion[];
}
export interface ArbolDependiente {
  niveles: string[];
  arbol: NodoOpcion[];
}
export const SEP_DEPENDIENTE = ' / ';

/** Lee `opciones` como árbol, o null si no tiene la forma (espeja al backend). */
export function leerArbolDependiente(opciones: unknown): ArbolDependiente | null {
  if (typeof opciones !== 'object' || opciones === null) return null;
  const o = opciones as Record<string, unknown>;
  const niveles = o.niveles;
  if (!Array.isArray(niveles) || niveles.length === 0) return null;
  if (!niveles.every((n) => typeof n === 'string' && n.trim() !== '')) return null;
  const esNodo = (n: unknown): n is NodoOpcion => {
    if (typeof n !== 'object' || n === null || Array.isArray(n)) return false;
    const r = n as Record<string, unknown>;
    if (typeof r.valor !== 'string' || r.valor.trim() === '') return false;
    if (r.hijos === undefined) return true;
    return Array.isArray(r.hijos) && r.hijos.every(esNodo);
  };
  const arbol = o.arbol;
  if (!Array.isArray(arbol) || !arbol.every(esNodo)) return null;
  return { niveles: niveles as string[], arbol: arbol as NodoOpcion[] };
}

/** Los hijos del nodo al que llega la ruta (o la raíz si la ruta está vacía). */
export function hijosDeRuta(a: ArbolDependiente, ruta: string[]): NodoOpcion[] {
  let nivel = a.arbol;
  for (const paso of ruta) {
    const nodo = nivel.find((n) => n.valor === paso);
    if (!nodo) return [];
    nivel = nodo.hijos ?? [];
  }
  return nivel;
}

/**
 * Texto indentado → árbol. Cada nivel se marca con 2 espacios (o un tab):
 *
 *     QUALCOMM
 *       SNAPDRAGON
 *         8 Gen 3
 *
 * Se eligió texto y no un constructor de nodos porque se tipea y se PEGA
 * rápido (una lista de modelos sale de cualquier lado), que es como se
 * cargan estas tablas de verdad.
 */
export function textoAArbol(texto: string): NodoOpcion[] {
  const raiz: NodoOpcion[] = [];
  // Pila de listas de hijos por profundidad; [0] es la raíz.
  const pila: NodoOpcion[][] = [raiz];
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const sangria = linea.match(/^[\t ]*/)?.[0] ?? '';
    // Un tab cuenta como un nivel; los espacios, de a dos.
    const prof = sangria.replace(/\t/g, '  ').length >> 1;
    const nivel = Math.min(prof, pila.length - 1);
    const nodo: NodoOpcion = { valor: linea.trim() };
    pila[nivel].push(nodo);
    nodo.hijos = [];
    pila.length = nivel + 1;
    pila.push(nodo.hijos);
  }
  const limpiar = (ns: NodoOpcion[]): NodoOpcion[] =>
    ns.map((n) => {
      const hijos = limpiar(n.hijos ?? []);
      return hijos.length > 0 ? { valor: n.valor, hijos } : { valor: n.valor };
    });
  return limpiar(raiz);
}

/** Árbol → texto indentado, para volver a editarlo. */
export function arbolATexto(nodos: NodoOpcion[], prof = 0): string {
  return nodos
    .map((n) => {
      const linea = '  '.repeat(prof) + n.valor;
      const hijos = n.hijos?.length ? '\n' + arbolATexto(n.hijos, prof + 1) : '';
      return linea + hijos;
    })
    .join('\n');
}

/** Profundidad máxima del árbol (para avisar si excede los niveles). */
export function profundidadArbol(nodos: NodoOpcion[]): number {
  return nodos.reduce(
    (max, n) => Math.max(max, 1 + profundidadArbol(n.hijos ?? [])),
    0,
  );
}

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
