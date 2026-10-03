import type { Producto, ProductoVariante } from '@/core/types/producto';
import { infoPrecioEfectivo } from '@/core/types/producto';
import { coincideTodosLosTerminos, normalizarTexto, terminosBusqueda } from '@/core/utils/busqueda-texto';
import { CLAVE_ATRIBUTO_DISENO } from './variantes/SepararPorDisenoDialog';
import { claveColeccion } from './variantes/coleccion-disenos';

/**
 * Un producto que aparece en la búsqueda POR SUS VARIANTES, no por su nombre:
 * quien pide "un CRISTAL" no sabe que el producto se llama EDREDONES. Paridad
 * con el app (`busqueda_variantes.dart`); el backend indexa lo mismo en
 * `Producto.textoBusqueda`, por eso el servidor ya lo devuelve.
 */
export interface CoincidenciaVariantes {
  /** Las variantes activas que coinciden. */
  variantes: ProductoVariante[];
  /** Para el selector de variantes: solo las palabras que NO explica el producto. */
  consulta: string;
  /** El valor que coincidió ("CRISTAL"): el título de la card. */
  valor: string;
  /** Cuántas colecciones lo tienen (TELA con sus diseños cuenta una). */
  colecciones: number;
}

/** Texto del producto en sí (lo que el backend indexa del producto). */
function textoDeProducto(p: Producto): string {
  return [p.nombre, p.descripcion, p.codigoEmpresa, p.sku, p.codigoBarras, p.marca?.nombre, p.categoria?.nombre]
    .filter(Boolean)
    .join(' ');
}

/**
 * Lo que se busca de una variante: sus valores sin el Diseño (D1, D2… no los
 * busca nadie) y, si no tiene atributos, su nombre. El nombre de una variante
 * con atributos NO entra: lleva el "D1" adentro. Mismo criterio que el backend.
 */
function valoresBuscables(v: ProductoVariante): string[] {
  if (!v.atributosValores?.length) return [v.nombre];
  return v.atributosValores
    .filter((a) => a.atributo.clave !== CLAVE_ATRIBUTO_DISENO)
    .map((a) => a.valor);
}

/**
 * Si `p` aparece en la búsqueda `query` SOLO por sus variantes, cuáles y cómo
 * rotularlo. Null si coincide por su propio nombre (la card de siempre), si no
 * coincide o si no tiene variantes.
 */
export function coincidenciaPorVariantes(p: Producto, query: string): CoincidenciaVariantes | null {
  const terminos = terminosBusqueda(query);
  if (!terminos.length) return null;
  const variantes = (p.variantes ?? []).filter((v) => v.isActive !== false);
  if (!variantes.length) return null;

  const textoProducto = textoDeProducto(p);
  if (coincideTodosLosTerminos(textoProducto, terminos)) return null;

  const coinciden = variantes.filter((v) =>
    coincideTodosLosTerminos(`${textoProducto} ${valoresBuscables(v).join(' ')}`, terminos),
  );
  if (!coinciden.length) return null;

  // Las palabras que pone la variante, no el producto.
  const propios = terminos.filter((t) => !coincideTodosLosTerminos(textoProducto, [t]));
  const v0 = coinciden[0];
  const valor =
    [...valoresBuscables(v0), v0.nombre].find((c) => propios.some((t) => normalizarTexto(c).includes(t))) ??
    v0.nombre;

  return {
    variantes: coinciden,
    consulta: propios.join(' '),
    valor,
    colecciones: new Set(coinciden.map(claveColeccion)).size,
  };
}

/** Stock en la sede de las variantes que coincidieron. */
export function stockDeCoincidencia(c: CoincidenciaVariantes, sedeId: string): number {
  return c.variantes.reduce(
    (s, v) => s + (v.stocksPorSede?.find((x) => x.sedeId === sedeId)?.cantidad ?? 0),
    0,
  );
}

/** El precio más bajo de esas variantes y si no todas cuestan igual ("desde"). */
export function precioDeCoincidencia(c: CoincidenciaVariantes, sedeId: string): { minimo: number | null; variado: boolean } {
  const precios = c.variantes
    .map((v) => {
      const fila = v.stocksPorSede?.find((x) => x.sedeId === sedeId && x.precioConfigurado)
        ?? v.stocksPorSede?.find((x) => x.precioConfigurado);
      const ef = fila ? infoPrecioEfectivo(fila) : null;
      return ef != null ? Number(ef) : null;
    })
    .filter((x): x is number => x != null);
  if (!precios.length) return { minimo: null, variado: false };
  const minimo = Math.min(...precios);
  return { minimo, variado: precios.some((x) => Math.abs(x - minimo) > 0.0001) };
}
