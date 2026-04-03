'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import { useStockSede } from '@/features/stock/hooks/use-stock-sede';
import StockSedeSelector from '@/features/stock/components/StockSedeSelector';
import StockTable from '@/features/stock/components/StockTable';
import AjustarStockDialog from '@/features/stock/components/AjustarStockDialog';
import UpdatePreciosDialog from '@/features/stock/components/UpdatePreciosDialog';
import type { ProductoStock } from '@/core/types/stock';

export default function StockPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState<string>(defaultSede?.id ?? '');

  const { stocks, meta, filtros, isLoading, error, updateFiltros, setPage, reload } = useStockSede(sedeId || null);

  const [ajustarStock, setAjustarStock] = useState<ProductoStock | null>(null);
  const [preciosStock, setPreciosStock] = useState<ProductoStock | null>(null);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => updateFiltros({ search: value || undefined }), 400);
    setSearchTimeout(t);
  }, [updateFiltros, searchTimeout]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock por Sede</h1>
          <p className="text-sm text-gray-500">Gestión de inventario por ubicación</p>
        </div>
        <StockSedeSelector value={sedeId} onChange={setSedeId} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-[#437EFF]"
          />
        </div>
        <button onClick={reload} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" title="Recargar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        {meta && (
          <span className="text-xs text-gray-500">{meta.total} productos</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <StockTable
          stocks={stocks}
          meta={meta}
          isLoading={isLoading}
          canManage={canManage}
          onAjustar={setAjustarStock}
          onKardex={(stock) => router.push(`/dashboard/stock/${stock.id}/kardex`)}
          onPrecios={setPreciosStock}
          onPageChange={setPage}
        />
      </div>

      {/* Dialogs */}
      <AjustarStockDialog
        isOpen={!!ajustarStock}
        stock={ajustarStock}
        onSuccess={reload}
        onClose={() => setAjustarStock(null)}
      />
      <UpdatePreciosDialog
        isOpen={!!preciosStock}
        stock={preciosStock}
        onSuccess={reload}
        onClose={() => setPreciosStock(null)}
      />
    </div>
  );
}
