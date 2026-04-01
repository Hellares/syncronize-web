'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProductoFiltros, OrdenProducto } from '@/core/types/producto';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const TABS = [
  { label: 'Todos', key: 'todos' },
  { label: 'Productos', key: 'productos' },
  { label: 'Combos', key: 'combos' },
] as const;

const ORDEN_OPTIONS: { label: string; value: OrdenProducto }[] = [
  { label: 'Nombre A-Z', value: 'NOMBRE_ASC' },
  { label: 'Nombre Z-A', value: 'NOMBRE_DESC' },
  { label: 'Precio menor', value: 'PRECIO_ASC' },
  { label: 'Precio mayor', value: 'PRECIO_DESC' },
  { label: 'Stock menor', value: 'STOCK_ASC' },
  { label: 'Stock mayor', value: 'STOCK_DESC' },
  { label: 'Más recientes', value: 'RECIENTES' },
  { label: 'Más antiguos', value: 'ANTIGUOS' },
];

interface Props {
  filtros: ProductoFiltros;
  onUpdate: (partial: Partial<ProductoFiltros>) => void;
  onReset: () => void;
}

export default function ProductoFilters({ filtros, onUpdate, onReset }: Props) {
  const { sedes } = useEmpresa();
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);
  const [searchLocal, setSearchLocal] = useState(filtros.search || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = filtros.soloCombos ? 'combos' : filtros.soloProductos ? 'productos' : 'todos';

  useEffect(() => {
    catalogoService.getCategorias().then(setCategorias).catch(() => {});
    catalogoService.getMarcas().then(setMarcas).catch(() => {});
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ search: value || undefined });
    }, 400);
  };

  const handleTab = (tab: string) => {
    if (tab === 'productos') onUpdate({ soloProductos: true, soloCombos: false });
    else if (tab === 'combos') onUpdate({ soloProductos: false, soloCombos: true });
    else onUpdate({ soloProductos: false, soloCombos: false });
  };

  return (
    <div className="space-y-4">
      {/* Search + Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchLocal}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, código o SKU..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTab(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#004A94] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filtros.empresaCategoriaId || ''}
          onChange={(e) => onUpdate({ empresaCategoriaId: e.target.value || undefined })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.empresaMarcaId || ''}
          onChange={(e) => onUpdate({ empresaMarcaId: e.target.value || undefined })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.sedeId || ''}
          onChange={(e) => onUpdate({ sedeId: e.target.value || undefined })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]"
        >
          <option value="">Todas las sedes</option>
          {sedes.filter((s) => s.isActive).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.orden || ''}
          onChange={(e) => onUpdate({ orden: (e.target.value || undefined) as OrdenProducto | undefined })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]"
        >
          <option value="">Ordenar por...</option>
          {ORDEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={onReset}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
