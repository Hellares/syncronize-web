'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useKardex } from '@/features/stock/hooks/use-kardex';
import { getMovementTypeInfo } from '@/features/stock/components/movement-types';
import type { TipoMovimientoStock } from '@/core/types/stock';
import { MOVEMENT_TYPES } from '@/features/stock/components/movement-types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function KardexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { movimientos, resumen, filtros, isLoading, error, updateFiltros } = useKardex(id);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => {
    updateFiltros({
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      tipo: (tipoFiltro as TipoMovimientoStock) || undefined,
    });
  };

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setTipoFiltro('');
    updateFiltros({ fechaDesde: undefined, fechaHasta: undefined, tipo: undefined });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div>
        <Link href="/dashboard/stock" className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Volver a Stock</Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Kardex - Historial de Movimientos</h1>
      </div>

      {/* Filters toggle */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowFilters(!showFilters)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
        </button>
        <span className="text-xs text-gray-500">{movimientos.length} movimientos</span>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
              <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
                <option value="">Todos</option>
                {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button onClick={applyFilters} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
              Aplicar
            </button>
            <button onClick={clearFilters} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Resumen */}
      {resumen.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen por Tipo</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {resumen.map(r => {
              const info = getMovementTypeInfo(r.tipo);
              return (
                <div key={r.tipo} className="rounded-lg bg-gray-50 p-2.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>{info.label}</span>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {r.totalEntradas > 0 && <span className="text-green-600">+{r.totalEntradas}</span>}
                    {r.totalSalidas > 0 && <span className="text-red-600">-{r.totalSalidas}</span>}
                    <span className="text-gray-400">({r.cantidadMovimientos})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : movimientos.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-center">Anterior</th>
                <th className="px-4 py-3 text-center">Cantidad</th>
                <th className="px-4 py-3 text-center">Nuevo</th>
                <th className="hidden px-4 py-3 md:table-cell">Documento</th>
                <th className="hidden px-4 py-3 lg:table-cell">Usuario</th>
                <th className="hidden px-4 py-3 md:table-cell">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => {
                const info = getMovementTypeInfo(m.tipo);
                const isPositive = m.cantidad > 0;
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.creadoEn)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>{info.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{m.cantidadAnterior}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{m.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{m.cantidadNueva}</td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                      {m.tipoDocumento && <span>{m.tipoDocumento}{m.numeroDocumento ? ` ${m.numeroDocumento}` : ''}</span>}
                      {m.ventaCodigo && <span className="text-purple-600">Venta: {m.ventaCodigo}</span>}
                      {m.compraCodigo && <span className="text-green-600">Compra: {m.compraCodigo}</span>}
                      {m.transferenciaCodigo && <span className="text-teal-600">Transfer: {m.transferenciaCodigo}</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">{m.usuarioNombre || '-'}</td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell truncate max-w-[150px]">{m.motivo || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
