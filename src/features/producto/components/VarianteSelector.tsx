'use client';

/**
 * Selector de variantes — port del sheet del app (`variante_selector_sheet.dart`).
 *
 * Con 5 atributos y 91 combinaciones (EDREDONES en producción) la pantalla de
 * "un renglón de chips por atributo" se vuelve una pared: hay que recorrerla
 * con el ojo y el botón de agregar queda fuera de vista. Ahora, igual que en el
 * celular:
 *
 * 1. BUSCADOR arriba de todo: se escribe "ali" y salen las combinaciones CON
 *    stock, con su precio y sus unidades; al tocar una, el acordeón queda
 *    armado.
 * 2. ACORDEÓN: un atributo desplegado por vez, los resueltos colapsan a un
 *    renglón. Cinco atributos son cinco renglones, no cinco filas de chips.
 * 3. Abre LIMPIO, sin nada marcado. La excepción es un atributo con UN solo
 *    valor: ahí no hay nada que decidir.
 * 4. Los valores SIN STOCK no se dibujan (antes iban tachados y ocupaban lo
 *    mismo). Sobrevive solo el ya elegido que se quedó sin stock, o la
 *    selección desaparecería de pantalla sin explicación.
 * 5. AGREGAR NO CIERRA: aparece la barra de "último agregado" y el stock que
 *    muestra el diálogo descuenta lo que ya se llevó. Se cierra con la X o
 *    tocando afuera.
 *
 * 🔴 Lo usan Venta Rápida (#437EFF) y Cotización (#004A94): todo cambio acá se
 * ve en las dos pantallas.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Producto, ProductoVariante, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva, simboloUnidad } from '@/core/types/producto';
import type { TipoPrecioNivel } from '@/core/types/precio';
import { coincideTodosLosTerminos, terminosBusqueda } from '@/core/utils/busqueda-texto';
import { UnidadPresentacion } from '@/core/utils/unidad-presentacion';
import * as precioNivelService from '../services/precio-nivel-service';
// La herencia presentación producto→variante ya está resuelta y probada acá;
// duplicarla sería una segunda fuente de verdad para una regla que muerde.
import { presentacionDeVariante, type Presentacion } from '@/features/compras/utils/variantes-comprables';

/** Clave sintética para variantes SIN atributos estructurados: se elige por nombre. */
const SYNTH = '__variante__';

/**
 * Valor sintético para "esta variante NO declara ese atributo".
 *
 * Se muestra como "Sin género asignado" y es elegible: así una variante a la
 * que le falta un dato que sus hermanas sí tienen sigue siendo alcanzable —
 * antes quedaba INVISIBLE, con su stock ahí (en prod, VAR-000086 / LA U).
 */
const SIN_ASIGNAR = '__sin_asignar__';

/**
 * Atributo que guarda un CÓDIGO de la unidad, no un eje por el que se elige.
 *
 * 🔴 NO arma grupo del acordeón: sus valores son únicos por variante, así que
 * el grupo tendría un chip por variante y resolver la combinación exigiría
 * elegir un código de una pared de números. Se llega a ellos por el buscador.
 */
const TIPO_CODIGO_BARRAS = 'CODIGO_BARRAS';

/**
 * A partir de cuántos caracteres una consulta puede ser un código.
 *
 * 🔴 Con consultas cortas no se miran los códigos: los SKU son `VAR-000238`,
 * así que buscar "36" —una talla— traería la 000036.
 */
const LARGO_MINIMO_CODIGO = 6;

// Íconos en SVG y no en glifos (✎ ⊕ ⌕): Amazon Ember no trae varios de esos
// dingbats y el fallback los dibuja como un rectángulo.
const svgBase = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconBuscar = () => (
  <svg width="13" height="13" {...svgBase} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
);
const IconRama = () => (
  <svg width="13" height="13" {...svgBase} strokeWidth="2" className="mt-px shrink-0"><path d="M4 4v9a3 3 0 0 0 3 3h12" /><path d="m15 12 4 4-4 4" /></svg>
);
const IconMas = () => (
  <svg width="16" height="16" {...svgBase} strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
);
const IconCheck = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} {...svgBase} strokeWidth="2.1"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
const IconCirculo = () => (
  <svg width="15" height="15" {...svgBase} strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>
);
const IconLapiz = () => (
  <svg width="13" height="13" {...svgBase} strokeWidth="1.9"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const IconChevron = () => (
  <svg width="14" height="14" {...svgBase} strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
);
const IconCarrito = () => (
  <svg width="16" height="16" {...svgBase} strokeWidth="1.9"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.3L21 7H6" /></svg>
);

interface Grupo { clave: string; nombre: string; valores: string[] }

/**
 * Nivel por volumen, en la forma mínima que se necesita acá. Sirve tanto para
 * el que viene dentro de la variante como para el que devuelve el endpoint.
 */
interface Nivel {
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number | null;
  tipoPrecio: TipoPrecioNivel;
  precio?: number | null;
  porcentajeDesc?: number | null;
  isActive?: boolean;
}

/** El valor que la variante declara para `clave`, o null si no lo declara **o si está VACÍO**. */
function valorDe(v: ProductoVariante, clave: string): string | null {
  if (clave === SYNTH) return v.nombre;
  for (const av of v.atributosValores ?? []) {
    if (av.atributo?.clave !== clave) continue;
    const valor = (av.valor ?? '').trim();
    return valor === '' ? null : valor;
  }
  return null;
}

function derivarGrupos(variantes: ProductoVariante[]): Grupo[] {
  const orden: string[] = [];
  const nombre: Record<string, string> = {};
  const valores: Record<string, string[]> = {};
  for (const v of variantes) {
    for (const av of v.atributosValores ?? []) {
      // Los códigos identifican la unidad, no son una opción entre las que se elige.
      if (av.atributo?.tipo === TIPO_CODIGO_BARRAS) continue;
      const clave = av.atributo?.clave;
      if (!clave) continue;
      // Un valor vacío no es una opción elegible: sería un chip sin texto. La
      // variante que lo tenga entra igual, por el centinela.
      const valor = (av.valor ?? '').trim();
      if (valor === '') continue;
      if (!valores[clave]) {
        valores[clave] = [];
        nombre[clave] = av.atributo.nombre ?? clave;
        orden.push(clave);
      }
      if (!valores[clave].includes(valor)) valores[clave].push(valor);
    }
  }
  // Fallback: variantes "simples" sin atributos estructurados (nombradas
  // AZUL/ROJA pero sin el atributo Color asignado).
  if (orden.length === 0 && variantes.length) {
    const nombres: string[] = [];
    for (const v of variantes) if (!nombres.includes(v.nombre)) nombres.push(v.nombre);
    return [{ clave: SYNTH, nombre: 'Variante', valores: nombres }];
  }
  // Si ALGUNAS variantes no declaran el atributo, esa ausencia entra como un
  // valor más. Tratarla como comodín sería peor: dejaría vender una
  // combinación contra una variante que no la tiene.
  for (const clave of orden) {
    if (variantes.some((v) => valorDe(v, clave) == null)) valores[clave].push(SIN_ASIGNAR);
  }
  return orden.map((c) => ({ clave: c, nombre: nombre[c], valores: valores[c] }));
}

function etiquetaValor(g: Grupo, valor: string): string {
  return valor === SIN_ASIGNAR ? `Sin ${g.nombre.toLowerCase()} asignado` : valor;
}

function imgDe(x: { archivos?: Array<{ url: string; urlThumbnail?: string }>; imagenes?: string[] } | null): string | null {
  if (!x) return null;
  if (x.archivos?.length) return x.archivos[0].urlThumbnail || x.archivos[0].url;
  if (x.imagenes?.length) return x.imagenes[0];
  return null;
}

/** Códigos por los que se puede llegar a una variante tipeando o escaneando. */
function codigosDe(v: ProductoVariante): string[] {
  const out: string[] = [];
  const agregar = (s?: string | null) => { const t = (s ?? '').trim(); if (t) out.push(t); };
  agregar(v.codigoBarras);
  agregar(v.sku);
  for (const av of v.atributosValores ?? []) {
    if (av.atributo?.tipo === TIPO_CODIGO_BARRAS) agregar(av.valor);
  }
  return out;
}

interface Props {
  producto: Producto;
  sedeId: string;
  onConfirm: (variante: ProductoVariante, cantidad: number) => void;
  onClose: () => void;
  /** Color de acento (VR #437EFF, cotización #004A94). */
  accent?: string;
  /**
   * Lo que YA está en el carrito por variante, en unidad de venta. El diálogo
   * lo descuenta del stock que muestra: como ya no se cierra al agregar, sin
   * esto se podría vender dos veces la misma unidad.
   */
  cantidadesEnCarrito?: Record<string, number>;
}

export default function VarianteSelector({
  producto, sedeId, onConfirm, onClose, accent = '#437EFF', cantidadesEnCarrito = {},
}: Props) {
  const variantes = useMemo(() => (producto.variantes ?? []).filter((v) => v.isActive !== false), [producto]);
  const grupos = useMemo(() => derivarGrupos(variantes), [variantes]);

  // Se siembra una vez y se acumula en cada agregado; el padre re-renderiza
  // después, así que leer su mapa en cada tecla llegaría tarde.
  const [enCarrito, setEnCarrito] = useState<Record<string, number>>(() => ({ ...cantidadesEnCarrito }));
  const [query, setQuery] = useState('');
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  const [ultimoAgregado, setUltimoAgregado] = useState<string | null>(null);
  const [granelTexto, setGranelTexto] = useState('');
  const buscarRef = useRef<HTMLInputElement>(null);

  const seleccionLimpia = useMemo(() => {
    const init: Record<string, string | null> = {};
    // Un grupo con UN solo valor se auto-resuelve: pedir el tap es fricción pura.
    for (const g of grupos) init[g.clave] = g.valores.length === 1 ? g.valores[0] : null;
    return init;
  }, [grupos]);
  const [seleccion, setSeleccion] = useState<Record<string, string | null>>(seleccionLimpia);
  const [cantidad, setCantidad] = useState(0);

  const stockDeSede = (stocks?: StockPorSedeInfo[]): StockPorSedeInfo | null => {
    if (!stocks?.length) return null;
    return stocks.find((s) => s.sedeId === sedeId) ?? stocks[0];
  };
  /** Stock REAL de la sede menos lo que ya está en el carrito. */
  const disponible = (v: ProductoVariante) => {
    const real = stockDeSede(v.stocksPorSede)?.cantidad ?? 0;
    return Math.max(0, real - (enCarrito[v.id] ?? 0));
  };

  /**
   * ¿La variante satisface todas las claves no-nulas de `sel`?
   *
   * ESTRICTO a propósito: si la variante no declara un atributo que `sel`
   * exige, NO coincide. Tratarlo como comodín miente sobre lo que se vende.
   */
  const coincide = (v: ProductoVariante, sel: Record<string, string | null>) => {
    for (const [clave, valor] of Object.entries(sel)) {
      if (valor == null) continue;
      const actual = valorDe(v, clave);
      if (valor === SIN_ASIGNAR) { if (actual != null) return false; continue; }
      if (actual !== valor) return false;
    }
    return true;
  };

  const candidatas = (sel: Record<string, string | null>) => variantes.filter((v) => coincide(v, sel));

  /**
   * ¿Hay que elegir algo en este grupo, con lo ya elegido?
   *
   * Un atributo que solo tienen ALGUNAS variantes no puede ser obligatorio para
   * todas: si a una sola le agregás PROCESADOR, sus hermanas quedarían
   * inalcanzables.
   */
  const grupoAplica = (g: Grupo, sel: Record<string, string | null>) =>
    g.clave === SYNTH || candidatas(sel).some((v) => valorDe(v, g.clave) != null);

  const hayStockCon = (sel: Record<string, string | null>) =>
    variantes.some((v) => coincide(v, sel) && disponible(v) > 0);

  const resolverCon = (sel: Record<string, string | null>): ProductoVariante | null => {
    const pendientes = grupos.filter((g) => grupoAplica(g, sel) && sel[g.clave] == null);
    if (pendientes.length) return null;
    const cs = candidatas(sel);
    if (!cs.length) return null;
    // Con varias en carrera gana la más específica: la que declara más atributos.
    return [...cs].sort((a, b) => (b.atributosValores?.length ?? 0) - (a.atributosValores?.length ?? 0))[0];
  };

  const valorDisponible = (clave: string, valor: string) => {
    const tentativa: Record<string, string | null> = {};
    for (const g of grupos) tentativa[g.clave] = g.clave === clave ? valor : seleccion[g.clave];
    return hayStockCon(tentativa);
  };

  const resuelta = resolverCon(seleccion);
  const stockInfo = resuelta ? stockDeSede(resuelta.stocksPorSede) : null;
  const stockRestante = resuelta ? disponible(resuelta) : 0;
  const enLiq = stockInfo ? infoLiquidacionActiva(stockInfo) : false;
  const img = imgDe(resuelta) ?? imgDe(producto);

  /**
   * 🔴 La presentación se resuelve POR VARIANTE, no por la resuelta: las
   * tarjetas y los chips muestran variantes que TODAVÍA no se eligieron, y por
   * el camino sin presentación un granel sale "125000 unidades · S/ 0.01" en
   * vez de "125 kg · S/ 11.00/kg".
   */
  const presDe = (v: ProductoVariante): Presentacion => presentacionDeVariante(producto, v);
  const upDe = (v: ProductoVariante) => { const p = presDe(v); return new UnidadPresentacion(p.factor, p.simbolo); };
  const precioDe = (v: ProductoVariante) => {
    const s = stockDeSede(v.stocksPorSede);
    return s ? infoPrecioEfectivo(s) : undefined;
  };
  const textoPrecioDe = (v: ProductoVariante, precio: number) => upDe(v).precioTexto(precio, 'S/');
  const textoCantidadDe = (v: ProductoVariante, n: number) => {
    const p = presDe(v);
    if (p.factor > 1) return upDe(v).cantidadTexto(n);
    return `${n} ${n === 1 ? 'unidad' : 'unidades'}`;
  };

  const pres = resuelta ? presDe(resuelta) : { factor: 1, simbolo: undefined };
  const esGranel = pres.factor > 1;
  const precio = resuelta ? precioDe(resuelta) : undefined;

  /**
   * Niveles por variante, pedidos BAJO DEMANDA.
   *
   * 🔴 El catálogo (`GET /productos`) no trae `preciosNivel` en las variantes
   * —`buildIncludeClause` no lo incluye— así que sin esta llamada el diálogo
   * nunca puede mostrar el precio por mayor. Se pide solo el de la combinación
   * resuelta y se cachea: en un producto de 91 variantes, traerlos todos en el
   * catálogo engordaría la respuesta más pesada del sistema. Es lo mismo que
   * hace el app (`_cargarNivelesResuelta`).
   */
  const [nivelesPorVariante, setNivelesPorVariante] = useState<Record<string, Nivel[]>>({});
  const nivelesPedidos = useRef<Set<string>>(new Set());
  const resueltaId = resuelta?.id;

  useEffect(() => {
    if (!resueltaId || nivelesPedidos.current.has(resueltaId)) return;
    nivelesPedidos.current.add(resueltaId);
    let vivo = true;
    precioNivelService.getNivelesByVariante(resueltaId)
      .then((niveles) => { if (vivo) setNivelesPorVariante((prev) => ({ ...prev, [resueltaId]: niveles })); })
      // Sin niveles se sigue vendiendo al precio de lista: no vale trabar el POS.
      .catch(() => { nivelesPedidos.current.delete(resueltaId); });
    return () => { vivo = false; };
  }, [resueltaId]);

  /** El nivel por volumen que aplicaría a la cantidad elegida. */
  const nivelAplicado = useMemo(() => {
    if (!resuelta || cantidad <= 0) return null;
    const todos: Nivel[] = nivelesPorVariante[resuelta.id] ?? resuelta.preciosNivel ?? [];
    const niveles = todos.filter(
      (n) => n.isActive !== false
        && cantidad >= n.cantidadMinima
        && (n.cantidadMaxima == null || cantidad <= n.cantidadMaxima),
    );
    if (!niveles.length) return null;
    // El más específico: el de mínimo más alto que la cantidad alcanza.
    return [...niveles].sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0];
  }, [resuelta, cantidad, nivelesPorVariante]);

  const precioNivel = useMemo(() => {
    if (!nivelAplicado || precio == null) return null;
    if (nivelAplicado.tipoPrecio === 'PORCENTAJE_DESCUENTO') {
      const pct = Number(nivelAplicado.porcentajeDesc ?? 0);
      return pct > 0 ? Number(precio) * (1 - pct / 100) : null;
    }
    const p = Number(nivelAplicado.precio ?? 0);
    return p > 0 && p < Number(precio) ? p : null;
  }, [nivelAplicado, precio]);

  // ---- Búsqueda ----
  const resultados = useMemo(() => {
    const q = query.trim();
    const terminos = terminosBusqueda(q);
    if (!terminos.length || q.length < 2) return [];
    const conCodigos = q.length >= LARGO_MINIMO_CODIGO;
    const out = variantes.filter((v) => {
      if (disponible(v) <= 0) return false;
      const partes = [v.nombre, ...grupos.map((g) => valorDe(v, g.clave) ?? '')];
      if (conCodigos) partes.push(...codigosDe(v));
      return coincideTodosLosTerminos(partes.join(' '), terminos);
    });
    return out.sort((a, b) => disponible(b) - disponible(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, variantes, grupos, enCarrito, sedeId]);

  const hayResultados = query.trim().length >= 2 && resultados.length > 0;

  // ---- Acordeón ----
  /**
   * Qué grupo va desplegado: el que se tocó; si no, el primero sin elegir; y si
   * ya está todo elegido, el último — el más granular (el diseño), que es el
   * que más se cambia en mostrador.
   */
  const claveExpandida = (() => {
    if (!grupos.length) return '';
    if (grupoExpandido) return grupoExpandido;
    for (const g of grupos) if (seleccion[g.clave] == null) return g.clave;
    return grupos[grupos.length - 1].clave;
  })();

  const combinacionTexto = grupos
    .map((g) => seleccion[g.clave])
    .filter((v): v is string => !!v && v !== SIN_ASIGNAR)
    .join(' · ');

  // ---- Acciones ----
  const fijarCantidadInicial = (v: ProductoVariante | null) => {
    const rest = v ? disponible(v) : 0;
    const granel = v ? presDe(v).factor > 1 : false;
    setGranelTexto('');
    // A granel la cantidad se teclea en kilos; por unidad arranca en 1.
    setCantidad(granel ? 0 : (rest > 0 ? 1 : 0));
  };

  const seleccionar = (clave: string, valor: string) => {
    const next: Record<string, string | null> = { ...seleccion, [clave]: valor };
    // Reparar los atributos cuya selección quedó incompatible con el nuevo
    // valor (UX e-commerce: cambiar de color a uno sin tu talla reajusta la talla).
    for (const g of grupos) {
      if (g.clave === clave || next[g.clave] == null) continue;
      if (hayStockCon(next)) continue;
      const repl = g.valores.find((val) => hayStockCon({ ...next, [g.clave]: val }));
      if (repl) next[g.clave] = repl;
    }
    // El acordeón avanza al grupo siguiente; en el último no se mueve, para
    // poder cambiar de diseño varias veces sin que el panel salte.
    const i = grupos.findIndex((g) => g.clave === clave);
    setGrupoExpandido(i >= 0 && i < grupos.length - 1 ? grupos[i + 1].clave : clave);
    setSeleccion(next);
    setUltimoAgregado(null);
    fijarCantidadInicial(resolverCon(next));
  };

  /**
   * Elegir una combinación desde el buscador: deja el acordeón como si se
   * hubiera armado a mano.
   *
   * 🔴 Se recorren los GRUPOS, no los valores de la variante: un grupo que ESTA
   * variante no declara tiene que quedar en el centinela y no en null, o la
   * combinación no se resuelve hasta marcarlo a mano.
   */
  const elegirVariante = (v: ProductoVariante) => {
    const next: Record<string, string | null> = {};
    for (const g of grupos) next[g.clave] = valorDe(v, g.clave) ?? SIN_ASIGNAR;
    setSeleccion(next);
    setQuery('');
    setUltimoAgregado(null);
    setGrupoExpandido(grupos.length ? grupos[grupos.length - 1].clave : null);
    fijarCantidadInicial(v);
  };

  const limpiar = () => {
    setSeleccion(seleccionLimpia);
    setGrupoExpandido(null);
    setUltimoAgregado(null);
    setCantidad(0);
    setGranelTexto('');
  };

  const cambiarCantidad = (delta: number) => {
    setCantidad((c) => Math.max(0, Math.min(stockRestante, c + delta)));
  };

  /** Lo tecleado en kilos → unidad de venta (gramos), que es lo que viaja al carrito. */
  const cantidadDesdeGranel = (texto: string) => {
    const limpio = texto.replace(',', '.');
    const n = Number(limpio);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * pres.factor);
  };

  const onGranelChange = (texto: string) => {
    // Solo dígitos y hasta 3 decimales, como el formatter del app: con base en
    // gramos, 3 decimales de un kilo son exactamente 1 g.
    if (texto !== '' && !/^\d*[.,]?\d{0,3}$/.test(texto)) return;
    setGranelTexto(texto);
    setCantidad(Math.min(cantidadDesdeGranel(texto), stockRestante));
  };

  const puedeAgregar = resuelta != null && stockRestante > 0 && cantidad > 0 && cantidad <= stockRestante;

  /** Agrega al carrito y DEJA EL DIÁLOGO ABIERTO. */
  const agregar = () => {
    if (!resuelta || !puedeAgregar) return;
    // El resumen se arma ANTES de limpiar: depende de la variante resuelta.
    const resumen = `${textoCantidadDe(resuelta, cantidad)} · ${combinacionTexto}`;
    onConfirm(resuelta, cantidad);
    setEnCarrito((prev) => ({ ...prev, [resuelta.id]: (prev[resuelta.id] ?? 0) + cantidad }));
    setUltimoAgregado(resumen);
    setSeleccion(seleccionLimpia);
    setGrupoExpandido(null);
    setCantidad(0);
    setGranelTexto('');
    setQuery('');
    buscarRef.current?.focus();
  };

  /**
   * Combinaciones de este producto ya en el carrito. Se cuentan combinaciones y
   * no unidades a propósito: con granel las cantidades están en unidad atómica
   * y sumar 5000 g con 2 sacos no significa nada.
   */
  const combinacionesEnCarrito = variantes.filter((v) => (enCarrito[v.id] ?? 0) > 0).length;

  const inputBuscar = 'h-[30px] w-full rounded-[6px] bg-zinc-100 pl-8 pr-8 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[min(88vh,664px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header: foto, nombre, combinación, stock y buscador ── */}
        <div className="relative shrink-0 p-4 pb-3">
          <button type="button" onClick={onClose} title="Cerrar"
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>

          {/* El precio flota a la derecha: dentro de la fila le comía el ancho
              a la columna del nombre, que es justo donde entró el buscador. */}
          {precio != null && resuelta && (
            <div className="absolute right-4 top-7 text-right">
              <p className="text-base font-bold leading-tight"
                style={{ color: enLiq ? '#dc2626' : (precioNivel != null ? accent : '#374151') }}>
                {textoPrecioDe(resuelta, precioNivel ?? Number(precio))}
              </p>
              {/* Solo dos líneas: más abajo empieza el buscador, que usa el ancho
                  completo. El nivel que se aplicó se nombra en la línea del stock. */}
              {precioNivel != null && (
                <p className="text-[11px] text-gray-400 line-through">{textoPrecioDe(resuelta, Number(precio))}</p>
              )}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              {img
                ? <img src={img} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">📦</div>}
            </div>

            <div className="min-w-0 flex-1">
              {/* La franja derecha está ocupada por la X y el precio: las líneas
                  que quedan a esa altura la esquivan; el buscador usa todo el ancho. */}
              <p className="pr-[92px] text-[13px] font-medium leading-tight text-[#043261]">{producto.nombre}</p>

              {combinacionTexto && (
                <p className="mt-0.5 flex items-start gap-1 pr-[92px] text-[11px] leading-snug" style={{ color: accent }}>
                  <IconRama />
                  <span className="min-w-0 flex-1">{combinacionTexto}</span>
                </p>
              )}

              {resuelta && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 pr-[92px] text-[11px] font-semibold">
                  <span className={stockRestante > 0 ? 'text-green-700' : 'text-red-600'}>
                    {stockRestante > 0
                      ? `Stock disponible: ${textoCantidadDe(resuelta, stockRestante)}`
                      : 'Sin stock'}
                  </span>
                  {/* El mínimo se lee en la unidad en la que se habla: en un granel
                      "≥3" serían 3 gramos. */}
                  {precioNivel != null && (
                    <span className="rounded px-1 py-px text-[8px] font-extrabold uppercase tracking-wide text-white"
                      style={{ backgroundColor: accent }}>
                      {nivelAplicado?.nombre ?? 'Por mayor'} ≥{esGranel
                        ? upDe(resuelta).cantidadTexto(nivelAplicado?.cantidadMinima ?? 0)
                        : nivelAplicado?.cantidadMinima}
                    </span>
                  )}
                </p>
              )}
              {!resuelta && <p className="mt-1 text-[11px] text-gray-400">Selecciona una combinación</p>}

              {/* Con dos variantes ya conviene tener el campo: tipear es más
                  rápido que abrir el acordeón y recorrerlo. */}
              {variantes.length >= 2 && (
                <div className="relative mt-2.5">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><IconBuscar /></span>
                  <input ref={buscarRef} value={query} onChange={(e) => { setQuery(e.target.value); setUltimoAgregado(null); }}
                    placeholder="Buscar diseño, talla o código…" className={inputBuscar} />
                  {query && (
                    <button type="button" onClick={() => setQuery('')}
                      className="absolute right-1 top-1 flex h-[22px] w-[22px] items-center justify-center rounded text-[11px] text-gray-400 hover:text-gray-600">
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-px shrink-0 bg-gray-100" />

        {/* ── Cuerpo: resultados del buscador + acordeón ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2.5 pt-3.5">
          {hayResultados && (
            <div className="mb-4">
              {/* Las unidades solo se suman si ninguna se vende por peso: sumar
                  5000 g con 2 sacos da un número que no significa nada. */}
              <p className="mb-1.5 text-[10px] text-gray-500">
                {resultados.length} {resultados.length === 1 ? 'combinación' : 'combinaciones'}
                {resultados.every((v) => presDe(v).factor === 1) &&
                  ` · ${resultados.reduce((s, v) => s + disponible(v), 0)} en stock`}
              </p>
              {resultados.map((v) => {
                const vals = grupos.map((g) => valorDe(v, g.clave)).filter((x): x is string => !!x);
                const titulo = vals.length ? vals[vals.length - 1] : v.nombre;
                const resto = vals.slice(0, -1).join(' · ');
                const p = precioDe(v);
                return (
                  <button key={v.id} type="button" onClick={() => elegirVariante(v)}
                    className="mb-1.5 flex w-full items-center gap-2.5 rounded-md border border-gray-200 py-2 pl-3 pr-2.5 text-left transition hover:border-gray-300 hover:bg-gray-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-gray-900">{titulo}</span>
                      {resto && <span className="block truncate text-[10px] text-gray-500">{resto}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      {p != null && (
                        <span className="block text-xs font-semibold" style={{ color: accent }}>{textoPrecioDe(v, Number(p))}</span>
                      )}
                      <span className="block text-[10px] text-gray-500">{textoCantidadDe(v, disponible(v))}</span>
                    </span>
                    <span className="shrink-0" style={{ color: accent }}><IconMas /></span>
                  </button>
                );
              })}
              <div className="mt-3.5 flex items-center gap-2.5">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] text-gray-400">o elegí por atributo</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            </div>
          )}

          {query.trim().length >= 2 && resultados.length === 0 && (
            <p className="mb-3.5 text-xs text-gray-500">Sin combinaciones con stock para &quot;{query.trim()}&quot;</p>
          )}

          <div className="mb-2 flex items-center justify-between">
            {/* Con resultados a la vista, el divisor ya hace de título. */}
            <p className="text-xs font-medium text-[#043261]">{hayResultados ? '' : 'Elige la variante:'}</p>
            <button type="button" onClick={limpiar}
              className="rounded px-1.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              ↻ Limpiar
            </button>
          </div>

          {grupos.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin variantes disponibles</p>
          ) : grupos.map((g) => {
            const elegido = seleccion[g.clave];
            const resuelto = elegido != null;
            const abierto = g.clave === claveExpandida && grupoAplica(g, seleccion);

            if (!abierto) {
              return (
                <button key={g.clave} type="button" onClick={() => setGrupoExpandido(g.clave)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left hover:bg-gray-50">
                  <span className="shrink-0" style={{ color: resuelto ? accent : '#c3ccd8' }}>
                    {resuelto ? <IconCheck /> : <IconCirculo />}
                  </span>
                  <span className="w-[84px] shrink-0 text-[10px] uppercase tracking-wide text-gray-400">{g.nombre}</span>
                  <span className={`min-w-0 flex-1 truncate text-xs ${resuelto ? 'font-semibold text-[#043261]' : 'font-medium text-gray-400'}`}>
                    {resuelto ? etiquetaValor(g, elegido) : 'Elegir…'}
                  </span>
                  <span className="shrink-0 text-gray-400">{resuelto ? <IconLapiz /> : <IconChevron />}</span>
                </button>
              );
            }

            // Los valores sin stock NO se dibujan: tachados ocupaban lo mismo
            // que uno disponible y con 45 diseños eso es una pared inservible.
            const visibles = g.valores.filter((valor) => valorDisponible(g.clave, valor) || elegido === valor);
            return (
              <div key={g.clave} className="px-1.5 pb-3 pt-1.5">
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-600">{g.nombre}</p>
                {visibles.length === 0 ? (
                  <p className="text-[11px] text-gray-400">Sin stock en esta combinación</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {visibles.map((valor) => {
                      const sel = elegido === valor;
                      return (
                        <button key={valor} type="button" onClick={() => seleccionar(g.clave, valor)}
                          style={sel ? { borderColor: accent, color: accent, backgroundColor: `${accent}10` } : undefined}
                          className={`flex items-center gap-2 rounded-md border py-1.5 pl-1.5 pr-2.5 text-[11px] transition ${
                            sel ? 'font-bold' : 'border-gray-200 font-medium text-gray-700 hover:border-gray-300'}`}>
                          <span className="flex h-3 w-3 items-center justify-center rounded-full border"
                            style={{ borderColor: sel ? accent : '#c3ccd8' }}>
                            {sel && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />}
                          </span>
                          {etiquetaValor(g, valor)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-px shrink-0 bg-gray-100" />

        {/* ── Confirmación de lo último agregado ── */}
        {ultimoAgregado && (
          <div className="flex shrink-0 items-center gap-1.5 bg-green-50 px-4 py-1.5">
            <span className="shrink-0 text-green-600"><IconCheck size={14} /></span>
            <p className="min-w-0 flex-1 truncate text-[11px] text-green-900">{ultimoAgregado}</p>
            <p className="shrink-0 text-[10px] text-green-700">
              {combinacionesEnCarrito === 1 ? '1 en el carrito' : `${combinacionesEnCarrito} en el carrito`}
            </p>
          </div>
        )}

        {/* ── Pie: cantidad + agregar ── */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3.5 pt-3">
          {esGranel ? (
            // A granel la cantidad se TECLEA en la unidad de cobro (kg), con el
            // equivalente atómico debajo: que se vea "= 1500 g" es lo que evita
            // cargar 1.5 creyendo que son gramos.
            <div className="w-[132px] shrink-0">
              <div className="relative">
                <input value={granelTexto} onChange={(e) => onGranelChange(e.target.value)} inputMode="decimal"
                  placeholder="0" disabled={!resuelta || stockRestante <= 0}
                  className="h-9 w-full rounded-[6px] bg-zinc-100 px-2.5 pr-9 text-sm font-bold text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 focus:shadow-lg focus:shadow-blue-200 disabled:opacity-50" />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">{pres.simbolo}</span>
              </div>
              {/* Que se vea "= 1500 g" es lo que evita cargar 1.5 creyendo que son gramos. */}
              <p className="mt-0.5 text-[9px] text-gray-500">
                {cantidad > 0
                  ? `= ${cantidad} ${(resuelta && simboloUnidad(resuelta.unidadMedida)) ?? ''}`.trim()
                  : `Disponible ${resuelta ? textoCantidadDe(resuelta, stockRestante) : '0'}`}
              </p>
            </div>
          ) : (
            <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-gray-200 bg-white">
              <button type="button" disabled={!puedeAgregar || cantidad <= 1} onClick={() => cambiarCantidad(-1)}
                className="flex h-9 w-9 items-center justify-center disabled:cursor-default">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-sm font-bold"
                  style={puedeAgregar && cantidad > 1 ? { backgroundColor: `${accent}1a`, color: accent } : { color: '#c3ccd8' }}>−</span>
              </button>
              <span className="min-w-[30px] text-center text-[15px] font-extrabold"
                style={{ color: puedeAgregar ? '#2BAF47' : '#c3ccd8' }}>{cantidad}</span>
              <button type="button" disabled={!puedeAgregar || cantidad >= stockRestante} onClick={() => cambiarCantidad(1)}
                className="flex h-9 w-9 items-center justify-center disabled:cursor-default">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-sm font-bold"
                  style={puedeAgregar && cantidad < stockRestante ? { backgroundColor: `${accent}1a`, color: accent } : { color: '#c3ccd8' }}>+</span>
              </button>
            </div>
          )}

          <button type="button" disabled={!puedeAgregar} onClick={agregar}
            style={puedeAgregar ? { backgroundColor: accent } : undefined}
            className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold ${puedeAgregar ? 'text-white' : 'bg-gray-100 text-gray-400'}`}>
            {puedeAgregar && <IconCarrito />}
            {resuelta == null
              ? 'Elige una combinación'
              : stockRestante <= 0
                ? 'Sin stock'
                : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}
