import type { TipoPrecioNivel } from './precio';
import { UnidadPresentacion, presentacionPlana } from '@/core/utils/unidad-presentacion';

/**
 * MONITOR DE MAYOREO COMBINADO — cómo quedan agrupadas las variantes de un
 * producto según sus niveles de precio.
 *
 * El grupo es IMPLÍCITO: dos variantes combinan cuando tienen un nivel
 * equivalente (mismo mínimo, máximo, tipo y valor), no porque alguien las haya
 * puesto en una lista. Eso es lo que hace que no haga falta configurar nada — y
 * también lo que lo vuelve invisible. Estos tipos existen para poder MIRARLO
 * antes de vender.
 *
 * 🔴 Los grupos los arma el BACKEND con la misma llave que usa para cobrar. La
 * web no los recalcula a propósito: un monitor que agrupara por su cuenta
 * podría mostrar algo distinto de lo que el POS termina cobrando, que es justo
 * el problema que viene a resolver.
 */

/** Una variante dentro de un grupo (o fuera de todos). */
export interface VarianteMayoreo {
  varianteId: string;
  nombre: string;
  sku: string;
  isActive: boolean;
  /** Precio de lista en la sede consultada. Null si no está configurado. */
  precioVenta: number | null;
  stockActual: number | null;
  /**
   * Precio unitario que deja el nivel. En un nivel por PORCENTAJE cambia de
   * variante en variante, porque se aplica sobre el precio de lista de cada
   * una. Null en las que no están en ningún grupo.
   */
  precioConNivel: number | null;
  /** Cuánto baja por unidad. Null si falta alguno de los dos precios. */
  ahorroUnitario: number | null;
  /**
   * Presentación de la variante, para que el diálogo de precios de un granel
   * hable en kilos y no en gramos. Null = se vende en su unidad de venta.
   */
  unidadPresentacionSimbolo: string | null;
  factorPresentacion: number | null;
}

/** Un grupo: las variantes que suman entre sí para llegar a un mismo mínimo. */
export interface GrupoMayoreo {
  /**
   * Llave con la que el backend agrupa. Solo para identificar el grupo en la
   * UI (keys de React, expandir/colapsar); no se muestra.
   */
  clave: string;
  nombreNivel: string;
  cantidadMinima: number;
  cantidadMaxima: number | null;
  tipoPrecio: TipoPrecioNivel;
  precio: number | null;
  porcentajeDesc: number | null;
  variantes: VarianteMayoreo[];
  /**
   * Las variantes del grupo NO comparten precio de lista. La misma rebaja les
   * deja descuentos distintos: casi siempre es un precio mal cargado.
   */
  preciosVentaDispares: boolean;
  /**
   * El nivel no baja el precio de al menos una variante, así que en esa nunca
   * va a aplicar (el motor descarta el nivel que no mejora la base).
   */
  nivelSinEfecto: boolean;
}

/** La foto completa del producto. */
export interface GruposMayoreoResumen {
  productoId: string;
  productoNombre: string;
  sedeId: string | null;
  totalVariantes: number;
  /** Cuántas están en al menos un grupo (o sea, pueden hacer mayoreo). */
  variantesEnGrupo: number;
  grupos: GrupoMayoreo[];
  /** Estas NUNCA van a hacer mayoreo: no tienen ningún nivel cargado. */
  sinNivel: VarianteMayoreo[];
}

export function esPorcentaje(g: GrupoMayoreo): boolean {
  return g.tipoPrecio === 'PORCENTAJE_DESCUENTO';
}

/**
 * Un grupo de una sola variante NO combina con nadie: esa variante necesita
 * llegar al mínimo ella sola, como antes. Es la señal de que algo quedó suelto
 * — casi siempre un precio distinto por un sol.
 */
export function combinaConAlguien(g: GrupoMayoreo): boolean {
  return g.variantes.length > 1;
}

/** Unidades en stock de todo el grupo: cuánto se podría llegar a combinar. */
export function stockDelGrupo(g: GrupoMayoreo): number {
  return g.variantes.reduce((acc, v) => acc + (v.stockActual ?? 0), 0);
}

/** Grupos de una sola variante: no combinan con nadie. */
export function gruposSolitarios(r: GruposMayoreoResumen): number {
  return r.grupos.filter((g) => !combinaConAlguien(g)).length;
}

/** Grupos con algo que revisar (precios dispares o nivel sin efecto). */
export function gruposConAviso(r: GruposMayoreoResumen): number {
  return r.grupos.filter((g) => g.preciosVentaDispares || g.nivelSinEfecto).length;
}

/**
 * La presentación de un grupo: la de sus variantes, pero SOLO cuando todas
 * coinciden.
 *
 * El precio y el mínimo del nivel son uno solo para el grupo entero, así que
 * únicamente se pueden mostrar en kilos si todas hablan en kilos. Con
 * presentaciones distintas —un SACO de 50 combinando con un GRANEL de 1000, que
 * el backend agrupa igual porque comparten mínimo y precio— cualquier
 * conversión sería falsa para al menos una, y se cae a unidad de venta.
 */
export function presentacionDelGrupo(g: GrupoMayoreo): UnidadPresentacion {
  if (g.variantes.length === 0) return UnidadPresentacion.ninguna();
  const primera = presentacionPlana(g.variantes[0]);
  const todasIguales = g.variantes.every((v) => {
    const p = presentacionPlana(v);
    return p.factor === primera.factor && p.simboloVisible === primera.simboloVisible;
  });
  return todasIguales ? primera : UnidadPresentacion.ninguna();
}
