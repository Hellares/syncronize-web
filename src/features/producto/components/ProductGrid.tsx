'use client';

// Grid de selección de productos (cards) reutilizable — misma presentación que
// Venta Rápida. Autocontenido: maneja su búsqueda y listado; emite onSelect(producto).
// El padre decide qué hacer (agregar al carrito / a la cotización / abrir variantes).

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Producto, ProductoFiltros } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';
import ProductCard, { PRODUCT_CARD_SHELL } from '@/features/producto/components/ProductCard';

// Estilo estándar de input de la web (mismo que el selector de variantes y el
// módulo de compras): zinc-100, ring azul, sombra y glow al enfocar. El padding
// izquierdo deja lugar a la lupa y el derecho al limpiar / spinner.
const inputClass = 'h-[30px] w-full rounded-[6px] bg-zinc-100 pl-8 pr-9 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200';

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
  /**
   * Filtros que se superponen a los de VENDER, que son los de siempre acá.
   * Comprar no es lo mismo: entran los insumos, quedan fuera los combos --un
   * combo se arma, no se le compra a nadie-- y hacen falta los productos que
   * todavía no tienen stock en la sede, que son justamente los que se están
   * por recibir por primera vez.
   */
  filtros?: Partial<ProductoFiltros>;
}

export default function ProductGrid({ sedeId, onSelect, maxHeightClass = 'max-h-[28rem]', colsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', accent = '#004A94', filtros }: Props) {
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
          ...filtros,
        });
        setProductos(res.data);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
    // `filtros` se serializa a proposito: es un objeto literal en el padre y
    // como dependencia cruda volveria a buscar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId, JSON.stringify(filtros ?? {})]);

  // Carga inicial / al cambiar de sede (search está memoizado en [sedeId])
  useEffect(() => { search(''); }, [search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
          </svg>
        </span>
        <input className={inputClass} value={query} onChange={e => search(e.target.value)}
          placeholder="Buscar producto por nombre, código o SKU…" />
        {searching ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#004A94]" />
          </div>
        ) : query ? (
          <button type="button" onClick={() => search('')} title="Limpiar"
            className="absolute right-1.5 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
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
