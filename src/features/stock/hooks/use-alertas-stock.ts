'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductoStock } from '@/core/types/stock';
import { stockDisponibleVenta } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

export function useAlertasStock(sedeId: string | null) {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [total, setTotal] = useState(0);
  const [criticos, setCriticos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getAlertasBajoMinimo(sedeId ?? undefined);
      setProductos(res.productos);
      setTotal(res.total);
      setCriticos(res.criticos);
    } catch {
      setError('Error al cargar alertas de stock');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { load(); }, [load]);

  const productosCriticos = productos.filter(p => stockDisponibleVenta(p) <= 0);
  const productosBajoMinimo = productos.filter(p => stockDisponibleVenta(p) > 0);

  return { productos, productosCriticos, productosBajoMinimo, total, criticos, isLoading, error, reload: load };
}
