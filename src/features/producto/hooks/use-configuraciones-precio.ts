'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConfiguracionPrecio, CreateConfiguracionPrecioDto, UpdateConfiguracionPrecioDto } from '@/core/types/precio';
import * as configService from '../services/configuracion-precio-service';

export function useConfiguracionesPrecio() {
  const [configs, setConfigs] = useState<ConfiguracionPrecio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await configService.getConfiguraciones();
      setConfigs(data);
    } catch {
      setError('Error al cargar configuraciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: CreateConfiguracionPrecioDto) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await configService.createConfiguracion(data);
      await load();
      setSuccess('Configuración creada');
    } catch {
      setError('Error al crear configuración');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const update = useCallback(async (id: string, data: UpdateConfiguracionPrecioDto) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await configService.updateConfiguracion(id, data);
      await load();
      setSuccess('Configuración actualizada');
    } catch {
      setError('Error al actualizar configuración');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null); setSuccess(null);
    try {
      await configService.deleteConfiguracion(id);
      await load();
      setSuccess('Configuración eliminada');
    } catch {
      setError('Error al eliminar configuración');
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  return { configs, isLoading, isSubmitting, error, success, create, update, remove, reload: load };
}
