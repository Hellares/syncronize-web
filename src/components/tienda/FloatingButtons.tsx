'use client';

import { useState, useEffect } from 'react';

interface Props {
  telefono?: string;
  empresaNombre: string;
}

export function FloatingButtons({ telefono, empresaNombre }: Props) {
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* WhatsApp FAB */}
      {telefono && (
        <a
          href={`https://wa.me/${telefono.replace(/\D/g, '').replace(/^9/, '51')}?text=${encodeURIComponent(`Hola ${empresaNombre}, vi su tienda en Syncronize y me gustaría mas información.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-[60px] h-[60px] rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 group overflow-hidden"
        >
          <img src="/w.png" alt="WhatsApp" className="w-[60px] h-[60px] object-contain" />
          <span className="absolute right-full mr-3 bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chatea con nosotros
          </span>
        </a>
      )}

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-300 hover:bg-gray-50 ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  );
}
