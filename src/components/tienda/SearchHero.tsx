'use client';

import { useState, useEffect, useRef } from 'react';
import { Empresa } from '@/lib/types';
import { TiendaColors, lighten } from '@/lib/colors';
import { BannerDestellos } from './BannerDestellos';

interface Banner {
  url: string;
  texto?: string;
  link?: string;
  orden?: number;
}

interface Props {
  empresa: Empresa;
  bannerUrl?: string;
  bannerTexto?: string;
  banners?: Banner[];
  totalProductos: number;
  onSearch?: (query: string) => void;
  colors: TiendaColors;
}

/** Los banners a mostrar: la lista del app o, si no hay, el banner principal viejo. */
export function slidesDeBanners(banners?: Banner[], bannerUrl?: string, bannerTexto?: string): Banner[] {
  const lista = (banners ?? []).filter((b) => b?.url);
  if (lista.length > 0) return [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return bannerUrl ? [{ url: bannerUrl, texto: bannerTexto }] : [];
}

/**
 * El link del banner lo escribe la empresa y va a un `href` público: solo
 * http(s) o una ruta de la misma tienda (`/...`, `#...`).
 */
function linkSeguro(link?: string): string | null {
  const l = link?.trim();
  if (!l) return null;
  if (/^https?:\/\//i.test(l) || (l.startsWith('/') && !l.startsWith('//')) || l.startsWith('#')) return l;
  return null;
}

// La parte de abajo del banner se desvanece hacia el fondo de la página (como
// Mercado Libre) y las tarjetas de "Envío nacional", etc. se montan encima.
const DIFUMINADO = 'linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%)';

export function SearchHero({ bannerUrl, bannerTexto, banners, colors }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueX = useRef<number | null>(null);

  const slides = slidesDeBanners(banners, bannerUrl, bannerTexto);
  const multiSlide = slides.length > 1;
  const ir = (delta: number) => setActiveSlide((prev) => (prev + delta + slides.length) % slides.length);

  // Autoplay; se pausa con el mouse encima. `activeSlide` en las dependencias
  // reinicia los 5 s cuando el usuario cambia de banner a mano.
  useEffect(() => {
    if (!multiSlide || pausado) return;
    const t = setTimeout(() => setActiveSlide((prev) => (prev + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [multiSlide, pausado, slides.length, activeSlide]);

  if (slides.length === 0) {
    return (
      <div className="h-[84px]" style={{ background: `linear-gradient(to bottom right, ${colors.primario}, ${lighten(colors.primario, 0.2)}, ${colors.secundario})` }} />
    );
  }

  return (
    <div
      className="group relative w-full h-[150px] sm:h-[230px] md:h-[320px] lg:h-[400px] overflow-hidden"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={(e) => { toqueX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (toqueX.current == null || !multiSlide) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        toqueX.current = null;
        if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
      }}
    >
      {/* Slides (con el difuminado inferior) */}
      <div className="absolute inset-0" style={{ maskImage: DIFUMINADO, WebkitMaskImage: DIFUMINADO }}>
        {slides.map((slide, i) => {
          const activa = i === activeSlide;
          const href = linkSeguro(slide.link);
          const img = (
            <img
              src={slide.url}
              alt={slide.texto || ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
          );
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${activa ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden={!activa}
            >
              {href ? (
                <a href={href} target={/^https?:/i.test(href) ? '_blank' : undefined} rel="noopener noreferrer" tabIndex={activa ? 0 : -1}>
                  {img}
                </a>
              ) : img}

              {slide.texto && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-start pointer-events-none">
                  <div className="max-w-7xl mx-auto px-6 w-full pt-[8%]">
                    <h2 className="text-white text-lg sm:text-3xl md:text-4xl font-bold max-w-md leading-tight drop-shadow-lg">
                      {slide.texto}
                    </h2>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Destellos (dentro del difuminado: se apagan junto con el banner) */}
        <BannerDestellos color={colors.primario} />
      </div>

      {multiSlide && (
        <>
          {/* Puntos: por encima de las tarjetas que se montan sobre el banner */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[42%] md:bottom-[44%] flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-5 md:w-6 bg-white shadow-md' : 'w-1.5 md:w-2 bg-white/60'}`}
              />
            ))}
          </div>

          {/* Flechas: en computadora aparecen al pasar el mouse */}
          {([-1, 1] as const).map((delta) => (
            <button
              key={delta}
              onClick={() => ir(delta)}
              aria-label={delta < 0 ? 'Banner anterior' : 'Banner siguiente'}
              className={`hidden md:flex absolute top-[30%] -translate-y-1/2 ${delta < 0 ? 'left-4' : 'right-4'} w-11 h-11 rounded-full bg-white/90 hover:bg-white shadow-lg items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={delta < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
              </svg>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
