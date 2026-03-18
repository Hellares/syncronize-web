'use client';

import { useState } from 'react';

interface Props {
  imagenes: { id: string; url: string; thumbnail?: string }[];
  nombre: string;
}

export function ImageGallery({ imagenes, nombre }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md aspect-square flex items-center justify-center text-gray-300">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Imagen principal */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden aspect-square relative group">
        <img
          src={imagenes[activeIndex].url}
          alt={nombre}
          className="w-full h-full object-contain transition-opacity duration-300"
        />

        {/* Flechas de navegación */}
        {imagenes.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev === 0 ? imagenes.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev === imagenes.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicador */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imagenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {imagenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {imagenes.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${
                i === activeIndex
                  ? 'border-blue-500 shadow-sm'
                  : 'border-transparent opacity-50 hover:opacity-80 hover:border-gray-300'
              }`}
            >
              <img src={img.thumbnail || img.url} alt="" className="w-full h-full object-cover rounded-md" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
