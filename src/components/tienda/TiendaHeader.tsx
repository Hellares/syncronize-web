'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Empresa } from '@/lib/types';
import { TiendaColors, darken, lighten, alpha } from '@/lib/colors';

interface Props {
  empresa: Empresa;
  subdominio: string;
  categorias: string[];
  onSearch?: (query: string) => void;
  colors: TiendaColors;
}

export function TiendaHeader({ empresa, subdominio, categorias, onSearch, colors }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-20">
      {/* Header principal */}
      <div className="shadow-md" style={{ background: `linear-gradient(to right, ${colors.primario}, ${lighten(colors.primario, 0.15)}, ${colors.secundario})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-14">
          {/* Logo */}
          <Link href={`/${subdominio}`} className="flex items-center flex-shrink-0">
            {empresa.logo ? (
              <img src={empresa.logo} alt={empresa.nombre} className="h-11 sm:h-12 max-w-[200px] sm:max-w-[250px] object-contain drop-shadow-sm" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {empresa.nombre[0]}
                </div>
                <span className="text-white font-bold text-[11px] leading-tight hidden sm:block max-w-[170px] line-clamp-2">
                  {empresa.nombre}
                </span>
              </div>
            )}
          </Link>

          {/* Buscador */}
          <div className="flex-1 max-w-2xl">
            <form className="relative" onSubmit={(e) => { e.preventDefault(); onSearch?.(searchQuery); }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="Buscar productos, marcas y mas..."
                className="w-full pl-4 pr-12 py-2 rounded-md bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400 shadow-sm"
              />
              <button type="submit" className="absolute right-0 top-0 bottom-0 px-3 bg-gray-100 hover:bg-gray-200 rounded-r-md transition-colors border-l">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
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
      <div className="backdrop-blur-sm border-b border-white/10" style={{ background: `linear-gradient(to right, ${darken(colors.acento, 0.1)}, ${colors.acento}, ${lighten(colors.acento, 0.1)})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="hidden md:flex items-center gap-0.5 h-10">
            <Link href={`/${subdominio}`}
              className="px-3 py-1 text-[14px] font-semibold text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap">
              Inicio
            </Link>

            {/* Dropdown categorías */}
            {categorias.length > 0 && (
              <div className="relative"
                onMouseEnter={() => setCategoriasOpen(true)}
                onMouseLeave={() => setCategoriasOpen(false)}>
                <button className="px-3 py-1 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap flex items-center gap-1">
                  Categorias
                  <svg className={`w-3 h-3 transition-transform ${categoriasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {categoriasOpen && (
                  <div className="absolute top-full left-0 mt-0.5 rounded-lg shadow-2xl py-1 min-w-[220px] z-50 max-h-[70vh] overflow-y-auto" style={{ backgroundColor: lighten(colors.primario, 0.85), borderColor: lighten(colors.primario, 0.7), borderWidth: 1, borderStyle: 'solid' }}>
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

            <span className="px-3 py-1 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              Productos
            </span>
            <span className="px-3 py-1 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              Servicios
            </span>
            <span className="px-3 py-1 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
              📍 Ubicacion
            </span>

            {empresa.telefono && (
              <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`}
                target="_blank"
                className="ml-auto px-3 py-1 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer whitespace-nowrap">
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
