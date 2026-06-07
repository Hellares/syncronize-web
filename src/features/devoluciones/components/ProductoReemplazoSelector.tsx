'use client';

import { useState, useRef, useEffect } from 'react';
import type { Producto } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';

export interface ReemplazoSeleccion {
  productoReemplazoId: string;
  varianteReemplazoId?: string;
  nombre: string;
}

interface Props {
  sedeId: string;
  value: ReemplazoSeleccion | null;
  onChange: (sel: ReemplazoSeleccion | null) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';

/** Buscador liviano de producto/variante de reemplazo (el backend calcula el precio + diferencia). */
export default function ProductoReemplazoSelector({ sedeId, value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productoConVariantes, setProductoConVariantes] = useState<Producto | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResultados([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 15, search: q.trim(), sedeId, soloProductos: true, isActive: true });
        setResultados(res.data ?? []);
        setOpen(true);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const elegirProducto = (p: Producto) => {
    if (p.variantes && p.variantes.length > 0) {
      setProductoConVariantes(p);
      return;
    }
    onChange({ productoReemplazoId: p.id, nombre: p.nombre });
    setOpen(false);
    setSearch('');
  };

  const elegirVariante = (p: Producto, varId: string, varNombre: string) => {
    onChange({ productoReemplazoId: p.id, varianteReemplazoId: varId, nombre: `${p.nombre} · ${varNombre}` });
    setProductoConVariantes(null);
    setOpen(false);
    setSearch('');
  };

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
        <span className="text-xs text-indigo-800">🔄 {value.nombre}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-indigo-400 hover:text-indigo-700">Cambiar</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input className={inputClass} value={search} onChange={e => buscar(e.target.value)}
        placeholder="Buscar producto de reemplazo (mín. 2 letras)..." />
      {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">...</span>}

      {productoConVariantes ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-700">{productoConVariantes.nombre} · elige variante</p>
            <button type="button" onClick={() => setProductoConVariantes(null)} className="text-[10px] text-gray-400">✕</button>
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {(productoConVariantes.variantes ?? []).filter(v => v.isActive).map(v => (
              <button key={v.id} type="button" onClick={() => elegirVariante(productoConVariantes, v.id, v.nombre)}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-[#437EFF]/5">
                {v.nombre} <span className="text-[10px] text-gray-400">{v.sku}</span>
              </button>
            ))}
          </div>
        </div>
      ) : open && resultados.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {resultados.map(p => (
            <button key={p.id} type="button" onClick={() => elegirProducto(p)}
              className="block w-full border-b border-gray-50 px-3 py-2 text-left text-xs text-gray-700 last:border-0 hover:bg-[#437EFF]/5">
              {p.nombre}
              {p.variantes && p.variantes.length > 0 && <span className="ml-1 text-[10px] text-indigo-500">({p.variantes.length} variantes)</span>}
              <span className="ml-1 text-[10px] text-gray-400">{p.codigoEmpresa}</span>
            </button>
          ))}
        </div>
      ) : open && !loading ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-center text-[11px] text-gray-400 shadow-lg">Sin resultados</div>
      ) : null}
    </div>
  );
}
