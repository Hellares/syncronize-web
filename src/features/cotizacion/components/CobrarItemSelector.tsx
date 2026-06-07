'use client';

import { useState, useCallback, useRef } from 'react';
import type { Producto } from '@/core/types/producto';
import { infoPrecioEfectivo } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';

/** Item nuevo a agregar en el cobro (shape CotizacionDetalleInput de Flutter) */
export interface ItemAdicional {
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  porcentajeIGV: number;
  precioIncluyeIgv: boolean;
  tipoAfectacion: string;
  icbper: number;
}

/** Cálculos del item (paridad cotizacion_detalle_input.dart getters) */
export function calcularItem(it: { cantidad: number; precioUnitario: number; descuento: number; porcentajeIGV: number; precioIncluyeIgv: boolean; tipoAfectacion: string; icbper: number }) {
  const bruto = it.cantidad * it.precioUnitario - it.descuento;
  const rate = it.tipoAfectacion === '10' ? it.porcentajeIGV / 100 : 0;
  const subtotal = it.precioIncluyeIgv && rate > 0 ? bruto / (1 + rate) : bruto;
  const igv = subtotal * rate;
  const icbperTotal = it.icbper * it.cantidad;
  const total = (it.precioIncluyeIgv ? bruto : subtotal + igv) + icbperTotal;
  return { subtotal, igv, total };
}

interface Props {
  isOpen: boolean;
  sedeId?: string | null;
  onAdd: (item: ItemAdicional) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

/** Selector compacto de producto/variante para agregar items en el cobro */
export default function CobrarItemSelector({ isOpen, sedeId, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [variantesDe, setVariantesDe] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 10, search: q, sedeId: sedeId || undefined, isActive: true });
        setResults(res.data);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
  }, [sedeId]);

  const stockSede = (p: { stocksPorSede?: Array<{ sedeId: string; precio?: number; precioIncluyeIgv?: boolean; cantidad: number }> }) => {
    if (!p.stocksPorSede?.length) return null;
    return p.stocksPorSede.find(s => s.sedeId === sedeId) ?? p.stocksPorSede[0];
  };

  const agregar = async (p: Producto, varianteId?: string, varianteNombre?: string, stocksVariante?: Producto['variantes']) => {
    const n = Math.max(1, parseInt(cantidad) || 1);
    let stock;
    if (varianteId) {
      const v = (stocksVariante ?? p.variantes ?? []).find(x => x.id === varianteId);
      stock = v ? stockSede(v) : null;
    } else {
      stock = stockSede(p);
    }
    const precio = stock ? infoPrecioEfectivo(stock as Parameters<typeof infoPrecioEfectivo>[0]) ?? stock.precio ?? 0 : 0;
    onAdd({
      productoId: p.id,
      varianteId,
      descripcion: varianteNombre ? `${p.nombre} - ${varianteNombre}` : p.nombre,
      cantidad: n,
      precioUnitario: Number(precio ?? 0),
      descuento: 0,
      porcentajeIGV: p.impuestoPorcentaje ?? 18,
      precioIncluyeIgv: stock?.precioIncluyeIgv ?? true,
      tipoAfectacion: (p as { tipoAfectacion?: string }).tipoAfectacion ?? '10',
      icbper: 0,
    });
    setQuery(''); setResults([]); setVariantesDe(null); setCantidad('1');
  };

  const handlePick = async (p: Producto) => {
    if (p.tieneVariantes) {
      if (!p.variantes?.length) {
        try {
          const full = await productoService.getProducto(p.id);
          setVariantesDe(full);
        } catch { /* ignore */ }
      } else {
        setVariantesDe(p);
      }
      setResults([]);
      return;
    }
    agregar(p);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[75vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">Agregar producto al cobro</h3>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <input className={inputClass} value={query} onChange={e => search(e.target.value)} placeholder="Buscar producto..." autoFocus />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
          </div>
          <input className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center outline-none focus:border-[#437EFF]"
            type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} title="Cantidad" />
        </div>

        {variantesDe ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">Variantes de <strong>{variantesDe.nombre}</strong>:</p>
            {(variantesDe.variantes ?? []).filter(v => v.isActive !== false).map(v => {
              const st = stockSede(v);
              return (
                <button key={v.id} onClick={() => agregar(variantesDe, v.id, v.nombre, variantesDe.variantes)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:border-[#437EFF] hover:bg-[#437EFF]/5">
                  <span className="font-medium text-gray-900">{v.nombre}</span>
                  <span className="text-xs text-gray-500">
                    {st?.precio != null ? `S/ ${Number(st.precio).toFixed(2)}` : 'Sin precio'} · stock {st?.cantidad ?? 0}
                  </span>
                </button>
              );
            })}
            <button onClick={() => setVariantesDe(null)} className="text-xs text-[#437EFF] hover:underline">← Volver a buscar</button>
          </div>
        ) : results.length > 0 && (
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {results.map(p => {
              const st = stockSede(p);
              return (
                <button key={p.id} onClick={() => handlePick(p)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-[10px] text-gray-400">{p.sku || p.codigoEmpresa}{p.tieneVariantes ? ' · Con variantes' : ''}</p>
                  </div>
                  {!p.tieneVariantes && (
                    <span className="shrink-0 text-xs text-gray-600">
                      {st?.precio != null ? `S/ ${Number(st.precio).toFixed(2)}` : '—'} · {st?.cantidad ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
