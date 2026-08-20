import type { ProductoVariante } from '@/core/types/producto';
import { simboloUnidad } from '@/core/types/producto';
import { UnidadPresentacion } from '@/core/utils/unidad-presentacion';
import { coincideTodosLosTerminos, normalizarTexto, terminosBusqueda } from '@/core/utils/busqueda-texto';

/**
 * Buscador + filtro numérico de variantes. Port de
 * `lib/features/producto/presentation/widgets/filtro_variantes.dart`, donde lo
 * comparten la edición masiva, el análisis y la gestión de variantes.
 *
 * La lógica vive acá y no dentro del componente porque tiene tres trampas que
 * ya costaron encontrar una vez: los códigos no pueden entrar al match por
 * fragmentos, el valor se compara en unidad de PRESENTACIÓN, y el stock solo se
 * puede sumar entre variantes de la misma presentación.
 */

/** Contra qué precio filtra la barra numérica. */
export const CAMPOS_PRECIO = {
  venta: 'P. Venta',
  costo: 'Costo',
  mayor: 'Por mayor',
} as const;

export type CampoPrecio = keyof typeof CAMPOS_PRECIO;

/**
 * Cómo se compara. `sin` no lleva valor: sirve para el caso más útil de todos
 * —"mostrame las que TODAVÍA no tienen precio por mayor"— que es lo que se
 * revisa al terminar de cargar una lista.
 */
export const OPS_PRECIO = {
  igual: '=',
  menor: '<',
  mayorQue: '>',
  entre: 'entre',
  sin: 'vacío',
} as const;

export type OpPrecio = keyof typeof OPS_PRECIO;

export const pideValor = (op: OpPrecio) => op !== 'sin';
export const pideDos = (op: OpPrecio) => op === 'entre';

/** Estado del buscador y del filtro numérico. */
export interface FiltroVariantes {
  busqueda: string;
  abierto: boolean;
  campo: CampoPrecio;
  op: OpPrecio;
  desde: string;
  hasta: string;
}

export const FILTRO_VACIO: FiltroVariantes = {
  busqueda: '',
  abierto: false,
  campo: 'venta',
  op: 'igual',
  desde: '',
  hasta: '',
};

/**
 * Al cerrar el panel se limpian los valores: un filtro activo pero invisible
 * haría creer que faltan variantes.
 */
export function alternarPanel(f: FiltroVariantes): FiltroVariantes {
  const abierto = !f.abierto;
  return abierto ? { ...f, abierto } : { ...f, abierto, desde: '', hasta: '' };
}

/** Cambiar de comparador limpia lo que ese comparador ya no usa. */
export function conOperador(f: FiltroVariantes, op: OpPrecio): FiltroVariantes {
  return {
    ...f,
    op,
    hasta: pideDos(op) ? f.hasta : '',
    desde: pideValor(op) ? f.desde : '',
  };
}

/** El teclado deja escribir coma: "0,5" tiene que valer lo mismo que "0.5". */
export function parseNumero(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function filtraPrecio(f: FiltroVariantes): boolean {
  if (!f.abierto) return false;
  if (!pideValor(f.op)) return true;
  return parseNumero(f.desde) != null;
}

export const filtraTexto = (f: FiltroVariantes) => f.busqueda.trim().length > 0;

export const filtroActivo = (f: FiltroVariantes) => filtraTexto(f) || filtraPrecio(f);

/**
 * La consulta lista para buscar en los CÓDIGOS, o null si no corresponde.
 *
 * 🔴 Los códigos van SEPARADOS y sin partir en palabras. Son cadenas con
 * números (`VAR-000230`, un EAN) y con el match por fragmentos del nombre
 * pasaba esto: buscando "3 pzs", el término "3" caía dentro de `VAR-000230` y
 * una variante de **5 PZS** entraba en los resultados. Un código solo tiene
 * sentido buscado entero, y con menos de 3 caracteres vuelve a enganchar medio
 * catálogo por el número.
 */
export function consultaCodigo(f: FiltroVariantes): string | null {
  const consulta = normalizarTexto(f.busqueda);
  return consulta.length >= 3 ? consulta : null;
}

/** ¿Alguno de los códigos de la variante contiene la consulta entera? */
function coincideCodigo(v: ProductoVariante, consulta: string): boolean {
  if (normalizarTexto(v.sku).includes(consulta)) return true;
  if (normalizarTexto(v.codigoEmpresa).includes(consulta)) return true;
  return !!v.codigoBarras && normalizarTexto(v.codigoBarras).includes(consulta);
}

/**
 * La presentación de la variante: sin esto el filtro numérico de un granel
 * pediría el precio POR GRAMO (0.008) cuando en pantalla dice S/8.00/kg.
 */
export function presentacionDeVariante(v: ProductoVariante): UnidadPresentacion {
  if (v.unidadPresentacionId && Number(v.factorPresentacion ?? 0) > 1) {
    return new UnidadPresentacion(Number(v.factorPresentacion), v.unidadPresentacionSimbolo);
  }
  return new UnidadPresentacion(1, null, v.unidadMedidaId ? simboloUnidad(v.unidadMedida) : null);
}

/**
 * El nivel por mayor vigente: el de menor cantidad mínima (el backend los manda
 * ordenados). Si hubiera varios cargados desde la pantalla de precios, muestra
 * el primero, igual que el app.
 */
export function nivelPorMayor(v: ProductoVariante) {
  return v.preciosNivel?.[0] ?? null;
}

/**
 * Devuelve el valor del campo pedido **en unidad de PRESENTACIÓN** — la misma
 * en la que se ve en la tabla y en la que se teclea el filtro.
 *
 * 🔴 El precio por mayor NO depende de la sede (`PrecioNivel` no tiene
 * `sedeId`), a diferencia de precio y costo.
 */
export function crearValorDe(sedeId: string | null) {
  return (v: ProductoVariante, campo: CampoPrecio): number | null => {
    const fila = sedeId ? v.stocksPorSede?.find((s) => s.sedeId === sedeId) : undefined;
    const crudo =
      campo === 'venta' ? fila?.precio
      : campo === 'costo' ? fila?.precioCosto
      : nivelPorMayor(v)?.precio;
    if (crudo == null) return null;
    return presentacionDeVariante(v).precio(Number(crudo));
  };
}

function pasaPrecio(
  f: FiltroVariantes,
  v: ProductoVariante,
  valorDe: (v: ProductoVariante, campo: CampoPrecio) => number | null,
): boolean {
  if (!filtraPrecio(f)) return true;
  const valor = valorDe(v, f.campo);
  if (f.op === 'sin') return valor == null;
  if (valor == null) return false;

  const a = parseNumero(f.desde);
  if (a == null) return true;

  switch (f.op) {
    // Tolerancia de medio centavo: los precios se muestran con 2 decimales y un
    // === sobre floats no engancharía nunca.
    case 'igual': return Math.abs(valor - a) < 0.005;
    case 'menor': return valor < a;
    case 'mayorQue': return valor > a;
    case 'entre': {
      const b = parseNumero(f.hasta);
      return b == null ? valor >= a : valor >= a && valor <= b;
    }
    default: return false;
  }
}

/** Filtra por texto Y por precio. */
export function filtrarVariantes(
  f: FiltroVariantes,
  variantes: ProductoVariante[],
  valorDe: (v: ProductoVariante, campo: CampoPrecio) => number | null,
): ProductoVariante[] {
  const terminos = terminosBusqueda(f.busqueda);
  const porCodigo = consultaCodigo(f);

  return variantes.filter((v) => {
    if (terminos.length > 0) {
      // Nombre + valores de atributo: acá sí conviene el match por fragmentos y
      // en cualquier orden, así "frozen 3 pzs" filtra de una.
      const texto = `${v.nombre} ${v.atributosValores.map((a) => a.valor).join(' ')}`;
      const porNombre = coincideTodosLosTerminos(texto, terminos);
      if (!porNombre && !(porCodigo && coincideCodigo(v, porCodigo))) return false;
    }
    return pasaPrecio(f, v, valorDe);
  });
}

/** Stock de una variante sumando todas las sedes. */
export function stockTotal(v: ProductoVariante): number {
  return v.stocksPorSede?.reduce((s, x) => s + x.cantidad, 0) ?? 0;
}

/**
 * Cuántas se ven y cuánto stock suman.
 *
 * `stock` en null = "mixto": sumar 5000 g de un granel con 2 sacos da un número
 * que no significa nada, así que se devuelve null cuando lo visible no comparte
 * presentación.
 */
export function resumenVisible(visibles: ProductoVariante[]): { cantidad: number; stock: string | null } {
  if (visibles.length === 0) return { cantidad: 0, stock: null };

  const u0 = presentacionDeVariante(visibles[0]);
  let total = 0;
  let mismaUnidad = true;
  for (const v of visibles) {
    const u = presentacionDeVariante(v);
    if (u.factor !== u0.factor || u.simboloVisible !== u0.simboloVisible) mismaUnidad = false;
    total += stockTotal(v);
  }
  if (!mismaUnidad) return { cantidad: visibles.length, stock: null };

  const texto = u0.cantidadTexto(total);
  return { cantidad: visibles.length, stock: u0.simboloVisible == null ? `${texto} u` : texto };
}
