'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductoCard } from './ProductoCard';
import { Producto, PaginatedResponse } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Props {
  subdominio: string;
  productosIniciales: Producto[];
  totalProductos: number;
  categorias?: string[];
  initialSearch?: string;
}

export function ProductosGrid({ subdominio, productosIniciales, totalProductos, categorias = [], initialSearch }: Props) {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [search, setSearch] = useState('');

  // Sincronizar búsqueda del hero
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== search) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(totalProductos);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!search && !categoriaActiva) {
      setProductos(productosIniciales);
      setTotal(totalProductos);
      return;
    }

    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '40' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/${subdominio}/productos?${params}`);
        const json = await res.json();

        // El backend puede devolver { data, total } o { data, pagination: { total } }
        const items: Producto[] = json.data || [];
        const totalCount: number = json.total ?? json.pagination?.total ?? items.length;

        let filtered = items;
        if (categoriaActiva) {
          filtered = filtered.filter(p => p.categoria === categoriaActiva);
        }

        setProductos(filtered);
        setTotal(categoriaActiva ? filtered.length : totalCount);
      } catch {
        // mantener datos
      }
      setIsLoading(false);
    }, 400);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search, categoriaActiva, subdominio, productosIniciales, totalProductos]);

  return (
    <div>
      {/* Buscador + limpiar */}
      <div className="mb-5 flex gap-3 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos en esta tienda..."
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {(search || categoriaActiva) && (
          <button
            onClick={() => { setSearch(''); setCategoriaActiva(null); }}
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Mostrar todos
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Productos <span className="text-sm font-normal text-gray-400">({total})</span>
        </h2>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="text-gray-500 font-medium">No se encontraron productos</p>
          {search && <p className="text-sm text-gray-400 mt-1">Intenta con otra busqueda</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
          {productos.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} subdominio={subdominio} />
          ))}
        </div>
      )}
    </div>
  );
}
