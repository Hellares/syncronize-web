'use client';

import { useState, useEffect } from 'react';
import { Empresa } from '@/lib/types';
import { TiendaColors, lighten } from '@/lib/colors';

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

export function SearchHero({ empresa, bannerUrl, bannerTexto, banners, totalProductos, colors }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides: Banner[] = banners && banners.length > 0
    ? banners.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    : bannerUrl
      ? [{ url: bannerUrl, texto: bannerTexto }]
      : [];

  const hasSlides = slides.length > 0;
  const multiSlide = slides.length > 1;

  // Autoplay
  useEffect(() => {
    if (!multiSlide) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [multiSlide, slides.length]);

  if (!hasSlides) {
    return (
      <div className="py-8" style={{ background: `linear-gradient(to bottom right, ${colors.primario}, ${lighten(colors.primario, 0.2)}, ${colors.secundario})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/80 text-sm">📦 {totalProductos} productos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Banner edge-to-edge con max-width */}
      <div className="max-w-[1400px] mx-auto">
        <div className="relative w-full aspect-[21/7] sm:aspect-[3.5/1] overflow-hidden">
          {/* Slides */}
          {slides.map((slide, i) => (
            <img
              key={i}
              src={slide.url}
              alt={slide.texto || ''}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === activeSlide ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}

          {/* Texto del slide */}
          {slides[activeSlide]?.texto && slides[activeSlide].texto !== '' && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
              <div className="max-w-7xl mx-auto px-6 w-full">
                <h2 className="text-white text-xl sm:text-3xl md:text-4xl font-bold max-w-md leading-tight drop-shadow-lg">
                  {slides[activeSlide].texto}
                </h2>
              </div>
            </div>
          )}

          {/* Dots */}
          {multiSlide && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-6 bg-white shadow-md' : 'w-2 bg-white/50'}`}
                />
              ))}
            </div>
          )}

          {/* Flechas */}
          {multiSlide && (
            <>
              <button onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
