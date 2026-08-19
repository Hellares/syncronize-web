import type { Producto, ProductoVariante, StockPorSedeInfo } from '@/core/types/producto';

/**
 * Qué variante se COMPRA y cuál no.
 *
 * En un par SACO→GRANEL solo el saco se le compra al proveedor. El granel entra
 * al stock ABRIENDO un bulto, y esa apertura es la que le calcula el costo por
 * promedio ponderado (un saco de S/160 que rinde 15 000 g deja el gramo en
 * 0.010667). Comprar el granel directo mete un costo TECLEADO en ese promedio
 * —el margen queda mintiendo, sin síntoma— y suma gramos sin descontar ningún
 * saco, con lo que "5 cerrados / 5 abiertos" deja de significar algo.
 *
 * No hace falta ningún campo nuevo: la regla se deriva del vínculo de apertura
 * que ya viene cargado. Es la misma que aplica el app Flutter.
 */

/** Un BULTO cerrado: se puede abrir, así que se compra. */
export function esBulto(v: ProductoVariante): boolean {
  return !!v.varianteAperturaId && Number(v.rendimientoApertura ?? 0) > 0;
}

/**
 * Ids de las variantes a las que se LLEGA abriendo un bulto (los GRANEL).
 *
 * Falla hacia el lado que no traba: si el payload viniera sin los sacos, o el
 * vínculo estuviera a medias (sin rendimiento), el granel queda comprable.
 * Nunca puede inventar un bloqueo.
 */
export function destinosDeApertura(producto: Producto): Set<string> {
  const vs = producto.variantes;
  if (!vs?.length) return new Set<string>();
  return new Set(vs.filter(esBulto).map((v) => v.varianteAperturaId as string));
}

/** El producto se repone por bulto cerrado: es el "cómo se compra esto". */
export function seCompraPorBulto(producto: Producto): boolean {
  return (producto.variantes ?? []).some(esBulto);
}

/**
 * Parte las variantes ACTIVAS en las que se compran y las que no.
 *
 * El set de destinos se resuelve UNA vez y no por variante: un producto puede
 * tener 91.
 */
export function particionarVariantes(producto: Producto): {
  comprables: ProductoVariante[];
  bloqueadas: ProductoVariante[];
} {
  const destinos = destinosDeApertura(producto);
  const comprables: ProductoVariante[] = [];
  const bloqueadas: ProductoVariante[] = [];
  for (const v of producto.variantes ?? []) {
    if (!v.isActive) continue;
    (destinos.has(v.id) ? bloqueadas : comprables).push(v);
  }
  return { comprables, bloqueadas };
}

/** Unidad en la que se le HABLA al usuario sobre esta variante. */
export interface Presentacion {
  /** Unidades de venta que trae 1 de presentación (1 kg = 1000 g). */
  factor: number;
  simbolo?: string;
}

/**
 * Si la variante trae presentación propia, esa; si no, hereda la del producto
 * —que es lo que pasa cuando se configura "kg ×1000" una sola vez—. Un bulto
 * cerrado NO hereda: tiene unidad propia distinta y ahí la del producto no
 * aplica.
 */
export function presentacionDeVariante(
  producto: Producto,
  v: ProductoVariante,
): Presentacion {
  const factorPropio = Number(v.factorPresentacion ?? 0);
  if (v.unidadPresentacionId && factorPropio > 1) {
    return { factor: factorPropio, simbolo: v.unidadPresentacionSimbolo ?? undefined };
  }
  if (esBulto(v)) return { factor: 1, simbolo: v.unidadMedida?.abreviatura ?? 'und' };
  const factorProducto = Number(producto.factorPresentacion ?? 0);
  if (factorProducto > 1) {
    return { factor: factorProducto, simbolo: producto.unidadPresentacionSimbolo ?? undefined };
  }
  return { factor: 1, simbolo: v.unidadMedida?.abreviatura ?? undefined };
}

/** Stock de la variante en una sede. */
export function stockDeVarianteEnSede(
  v: ProductoVariante,
  sedeId: string,
): StockPorSedeInfo | undefined {
  return v.stocksPorSede?.find((s) => s.sedeId === sedeId);
}

/** "S/ 160.00" · con presentación, "S/ 11.00/kg". */
export function textoCosto(
  costo: number | null | undefined,
  pres: Presentacion,
  moneda = 'S/',
): string | null {
  if (costo == null || costo <= 0) return null;
  const valor = (costo * (pres.factor > 1 ? pres.factor : 1)).toFixed(2);
  return pres.factor > 1 && pres.simbolo
    ? `${moneda} ${valor}/${pres.simbolo}`
    : `${moneda} ${valor}`;
}

/** "15 kg" · "46" — sin ceros de relleno. */
export function textoCantidad(cantidad: number, pres: Presentacion): string {
  const valor = pres.factor > 1 ? cantidad / pres.factor : cantidad;
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return pres.simbolo ? `${texto} ${pres.simbolo}` : texto;
}
