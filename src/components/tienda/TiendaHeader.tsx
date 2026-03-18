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
  const [categoriasOpen, setCategoriasOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20">
      {/* Header principal */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-14">
          {/* Logo */}
          <Link href={`/${subdominio}`} className="flex items-center gap-2 flex-shrink-0">
            {empresa.logo ? (
              <img src={empresa.logo} alt={empresa.nombre} className="w-9 h-9 rounded-lg object-cover bg-white shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {empresa.nombre[0]}
              </div>
            )}
            <span className="text-white font-bold text-[11px] leading-tight hidden sm:block w-[170px] line-clamp-2 text-center">
              {empresa.nombre}
            </span>
          </Link>

          {/* Buscador */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar productos, marcas y mas..."
                className="w-full pl-4 pr-12 py-2 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400 shadow-sm"
              />
              <button className="absolute right-0 top-0 bottom-0 px-3 bg-gray-100 hover:bg-gray-200 rounded-r-md transition-colors border-l">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Info derecha */}
          <div className="hidden md:flex items-center gap-2 whitespace-nowrap">
            <div className="bg-slate-800 text-amber-400 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
              Envios a nivel nacional
            </div>
            <div className="leading-tight">
              <p className="text-[12px] text-white/70">Descuentos en tu <span className="font-bold text-amber-300">primera compra</span></p>
            </div>
          </div>

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="bg-gradient-to-r from-blue-700/90 via-blue-600/90 to-cyan-600/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="hidden md:flex items-center gap-0.5 h-9">
            <Link href={`/${subdominio}`}
              className="px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap">
              Inicio
            </Link>

            {/* Dropdown categorías */}
            {categorias.length > 0 && (
              <div className="relative"
                onMouseEnter={() => setCategoriasOpen(true)}
                onMouseLeave={() => setCategoriasOpen(false)}>
                <button className="px-3 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center gap-1">
                  Categorias
                  <svg className={`w-3 h-3 transition-transform ${categoriasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {categoriasOpen && (
                  <div className="absolute top-full left-0 mt-0.5 bg-blue-100 rounded-lg shadow-2xl border border-blue-200 py-1 min-w-[220px] z-50 max-h-[70vh] overflow-y-auto">
                    {categorias.map((cat) => (
                      <span key={cat}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-white cursor-pointer transition-colors">
                        {cat}
                        <svg className="w-3.5 h-3.5 text-blue-300 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="px-3 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              Productos
            </span>
            <span className="px-3 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              Servicios
            </span>
            <span className="px-3 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              📍 Ubicacion
            </span>

            {empresa.telefono && (
              <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`}
                target="_blank"
                className="ml-auto px-3 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
                Contactanos
              </a>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-2 space-y-0.5">
            <Link href={`/${subdominio}`} onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-blue-50 rounded-lg">Inicio</Link>

            {categorias.length > 0 && (
              <details className="group">
                <summary className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg cursor-pointer list-none flex items-center justify-between">
                  Categorias
                  <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pl-6 space-y-0.5 mt-0.5">
                  {categorias.map((cat) => (
                    <span key={cat} onClick={() => setMenuOpen(false)}
                      className="block px-3 py-1.5 text-sm text-gray-500 hover:bg-blue-50 rounded-lg cursor-pointer">{cat}</span>
                  ))}
                </div>
              </details>
            )}

            <span onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg cursor-pointer">Productos</span>
            <span onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg cursor-pointer">Servicios</span>
            <span onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg cursor-pointer">📍 Ubicacion</span>

            {empresa.telefono && (
              <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`} target="_blank"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg">💬 Contactanos</a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
