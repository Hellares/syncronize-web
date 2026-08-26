import type { CompraDetalleItem, CompraGastoItem, DetalleProductoRef } from '@/core/types/compra';
import type { HistorialComprasProducto } from '@/core/types/compra';
import { nombreUnidad, simboloUnidad } from '@/core/types/producto';

/**
 * Como se vuelve a abrir en el formulario una linea que YA esta guardada.
 *
 * 🔴 El backend guarda `cantidad` y `precioUnitario` SIEMPRE en unidad atomica.
 * Lo que el usuario escribio (3 SACOS a S/50, 15 kg a S/8) hay que
 * reconstruirlo, y equivocarse no rompe nada visible: los numeros simplemente
 * cambian solos al volver a guardar.
 *
 * Es el espejo de `domain/linea_guardada.dart` del app.
 */

export type LineaForm = {
  productoId?: string;
  /** Variante concreta que se compra. Sin esto la compra se cuelga del producto
   *  PADRE, y en un producto con variantes el stock vive en las filas de
   *  variante: quedaria un residual que no corresponde a nada vendible. */
  varianteId?: string;
  /** Linea que vino de una orden de compra. Viaja de vuelta al guardar: sin
   *  ella, confirmar la compra deja de descontar lo recibido de la orden. */
  ordenCompraDetalleId?: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  descuento?: number;
  /** IGV con el que se guardo la linea. Viaja de vuelta al editar o el backend
   *  la recalcula con el 18 por defecto. */
  porcentajeIGV?: number;
  // Empaque variable (solo productos con unidad de compra configurada)
  unidadCompraNombre?: string;
  unidadBaseNombre?: string;
  /** Simbolo corto de la unidad de VENTA (g, und): el que va en la
   *  equivalencia "entran 66000 g". El nombre largo se lee mal ahi. */
  unidadVentaSimbolo?: string;
  factorProducto?: number;      // factor configurado en el producto
  usaUnidadCompra?: boolean;    // toggle "Comprar por {unidadCompra}"
  factor?: string;              // override editable por línea (default = factorProducto)
  nuevoPrecioVenta?: string;    // ajustar precio de venta al confirmar
  // Contexto (no viaja al backend): hint de costo + historial de compras
  /** Presentacion de la variante: la cantidad y el precio se ESCRIBEN en esta
   *  unidad (kg) y se convierten a la atomica (g) al guardar. Sin esto, S/11
   *  el kilo viajaria como S/11 el GRAMO. */
  factorPres?: number;
  simboloPres?: string;
  costoActual?: number | null;
  precioVentaActual?: number | null;
  /** Stock que YA hay en la sede, en unidad atomica. Sin esto no se puede
   *  proyectar el promedio ponderado. */
  stockActual?: number | null;
  historial?: HistorialComprasProducto | null;
  historialAbierto?: boolean;
};

/** Un gasto de la factura mientras se escribe (monto como TEXTO, igual que las lineas). */
export type GastoForm = {
  concepto: string;
  monto: string;
  prorratea: boolean;
  /** Se conservan al editar aunque la web todavia no los ofrezca: guardar
   *  REEMPLAZA la lista entera de gastos, asi que un gasto que vuelve sin su
   *  criterio o sin su categoria los PIERDE. */
  criterio?: 'VALOR' | 'CANTIDAD';
  categoriaGastoId?: string | null;
};

/** Decimal de Prisma: llega como string. */
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Numero → texto de input, sin ceros de relleno: 3 · 147.99 · 0.006727 */
const txt = (n: number) => String(parseFloat(n.toFixed(6)));

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Precio por saco/paquete, reconstruido desde la PLATA de la linea.
 *
 * 🔴 No se multiplica el precio atomico por el factor: el backend lo guardo
 * redondeado a 6 decimales, asi que un saco de S/147.99 volveria como
 * S/147.994 — visible en el campo, y raro. El bruto de la linea si es exacto:
 * es `total` cuando el precio lleva el IGV adentro y `subtotal` cuando el IGV
 * va por encima (que es como entran las recepciones desde una OC).
 */
function precioPorUnidadDeCompra(d: CompraDetalleItem, precioIncluyeIgv: boolean): number {
  const cantidad = num(d.cantidadOriginal);
  if (cantidad <= 0) return round6(num(d.precioUnitario) * (num(d.factorAplicado) || 1));
  const bruto = precioIncluyeIgv ? num(d.total) : num(d.subtotal);
  return round6((bruto + num(d.descuento)) / cantidad);
}

/** Rearma la linea del formulario a partir de una ya guardada. */
export function lineaDesdeDetalleGuardado(
  d: CompraDetalleItem,
  precioIncluyeIgv: boolean,
): LineaForm {
  const producto = d.producto ?? undefined;
  const variante = d.variante ?? undefined;
  const factorAplicado = num(d.factorAplicado);
  const porEmpaque = !!d.usaUnidadCompra && factorAplicado > 0;

  // La presentacion se resuelve POR VARIANTE cuando la tiene: un bulto cerrado
  // se compra por unidad aunque su producto se guarde en gramos.
  const fuentePres: DetalleProductoRef | undefined =
    num(variante?.factorPresentacion) > 0 ? variante : producto;
  const factorPres = num(fuentePres?.factorPresentacion) > 1
    ? num(fuentePres?.factorPresentacion)
    : undefined;

  // Con el empaque prendido la cantidad y el precio se escriben POR SACO y la
  // presentacion no se aplica (los dos re-expresan el mismo campo).
  const fCarga = porEmpaque ? 1 : (factorPres ?? 1);
  const cantidad = porEmpaque ? num(d.cantidadOriginal) : d.cantidad / fCarga;
  const precio = porEmpaque
    ? precioPorUnidadDeCompra(d, precioIncluyeIgv)
    : round6(num(d.precioUnitario) * fCarga);

  // El precio de venta se guarda por unidad de VENTA y se escribe en la de
  // presentacion, tenga o no empaque prendido.
  const nuevoPV = num(d.nuevoPrecioVenta);

  const factorProducto = num(producto?.factorCompra) > 0
    ? num(producto?.factorCompra)
    : (factorAplicado > 0 ? factorAplicado : undefined);

  return {
    ...(d.productoId ? { productoId: d.productoId } : {}),
    ...(d.varianteId ? { varianteId: d.varianteId } : {}),
    ...(d.ordenCompraDetalleId ? { ordenCompraDetalleId: d.ordenCompraDetalleId } : {}),
    descripcion: d.descripcion,
    cantidad: txt(cantidad),
    precioUnitario: txt(precio),
    descuento: num(d.descuento),
    porcentajeIGV: num(d.porcentajeIGV),
    unidadCompraNombre: d.unidadOriginalSimbolo ?? nombreUnidad(producto?.unidadCompra),
    unidadBaseNombre: nombreUnidad(variante?.unidadMedida ?? producto?.unidadMedida),
    unidadVentaSimbolo: simboloUnidad(variante?.unidadMedida ?? producto?.unidadMedida),
    ...(factorProducto ? { factorProducto } : {}),
    ...(porEmpaque ? { usaUnidadCompra: true, factor: String(factorAplicado) } : {}),
    ...(nuevoPV > 0 ? { nuevoPrecioVenta: txt(nuevoPV * (factorPres ?? 1)) } : {}),
    ...(factorPres ? { factorPres } : {}),
    simboloPres: simboloUnidad(fuentePres?.unidadPresentacion),
    // El costo y el stock de la sede no viven en la compra: la linea se reabre
    // sin proyeccion de costo hasta que se toque el producto.
    costoActual: null,
    precioVentaActual: null,
    stockActual: null,
  };
}

/** Un gasto guardado, en la forma con la que lo escribe el formulario. */
export function gastoDesdeGuardado(g: CompraGastoItem): GastoForm {
  return {
    concepto: g.concepto,
    monto: txt(num(g.monto)),
    prorratea: g.prorratea,
    criterio: g.criterio,
    categoriaGastoId: g.categoriaGastoId ?? null,
  };
}
