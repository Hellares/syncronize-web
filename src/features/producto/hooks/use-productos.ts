'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Producto, ProductoFiltros, PaginationMeta } from '@/core/types/producto';
import * as productoService from '../services/producto-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

export function useProductos() {
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filtros, setFiltros] = useState<ProductoFiltros>({ page: 1, limit: 10, sedeId: defaultSede?.id });
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
    fetchProductos({ page: 1, limit: 10, sedeId: defaultSede?.id });
  }, [fetchProductos, defaultSede?.id]);

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
    const next: ProductoFiltros = { page: 1, limit: 10, sedeId: defaultSede?.id };
    setFiltros(next);
    fetchProductos(next);
  }, [fetchProductos, defaultSede?.id]);

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
