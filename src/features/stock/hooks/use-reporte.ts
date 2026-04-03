'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReporteFiltros } from '@/core/types/stock';

type FetchFn<T> = (filtros: ReporteFiltros) => Promise<T>;

export function useReporte<T>(fetchFn: FetchFn<T>, initialFiltros: ReporteFiltros = {}) {
  const [data, setData] = useState<T | null>(null);
  const [filtros, setFiltros] = useState<ReporteFiltros>(initialFiltros);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: ReporteFiltros) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn(f);
      setData(result);
    } catch {
      setError('Error al cargar el reporte');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => { load(initialFiltros); }, [load]);

  const updateFiltros = useCallback((partial: Partial<ReporteFiltros>) => {
    setFiltros(prev => {
      const next = { ...prev, ...partial };
      load(next);
      return next;
    });
  }, [load]);

  const reload = useCallback(() => load(filtros), [load, filtros]);

  return { data, filtros, isLoading, error, updateFiltros, reload };
}
