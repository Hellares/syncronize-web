'use client';

// Visual de la card de producto (presentacional) — diseño inspirado en Uiverse:
// imagen con esquina sup-der redondeada, price tag flotante, marca y badges.
// El padre la envuelve en un <button> con su propio manejo de click (agregar / etc.).
// Se usa en Venta Rápida y en el grid de Cotización para un look unificado.

import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';
import { presentacionPlana } from '@/core/utils/unidad-presentacion';

/**
 * Shell del <button> contenedor, SIN color de borde.
 *
 * 🔴 El color va aparte porque agregarle otro `border-*` encima al shell
 * completo NO alcanza: las dos son utilidades de `border-color` y en la hoja
 * compilada el arbitrario (`border-[#...]`) se declara ANTES que el nombrado
 * (`border-gray-200/80`), así que gana el gris y el override queda mudo. El
 * orden de las clases en el atributo no decide nada.
 */
export const PRODUCT_CARD_BASE =
  'group relative flex w-full flex-col rounded-xl border bg-white p-1 text-left shadow-[rgba(100,100,111,0.2)_0px_50px_30px_-20px] transition-all duration-500 ease-in-out hover:scale-[1.03]';

/** Shell por defecto, con el borde gris de siempre. */
export const PRODUCT_CARD_SHELL = `${PRODUCT_CARD_BASE} border-gray-200/80`;

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
  // Un granel se guarda en gramos: sin convertir, la tarjeta decía "S/ 0.01"
  // y "×28000" en vez de "S/ 11.00/kg" y "28 kg". Sin presentación el factor
  // es 1 y todo queda como antes.
  const pres = presentacionPlana(p);

  return (
    <>
      {/* Imagen + badges + price tag flotante */}
      <div className="relative">
        {/* 🔴 PROPORCIÓN, no altura fija. Con `h-24` la caja medía 96px
            pasara lo que pasara con el ancho: en una grilla de 5 columnas a
            pantalla ancha la tarjeta llega a ~200px y la foto quedaba en una
            franja de 2:1 —con `object-cover`, una tajada horizontal del
            producto—. Con `aspect-[4/3]` el alto sigue al ancho y la foto se
            ve entera en cualquier tamaño de pantalla. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg rounded-tr-[1.6rem] bg-gradient-to-br from-gray-50 to-gray-100">
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
              {sinStock ? 'SIN STOCK' : pres.activa ? pres.cantidadTexto(stock?.cantidad ?? 0) : `×${stock?.cantidad ?? 0}`}
            </span>
          )}
        </div>
        {/* Price tag flotante (asoma bajo la imagen) */}
        {precio != null && (
          <span className="absolute -bottom-2 right-1.5 z-10 rounded-lg rounded-b-2xl bg-white px-1.5 py-0.5 text-[11px] font-extrabold shadow-[0_2px_10px_rgba(0,0,0,0.15)]" style={{ color: priceColor }}>
            S/ {fmt(pres.precio(Number(precio)))}
            {pres.activa && <span className="text-[9px] font-bold">/{pres.simbolo}</span>}
          </span>
        )}
      </div>

      {/* Contenido
          🔴 Las tres filas RESERVAN su espacio aunque estén vacías. En una
          grilla, todas las tarjetas de una fila se estiran a la más alta: con
          la marca y la pastilla apareciendo y desapareciendo, un solo producto
          con variantes estiraba la fila entera y a los demás les quedaba un
          hueco abajo. El nombre ya lo hacía con `min-h-[1.8rem]`; faltaban las
          otras dos. Así la tarjeta mide lo mismo SIEMPRE. */}
      <div className="px-1.5 pb-1 pt-3">
        <p className="h-3 truncate text-[9px] font-bold uppercase leading-3 tracking-wide text-gray-400">{marca ?? ''}</p>
        <p className="line-clamp-2 text-[11px] font-medium leading-tight text-gray-800 min-h-[1.8rem]">{p.nombre}</p>
        <div className="mt-0.5 flex h-[18px] items-center">
          {p.tieneVariantes ? (
            <span className="inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 ring-1 ring-blue-200">Variantes →</span>
          ) : p.esCombo && precio == null ? (
            <p className="text-[11px] font-bold text-purple-700">Calculado</p>
          ) : precio == null ? (
            <p className="text-[11px] font-semibold text-gray-400">Sin precio</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
