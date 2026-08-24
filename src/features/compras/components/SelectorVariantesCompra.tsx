'use client';

import { useMemo, useState } from 'react';
import type { Producto, ProductoVariante } from '@/core/types/producto';
import {
  particionarVariantes,
  presentacionDeVariante,
  stockDeVarianteEnSede,
  textoCantidad,
  textoCosto,
} from '../utils/variantes-comprables';

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

interface Props {
  producto: Producto;
  sedeId: string;
  moneda: string;
  /** Ids ya cargados como línea: se marcan y no se agregan dos veces. */
  yaAgregadas: string[];
  /**
   * El costo va en la unidad en la que se COMPRA (el kilo, la unidad).
   * `undefined` = no se tecleó ninguno y la línea nace con el de la última
   * compra, como antes.
   */
  onElegir: (variante: ProductoVariante, costo?: number) => void;
  onCerrar: () => void;
}

/**
 * Elegir qué variantes se compran, replicando el sheet del app Flutter.
 *
 * Va PLANA con buscador y no en acordeón por atributo: comprando, las variantes
 * mal cargadas —a las que les falta un atributo— son justo las que hay que
 * reponer, y un acordeón las dejaría inalcanzables. Un producto puede tener 91.
 *
 * Los GRANEL se muestran en una sección plegada y BLOQUEADA en vez de
 * esconderse: si desaparecieran, el que busca "POLLO GRANEL" y no lo encuentra
 * concluye que está roto o que la variante se borró.
 *
 * Cada fila trae su CAMPO DE COSTO: cargarlo acá evita agregar la variante y
 * después buscarla en la lista de líneas para escribirle el número.
 */
export default function SelectorVariantesCompra({
  producto, sedeId, moneda, yaAgregadas, onElegir, onCerrar,
}: Props) {
  const [q, setQ] = useState('');
  const [verBloqueadas, setVerBloqueadas] = useState(false);
  /** Costo tecleado por variante, tal cual se escribió. */
  const [costos, setCostos] = useState<Record<string, string>>({});
  const simbolo = moneda === 'USD' ? '$' : 'S/';

  const { comprables, bloqueadas } = useMemo(
    () => particionarVariantes(producto), [producto],
  );

  const filtrar = (vs: ProductoVariante[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return vs;
    return vs.filter((v) =>
      `${v.nombre} ${v.sku} ${v.codigoEmpresa} ${v.codigoBarras ?? ''}`.toLowerCase().includes(t));
  };
  const listaComprables = filtrar(comprables);
  const listaBloqueadas = filtrar(bloqueadas);

  const fila = (v: ProductoVariante, bloqueada: boolean) => {
    const pres = presentacionDeVariante(producto, v);
    const info = stockDeVarianteEnSede(v, sedeId);
    const costoAnterior = info?.precioCosto != null ? Number(info.precioCosto) : null;
    const costo = textoCosto(info?.precioCosto, pres, simbolo);
    const yaEsta = yaAgregadas.includes(v.id);
    // El costo se teclea en la unidad en la que se COMPRA: un granel suelto se
    // compra en kilos aunque el stock se guarde en gramos.
    const enPresentacion = (n: number) => (pres.factor > 1 ? n * pres.factor : n);
    const tecleado = costos[v.id] ?? '';

    const agregar = () => {
      const n = parseFloat(tecleado.replace(',', '.'));
      onElegir(v, Number.isFinite(n) && n > 0 ? n : undefined);
    };

    return (
      <div
        key={v.id}
        className={`flex items-center gap-2 rounded-[6px] px-3 py-2 transition-colors ${
          bloqueada ? 'bg-zinc-50' : yaEsta ? 'bg-blue-50/60' : 'hover:bg-blue-50'
        }`}
      >
        <button
          type="button"
          disabled={bloqueada || yaEsta}
          onClick={agregar}
          className={`min-w-0 flex-1 text-left ${bloqueada || yaEsta ? 'cursor-default' : ''}`}
        >
          <p className={`truncate text-xs font-medium ${bloqueada ? 'text-gray-500' : 'text-gray-800'}`}>
            {v.nombre}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500">
            {bloqueada ? (
              // No se dice el costo: el del granel lo escribe la apertura por
              // promedio ponderado, y mostrarlo invita a "corregirlo" acá.
              <span className="font-medium text-gray-600">🔒 sale de abrir un saco</span>
            ) : (
              // Sin costo se dice: es una variante que nunca se compró en esta
              // sede, no una que sale gratis.
              <span className={costo ? 'font-semibold text-gray-700' : 'font-semibold text-amber-600'}>
                {costo ?? 'sin costo'}
              </span>
            )}
            <span className="text-gray-400">·</span>
            <span className={info ? '' : 'text-amber-600'}>
              {info ? `Stock ${textoCantidad(info.cantidad, pres)}` : 'NUEVA en esta sede'}
            </span>
          </p>
        </button>

        {yaEsta && !bloqueada && (
          <span className="shrink-0 text-[10px] font-semibold text-[#004A94]">ya agregada</span>
        )}

        {/* Costo al elegir. Repetir el costo anterior es el caso normal, así que
            se ofrece de un toque en vez de obligar a tipearlo. */}
        {!bloqueada && !yaEsta && (
          <div className="flex shrink-0 items-center gap-1.5">
            {costoAnterior != null && costoAnterior > 0 && (
              <button
                type="button"
                title="Usar el costo de la última compra"
                onClick={() => setCostos((c) => ({ ...c, [v.id]: enPresentacion(costoAnterior).toFixed(2) }))}
                className="text-[10px] font-semibold text-[#004A94] hover:underline"
              >
                usar {enPresentacion(costoAnterior).toFixed(2)}
              </button>
            )}
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                {simbolo}
              </span>
              <input
                value={tecleado}
                onChange={(e) => setCostos((c) => ({ ...c, [v.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
                inputMode="decimal"
                placeholder="costo"
                title={pres.factor > 1 && pres.simbolo ? `Costo por ${pres.simbolo}` : 'Costo por unidad'}
                className="h-[30px] w-[94px] rounded-[6px] bg-zinc-100 pl-7 pr-2 text-right text-xs font-semibold text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:font-normal placeholder:text-zinc-400 focus:shadow-lg focus:shadow-blue-200"
              />
              {/* La unidad en la que se teclea: sin esto un granel se carga con
                  el precio del gramo. */}
              {pres.factor > 1 && pres.simbolo && (
                <span className="pointer-events-none absolute -bottom-3 right-1 text-[9px] text-gray-400">
                  por {pres.simbolo}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={agregar}
              title="Agregar a la compra"
              className="rounded-[6px] bg-[#004A94] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#003a74]"
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
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
              <span className="text-gray-400"> · escribí el costo y agregá</span>
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

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {listaComprables.length === 0 && listaBloqueadas.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-gray-400">Ninguna variante coincide</p>
          )}
          {listaComprables.map((v) => fila(v, false))}

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
      </div>
    </div>
  );
}
