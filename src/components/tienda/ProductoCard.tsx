'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Producto } from '@/lib/types';

export function ProductoCard({ producto, subdominio }: { producto: Producto; subdominio: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const precioFinal = producto.enOferta && producto.precioOferta ? producto.precioOferta : producto.precio;
  const tieneDescuento = producto.enOferta && producto.precioOferta && producto.precio;
  const descuentoPct = tieneDescuento && producto.precio! > 0
    ? Math.round((1 - producto.precioOferta! / producto.precio!) * 100) : 0;

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    router.push(`/${subdominio}/producto/${producto.id}`);
  };

  return (
    <div onClick={handleClick} className="block h-full">
      <article className={`bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 cursor-pointer group h-full flex flex-col relative border border-gray-200 md:border-2 hover:border-blue-400 hover:-translate-y-1 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 rounded-2xl">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Imagen */}
        <div className="relative aspect-square md:aspect-[4/3] bg-gradient-to-br from-white via-gray-50 to-blue-50/30 overflow-hidden border-b border-gray-100">
          {producto.imagen ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="w-full h-full object-contain p-2 md:p-4 group-hover:scale-110 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-[10px]">Sin imagen</span>
            </div>
          )}

          {/* Badges top */}
          <div className="absolute top-0 left-0 right-0 p-1.5 md:p-2 flex justify-between items-start">
            {tieneDescuento && descuentoPct > 0 ? (
              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] md:text-[10px] font-extrabold px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg shadow-lg shadow-red-500/40 ring-1 ring-red-400/50">
                -{descuentoPct}%
              </span>
            ) : <span />}

            {producto.hayStock && producto.enOferta && (
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[7px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 rounded-md shadow-md">
                OFERTA
              </span>
            )}
          </div>

          {/* Overlay agotado */}
          {!producto.hayStock && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end justify-center pb-5">
              <span className="bg-white text-gray-800 text-[10px] font-bold px-5 py-1.5 rounded-full shadow-lg border border-gray-200">
                Sin stock
              </span>
            </div>
          )}

          {/* Envio badge */}
          {producto.hayStock && precioFinal && precioFinal > 100 && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                ENVIO GRATIS
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-1.5 md:p-3.5 flex flex-col flex-1 gap-0.5 md:gap-1">
          {/* Precio */}
          <div>
            {precioFinal != null ? (
              <>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className={`text-xs md:text-xl font-extrabold tracking-tight ${tieneDescuento ? 'text-green-600' : 'text-gray-900'}`}>
                    S/ {precioFinal.toFixed(2)}
                  </span>
                  {tieneDescuento && (
                    <span className="text-[8px] md:text-[11px] text-gray-400 line-through font-medium">
                      S/ {producto.precio!.toFixed(2)}
                    </span>
                  )}
                </div>
                {/* Cuotas */}
                {precioFinal > 50 && (
                  <p className="text-[7px] md:text-[10px] text-gray-400 mt-0.5">
                    en <span className="text-green-600 font-semibold">6x S/ {(precioFinal / 6).toFixed(2)}</span> sin interes
                  </p>
                )}
              </>
            ) : (
              <span className="text-[10px] md:text-sm font-bold text-blue-600">Consultar precio</span>
            )}
          </div>

          {/* Estrellas */}
          {producto.calificacion != null && producto.totalOpiniones! > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex gap-px">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i <= producto.calificacion! ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200'}`}
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-[10px] text-gray-400 font-medium">({producto.totalOpiniones})</span>
            </div>
          )}

          {/* Nombre */}
          <h3 className="text-[9px] md:text-[13px] text-gray-800 line-clamp-2 leading-tight font-semibold group-hover:text-blue-600 transition-colors flex-1 mt-0.5">
            {producto.nombre}
          </h3>

          {/* Ubicacion + distancia */}
          <div className="flex items-center justify-between mt-auto pt-1 md:pt-2 border-t border-gray-100">
            {producto.empresa?.ubicacion ? (
              <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {producto.empresa.ubicacion}
              </span>
            ) : <span />}
            {producto.distancia != null && (
              <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap ml-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                {producto.distancia < 1 ? `${Math.round(producto.distancia * 1000)}m` : `${producto.distancia.toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
