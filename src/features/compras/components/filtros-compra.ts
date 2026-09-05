import type { ProductoFiltros } from '@/core/types/producto';

/**
 * El catálogo visto desde una COMPRA, que no es el mismo que vendiendo.
 *
 * Es la misma decisión que ya tomó el app en `compra_productos_page.dart`, y
 * vale la pena repetir el porqué de cada una:
 *
 * - `mostrarTodos`: una recepción es la forma en que un producto ENTRA por
 *   primera vez a una sede. Filtrando por sede no aparecen los que todavía no
 *   viven acá, y se terminan creando duplicados.
 * - `esInsumo` sin setear (o sea, los dos): **los insumos se compran**. El
 *   catálogo de venta los esconde, y acá esconderlos deja media compra afuera.
 * - `soloProductos`: un combo no se le compra a nadie, se arma con lo que ya
 *   está en stock.
 * - `isActive`: un producto dado de baja no se repone.
 */
export const FILTROS_COMPRA: Partial<ProductoFiltros> = {
  isActive: true,
  mostrarTodos: true,
  soloProductos: true,
  esInsumo: undefined,
};
