'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Producto, ProductoFiltros, PaginationMeta } from '@/core/types/producto';
import * as productoService from '../services/producto-service';

const DEFAULT_FILTROS: ProductoFiltros = {
  page: 1,
  limit: 10,
};

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filtros, setFiltros] = useState<ProductoFiltros>(DEFAULT_FILTROS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductos = useCallback(async (f: ProductoFiltros) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productoService.getProductos(f);
      setProductos(res.data);
      setMeta(res.meta);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos(DEFAULT_FILTROS);
  }, [fetchProductos]);

  const updateFiltros = useCallback((partial: Partial<ProductoFiltros>) => {
    setFiltros((prev) => {
      const next = { ...prev, ...partial, page: partial.page ?? 1 };
      fetchProductos(next);
      return next;
    });
  }, [fetchProductos]);

  const setPage = useCallback((page: number) => {
    if (meta && (page < 1 || page > meta.totalPages)) return;
    setFiltros((prev) => {
      const next = { ...prev, page };
      fetchProductos(next);
      return next;
    });
  }, [fetchProductos, meta]);

  const reload = useCallback(() => {
    fetchProductos(filtros);
  }, [fetchProductos, filtros]);

  const resetFiltros = useCallback(() => {
    const next = { ...DEFAULT_FILTROS };
    setFiltros(next);
    fetchProductos(next);
  }, [fetchProductos]);

  return {
    productos,
    meta,
    filtros,
    isLoading,
    error,
    updateFiltros,
    setPage,
    reload,
    resetFiltros,
  };
}
