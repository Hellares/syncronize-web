'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Producto } from '@/lib/types';

interface Props {
  ofertas: Producto[];
  subdominio: string;
}

export function OfertasCarousel({ ofertas, subdominio }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Autoplay
  useEffect(() => {
    if (isDragging) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft: sl, scrollWidth, clientWidth } = scrollRef.current;
      if (sl + clientWidth >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isDragging]);

  return (
    <div className="relative group">
      {/* Scroll buttons */}
      <button onClick={() => scroll('left')}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button onClick={() => scroll('right')}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto pb-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab scroll-smooth'}`}
        style={{ scrollbarWidth: 'none', userSelect: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {ofertas.map((producto) => {
          const descuentoPct = producto.precio && producto.precioOferta && producto.precio > 0
            ? Math.round((1 - producto.precioOferta / producto.precio) * 100)
            : 0;

          return (
            <Link key={producto.id} href={`/${subdominio}/producto/${producto.id}`}
              className="flex-shrink-0 w-40 sm:w-44"
              draggable={false}
              onClick={(e) => { if (isDragging) e.preventDefault(); }}>
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300 group/card">
                {/* Imagen */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                  {producto.imagen ? (
                    <img src={producto.imagen} alt={producto.nombre}
                      className="w-full h-full object-contain p-2 group-hover/card:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📦</div>
                  )}
                  {descuentoPct > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg shadow-lg shadow-red-500/30">
                      -{descuentoPct}%
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <h3 className="text-[11px] text-gray-600 line-clamp-2 leading-snug mb-1.5 font-medium min-h-[28px]">
                    {producto.nombre}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-green-600">
                      S/ {producto.precioOferta?.toFixed(2)}
                    </span>
                    {producto.precio && (
                      <span className="text-[10px] text-gray-400 line-through">
                        S/ {producto.precio.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {/* Estrellas */}
                  {producto.calificacion != null && producto.totalOpiniones! > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex gap-px">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`text-[10px] ${i <= producto.calificacion! ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">({producto.totalOpiniones})</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
