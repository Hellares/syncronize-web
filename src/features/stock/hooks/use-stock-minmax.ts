'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductoStock, StockMinMaxBulkItem } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

interface EditableMinMax {
  productoStockId: string;
  stockMinimo: string;
  stockMaximo: string;
  original: { stockMinimo?: number; stockMaximo?: number };
}

export function useStockMinMax(sedeId: string | null) {
  const [stocks, setStocks] = useState<ProductoStock[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableMinMax>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sedeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getStockBySede(sedeId, { page: 1, limit: 200 });
      setStocks(res.data);
      const editMap: Record<string, EditableMinMax> = {};
      for (const s of res.data) {
        editMap[s.id] = {
          productoStockId: s.id,
          stockMinimo: s.stockMinimo != null ? String(s.stockMinimo) : '',
          stockMaximo: s.stockMaximo != null ? String(s.stockMaximo) : '',
          original: { stockMinimo: s.stockMinimo ?? undefined, stockMaximo: s.stockMaximo ?? undefined },
        };
      }
      setEdits(editMap);
    } catch {
      setError('Error al cargar stock');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { load(); }, [load]);

  const updateEdit = useCallback((id: string, field: 'stockMinimo' | 'stockMaximo', value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  const hasChanges = Object.values(edits).some(e => {
    const minChanged = (parseInt(e.stockMinimo) || 0) !== (e.original.stockMinimo ?? 0);
    const maxChanged = (parseInt(e.stockMaximo) || 0) !== (e.original.stockMaximo ?? 0);
    return minChanged || maxChanged;
  });

  const save = useCallback(async () => {
    if (!sedeId) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const items: StockMinMaxBulkItem[] = Object.values(edits)
        .filter(e => {
          const minChanged = (parseInt(e.stockMinimo) || 0) !== (e.original.stockMinimo ?? 0);
          const maxChanged = (parseInt(e.stockMaximo) || 0) !== (e.original.stockMaximo ?? 0);
          return minChanged || maxChanged;
        })
        .map(e => ({
          productoStockId: e.productoStockId,
          ...(e.stockMinimo && { stockMinimo: parseInt(e.stockMinimo) }),
          ...(e.stockMaximo && { stockMaximo: parseInt(e.stockMaximo) }),
        }));

      if (items.length === 0) return;
      await stockService.updateStockMinMaxBulk(sedeId, items);
      setSuccess(`${items.length} productos actualizados`);
      await load();
    } catch {
      setError('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  }, [sedeId, edits, load]);

  return { stocks, edits, isLoading, isSaving, error, success, hasChanges, updateEdit, save, reload: load };
}
