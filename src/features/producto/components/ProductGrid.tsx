'use client';

// Grid de selección de productos (cards) reutilizable — misma presentación que
// Venta Rápida. Autocontenido: maneja su búsqueda y listado; emite onSelect(producto).
// El padre decide qué hacer (agregar al carrito / a la cotización / abrir variantes).

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]/20';

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function imgUrl(p: { archivos?: Array<{ url: string; urlThumbnail?: string }>; imagenes?: string[] }): string | null {
  if (p.archivos?.length) return p.archivos[0].urlThumbnail || p.archivos[0].url;
  if (p.imagenes?.length) return p.imagenes[0];
  return null;
}

/** Todas las imágenes del producto (galería) para el dialog. */
function imgList(p: { archivos?: Array<{ url: string; urlThumbnail?: string }>; imagenes?: string[] }): string[] {
  if (p.archivos?.length) return p.archivos.map(a => a.url);
  if (p.imagenes?.length) return p.imagenes;
  return [];
}

interface Props {
  sedeId: string;
  onSelect: (producto: Producto) => void;
  /** Altura máxima del grid (clase tailwind). Por defecto acotado para no empujar la página. */
  maxHeightClass?: string;
  /** Columnas del grid (clases tailwind). Útil para paneles angostos. */
  colsClass?: string;
}

export default function ProductGrid({ sedeId, onSelect, maxHeightClass = 'max-h-[28rem]', colsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' }: Props) {
  const [query, setQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog de imágenes (doble-click). Timer para distinguir click simple de doble.
  const [imgDialog, setImgDialog] = useState<Producto | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback((p: Producto) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { onSelect(p); clickTimer.current = null; }, 200);
  }, [onSelect]);

  const handleDoubleClick = useCallback(async (p: Producto) => {
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    setImgIdx(0);
    setImgDialog(p);
    // Enriquecer con todas las imágenes del detalle (la lista puede traer solo el thumbnail)
    try {
      const full = await productoService.getProducto(p.id);
      setImgDialog(prev => (prev && prev.id === p.id ? full : prev));
    } catch { /* se queda con lo de la lista */ }
  }, []);

  const stockDeSede = useCallback((stocks?: StockPorSedeInfo[]): StockPorSedeInfo | null => {
    if (!stocks?.length) return null;
    return stocks.find(s => s.sedeId === sedeId) ?? stocks[0];
  }, [sedeId]);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({
          page: 1, limit: 30, search: q || undefined, sedeId: sedeId || undefined, isActive: true, esInsumo: false,
        });
        setProductos(res.data);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
  }, [sedeId]);

  // Carga inicial / al cambiar de sede (search está memoizado en [sedeId])
  useEffect(() => { search(''); }, [search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input className={inputClass} value={query} onChange={e => search(e.target.value)}
          placeholder="Buscar producto por nombre, código o SKU..." />
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#004A94]" /></div>}
      </div>

      <div className={`grid gap-2.5 ${colsClass} ${maxHeightClass} overflow-y-auto p-1 content-start`}>
        {productos.map(p => {
          const stock = stockDeSede(p.stocksPorSede);
          const precio = p.tieneVariantes ? null : stock ? infoPrecioEfectivo(stock) : null;
          const enLiq = stock ? infoLiquidacionActiva(stock) : false;
          const img = imgUrl(p);
          const sinStock = !p.tieneVariantes && !p.esCombo && (stock?.cantidad ?? 0) <= 0;
          return (
            <button key={p.id} type="button" onClick={() => handleClick(p)} onDoubleClick={() => handleDoubleClick(p)} title="Click: agregar · Doble click: ver imágenes"
              className="group relative overflow-hidden rounded-lg border border-gray-300/80 bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#004A94]/60 hover:shadow-[0_8px_20px_rgba(0,74,148,0.15)] active:translate-y-0 active:shadow-sm">
              <div className="relative h-20 w-full bg-gradient-to-br from-gray-50 to-gray-100">
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
                    </svg>
                  </div>
                )}
                <div className="absolute left-1 top-1 flex gap-1">
                  {p.esCombo && <span className="rounded-md bg-purple-600/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">📦 COMBO</span>}
                  {enLiq && <span className="rounded-md bg-red-600/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">LIQ</span>}
                </div>
                {!p.tieneVariantes && (
                  <span className={`absolute right-1 top-1 rounded-md px-1.5 py-0.5 text-[8px] font-bold shadow-sm ${sinStock ? 'bg-red-600/90 text-white' : 'bg-white/90 text-gray-600'}`}>
                    {sinStock ? 'SIN STOCK' : `×${stock?.cantidad ?? 0}`}
                  </span>
                )}
              </div>
              <div className="px-2 pb-1.5 pt-1">
                <p className="line-clamp-2 text-[11px] font-medium leading-tight text-gray-800 min-h-[1.8rem]">{p.nombre}</p>
                <div className="mt-0.5 flex items-end justify-between">
                  {p.esCombo ? (
                    <p className={`text-[13px] font-bold ${enLiq ? 'text-red-600' : 'text-purple-700'}`}>{precio != null ? `S/ ${fmt(Number(precio))}` : 'Calculado'}</p>
                  ) : p.tieneVariantes ? (
                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 ring-1 ring-blue-200">Variantes →</span>
                  ) : (
                    <p className={`text-[13px] font-bold ${enLiq ? 'text-red-600' : 'text-[#004A94]'}`}>{precio != null ? `S/ ${fmt(Number(precio))}` : 'Sin precio'}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {!searching && productos.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-gray-400">Sin productos</p>
        )}
      </div>

      {imgDialog && (() => {
        const imgs = imgList(imgDialog);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setImgDialog(null)}>
            <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{imgDialog.nombre}</p>
                <button type="button" onClick={() => setImgDialog(null)} className="shrink-0 text-gray-400 hover:text-gray-600">✕</button>
              </div>
              {imgs.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">Este producto no tiene imágenes</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                    <img src={imgs[Math.min(imgIdx, imgs.length - 1)]} alt={imgDialog.nombre} className="max-h-full max-w-full object-contain" />
                  </div>
                  {imgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {imgs.map((u, i) => (
                        <button key={i} type="button" onClick={() => setImgIdx(i)}
                          className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === imgIdx ? 'border-[#004A94]' : 'border-transparent'}`}>
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
