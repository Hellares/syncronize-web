'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoriaTienda } from '@/lib/types';

interface Props {
  categorias: CategoriaTienda[];
  categoriaActiva: string | null;
  onElegir: (id: string) => void;
  /** Color de la barra: las flechas se funden con él. */
  fondo: string;
}

/**
 * Las categorías de la barra de la cabecera. Si entran todas quedan quietas;
 * si no, se deslizan (rueda, touchpad o las flechas de los costados), que
 * solo aparecen hacia donde queda algo por ver.
 */
export function CategoriasSlider({ categorias, categoriaActiva, onElegir, fondo }: Props) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const medir = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    // 1 px de tolerancia: el ancho puede venir con decimales.
    setPuedeIzq(el.scrollLeft > 1);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = pistaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    // Tras pintar: la fuente puede cambiar el ancho de los textos.
    const t = setTimeout(medir, 0);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [medir, categorias]);

  // La categoría elegida (desde el menú, la barra lateral…) se trae a la vista.
  // A mano y solo en horizontal: `scrollIntoView` también movería la página.
  useEffect(() => {
    const el = pistaRef.current;
    const boton = categoriaActiva ? el?.querySelector<HTMLElement>(`[data-cat="${categoriaActiva}"]`) : null;
    if (!el || !boton) return;
    const izq = boton.offsetLeft;
    const der = izq + boton.offsetWidth;
    if (izq < el.scrollLeft) el.scrollTo({ left: izq - 40, behavior: 'smooth' });
    else if (der > el.scrollLeft + el.clientWidth) el.scrollTo({ left: der - el.clientWidth + 40, behavior: 'smooth' });
  }, [categoriaActiva]);

  const mover = (sentido: 1 | -1) => {
    const el = pistaRef.current;
    if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const flecha = (sentido: 1 | -1) => (
    <div
      className={`absolute top-0 bottom-0 ${sentido === -1 ? 'left-0 pr-6' : 'right-0 pl-6'} flex items-center z-10`}
      style={{
        background: `linear-gradient(to ${sentido === -1 ? 'right' : 'left'}, ${fondo} 55%, transparent)`,
      }}
    >
      <button
        type="button"
        onClick={() => mover(sentido)}
        aria-label={sentido === -1 ? 'Ver categorías anteriores' : 'Ver más categorías'}
        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={sentido === -1 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="relative flex-1 min-w-0">
      {puedeIzq && flecha(-1)}
      <div
        ref={pistaRef}
        onScroll={medir}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-center gap-1 w-max">
          {categorias.map((cat) => {
            const activa = cat.id === categoriaActiva;
            return (
              <button
                key={cat.id}
                data-cat={cat.id}
                onClick={() => onElegir(cat.id)}
                title={cat.nombre}
                className="flex-shrink-0 px-3 xl:px-4 py-1 rounded-md text-white text-[13px] font-medium uppercase tracking-wide whitespace-nowrap transition-colors hover:bg-white/15"
                style={activa ? { backgroundColor: 'rgba(255,255,255,0.22)' } : undefined}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>
      </div>
      {puedeDer && flecha(1)}
    </div>
  );
}
