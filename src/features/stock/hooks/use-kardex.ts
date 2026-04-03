'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MovimientoStock, ResumenMovimiento, MovimientoFiltros } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

const DEFAULT_FILTROS: MovimientoFiltros = { limit: 50 };

export function useKardex(productoStockId: string | null) {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [resumen, setResumen] = useState<ResumenMovimiento[]>([]);
  const [filtros, setFiltros] = useState<MovimientoFiltros>(DEFAULT_FILTROS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovimientos = useCallback(async (f: MovimientoFiltros) => {
    if (!productoStockId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockService.getMovimientos(productoStockId, f);
      setMovimientos(data.movimientos);
      setResumen(data.resumen);
    } catch {
      setError('Error al cargar el kardex');
    } finally {
      setIsLoading(false);
    }
  }, [productoStockId]);

  useEffect(() => {
    fetchMovimientos(DEFAULT_FILTROS);
  }, [productoStockId, fetchMovimientos]);

  const updateFiltros = useCallback((partial: Partial<MovimientoFiltros>) => {
    setFiltros(prev => {
      const next = { ...prev, ...partial };
      fetchMovimientos(next);
      return next;
    });
  }, [fetchMovimientos]);

  const reload = useCallback(() => fetchMovimientos(filtros), [fetchMovimientos, filtros]);

  return { movimientos, resumen, filtros, isLoading, error, updateFiltros, reload };
}
