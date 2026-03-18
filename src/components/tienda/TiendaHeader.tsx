'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Empresa } from '@/lib/types';

interface Props {
  empresa: Empresa;
  subdominio: string;
  categorias: string[];
}

export function TiendaHeader({ empresa, subdominio, categorias }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-10">
          {/* Nav categorías */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto flex-1">
            <Link href={`/${subdominio}`}
              className="px-3 py-1.5 text-xs font-semibold text-gray-900 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors whitespace-nowrap">
              Inicio
            </Link>
            {categorias.slice(0, 10).map((cat) => (
              <span key={cat}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer whitespace-nowrap">
                {cat}
              </span>
            ))}
            {empresa.telefono && (
              <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`}
                target="_blank"
                className="ml-auto px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors whitespace-nowrap">
                Contactanos
              </a>
            )}
          </nav>

          {/* Hamburger mobile */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600 hover:text-gray-900">
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <span className="md:hidden text-sm font-medium text-gray-700 ml-2">Menu</span>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-2 space-y-0.5">
            <Link href={`/${subdominio}`} onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-lg">
              Inicio
            </Link>
            {categorias.map((cat) => (
              <span key={cat} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                {cat}
              </span>
            ))}
            {empresa.telefono && (
              <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`}
                target="_blank" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg">
                💬 Contactanos por WhatsApp
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
