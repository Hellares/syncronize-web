'use client';

// Visual de la card de producto (presentacional) — diseño inspirado en Uiverse:
// imagen con esquina sup-der redondeada, price tag flotante, marca y badges.
// El padre la envuelve en un <button> con su propio manejo de click (agregar / etc.).
// Se usa en Venta Rápida y en el grid de Cotización para un look unificado.

import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';

/** Clases del <button> contenedor (úsalas en el padre para unificar el shell). */
export const PRODUCT_CARD_SHELL =
  'group relative flex w-full flex-col rounded-xl border border-gray-200/80 bg-white p-1 text-left shadow-[0_10px_22px_-6px_rgba(100,100,111,0.30),0_3px_8px_-3px_rgba(100,100,111,0.20)] transition-all duration-200 hover:-translate-y-1.5 hover:border-gray-300 hover:shadow-[0_22px_36px_-10px_rgba(0,74,148,0.30),0_8px_16px_-6px_rgba(0,74,148,0.20)] active:translate-y-0';

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function imgUrl(p: { archivos?: Array<{ url: string; urlThumbnail?: string }>; imagenes?: string[] }): string | null {
  if (p.archivos?.length) return p.archivos[0].urlThumbnail || p.archivos[0].url;
  if (p.imagenes?.length) return p.imagenes[0];
  return null;
}

interface Props {
  producto: Producto;
  sedeId: string;
  /** Color de acento (VR #437EFF, cotización #004A94). */
  accent?: string;
}

export default function ProductCard({ producto: p, sedeId, accent = '#004A94' }: Props) {
  const stock: StockPorSedeInfo | null = (p.stocksPorSede ?? []).find(s => s.sedeId === sedeId) ?? p.stocksPorSede?.[0] ?? null;
  const precio = p.tieneVariantes ? null : stock ? infoPrecioEfectivo(stock) : null;
  const enLiq = stock ? infoLiquidacionActiva(stock) : false;
  const img = imgUrl(p);
  const sinStock = !p.tieneVariantes && !p.esCombo && (stock?.cantidad ?? 0) <= 0;
  const marca = p.marca?.nombre;
  const priceColor = enLiq ? '#dc2626' : accent;

  return (
    <>
      {/* Imagen + badges + price tag flotante */}
      <div className="relative">
        <div className="relative h-24 w-full overflow-hidden rounded-lg rounded-tr-[1.6rem] bg-gradient-to-br from-gray-50 to-gray-100">
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
          {/* Badges sobre la imagen */}
          <div className="absolute left-1.5 top-1.5 flex gap-1">
            {p.esCombo && <span className="rounded-md bg-purple-600/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">📦 COMBO</span>}
            {enLiq && <span className="rounded-md bg-red-600/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">LIQ</span>}
          </div>
          {!p.tieneVariantes && (
            <span className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[8px] font-bold shadow-sm ${sinStock ? 'bg-red-600/90 text-white' : 'bg-white/90 text-gray-600'}`}>
              {sinStock ? 'SIN STOCK' : `×${stock?.cantidad ?? 0}`}
            </span>
          )}
        </div>
        {/* Price tag flotante (asoma bajo la imagen) */}
        {precio != null && (
          <span className="absolute -bottom-2 right-1.5 z-10 rounded-lg rounded-b-2xl bg-white px-1.5 py-0.5 text-[11px] font-extrabold shadow-[0_2px_10px_rgba(0,0,0,0.15)]" style={{ color: priceColor }}>
            S/ {fmt(Number(precio))}
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="px-1.5 pb-1 pt-3">
        {marca && <p className="truncate text-[9px] font-bold uppercase tracking-wide text-gray-400">{marca}</p>}
        <p className="line-clamp-2 text-[11px] font-medium leading-tight text-gray-800 min-h-[1.8rem]">{p.nombre}</p>
        {p.tieneVariantes ? (
          <span className="mt-0.5 inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 ring-1 ring-blue-200">Variantes →</span>
        ) : p.esCombo && precio == null ? (
          <p className="mt-0.5 text-[11px] font-bold text-purple-700">Calculado</p>
        ) : precio == null ? (
          <p className="mt-0.5 text-[11px] font-semibold text-gray-400">Sin precio</p>
        ) : null}
      </div>
    </>
  );
}
