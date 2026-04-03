'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ComboCompleto, CreateComponenteComboDto, UpdateComponenteComboDto } from '@/core/types/combo';
import * as comboService from '../services/combo-service';

export function useCombo(comboId: string, sedeId: string | null) {
  const [combo, setCombo] = useState<ComboCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sedeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await comboService.getComboCompleto(comboId, sedeId);
      setCombo(data);
    } catch {
      setError('Error al cargar el combo');
    } finally {
      setIsLoading(false);
    }
  }, [comboId, sedeId]);

  useEffect(() => { load(); }, [load]);

  const addComponente = useCallback(async (data: CreateComponenteComboDto) => {
    if (!sedeId) return;
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await comboService.addComponente(comboId, { ...data, sedeId });
      await load();
      setSuccess('Componente agregado');
    } catch {
      setError('Error al agregar componente');
    } finally {
      setIsSubmitting(false);
    }
  }, [comboId, sedeId, load]);

  const updateComponente = useCallback(async (componenteId: string, data: UpdateComponenteComboDto) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await comboService.updateComponente(componenteId, data);
      await load();
      setSuccess('Componente actualizado');
    } catch {
      setError('Error al actualizar componente');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const removeComponente = useCallback(async (componenteId: string) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await comboService.deleteComponente(componenteId);
      await load();
      setSuccess('Componente eliminado');
    } catch {
      setError('Error al eliminar componente');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  return { combo, isLoading, isSubmitting, error, success, addComponente, updateComponente, removeComponente, reload: load };
}
