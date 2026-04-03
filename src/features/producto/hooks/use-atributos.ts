'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductoAtributo, CreateProductoAtributoDto, UpdateProductoAtributoDto } from '@/core/types/producto';
import * as varianteService from '../services/variante-service';

export function useAtributos() {
  const [atributos, setAtributos] = useState<ProductoAtributo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = useCallback(() => { setError(null); setSuccess(null); }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await varianteService.getProductoAtributos();
      setAtributos(data);
    } catch {
      setError('Error al cargar atributos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: CreateProductoAtributoDto) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.createProductoAtributo(data);
      await load();
      setSuccess('Atributo creado correctamente');
    } catch {
      setError('Error al crear el atributo');
    } finally {
      setIsSubmitting(false);
    }
  }, [load, clearMessages]);

  const update = useCallback(async (id: string, data: UpdateProductoAtributoDto) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.updateProductoAtributo(id, data);
      await load();
      setSuccess('Atributo actualizado correctamente');
    } catch {
      setError('Error al actualizar el atributo');
    } finally {
      setIsSubmitting(false);
    }
  }, [load, clearMessages]);

  const remove = useCallback(async (id: string) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.deleteProductoAtributo(id);
      await load();
      setSuccess('Atributo eliminado correctamente');
    } catch {
      setError('Error al eliminar el atributo');
    } finally {
      setIsSubmitting(false);
    }
  }, [load, clearMessages]);

  return { atributos, isLoading, isSubmitting, error, success, clearMessages, create, update, remove, reload: load };
}
