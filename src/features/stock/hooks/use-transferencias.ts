'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TransferenciaStock, TransferenciaFiltros } from '@/core/types/stock';
import type { PaginationMeta } from '@/core/types/producto';
import * as transferenciaService from '../services/transferencia-service';

const DEFAULT_FILTROS: TransferenciaFiltros = { page: 1, limit: 20 };

export function useTransferencias() {
  const [transferencias, setTransferencias] = useState<TransferenciaStock[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filtros, setFiltros] = useState<TransferenciaFiltros>(DEFAULT_FILTROS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (f: TransferenciaFiltros) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await transferenciaService.getTransferencias(f);
      setTransferencias(res.data);
      setMeta(res.meta);
    } catch {
      setError('Error al cargar transferencias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(DEFAULT_FILTROS); }, [fetch]);

  const updateFiltros = useCallback((partial: Partial<TransferenciaFiltros>) => {
    setFiltros(prev => {
      const next = { ...prev, ...partial, page: partial.page ?? 1 };
      fetch(next);
      return next;
    });
  }, [fetch]);

  const setPage = useCallback((page: number) => {
    setFiltros(prev => { const next = { ...prev, page }; fetch(next); return next; });
  }, [fetch]);

  const reload = useCallback(() => fetch(filtros), [fetch, filtros]);

  return { transferencias, meta, filtros, isLoading, error, updateFiltros, setPage, reload };
}
