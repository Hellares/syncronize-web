'use client';

// Grid de selección de productos (cards) reutilizable — misma presentación que
// Venta Rápida. Autocontenido: maneja su búsqueda y listado; emite onSelect(producto).
// El padre decide qué hacer (agregar al carrito / a la cotización / abrir variantes).

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Producto } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';
import ProductCard, { PRODUCT_CARD_SHELL } from '@/features/producto/components/ProductCard';

const inputClass = 'w-full rounded-[6px] h-[30px] border border-gray-300 px-3 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]/20';

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
  /** Color de acento de las cards (price tag). */
  accent?: string;
}

export default function ProductGrid({ sedeId, onSelect, maxHeightClass = 'max-h-[28rem]', colsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', accent = '#004A94' }: Props) {
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

      <div className={`grid gap-y-2.5 gap-x-[15px] ${colsClass} ${maxHeightClass} overflow-y-auto rounded-xl bg-[#f5f5f5] p-3 content-start`}>
        {productos.map(p => (
          <button key={p.id} type="button" onClick={() => handleClick(p)} onDoubleClick={() => handleDoubleClick(p)}
            title="Click: agregar · Doble click: ver imágenes" className={PRODUCT_CARD_SHELL}>
            <ProductCard producto={p} sedeId={sedeId} accent={accent} />
          </button>
        ))}
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
