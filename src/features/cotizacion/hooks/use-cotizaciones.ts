'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Cotizacion, CotizacionFiltros } from '@/core/types/cotizacion';
import * as cotizacionService from '../services/cotizacion-service';

/**
 * Cuántas cotizaciones trae cada tanda.
 *
 * El backend pagina por CURSOR: pide `limit + 1` para saber si hay más sin un
 * count extra, y el cursor es el id de la última fila. No hay total, así que no
 * hay "página 3 de 12" — hay "cargar más".
 */
const POR_TANDA = 20;

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filtros, setFiltros] = useState<CotizacionFiltros>({ page: 1, limit: POR_TANDA });
  const [isLoading, setIsLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  const fetchCotizaciones = useCallback(async (f: CotizacionFiltros) => {
    setIsLoading(true);
    setError(null);
    try {
      const pagina = await cotizacionService.getCotizaciones(f);
      setCotizaciones(pagina.items);
      setHasMore(pagina.hasMore);
      cursorRef.current = pagina.nextCursor;
    } catch {
      setError('Error al cargar cotizaciones');
      setCotizaciones([]);
      setHasMore(false);
      cursorRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotizaciones(filtros);
  }, [fetchCotizaciones, filtros]);

  /** Siguiente tanda, APENDEADA: la lista no se reemplaza. */
  const cargarMas = useCallback(async () => {
    if (!hasMore || cargandoMas || !cursorRef.current) return;
    setCargandoMas(true);
    try {
      const pagina = await cotizacionService.getCotizaciones(filtros, cursorRef.current);
      setCotizaciones(prev => [...prev, ...pagina.items]);
      setHasMore(pagina.hasMore);
      cursorRef.current = pagina.nextCursor;
    } catch {
      setError('Error al cargar más cotizaciones');
    } finally {
      setCargandoMas(false);
    }
  }, [filtros, hasMore, cargandoMas]);

  // Cualquier cambio de filtro arranca de cero: el cursor viejo apunta a una
  // fila que puede no estar en el nuevo resultado.
  const updateFiltros = useCallback((partial: Partial<CotizacionFiltros>) => {
    setFiltros(prev => ({ ...prev, ...partial, page: 1 }));
  }, []);

  const reload = useCallback(() => {
    fetchCotizaciones(filtros);
  }, [fetchCotizaciones, filtros]);

  const resetFiltros = useCallback(() => {
    setFiltros({ page: 1, limit: POR_TANDA });
  }, []);

  return {
    cotizaciones, filtros, isLoading, cargandoMas, hasMore, error,
    updateFiltros, cargarMas, reload, resetFiltros,
  };
}
