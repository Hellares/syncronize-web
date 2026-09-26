'use client';

import { useEffect, useRef, useState } from 'react';
import { TiendaColors } from '@/lib/colors';

/**
 * Fotos que se deslizan (scroll-snap): con el dedo en celular y con flechas en
 * computadora. Pasa sola cada 5 s mientras no se toque.
 */
export function GaleriaSlider({ fotos, colors }: { fotos: string[]; colors: TiendaColors }) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);
  const [tocada, setTocada] = useState(false);

  const irA = (i: number) => {
    const pista = pistaRef.current;
    const hijo = pista?.children[i] as HTMLElement | undefined;
    if (pista && hijo) pista.scrollTo({ left: hijo.offsetLeft - pista.offsetLeft, behavior: 'smooth' });
  };

  // La foto activa es la que está más cerca del borde izquierdo.
  const alDesplazar = () => {
    const pista = pistaRef.current;
    if (!pista) return;
    let mejor = 0;
    let distancia = Infinity;
    Array.from(pista.children).forEach((c, i) => {
      const d = Math.abs((c as HTMLElement).offsetLeft - pista.offsetLeft - pista.scrollLeft);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    setActiva(mejor);
  };

  useEffect(() => {
    if (tocada || fotos.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => irA((activa + 1) % fotos.length), 5000);
    return () => clearTimeout(t);
  }, [activa, tocada, fotos.length]);

  if (fotos.length === 0) return null;

  return (
    <div className="relative" onMouseEnter={() => setTocada(true)} onTouchStart={() => setTocada(true)}>
      <div
        ref={pistaRef}
        onScroll={alDesplazar}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory -mr-4 md:mr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            loading="lazy"
            className="snap-start flex-shrink-0 w-[78%] sm:w-[48%] lg:w-[32%] h-[220px] md:h-[300px] object-cover rounded-xl bg-gray-100"
          />
        ))}
      </div>

      {fotos.length > 1 && (
        <>
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setTocada(true); irA(Math.min(fotos.length - 1, Math.max(0, activa + d))); }}
              aria-label={d < 0 ? 'Foto anterior' : 'Foto siguiente'}
              className={`hidden md:flex absolute top-1/2 -translate-y-[calc(50%+12px)] ${d < 0 ? '-left-5' : '-right-5'} w-11 h-11 rounded-full bg-white shadow-lg items-center justify-center text-gray-700 hover:text-gray-900`}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={d < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
              </svg>
            </button>
          ))}
          <div className="mt-4 flex justify-center gap-1.5">
            {fotos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setTocada(true); irA(i); }}
                aria-label={`Foto ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === activa ? 24 : 6, backgroundColor: i === activa ? colors.primario : '#b7c6dd' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
