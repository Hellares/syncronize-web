'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductoStock, StockFiltros } from '@/core/types/stock';
import type { PaginationMeta } from '@/core/types/producto';
import * as stockService from '../services/stock-service';

const DEFAULT_FILTROS: StockFiltros = { page: 1, limit: 20 };

export function useStockSede(sedeId: string | null) {
  const [stocks, setStocks] = useState<ProductoStock[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filtros, setFiltros] = useState<StockFiltros>(DEFAULT_FILTROS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = useCallback(async (f: StockFiltros) => {
    if (!sedeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getStockBySede(sedeId, f);
      setStocks(res.data);
      setMeta(res.meta);
    } catch {
      setError('Error al cargar el stock');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => {
    const reset = { ...DEFAULT_FILTROS };
    setFiltros(reset);
    fetchStocks(reset);
  }, [sedeId, fetchStocks]);

  const updateFiltros = useCallback((partial: Partial<StockFiltros>) => {
    setFiltros(prev => {
      const next = { ...prev, ...partial, page: partial.page ?? 1 };
      fetchStocks(next);
      return next;
    });
  }, [fetchStocks]);

  const setPage = useCallback((page: number) => {
    setFiltros(prev => {
      const next = { ...prev, page };
      fetchStocks(next);
      return next;
    });
  }, [fetchStocks]);

  const reload = useCallback(() => fetchStocks(filtros), [fetchStocks, filtros]);

  return { stocks, meta, filtros, isLoading, error, updateFiltros, setPage, reload };
}
