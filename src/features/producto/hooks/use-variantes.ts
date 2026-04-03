'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  ProductoVariante,
  ProductoAtributo,
  CreateVarianteDto,
  UpdateVarianteDto,
  GenerarCombinacionesDto,
} from '@/core/types/producto';
import * as varianteService from '../services/variante-service';

export function useVariantes(productoId: string) {
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [atributosDisponibles, setAtributosDisponibles] = useState<ProductoAtributo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const loadVariantes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [variantesData, atributosData] = await Promise.all([
        varianteService.getVariantes(productoId),
        varianteService.getProductoAtributos(),
      ]);
      setVariantes(variantesData);
      setAtributosDisponibles(atributosData.filter(a => a.isActive));
    } catch {
      setError('Error al cargar las variantes');
    } finally {
      setIsLoading(false);
    }
  }, [productoId]);

  const createVariante = useCallback(async (data: CreateVarianteDto) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.createVariante(productoId, data);
      await loadVariantes();
      setSuccessMessage('Variante creada correctamente');
    } catch {
      setError('Error al crear la variante');
    } finally {
      setIsSubmitting(false);
    }
  }, [productoId, loadVariantes, clearMessages]);

  const updateVariante = useCallback(async (varianteId: string, data: UpdateVarianteDto) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.updateVariante(varianteId, data);
      await loadVariantes();
      setSuccessMessage('Variante actualizada correctamente');
    } catch {
      setError('Error al actualizar la variante');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadVariantes, clearMessages]);

  const deleteVariante = useCallback(async (varianteId: string) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await varianteService.deleteVariante(varianteId);
      await loadVariantes();
      setSuccessMessage('Variante eliminada correctamente');
    } catch {
      setError('Error al eliminar la variante');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadVariantes, clearMessages]);

  const generarCombinaciones = useCallback(async (data: GenerarCombinacionesDto) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const nuevas = await varianteService.generarCombinaciones(productoId, data);
      await loadVariantes();
      setSuccessMessage(`${nuevas.length} variantes generadas correctamente`);
    } catch {
      setError('Error al generar combinaciones');
    } finally {
      setIsSubmitting(false);
    }
  }, [productoId, loadVariantes, clearMessages]);

  useEffect(() => {
    if (productoId) loadVariantes();
  }, [productoId, loadVariantes]);

  return {
    variantes,
    atributosDisponibles,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    clearMessages,
    loadVariantes,
    createVariante,
    updateVariante,
    deleteVariante,
    generarCombinaciones,
  };
}
