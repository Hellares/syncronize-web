'use client';

import { useMemo, useState } from 'react';
import type { Producto, ProductoVariante } from '@/core/types/producto';
import CantidadStepper from '@/components/ui/CantidadStepper';
import {
  agruparPorColeccion,
  claveColeccion,
  nombreColeccion,
  tituloColeccion,
  valorDiseno,
} from '@/features/producto/components/variantes/coleccion-disenos';
import {
  particionarVariantes,
  presentacionDeVariante,
  stockDeVarianteEnSede,
  textoCantidad,
  textoCosto,
} from '../utils/variantes-comprables';

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/** Lo que ya está cargado en la compra para una variante, tal cual las líneas
 *  lo guardan: texto, en la unidad en la que se compra (el kilo). */
export interface LineaVariante {
  cantidad: string;
  precioUnitario: string;
  nuevoPrecioVenta?: string;
}

interface Props {
  producto: Producto;
  sedeId: string;
  moneda: string;
  /** Las líneas de la compra de ESTE producto, por variante. */
  lineas: Record<string, LineaVariante>;
  /** Cantidad absoluta: 0 saca la línea, y la primera la crea. */
  onCantidad: (variante: ProductoVariante, cantidad: number) => void;
  /** Texto del costo o de la venta nueva, en la unidad en la que se compra. */
  onCampo: (
    variante: ProductoVariante,
    campo: 'precioUnitario' | 'nuevoPrecioVenta',
    valor: string,
  ) => void;
  onCerrar: () => void;
}

/** Miniatura de la variante (la primera imagen, en thumbnail). */
function miniaturaDe(v: ProductoVariante): string | null {
  const a = v.archivos?.[0];
  return a ? (a.urlThumbnail ?? a.url) : null;
}

function Foto({ v, lado, coleccion = false }: { v: ProductoVariante; lado: number; coleccion?: boolean }) {
  const url = miniaturaDe(v);
  const diseno = coleccion ? null : valorDiseno(v);
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#F1F4F8]"
      style={{ width: lado, height: lado }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : diseno ? (
        <span className="text-[9px] font-bold text-gray-500">{diseno}</span>
      ) : (
        <span className="text-[13px] text-gray-300">{coleccion ? '▦' : '⊘'}</span>
      )}
    </div>
  );
}

/**
 * Elegir qué variantes se compran, replicando el sheet del app Flutter.
 *
 * Va PLANA con buscador y no en acordeón por atributo: comprando, las variantes
 * mal cargadas —a las que les falta un atributo— son justo las que hay que
 * reponer, y un acordeón las dejaría inalcanzables. Un producto puede tener 91.
 * Lo único que se junta son los DISEÑOS de una colección (D1, D2… de CRISTAL):
 * una card plegable con foto y los diseños adentro como ramas de un árbol.
 *
 * Los GRANEL se muestran en una sección plegada y BLOQUEADA en vez de
 * esconderse: si desaparecieran, el que busca "POLLO GRANEL" y no lo encuentra
 * concluye que está roto o que la variante se borró.
 *
 * Trabaja DIRECTO sobre las líneas de la compra: el stepper crea, ajusta o saca
 * la línea, y costo y venta se escriben en la misma pasada. Vacíos = los de la
 * sede (el costo vuelve al actual; la venta se mantiene).
 */
export default function SelectorVariantesCompra({
  producto, sedeId, moneda, lineas, onCantidad, onCampo, onCerrar,
}: Props) {
  const [q, setQ] = useState('');
  const [verBloqueadas, setVerBloqueadas] = useState(false);
  const simbolo = moneda === 'USD' ? '$' : 'S/';

  const { comprables, bloqueadas } = useMemo(
    () => particionarVariantes(producto), [producto],
  );

  // Colecciones abiertas. Arrancan abiertas las que ya se están comprando: se
  // vuelve a corregir una cantidad, no a buscarla de nuevo. Buscando también
  // quedan plegadas (como en el app): el renglón dice que hay coincidencias.
  const [abiertas, setAbiertas] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const v of producto.variantes ?? []) {
      if (lineas[v.id] && valorDiseno(v)) s.add(claveColeccion(v));
    }
    return s;
  });
  const alternar = (clave: string) =>
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (!s.delete(clave)) s.add(clave);
      return s;
    });

  const filtrar = (vs: ProductoVariante[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return vs;
    return vs.filter((v) =>
      `${v.nombre} ${v.sku} ${v.codigoEmpresa} ${v.codigoBarras ?? ''}`.toLowerCase().includes(t));
  };
  const listaComprables = filtrar(comprables);
  const listaBloqueadas = filtrar(bloqueadas);
  const elegidas = Object.keys(lineas).length;

  const cantidadDe = (v: ProductoVariante) =>
    parseFloat((lineas[v.id]?.cantidad ?? '').replace(',', '.')) || 0;

  const fila = (v: ProductoVariante, bloqueada: boolean, enColeccion = false) => {
    const pres = presentacionDeVariante(producto, v);
    const info = stockDeVarianteEnSede(v, sedeId);
    // En la unidad en la que se compra: un granel suelto, en kilos.
    const enPresentacion = (n: number) => (pres.factor > 1 ? n * pres.factor : n);
    const costoActual = info?.precioCosto != null ? Number(info.precioCosto) : null;
    const ventaActual = info?.precio != null ? Number(info.precio) : null;
    const costo = textoCosto(costoActual, pres, simbolo);
    const venta = textoCosto(ventaActual, pres, simbolo);
    const linea = lineas[v.id];
    const cantidad = cantidadDe(v);
    const enCompra = !!linea && cantidad > 0;
    const unidad = pres.factor > 1 && pres.simbolo ? `/${pres.simbolo}` : '';

    return (
      <div
        key={v.id}
        className={
          enColeccion
            // Debajo de su colección va como rama, sin card propia: card dentro
            // de card se ve recargado.
            ? 'py-1.5 pr-1'
            : `rounded-[8px] border px-2.5 py-2 transition-colors ${
              bloqueada
                ? 'border-gray-200 bg-zinc-50'
                : enCompra
                  ? 'border-[#004A94]/35 bg-blue-50/40'
                  : 'border-gray-200 bg-white hover:bg-blue-50/30'
            }`
        }
      >
        <div className="flex items-center gap-2">
          {enColeccion && <span className="shrink-0 text-sm text-gray-400">⤷</span>}
          <Foto v={v} lado={36} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-semibold ${bloqueada ? 'text-gray-500' : 'text-gray-800'}`}>
              {enColeccion ? (valorDiseno(v) ?? v.nombre) : v.nombre}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500">
              {bloqueada ? (
                // No se dice el costo: el del granel lo escribe la apertura por
                // promedio ponderado, y mostrarlo invita a "corregirlo" acá.
                <span className="font-medium text-gray-600">🔒 sale de abrir un saco</span>
              ) : (
                <>
                  {/* Sin costo se dice: es una variante que nunca se compró en
                      esta sede, no una que sale gratis. */}
                  <span className={costo ? 'font-semibold text-gray-700' : 'font-semibold text-amber-600'}>
                    {costo ? `Costo ${costo}` : 'sin costo'}
                  </span>
                  {/* El de venta al lado, para ver el margen mientras se carga
                      el costo nuevo. */}
                  {venta && <span className="font-semibold text-green-700">Venta {venta}</span>}
                </>
              )}
              <span className={info ? '' : 'text-amber-600'}>
                {info ? `Stock ${textoCantidad(info.cantidad, pres)}` : 'NUEVA en esta sede'}
              </span>
            </p>
          </div>
          {bloqueada && !enCompra ? (
            // Sin stepper: no hay nada que sumar. Se reserva su ancho para que
            // las filas queden alineadas.
            <div className="w-[96px] shrink-0" />
          ) : (
            <CantidadStepper
              className="w-[96px] shrink-0"
              value={cantidad}
              onChange={(n) => onCantidad(v, n)}
              decimales={pres.factor > 1}
              // Un granel que YA venía cargado se puede SACAR pero no sumar.
              puedeMas={!bloqueada}
              soloLectura={bloqueada}
            />
          )}
        </div>

        {/* Costo y venta en la misma pasada que la cantidad: si no, hay que
            buscar cada línea en la tabla para escribirle los números. */}
        {enCompra && !bloqueada && (
          <div className={`mt-2 ${enColeccion ? 'pl-[60px]' : 'pl-[44px]'}`}>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-medium text-gray-600">
                  Costo{unidad && ` (${unidad})`}
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{simbolo}</span>
                  <input
                    className={`${INPUT_STD} pl-7 text-right font-semibold`}
                    inputMode="decimal"
                    value={linea.precioUnitario}
                    // Vacío se usa el costo de hoy: va de placeholder.
                    placeholder={costoActual != null && costoActual > 0 ? enPresentacion(costoActual).toFixed(2) : '0.00'}
                    onChange={(e) => onCampo(v, 'precioUnitario', e.target.value.replace(/[^\d.,]/g, ''))}
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-medium text-gray-600">
                  Venta{unidad && ` (${unidad})`}
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{simbolo}</span>
                  <input
                    className={`${INPUT_STD} pl-7 text-right font-semibold ring-green-600 focus:shadow-green-200`}
                    inputMode="decimal"
                    value={linea.nuevoPrecioVenta ?? ''}
                    // Vacío se mantiene la de hoy: va de placeholder para que
                    // se vea a cuánto se vende sin tener que escribirlo.
                    placeholder={ventaActual != null && ventaActual > 0 ? enPresentacion(ventaActual).toFixed(2) : '0.00'}
                    onChange={(e) => onCampo(v, 'nuevoPrecioVenta', e.target.value.replace(/[^\d.,]/g, ''))}
                  />
                </div>
              </label>
            </div>
            {/* Repetir el costo anterior es el caso normal: de un toque. */}
            {costoActual != null && costoActual > 0
              && linea.precioUnitario !== enPresentacion(costoActual).toFixed(2) && (
              <button
                type="button"
                onClick={() => onCampo(v, 'precioUnitario', enPresentacion(costoActual).toFixed(2))}
                className="mt-1 text-[10px] font-semibold text-[#004A94] hover:underline"
              >
                usar costo anterior {costo}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const coleccion = (clave: string, disenos: ProductoVariante[]) => {
    const abierta = abiertas.has(clave);
    const conFoto = disenos.find((d) => miniaturaDe(d)) ?? disenos[0];
    const unidades = disenos.reduce((t, d) => t + cantidadDe(d), 0);
    const enCompra = unidades > 0;
    return (
      <div
        key={`col-${clave}`}
        className={`rounded-[8px] border transition-colors ${
          enCompra ? 'border-[#004A94]/35 bg-blue-50/40' : 'border-gray-200 bg-[#F7F9FC]'
        }`}
      >
        <button
          type="button"
          onClick={() => alternar(clave)}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left"
        >
          <Foto v={conFoto} lado={40} coleccion />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#004A94]">{nombreColeccion(disenos[0])}</p>
            <p className="truncate text-[10px] text-gray-500">
              {tituloColeccion(disenos[0])} · {disenos.length} diseños
            </p>
          </div>
          {enCompra && (
            <span className="shrink-0 rounded-full bg-[#004A94] px-2 py-0.5 text-[10px] font-bold text-white">
              {Number.isInteger(unidades) ? unidades : unidades.toFixed(3).replace(/0+$/, '')} u
            </span>
          )}
          <span className="shrink-0 text-xs text-gray-500">{abierta ? '▲' : '▼'}</span>
        </button>
        {abierta && (
          <div className="border-t border-gray-200 py-1 pl-3 pr-1.5">
            {disenos.map((d) => fila(d, false, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#004A94]">{producto.nombre}</p>
            <p className="text-[11px] text-gray-500">
              {/* El numero honesto es cuantas se COMPRAN: decir "28 variantes" y
                  ofrecer 16 se lee como si faltaran. */}
              {bloqueadas.length > 0
                ? `${comprables.length} se compran`
                : `${comprables.length} variantes`}
            </p>
          </div>
          <button onClick={onCerrar} className="shrink-0 text-xs text-gray-500 hover:text-gray-800">Cerrar</button>
        </div>

        <div className="px-4 py-2">
          <input
            autoFocus
            className={INPUT_STD}
            placeholder="Filtrar variantes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
          {listaComprables.length === 0 && listaBloqueadas.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-gray-400">Ninguna variante coincide</p>
          )}
          {agruparPorColeccion(listaComprables).map((f) =>
            f.tipo === 'variante' ? fila(f.variante, false) : coleccion(f.clave, f.disenos))}

          {listaBloqueadas.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setVerBloqueadas((x) => !x)}
                className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 hover:text-gray-800"
              >
                🔒 No se compran · entran al abrir un saco ({listaBloqueadas.length})
                <span className="ml-auto text-gray-400">{verBloqueadas ? '▲' : '▼'}</span>
              </button>
              {verBloqueadas && listaBloqueadas.map((v) => fila(v, true))}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-2.5">
          <button
            type="button"
            onClick={onCerrar}
            className="h-[38px] w-full rounded-[8px] bg-[#004A94] text-[13px] font-bold text-white hover:bg-[#003a74]"
          >
            {elegidas > 0 ? `Listo (${elegidas})` : 'Listo'}
          </button>
        </div>
      </div>
    </div>
  );
}
