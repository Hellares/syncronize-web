'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ProductoStock } from '@/core/types/stock';
import { nombreProductoStock, skuProductoStock } from '@/core/types/stock';
import * as stockService from '@/features/stock/services/stock-service';
import GestionarLiquidacionDialog from '@/features/stock/components/GestionarLiquidacionDialog';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const MOTIVO_LABEL: Record<string, string> = {
  FUERA_DE_CAMPANA: 'Fuera de campaña',
  SIN_ROTACION: 'Sin rotación',
  PROXIMO_A_VENCER: 'Próximo a vencer',
  DESCONTINUADO: 'Descontinuado',
  OTRO: 'Otro',
};

export default function LiquidacionesPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const [sedeId, setSedeId] = useState<string>('');
  const [items, setItems] = useState<ProductoStock[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestionTarget, setGestionTarget] = useState<ProductoStock | null>(null);

  const fetchLiquidaciones = useCallback(async (sede: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getLiquidaciones({ sedeId: sede || undefined, limit: 100 });
      setItems(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch {
      setError('Error al cargar liquidaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiquidaciones(sedeId);
  }, [fetchLiquidaciones, sedeId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${total} productos en liquidación activa`}</p>
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#437EFF] bg-white"
          >
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">🏷</p>
          <p className="text-gray-400">No hay productos en liquidación</p>
          <p className="mt-1 text-xs text-gray-400">Activa liquidaciones desde Stock por Sede → Configurar Precios</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Sede</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">P. Base</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Costo</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Liquidación</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-right lg:table-cell">Pérdida/u</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Motivo</th>
                <th className="px-4 py-3 font-medium text-gray-500">Vence</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((s) => {
                const perdida = s.precioCosto != null && s.precioLiquidacion != null
                  ? Number(s.precioCosto) - Number(s.precioLiquidacion) : null;
                return (
                  <tr key={s.id}
                    onClick={() => permissions.canManageProducts && setGestionTarget(s)}
                    className={`transition-colors hover:bg-gray-50/50 ${permissions.canManageProducts ? 'cursor-pointer' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{nombreProductoStock(s)}</p>
                      <p className="font-mono text-[10px] text-gray-400">{skuProductoStock(s)}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-gray-500">{s.sede?.nombre || sedes.find(x => x.id === s.sedeId)?.nombre || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-400 line-through">{s.precio != null ? `S/ ${Number(s.precio).toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      <span className="text-xs text-gray-500">{s.precioCosto != null ? `S/ ${Number(s.precioCosto).toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-red-600">{s.precioLiquidacion != null ? `S/ ${Number(s.precioLiquidacion).toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <span className="text-xs font-medium text-red-500">{perdida != null ? `S/ ${perdida.toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        {MOTIVO_LABEL[s.motivoLiquidacion ?? ''] ?? s.motivoLiquidacion ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {s.fechaFinLiquidacion ? new Date(s.fechaFinLiquidacion).toLocaleDateString('es-PE') : 'Sin vencimiento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">{s.stockActual}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <GestionarLiquidacionDialog
        isOpen={!!gestionTarget}
        stock={gestionTarget}
        onSuccess={() => { setGestionTarget(null); fetchLiquidaciones(sedeId); }}
        onClose={() => setGestionTarget(null)}
      />
    </div>
  );
}
