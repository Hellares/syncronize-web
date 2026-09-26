'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductoCard } from './ProductoCard';
import { CategoriaTienda, Producto, ProductosTiendaResponse, TIENDA_PAGE_SIZE } from '@/lib/types';
import { TiendaColors, alpha } from '@/lib/colors';

interface Props {
  subdominio: string;
  productosIniciales: Producto[];
  totalInicial: number;
  totalPagesInicial: number;
  categorias: CategoriaTienda[];
  /** La categoría la maneja TiendaContent: la eligen el header, la barra lateral o los chips. */
  categoriaActiva: string | null;
  onCategoriaChange: (id: string | null) => void;
  initialSearch?: string;
  /** "Mostrar todos" también vacía el buscador de la cabecera. */
  onLimpiarBusqueda?: () => void;
  colors: TiendaColors;
}

async function pedirPagina(
  subdominio: string,
  page: number,
  search: string,
  categoriaId: string | null,
): Promise<ProductosTiendaResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(TIENDA_PAGE_SIZE) });
  if (search) params.set('search', search);
  if (categoriaId) params.set('categoriaId', categoriaId);
  const res = await fetch(`/api/${encodeURIComponent(subdominio)}/productos?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function ProductosGrid({
  subdominio, productosIniciales, totalInicial, totalPagesInicial,
  categorias, categoriaActiva, onCategoriaChange, initialSearch, onLimpiarBusqueda, colors,
}: Props) {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(totalInicial);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(totalPagesInicial);
  const [isLoading, setIsLoading] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Cada consulta lleva un número: una respuesta que llega tarde (el usuario
  // ya cambió la búsqueda o la categoría) se descarta en vez de pisar la nueva.
  const consultaRef = useRef(0);

  // Sincronizar búsqueda del hero
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== search) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const busqueda = search.trim();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const consulta = ++consultaRef.current;
    setError(false);

    if (!busqueda && !categoriaActiva) {
      setProductos(productosIniciales);
      setTotal(totalInicial);
      setPage(1);
      setTotalPages(totalPagesInicial);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Tipear espera a que el usuario pare; elegir una categoría es un clic.
    timerRef.current = setTimeout(async () => {
      try {
        const json = await pedirPagina(subdominio, 1, busqueda, categoriaActiva);
        if (consulta !== consultaRef.current) return;
        setProductos(json.data ?? []);
        setTotal(json.pagination?.total ?? json.data?.length ?? 0);
        setPage(1);
        setTotalPages(json.pagination?.totalPages ?? 1);
      } catch {
        if (consulta !== consultaRef.current) return;
        setError(true);
      }
      setIsLoading(false);
    }, busqueda ? 400 : 0);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [busqueda, categoriaActiva, subdominio, productosIniciales, totalInicial, totalPagesInicial]);

  const verMas = async () => {
    if (cargandoMas) return;
    const consulta = consultaRef.current;
    setCargandoMas(true);
    try {
      const json = await pedirPagina(subdominio, page + 1, busqueda, categoriaActiva);
      if (consulta !== consultaRef.current) return;
      setProductos((prev) => {
        const vistos = new Set(prev.map((p) => p.id));
        return [...prev, ...(json.data ?? []).filter((p) => !vistos.has(p.id))];
      });
      setPage(page + 1);
      setTotal(json.pagination?.total ?? total);
      setTotalPages(json.pagination?.totalPages ?? totalPages);
    } catch {
      // El botón queda para reintentar.
    } finally {
      setCargandoMas(false);
    }
  };

  const categoriaNombre = categorias.find((c) => c.id === categoriaActiva)?.nombre;
  const hayMas = !isLoading && !error && page < totalPages;

  return (
    <div>
      {/* Se busca desde la cabecera (un solo buscador): acá solo se ve qué se filtró y se limpia. */}
      {(busqueda || categoriaActiva) && (
        <div className="mb-4 flex gap-2 items-center">
          <p className="flex-1 min-w-0 text-sm text-gray-600 truncate">
            {busqueda ? <>Resultados para <span className="font-medium text-gray-900">“{busqueda}”</span></> : categoriaNombre}
          </p>
          <button
            onClick={() => { setSearch(''); onLimpiarBusqueda?.(); onCategoriaChange(null); }}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors shadow-sm"
            style={{ backgroundColor: colors.primario }}
          >
            Mostrar todos
          </button>
        </div>
      )}

      {/* Chips de categoría: en pantallas chicas no hay barra lateral ni menú del header */}
      {categorias.length > 1 && (
        <div className="lg:hidden -mx-2 px-2 mb-3 flex gap-2 overflow-x-auto pb-1">
          {[{ id: null as string | null, nombre: 'Todas' }, ...categorias].map((cat) => {
            const activa = cat.id === categoriaActiva;
            return (
              <button
                key={cat.id ?? 'todas'}
                onClick={() => onCategoriaChange(cat.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap"
                style={activa
                  ? { backgroundColor: colors.primario, borderColor: colors.primario, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#4b5563' }}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-xl font-bold text-gray-900">
          {categoriaNombre ?? 'Productos'} <span className="text-xs md:text-sm font-normal text-gray-400">({total})</span>
        </h2>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: alpha(colors.primario, 0.2), borderTopColor: colors.primario }} />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-gray-500 font-medium">No se pudieron cargar los productos</p>
          <p className="text-sm text-gray-400 mt-1">Revisa tu conexión e intenta de nuevo</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[8px] sm:gap-5 px-[2.5px] md:px-0">
          {productos.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} subdominio={subdominio} colors={colors} />
          ))}
        </div>
      )}

      {/* Ver más */}
      {hayMas && (
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <button
            onClick={verMas}
            disabled={cargandoMas}
            className="px-6 py-2.5 rounded-xl border-2 bg-white text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ borderColor: colors.primario, color: colors.primario }}
          >
            {cargandoMas ? 'Cargando...' : 'Ver más productos'}
          </button>
          <p className="text-xs text-gray-400">Mostrando {productos.length} de {total}</p>
        </div>
      )}
    </div>
  );
}
