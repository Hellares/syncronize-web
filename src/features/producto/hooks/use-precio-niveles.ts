'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PrecioNivel, CreatePrecioNivelDto, UpdatePrecioNivelDto } from '@/core/types/precio';
import * as precioNivelService from '../services/precio-nivel-service';

export function usePrecioNiveles(productoId: string | null, varianteId?: string | null) {
  const [niveles, setNiveles] = useState<PrecioNivel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productoId && !varianteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = varianteId
        ? await precioNivelService.getNivelesByVariante(varianteId)
        : await precioNivelService.getNivelesByProducto(productoId!);
      setNiveles(data);
    } catch {
      setError('Error al cargar niveles de precio');
    } finally {
      setIsLoading(false);
    }
  }, [productoId, varianteId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: CreatePrecioNivelDto) => {
    if (!productoId && !varianteId) return;
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      if (varianteId) await precioNivelService.createNivelVariante(varianteId, data);
      else await precioNivelService.createNivelProducto(productoId!, data);
      await load();
      setSuccess('Nivel de precio creado');
    } catch {
      setError('Error al crear nivel de precio');
    } finally {
      setIsSubmitting(false);
    }
  }, [productoId, varianteId, load]);

  const update = useCallback(async (nivelId: string, data: UpdatePrecioNivelDto) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await precioNivelService.updateNivel(nivelId, data);
      await load();
      setSuccess('Nivel actualizado');
    } catch {
      setError('Error al actualizar nivel');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const remove = useCallback(async (nivelId: string) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await precioNivelService.deleteNivel(nivelId);
      await load();
      setSuccess('Nivel eliminado');
    } catch {
      setError('Error al eliminar nivel');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  return { niveles, isLoading, isSubmitting, error, success, create, update, remove, reload: load };
}
