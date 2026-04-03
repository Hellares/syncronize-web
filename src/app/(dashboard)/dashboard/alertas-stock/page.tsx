'use client';

import { useState } from 'react';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useAlertasStock } from '@/features/stock/hooks/use-alertas-stock';
import StockSedeSelector from '@/features/stock/components/StockSedeSelector';
import { nombreProductoStock, skuProductoStock, stockDisponibleVenta } from '@/core/types/stock';
import type { ProductoStock } from '@/core/types/stock';

function AlertCard({ stock }: { stock: ProductoStock }) {
  const disponible = stockDisponibleVenta(stock);
  const isCritical = disponible <= 0;
  const deficit = (stock.stockMinimo ?? 0) - disponible;

  return (
    <div className={`rounded-xl border p-4 ${isCritical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{nombreProductoStock(stock)}</p>
          <p className="text-xs text-gray-500">{skuProductoStock(stock)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          {isCritical ? 'Crítico' : 'Bajo'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase text-gray-400">Actual</p>
          <p className="text-sm font-bold text-gray-900">{stock.stockActual}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-400">Disponible</p>
          <p className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>{disponible}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-400">Mínimo</p>
          <p className="text-sm font-bold text-gray-700">{stock.stockMinimo ?? '-'}</p>
        </div>
      </div>
      {deficit > 0 && (
        <p className="mt-2 text-xs text-red-600 font-medium">Faltan {deficit} unidades para llegar al mínimo</p>
      )}
      {stock.sede && <p className="mt-1 text-[10px] text-gray-400">Sede: {stock.sede.nombre}</p>}
    </div>
  );
}

export default function AlertasStockPage() {
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState<string>(defaultSede?.id ?? '');
  const [tab, setTab] = useState<'criticos' | 'bajos'>('criticos');

  const { productosCriticos, productosBajoMinimo, total, criticos, isLoading, error } = useAlertasStock(sedeId || null);

  const items = tab === 'criticos' ? productosCriticos : productosBajoMinimo;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alertas de Stock</h1>
          <p className="text-sm text-gray-500">Productos con stock bajo o sin stock</p>
        </div>
        <StockSedeSelector value={sedeId} onChange={setSedeId} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total Alertas</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{criticos}</p>
          <p className="text-xs text-red-600">Críticos (Sin stock)</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{total - criticos}</p>
          <p className="text-xs text-amber-600">Bajo Mínimo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button onClick={() => setTab('criticos')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'criticos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Críticos ({productosCriticos.length})
        </button>
        <button onClick={() => setTab('bajos')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'bajos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Bajo Mínimo ({productosBajoMinimo.length})
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No hay alertas en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(s => <AlertCard key={s.id} stock={s} />)}
        </div>
      )}
    </div>
  );
}
