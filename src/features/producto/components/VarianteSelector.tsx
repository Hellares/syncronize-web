'use client';

// Selector dinámico de variantes — paridad con variante_selector_sheet.dart de Flutter.
// Deriva grupos de atributos (Color, Talla...) de las variantes, muestra chips por
// atributo, resuelve la variante al elegir un valor por grupo, con imagen/precio/stock
// dinámicos, disponibilidad por stock y stepper de cantidad.

import { useMemo, useState } from 'react';
import type { Producto, ProductoVariante, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';

const SYNTH = '__variante__';

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Grupo { clave: string; nombre: string; valores: string[] }

function derivarGrupos(variantes: ProductoVariante[]): Grupo[] {
  const orden: string[] = [];
  const nombre: Record<string, string> = {};
  const valores: Record<string, string[]> = {};
  for (const v of variantes) {
    for (const av of v.atributosValores ?? []) {
      const clave = av.atributo?.clave;
      if (!clave) continue;
      if (!valores[clave]) { valores[clave] = []; nombre[clave] = av.atributo.nombre ?? clave; orden.push(clave); }
      if (!valores[clave].includes(av.valor)) valores[clave].push(av.valor);
    }
  }
  // Fallback: variantes sin atributos estructurados → un único grupo por nombre.
  if (orden.length === 0 && variantes.length) {
    const nombres: string[] = [];
    for (const v of variantes) if (!nombres.includes(v.nombre)) nombres.push(v.nombre);
    return [{ clave: SYNTH, nombre: 'Variante', valores: nombres }];
  }
  return orden.map(c => ({ clave: c, nombre: nombre[c], valores: valores[c] }));
}

function imgDe(x: { archivos?: Array<{ url: string; urlThumbnail?: string }>; imagenes?: string[] } | null): string | null {
  if (!x) return null;
  if (x.archivos?.length) return x.archivos[0].urlThumbnail || x.archivos[0].url;
  if (x.imagenes?.length) return x.imagenes[0];
  return null;
}

interface Props {
  producto: Producto;
  sedeId: string;
  onConfirm: (variante: ProductoVariante, cantidad: number) => void;
  onClose: () => void;
  /** Color de acento (VR #437EFF, cotización #004A94). */
  accent?: string;
}

export default function VarianteSelector({ producto, sedeId, onConfirm, onClose, accent = '#437EFF' }: Props) {
  const variantes = useMemo(() => (producto.variantes ?? []).filter(v => v.isActive !== false), [producto]);
  const grupos = useMemo(() => derivarGrupos(variantes), [variantes]);

  const stockDeSede = (stocks?: StockPorSedeInfo[]): StockPorSedeInfo | null => {
    if (!stocks?.length) return null;
    return stocks.find(s => s.sedeId === sedeId) ?? stocks[0];
  };
  const stockDe = (v: ProductoVariante) => stockDeSede(v.stocksPorSede)?.cantidad ?? 0;

  const coincide = (v: ProductoVariante, sel: Record<string, string | null>) => {
    for (const [clave, valor] of Object.entries(sel)) {
      if (valor == null) continue;
      if (clave === SYNTH) { if (v.nombre !== valor) return false; continue; }
      const match = (v.atributosValores ?? []).filter(a => a.atributo?.clave === clave).map(a => a.valor);
      if (match.length === 0 || match[0] !== valor) return false;
    }
    return true;
  };

  const dispoCon = (sel: Record<string, string | null>) => variantes.some(v => coincide(v, sel) && stockDe(v) > 0);

  const [seleccion, setSeleccion] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const g of grupos) init[g.clave] = g.valores.length === 1 ? g.valores[0] : null;
    return init;
  });
  const [cantidad, setCantidad] = useState(1);

  const valorDisponible = (clave: string, valor: string) => {
    const tentativa: Record<string, string | null> = {};
    for (const g of grupos) tentativa[g.clave] = g.clave === clave ? valor : seleccion[g.clave];
    return dispoCon(tentativa);
  };

  const resuelta = grupos.every(g => seleccion[g.clave] != null)
    ? variantes.find(v => coincide(v, seleccion)) ?? null
    : null;
  const stockInfo = resuelta ? stockDeSede(resuelta.stocksPorSede) : null;
  const stockResuelta = resuelta ? stockDe(resuelta) : 0;
  const precio = stockInfo ? infoPrecioEfectivo(stockInfo) : null;
  const enLiq = stockInfo ? infoLiquidacionActiva(stockInfo) : false;
  const img = imgDe(resuelta) ?? imgDe(producto);

  const seleccionar = (clave: string, valor: string) => {
    setSeleccion(prev => {
      const next = { ...prev, [clave]: valor };
      // Reparar otros atributos cuya selección quedó incompatible (UX e-commerce).
      for (const g of grupos) {
        if (g.clave === clave || next[g.clave] == null) continue;
        const tent: Record<string, string | null> = { ...next };
        if (!dispoCon(tent)) {
          const repl = g.valores.find(val => dispoCon({ ...next, [g.clave]: val }));
          next[g.clave] = repl ?? next[g.clave];
        }
      }
      return next;
    });
    setCantidad(1);
  };

  const limpiar = () => {
    const init: Record<string, string | null> = {};
    for (const g of grupos) init[g.clave] = g.valores.length === 1 ? g.valores[0] : null;
    setSeleccion(init);
    setCantidad(1);
  };

  const puedeAgregar = resuelta != null && stockResuelta > 0 && cantidad > 0;
  const cantValida = Math.min(cantidad, Math.max(stockResuelta, 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header dinámico */}
        <div className="flex items-start gap-3 border-b border-gray-100 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">📦</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{producto.nombre}</p>
            {resuelta ? (
              <>
                <p className="truncate text-xs text-gray-500">{resuelta.nombre}</p>
                <p className="text-base font-bold" style={{ color: enLiq ? '#dc2626' : accent }}>{precio != null ? `S/ ${fmt(Number(precio))}` : 'Sin precio'}</p>
                <p className={`text-[11px] ${stockResuelta > 0 ? 'text-gray-500' : 'text-red-500'}`}>{stockResuelta > 0 ? `Stock: ${stockResuelta}` : 'Sin stock'}</p>
              </>
            ) : <p className="mt-1 text-xs text-gray-400">Elige una combinación</p>}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Grupos de atributos */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">Elige la variante:</p>
            <button type="button" onClick={limpiar} className="text-[11px] font-medium text-gray-500 hover:text-gray-700">↻ Limpiar</button>
          </div>
          {grupos.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin variantes disponibles</p>
          ) : grupos.map(g => (
            <div key={g.clave} className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-gray-500">{g.nombre}</p>
              <div className="flex flex-wrap gap-2">
                {g.valores.map(valor => {
                  const sel = seleccion[g.clave] === valor;
                  const disp = sel || valorDisponible(g.clave, valor);
                  return (
                    <button key={valor} type="button" disabled={!disp} onClick={() => seleccionar(g.clave, valor)}
                      style={sel ? { backgroundColor: accent, borderColor: accent } : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${sel ? 'text-white' : disp ? 'border-gray-300 text-gray-700 hover:border-gray-400' : 'border-gray-200 text-gray-300 line-through'}`}>
                      {valor}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: cantidad + agregar */}
        <div className="flex items-center gap-3 border-t border-gray-100 p-4">
          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50">
            <button type="button" disabled={!puedeAgregar || cantidad <= 1} onClick={() => setCantidad(c => Math.max(1, c - 1))}
              className="px-3 py-2 text-lg leading-none text-gray-600 disabled:text-gray-300">−</button>
            <span className="min-w-[2.2rem] text-center text-sm font-bold text-gray-900">{cantValida}</span>
            <button type="button" disabled={!puedeAgregar || cantidad >= stockResuelta} onClick={() => setCantidad(c => Math.min(stockResuelta, c + 1))}
              className="px-3 py-2 text-lg leading-none text-gray-600 disabled:text-gray-300">+</button>
          </div>
          <button type="button" disabled={!puedeAgregar} onClick={() => resuelta && onConfirm(resuelta, cantValida)}
            style={puedeAgregar ? { backgroundColor: accent } : undefined}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white ${puedeAgregar ? '' : 'bg-gray-300'}`}>
            {resuelta != null && stockResuelta <= 0 ? 'Sin stock' : resuelta == null ? 'Elige una combinación' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
