'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Producto } from '@/core/types/producto';
import * as productoService from '../services/producto-service';

export function useProductoDetail(id: string) {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducto = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await productoService.getProducto(id);
      setProducto(data);
    } catch {
      setError('Error al cargar el producto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchProducto();
  }, [id, fetchProducto]);

  return { producto, isLoading, error, reload: fetchProducto };
}
