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
  onElegir: (variante: ProductoVariante) => void;
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
 */
export default function SelectorVariantesCompra({
  producto, sedeId, moneda, yaAgregadas, onElegir, onCerrar,
}: Props) {
  const [q, setQ] = useState('');
  const [verBloqueadas, setVerBloqueadas] = useState(false);

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
    const costo = textoCosto(info?.precioCosto, pres, moneda === 'USD' ? '$' : 'S/');
    const yaEsta = yaAgregadas.includes(v.id);
    return (
      <button
        key={v.id}
        type="button"
        disabled={bloqueada || yaEsta}
        onClick={() => onElegir(v)}
        className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-left transition-colors ${
          bloqueada ? 'cursor-not-allowed bg-zinc-50' : yaEsta ? 'cursor-default bg-blue-50/60' : 'hover:bg-blue-50'
        }`}
      >
        <div className="min-w-0 flex-1">
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
        </div>
        {yaEsta && !bloqueada && (
          <span className="shrink-0 text-[10px] font-semibold text-[#004A94]">ya agregada</span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
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

        <div className="flex-1 overflow-y-auto px-2 pb-3">
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
