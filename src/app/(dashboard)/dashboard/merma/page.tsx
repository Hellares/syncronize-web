'use client';

import { useState, useCallback } from 'react';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useReporte } from '@/features/stock/hooks/use-reporte';
import StockSedeSelector from '@/features/stock/components/StockSedeSelector';
import * as stockService from '@/features/stock/services/stock-service';
import { getMovementTypeInfo } from '@/features/stock/components/movement-types';
import type { ReporteMerma } from '@/core/types/stock';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MermaPage() {
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState<string>(defaultSede?.id ?? '');

  const fetchMermas = useCallback((filtros: { sedeId?: string }) => {
    return stockService.getReporteMermas({ ...filtros });
  }, []);

  const { data, isLoading, error, updateFiltros } = useReporte<ReporteMerma>(fetchMermas, { sedeId: sedeId || undefined });

  const handleSedeChange = (id: string) => {
    setSedeId(id);
    updateFiltros({ sedeId: id || undefined });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Merma y Pérdida</h1>
          <p className="text-sm text-gray-500">Reporte de productos dañados y pérdidas</p>
        </div>
        <StockSedeSelector value={sedeId} onChange={handleSedeChange} />
      </div>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{data.resumen.totalDanado}</p>
            <p className="text-xs text-red-600">Total Dañado</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{data.resumen.totalPerdido}</p>
            <p className="text-xs text-amber-600">Total Perdido</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : !data || data.movimientos.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No hay mermas o pérdidas registradas</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-center">Cantidad</th>
                <th className="hidden px-4 py-3 md:table-cell">Motivo</th>
                <th className="hidden px-4 py-3 md:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {data.movimientos.map(m => {
                const info = getMovementTypeInfo(m.tipo);
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.creadoEn)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>{info.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-red-600">{m.cantidad}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell truncate max-w-[200px]">{m.motivo || '-'}</td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">{m.usuarioNombre || '-'}</td>
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
