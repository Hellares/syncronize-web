'use client';

import { useState } from 'react';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useStockMinMax } from '@/features/stock/hooks/use-stock-minmax';
import StockSedeSelector from '@/features/stock/components/StockSedeSelector';
import { nombreProductoStock, skuProductoStock } from '@/core/types/stock';

const inputClass = "w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function InventarioFisicoPage() {
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState<string>(defaultSede?.id ?? '');

  const { stocks, edits, isLoading, isSaving, error, success, hasChanges, updateEdit, save } = useStockMinMax(sedeId || null);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configurar Stock Mínimo/Máximo</h1>
          <p className="text-sm text-gray-500">Define umbrales de alerta para cada producto</p>
        </div>
        <div className="flex items-center gap-3">
          <StockSedeSelector value={sedeId} onChange={setSedeId} />
          {hasChanges && (
            <button onClick={save} disabled={isSaving}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {hasChanges && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
          <p className="text-xs text-amber-700 font-medium">Tienes cambios sin guardar</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : stocks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500">No hay productos en esta sede</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-center">Stock Actual</th>
                <th className="px-4 py-3 text-center">Mínimo</th>
                <th className="px-4 py-3 text-center">Máximo</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(stock => {
                const edit = edits[stock.id];
                if (!edit) return null;
                const min = parseInt(edit.stockMinimo) || 0;
                const isLow = min > 0 && stock.stockActual <= min;
                const isCritical = stock.stockActual <= 0;

                return (
                  <tr key={stock.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{nombreProductoStock(stock)}</p>
                      <p className="text-xs text-gray-500">{skuProductoStock(stock)}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{stock.stockActual}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        value={edit.stockMinimo}
                        onChange={e => updateEdit(stock.id, 'stockMinimo', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        value={edit.stockMaximo}
                        onChange={e => updateEdit(stock.id, 'stockMaximo', e.target.value)}
                      />
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      {isCritical ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-medium text-red-700">Crítico</span>
                      ) : isLow ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">Bajo</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-medium text-green-700">OK</span>
                      )}
                    </td>
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
