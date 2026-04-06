'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Cotizacion, CotizacionFiltros, PaginationMeta } from '@/core/types/cotizacion';
import * as cotizacionService from '../services/cotizacion-service';

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filtros, setFiltros] = useState<CotizacionFiltros>({ page: 1, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCotizaciones = useCallback(async (f: CotizacionFiltros) => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await cotizacionService.getCotizaciones(f);
      setCotizaciones(list);
      setMeta({ total: list.length, page: 1, limit: list.length, totalPages: 1 });
    } catch {
      setError('Error al cargar cotizaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotizaciones(filtros);
  }, [fetchCotizaciones, filtros]);

  const updateFiltros = useCallback((partial: Partial<CotizacionFiltros>) => {
    setFiltros(prev => {
      const next = { ...prev, ...partial, page: partial.page ?? 1 };
      return next;
    });
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltros(prev => ({ ...prev, page }));
  }, []);

  const reload = useCallback(() => {
    fetchCotizaciones(filtros);
  }, [fetchCotizaciones, filtros]);

  const resetFiltros = useCallback(() => {
    const defaults: CotizacionFiltros = { page: 1, limit: 10 };
    setFiltros(defaults);
  }, []);

  return { cotizaciones, meta, filtros, isLoading, error, updateFiltros, setPage, reload, resetFiltros };
}
