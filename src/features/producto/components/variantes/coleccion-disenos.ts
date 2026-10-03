import type { ProductoVariante } from '@/core/types/producto';
import { CLAVE_ATRIBUTO_DISENO, esDiseno } from './SepararPorDisenoDialog';

/**
 * Lo que identifica a una colección: los valores de los atributos SIN el
 * diseño. Misma regla que el backend (numeración de diseños) y que el app.
 */
export function claveColeccion(v: ProductoVariante): string {
  return v.atributosValores
    .filter((a) => a.atributo.clave !== CLAVE_ATRIBUTO_DISENO)
    .map((a) => `${a.atributoId}=${(a.valor ?? '').trim().toUpperCase()}`)
    .sort()
    .join('|');
}

/** "D3" de un diseño (null si no es diseño). */
export function valorDiseno(v: ProductoVariante): string | null {
  return v.atributosValores.find((a) => a.atributo.clave === CLAVE_ATRIBUTO_DISENO)?.valor ?? null;
}

function numeroDiseno(v: ProductoVariante): number {
  return Number((valorDiseno(v) ?? '').replace(/^\D+/, '')) || 0;
}

/** El nombre de la colección: el del diseño sin su " / D3" final. */
export function tituloColeccion(v: ProductoVariante): string {
  const d = valorDiseno(v);
  if (!d) return v.nombre;
  const escapado = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return v.nombre.replace(new RegExp(`\\s*/\\s*${escapado}\\s*$`), '');
}

/**
 * El nombre corto de la colección ("ALIANZA"): el valor del atributo que es la
 * colección —clave `dise_o` en JAYLI, o uno que se llame "Colección"—; sin él,
 * el último tramo del nombre sin el diseño. Misma regla que el app.
 */
export function nombreColeccion(v: ProductoVariante): string {
  for (const a of v.atributosValores) {
    const clave = (a.atributo.clave ?? '').toLowerCase();
    const esColeccion = clave === 'dise_o' || clave === 'coleccion'
      || (a.atributo.nombre ?? '').toLowerCase().includes('colec');
    if (esColeccion && (a.valor ?? '').trim()) return a.valor.trim();
  }
  const partes = tituloColeccion(v).split('/').map((x) => x.trim()).filter(Boolean);
  return partes.length ? partes[partes.length - 1] : v.nombre;
}

export type FilaVariantes =
  | { tipo: 'variante'; variante: ProductoVariante }
  | { tipo: 'coleccion'; clave: string; disenos: ProductoVariante[] };

/**
 * Junta los diseños de cada colección en una fila, en el lugar donde aparece
 * el primero, ordenados por número (D9 antes que D10). Lo que no es diseño
 * queda suelto (incluida la variante de la colección si todavía tiene
 * unidades sin separar: tiene su propia acción de separar).
 */
export function agruparPorColeccion(variantes: ProductoVariante[]): FilaVariantes[] {
  const filas: FilaVariantes[] = [];
  const grupos = new Map<string, ProductoVariante[]>();
  for (const v of variantes) {
    if (!esDiseno(v)) {
      filas.push({ tipo: 'variante', variante: v });
      continue;
    }
    const clave = claveColeccion(v);
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.push(v);
    } else {
      const nuevo = [v];
      grupos.set(clave, nuevo);
      filas.push({ tipo: 'coleccion', clave, disenos: nuevo });
    }
  }
  for (const g of grupos.values()) g.sort((a, b) => numeroDiseno(a) - numeroDiseno(b));
  return filas;
}
