'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSesionTienda } from './SesionTienda';
import { soles } from '@/lib/tienda-compra';
import { volarAlCarrito } from './volar-al-carrito';
import { useSeleccionVariante, type FotoSeleccion } from './seleccion-variante';

export interface VarianteCompra {
  id: string;
  nombre: string;
  atributos: { nombre: string; valor: string; clave?: string | null }[];
  imagenes?: { url: string; thumbnail: string | null }[];
  precio: number | null;
  precioOferta: number | null;
  enOferta: boolean;
  hayStock: boolean;
  stockActual: number;
}

interface Props {
  productoId: string;
  /** Para mostrarlo en el carrito del navegador (sin sesión). */
  nombre: string;
  precio: number | null;
  imagenUrl: string | null;
  hayStock: boolean;
  stockActual: number;
  variantes: VarianteCompra[];
  colorPrimario: string;
  /** Sin fotos propias, la galería arranca con las de las variantes. */
  productoTieneFotos?: boolean;
}

/**
 * Clave del atributo "Diseño": una foto = un diseño con su propio stock. Sus
 * valores (D1, D2…) no le dicen nada al comprador, así que se elige por FOTO.
 */
const CLAVE_DISENO = 'diseno';
/** Cuántas colecciones se ven antes de "Ver todas". */
const COLECCIONES_VISIBLES = 12;
/** Variante de la colección que todavía tiene unidades sin separar por diseño. */
const SURTIDO = 'Surtido';
const TONOS = ['#DCE7FB', '#FCE3EC', '#DDF3EA', '#FDEBD3', '#E7E1FA', '#E0F2F7'];

/** El atributo que es la COLECCIÓN: clave `dise_o` en JAYLI, o uno que se llame así. */
const esColeccion = (a: { nombre: string; clave?: string | null }) =>
  a.clave === 'dise_o' || a.clave === 'coleccion' || a.nombre.toLowerCase().includes('colec');

const precioDe = (v: VarianteCompra) => (v.enOferta && v.precioOferta ? v.precioOferta : v.precio);
const fotoDe = (v: VarianteCompra | undefined): FotoSeleccion | null => {
  const im = v?.imagenes?.[0];
  return im ? { url: im.url, thumbnail: im.thumbnail } : null;
};
const valorDe = (v: VarianteCompra, n: string) => v.atributos.find((a) => a.nombre === n)?.valor?.trim() || undefined;
const unicos = (xs: (string | undefined)[]) => xs.filter((x, i): x is string => !!x && xs.indexOf(x) === i);
const numeroDiseno = (d: string) => Number(d.replace(/^\D+/, '')) || 999;

/**
 * Cantidad + "Agregar al carrito" / "Comprar ahora" del detalle.
 *
 * Con un atributo de COLECCIÓN (los edredones de JAYLI: ALIANZA, CRISTAL…) se
 * elige en tres pasos: la colección en tarjetas con foto y "desde S/ x"; los
 * demás atributos, solo con los valores que tiene esa colección (si queda uno,
 * se elige solo); y el diseño por foto. Sin colección, cada atributo en
 * botones. Lo agotado no se ofrece, y la galería y el precio del detalle
 * siguen lo elegido (`seleccion-variante`).
 */
export function ComprarPanel({
  productoId, nombre, precio, imagenUrl, hayStock, stockActual, variantes, colorPrimario, productoTieneFotos = true,
}: Props) {
  const { agregar, subdominio } = useSesionTienda();
  const router = useRouter();
  const setSeleccion = useSeleccionVariante()?.setSeleccion;
  const [eleccion, setEleccion] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [verTodas, setVerTodas] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState<'agregar' | 'comprar' | null>(null);

  const conVariantes = variantes.length > 0;
  const conStock = useMemo(() => variantes.filter((v) => v.hayStock), [variantes]);

  // Atributos en el orden de la primera variante que los declara.
  const { nombres, atrColeccion, atrDiseno } = useMemo(() => {
    const orden: string[] = [];
    let col: string | null = null;
    let dis: string | null = null;
    for (const v of variantes) {
      for (const a of v.atributos) {
        if (!orden.includes(a.nombre)) orden.push(a.nombre);
        if (!col && esColeccion(a)) col = a.nombre;
        if (!dis && a.clave === CLAVE_DISENO) dis = a.nombre;
      }
    }
    // Una sola colección no es elección: va como un atributo más.
    if (col && unicos(variantes.map((v) => valorDe(v, col!))).length < 2) col = null;
    return { nombres: orden, atrColeccion: col, atrDiseno: dis };
  }, [variantes]);
  const otros = nombres.filter((n) => n !== atrColeccion && n !== atrDiseno);

  const coleccion = atrColeccion ? eleccion[atrColeccion] ?? '' : '';
  // El universo: con colección, sus variantes con stock; sin, todas las con stock.
  const universo = atrColeccion ? (coleccion ? conStock.filter((v) => valorDe(v, atrColeccion) === coleccion) : []) : conStock;

  // Lo elegido + lo que se elige solo (un atributo con un único valor posible).
  const sel: Record<string, string> = {};
  for (const n of otros) if (eleccion[n]) sel[n] = eleccion[n];
  // Una variante a la que le falta el atributo no queda afuera por él.
  const coincide = (v: VarianteCompra, excepto: string | null) =>
    otros.every((n) => n === excepto || !sel[n] || !valorDe(v, n) || valorDe(v, n) === sel[n]);
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (const n of otros) {
      if (sel[n]) continue;
      const vals = unicos(universo.filter((v) => coincide(v, n)).map((v) => valorDe(v, n)));
      if (vals.length === 1) sel[n] = vals[0];
    }
  }
  const atributos = otros
    .map((n) => {
      const todos = unicos(universo.map((v) => valorDe(v, n)));
      return {
        nombre: n,
        valores: todos.map((valor) => ({
          valor,
          activo: sel[n] === valor,
          posible: universo.some((v) => valorDe(v, n) === valor && coincide(v, n)),
        })),
      };
    })
    .filter((a) => a.valores.length > 0);

  const coinciden = universo.filter((v) => coincide(v, null));
  const faltaAtributo = atributos.find((a) => !sel[a.nombre] && coinciden.some((v) => valorDe(v, a.nombre)));

  // El diseño, por foto. Una variante de la colección sin diseño es lo que
  // queda sin separar: se ofrece como "Surtido".
  const disenoDe = (v: VarianteCompra) => (atrDiseno ? valorDe(v, atrDiseno) ?? SURTIDO : '');
  const hayDisenos = !!atrDiseno && !faltaAtributo && coinciden.some((v) => atrDiseno && valorDe(v, atrDiseno));
  const disenos = hayDisenos
    ? coinciden.slice().sort((a, b) => numeroDiseno(disenoDe(a)) - numeroDiseno(disenoDe(b)))
    : [];
  const disenoElegido = atrDiseno ? eleccion[atrDiseno] ?? '' : '';

  const variante = !conVariantes || (atrColeccion && !coleccion) || faltaAtributo
    ? null
    : hayDisenos
      ? disenos.find((v) => disenoDe(v) === disenoElegido) ?? null
      : coinciden.length === 1 ? coinciden[0] : null;

  const precioVariante = variante ? precioDe(variante) : null;
  const maximo = conVariantes ? (variante?.stockActual ?? 1) : stockActual;
  const disponible = conVariantes ? !!variante?.hayStock : hayStock;
  const faltaElegir = conVariantes && !variante;
  const queFalta = atrColeccion && !coleccion
    ? atrColeccion.toLowerCase()
    : faltaAtributo
      ? faltaAtributo.nombre.toLowerCase()
      : hayDisenos ? 'el diseño' : '';

  // Paso 1: colecciones con stock, en el orden del catálogo, con su foto y su
  // "desde".
  const colecciones = useMemo(() => {
    if (!atrColeccion) return [];
    return unicos(conStock.map((v) => valorDe(v, atrColeccion))).map((n) => {
      const vs = conStock.filter((v) => valorDe(v, atrColeccion) === n);
      const precios = vs.map(precioDe).filter((p): p is number => p != null);
      const min = precios.length ? Math.min(...precios) : null;
      const max = precios.length ? Math.max(...precios) : null;
      return { nombre: n, foto: fotoDe(vs.find((v) => v.imagenes?.length)), min, varia: min !== max };
    });
  }, [atrColeccion, conStock]);
  const agotadas = atrColeccion
    ? unicos(variantes.map((v) => valorDe(v, atrColeccion!))).filter((n) => !colecciones.some((c) => c.nombre === n)).length
    : 0;
  const q = busqueda.trim().toUpperCase();
  const filtradas = q ? colecciones.filter((c) => c.nombre.toUpperCase().includes(q)) : colecciones;
  const mostradas = verTodas || q ? filtradas : filtradas.slice(0, COLECCIONES_VISIBLES);

  // La galería y el precio del detalle siguen lo elegido.
  const base = atrColeccion && !coleccion ? conStock : coinciden.length ? coinciden : universo;
  const precios = base.map(precioDe).filter((p): p is number => p != null);
  const pmin = precios.length ? Math.min(...precios) : null;
  const pmax = precios.length ? Math.max(...precios) : null;
  const fotosVista: FotoSeleccion[] = [];
  for (const v of variante ? [variante] : base) {
    for (const im of v.imagenes ?? []) {
      if (!fotosVista.some((f) => f.url === im.url)) fotosVista.push({ url: im.url, thumbnail: im.thumbnail });
    }
    if (fotosVista.length >= 12) break;
  }
  // Antes de elegir, las fotos del producto (si tiene): la portada que cargó la empresa.
  const usarFotosVariantes = !!variante || !!coleccion || !productoTieneFotos || Object.keys(sel).length > 0;
  const fotoActiva = fotoDe(variante ?? undefined)?.url ?? null;
  const etiqueta = coleccion
    ? coleccion + (variante && atrDiseno && valorDe(variante, atrDiseno) ? ` · ${valorDe(variante, atrDiseno)}` : '')
    : null;
  const claveVista = JSON.stringify([
    usarFotosVariantes && fotosVista.length ? fotosVista.map((f) => f.url) : null,
    fotoActiva, precioVariante, pmin, pmax, etiqueta,
  ]);
  useEffect(() => {
    if (!setSeleccion || !conVariantes) return;
    const precioVista = variante ? precioVariante : pmin;
    setSeleccion({
      fotos: usarFotosVariantes && fotosVista.length ? fotosVista : null,
      fotoActiva,
      precio: precioVista,
      precioAntes: variante && variante.enOferta && variante.precioOferta ? variante.precio : null,
      desde: !variante && pmin != null && pmin !== pmax,
      etiqueta,
    });
    // claveVista resume todo lo que cambia la vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveVista, setSeleccion, conVariantes]);

  const elegir = (n: string, valor: string) => {
    setEleccion((prev) => {
      const nuevo: Record<string, string> = { ...prev, [n]: prev[n] === valor ? '' : valor };
      if (n === atrColeccion) {
        // Otra colección: lo demás se vuelve a elegir.
        return nuevo[n] ? { [n]: nuevo[n] } : {};
      }
      if (n !== atrDiseno && atrDiseno) delete nuevo[atrDiseno];
      // Lo elegido antes que ya no combina con esto se suelta.
      for (const b of otros) {
        if (b === n || !nuevo[b] || !nuevo[n]) continue;
        const sigue = universo.some((v) => valorDe(v, n) === nuevo[n] && (!valorDe(v, b) || valorDe(v, b) === nuevo[b]));
        if (!sigue) delete nuevo[b];
      }
      return Object.fromEntries(Object.entries(nuevo).filter(([, v]) => v));
    });
    setCantidad(1);
  };

  const ejecutar = async (modo: 'agregar' | 'comprar') => {
    if (faltaElegir || !disponible || enviando) return;
    setEnviando(modo);
    const ok = await agregar(productoId, variante?.id ?? null, cantidad, {
      nombre,
      varianteNombre: variante?.nombre ?? null,
      precio: (variante ? precioVariante : precio) ?? 0,
      imagenUrl: variante?.imagenes?.[0]?.url ?? imagenUrl,
      stockMax: maximo,
    });
    setEnviando(null);
    if (ok && modo === 'agregar') volarAlCarrito(document.querySelector<HTMLElement>('[data-producto-foto]'));
    if (ok && modo === 'comprar') router.push(`/${subdominio}/carrito`);
  };

  if (!conVariantes && !hayStock) return null;
  if (conVariantes && conStock.length === 0) {
    return <p className="mt-4 text-sm font-medium text-red-600">Sin stock por ahora.</p>;
  }

  const paso = (numero: number, titulo: string, extra?: string) => (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: colorPrimario }}
      >
        {numero}
      </span>
      <p className="text-sm font-bold text-gray-900">{titulo}</p>
      {extra && <span className="text-xs text-gray-500">{extra}</span>}
    </div>
  );
  let numeroPaso = atrColeccion ? 2 : 1;

  return (
    <div className="mt-4 space-y-5">
      {/* Paso 1: la colección */}
      {atrColeccion && !coleccion && (
        <div className="space-y-3">
          {paso(1, `Elegí tu ${atrColeccion.toLowerCase()}`, `${colecciones.length} disponibles`)}
          {colecciones.length > COLECCIONES_VISIBLES && (
            <label className="relative block">
              <span className="sr-only">Buscar {atrColeccion.toLowerCase()}</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar: alianza, frozen, spiderman…"
                className="h-11 w-full rounded-xl border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-gray-500"
              />
            </label>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
            {mostradas.map((c, i) => (
              <button
                key={c.nombre}
                type="button"
                onClick={() => elegir(atrColeccion, c.nombre)}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-colors hover:border-gray-400"
              >
                {c.foto ? (
                  <img src={c.foto.thumbnail ?? c.foto.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div
                    className="flex aspect-square w-full items-center justify-center text-2xl font-extrabold text-gray-800"
                    style={{ backgroundColor: TONOS[i % TONOS.length] }}
                  >
                    {c.nombre.split(/\s+/).map((p) => p[0]).join('').slice(0, 2)}
                  </div>
                )}
                <div className="px-2 pb-2 pt-1.5">
                  <p className="truncate text-xs font-bold text-gray-900">{c.nombre}</p>
                  {c.min != null && (
                    <p className="text-[11px] text-gray-500">{c.varia ? 'desde ' : ''}{soles(c.min)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {!verTodas && !q && filtradas.length > COLECCIONES_VISIBLES && (
            <button type="button" onClick={() => setVerTodas(true)} className="text-sm font-bold" style={{ color: colorPrimario }}>
              Ver las {filtradas.length} {atrColeccion.toLowerCase().endsWith('n') ? 'colecciones' : 'opciones'}
            </button>
          )}
          {q && filtradas.length === 0 && (
            <p className="text-sm text-gray-500">Nada disponible con “{busqueda.trim()}”.</p>
          )}
          {agotadas > 0 && (
            <p className="text-xs text-gray-400">{agotadas} agotada{agotadas === 1 ? '' : 's'} no se muestra{agotadas === 1 ? '' : 'n'}.</p>
          )}
        </div>
      )}

      {/* La colección elegida, con "Cambiar" */}
      {atrColeccion && coleccion && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
          {(() => {
            const f = colecciones.find((c) => c.nombre === coleccion)?.foto;
            return f ? <img src={f.thumbnail ?? f.url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : null;
          })()}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{atrColeccion}</p>
            <p className="truncate text-base font-extrabold text-gray-900">{coleccion}</p>
          </div>
          <button
            type="button"
            onClick={() => elegir(atrColeccion, coleccion)}
            className="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Paso 2: los demás atributos */}
      {(!atrColeccion || coleccion) && atributos.length > 0 && (
        <div className="space-y-3">
          {atrColeccion && paso(numeroPaso++, 'Medida y tipo')}
          {atributos.map((a) => (
            <div key={a.nombre}>
              <p className="mb-1.5 text-xs font-medium text-gray-500">
                {a.nombre}
                {sel[a.nombre] && <span className="text-gray-900">: {sel[a.nombre]}</span>}
                {a.valores.length === 1 && <span className="ml-1.5 text-[11px] text-gray-400">(única opción)</span>}
              </p>
              {a.valores.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {a.valores.map(({ valor, activo, posible }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => elegir(a.nombre, valor)}
                      className={`min-h-[40px] rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
                        activo
                          ? 'text-white'
                          : posible
                            ? 'border-gray-300 bg-white text-gray-800 hover:border-gray-500'
                            : 'border-dashed border-gray-300 bg-gray-50 text-gray-400'
                      }`}
                      style={activo ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : undefined}
                    >
                      {valor}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paso 3: el diseño, por foto */}
      {hayDisenos && atrDiseno && (
        <div className="space-y-3">
          {paso(numeroPaso++, 'Elegí el diseño', `${disenos.length} disponible${disenos.length === 1 ? '' : 's'}`)}
          <div className="flex flex-wrap gap-2">
            {disenos.map((v) => {
              const d = disenoDe(v);
              const activo = disenoElegido === d;
              const f = fotoDe(v);
              return (
                <button
                  key={v.id}
                  type="button"
                  title={d}
                  aria-label={`Diseño ${d}`}
                  onClick={() => elegir(atrDiseno, d)}
                  className="w-[84px] overflow-hidden rounded-lg border-2 bg-white text-center transition-colors"
                  style={{ borderColor: activo ? colorPrimario : '#e5e7eb' }}
                >
                  {f
                    ? <img src={f.thumbnail ?? f.url} alt="" loading="lazy" className="h-[72px] w-full object-cover" />
                    : <div className="flex h-[72px] items-center justify-center bg-gray-50 text-xs font-bold text-gray-500">{d}</div>}
                  <p className="py-1 text-[11px] font-bold text-gray-900">
                    {d}
                    <span className={v.stockActual <= 2 ? ' text-amber-700' : ' text-gray-500'}>
                      {' · '}{v.stockActual <= 2 ? (v.stockActual === 1 ? 'última' : 'últimas 2') : `${v.stockActual} u`}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {variante && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-gray-700">
          {precioVariante != null && <span className="font-bold text-gray-900">{soles(precioVariante)}</span>}
          {' · '}{variante.stockActual === 1 ? '¡Queda 1!' : `${variante.stockActual} disponibles`}
          <span className="block text-xs text-gray-500">{variante.nombre}</span>
        </p>
      )}

      {/* Una sola fila de botones a su ancho; en pantallas angostas bajan de línea */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center h-11 rounded-xl border border-gray-300">
          <button type="button" aria-label="Menos" className="w-10 h-11 text-lg text-gray-700 disabled:opacity-30"
            disabled={cantidad <= 1} onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
          <span className="w-8 text-center text-sm font-bold text-gray-900">{cantidad}</span>
          <button type="button" aria-label="Más" className="w-10 h-11 text-lg text-gray-700 disabled:opacity-30"
            disabled={cantidad >= maximo || faltaElegir} onClick={() => setCantidad((c) => Math.min(maximo, c + 1))}>+</button>
        </div>
        <button
          type="button"
          onClick={() => void ejecutar('agregar')}
          disabled={faltaElegir || !disponible || !!enviando}
          className="h-11 px-5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: colorPrimario }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
            <path d="M2 3h3l2.6 12.2a1 1 0 001 .8h9.5a1 1 0 001-.8L21 7H6" />
          </svg>
          {enviando === 'agregar' ? 'Agregando…' : faltaElegir && queFalta ? `Elegí ${queFalta}` : 'Agregar al carrito'}
        </button>
        <button
          type="button"
          onClick={() => void ejecutar('comprar')}
          disabled={faltaElegir || !disponible || !!enviando}
          className="h-11 px-5 rounded-xl border-2 bg-white text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: colorPrimario, color: colorPrimario }}
        >
          {enviando === 'comprar' ? 'Un momento…' : 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}
