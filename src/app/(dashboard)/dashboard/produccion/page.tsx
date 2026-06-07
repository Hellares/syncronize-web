'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { LoteProduccion } from '@/core/types/bom';
import * as bomService from '@/features/producto/services/bom-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const LIMIT = 30;

export default function ProduccionPage() {
  const { sedes } = useEmpresa();
  const [items, setItems] = useState<LoteProduccion[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sedeId, setSedeId] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (off = 0, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bomService.getLotesProduccion({
        sedeId: sedeId || undefined,
        search: search || undefined,
        limit: LIMIT,
        offset: off,
      });
      setItems(prev => append ? [...prev, ...res.items] : res.items);
      setTotal(res.total);
      setOffset(off);
    } catch {
      setError('Error al cargar los lotes de producción');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, search]);

  useEffect(() => { fetch(0); }, [fetch]);

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 400);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Producción</h1>
          <p className="text-sm text-gray-500">{isLoading && items.length === 0 ? 'Cargando...' : `${total} lotes fabricados`}</p>
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#437EFF] bg-white">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Búsqueda */}
      <input
        onChange={e => handleSearch(e.target.value)}
        placeholder="Buscar producto fabricado..."
        className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">🏭</p>
          <p className="text-gray-400">Sin lotes de producción</p>
          <p className="mt-1 text-xs text-gray-400">Fabrica desde Productos → Receta/Componentes</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Lote</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Cantidad</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Costo lote</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Costo/u</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Sede / Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((l) => (
                  <tr key={l.numeroDocumento + (l.id ?? '')} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-green-700">{l.numeroDocumento}</span>
                    </td>
                    <td className="px-4 py-3">
                      {l.productoId ? (
                        <Link href={`/dashboard/productos/${l.productoId}/componentes`} className="font-medium text-gray-900 hover:text-[#437EFF]">
                          {l.productoNombre}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900">{l.productoNombre}</span>
                      )}
                      {l.varianteNombre && <span className="ml-1 text-xs text-[#437EFF]">({l.varianteNombre})</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-green-600">+{l.cantidadProducida}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      <span className="text-xs text-gray-600">{l.costoLote != null ? `S/ ${Number(l.costoLote).toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      <span className="text-xs text-gray-600">{l.costoUnitario != null ? `S/ ${Number(l.costoUnitario).toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {new Date(l.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}{' '}
                        {new Date(l.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-gray-500">{l.sede?.nombre ?? '—'}{l.usuario?.nombre ? ` · ${l.usuario.nombre}` : ''}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length < total && (
            <div className="flex justify-center">
              <button onClick={() => fetch(offset + LIMIT, true)} disabled={isLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {isLoading ? 'Cargando...' : `Cargar más (${items.length}/${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
