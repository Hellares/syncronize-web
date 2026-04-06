'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Cotizacion } from '@/core/types/cotizacion';
import * as cotizacionService from '../services/cotizacion-service';

export function useCotizacionDetail(id: string) {
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cotizacionService.getCotizacion(id);
      setCotizacion(data);
    } catch {
      setError('Error al cargar cotización');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const cambiarEstado = useCallback(async (estado: string) => {
    try {
      await cotizacionService.cambiarEstado(id, estado);
      fetch();
    } catch (e: any) {
      throw e;
    }
  }, [id, fetch]);

  const duplicar = useCallback(async (): Promise<Cotizacion> => {
    const dup = await cotizacionService.duplicarCotizacion(id);
    return dup;
  }, [id]);

  return { cotizacion, isLoading, error, reload: fetch, cambiarEstado, duplicar };
}
