'use client';

import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';

interface CatalogoConfig<TEmpresa, TMaestro, TActivarDto> {
  fetchEmpresa: () => Promise<TEmpresa[]>;
  fetchMaestros: () => Promise<TMaestro[]>;
  activar: (dto: TActivarDto) => Promise<TEmpresa>;
  desactivar: (id: string) => Promise<void>;
}

export function useCatalogo<TEmpresa, TMaestro, TActivarDto>(
  config: CatalogoConfig<TEmpresa, TMaestro, TActivarDto>
) {
  const [itemsEmpresa, setItemsEmpresa] = useState<TEmpresa[]>([]);
  const [itemsMaestros, setItemsMaestros] = useState<TMaestro[]>([]);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(true);
  const [isLoadingMaestros, setIsLoadingMaestros] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEmpresa = useCallback(async () => {
    setIsLoadingEmpresa(true);
    try {
      const data = await config.fetchEmpresa();
      setItemsEmpresa(data);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setIsLoadingEmpresa(false);
    }
  }, [config]);

  const loadMaestros = useCallback(async () => {
    setIsLoadingMaestros(true);
    try {
      const data = await config.fetchMaestros();
      setItemsMaestros(data);
    } catch {
      // Silent — maestros are optional
    } finally {
      setIsLoadingMaestros(false);
    }
  }, [config]);

  useEffect(() => {
    loadEmpresa();
    loadMaestros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActivar = useCallback(async (dto: TActivarDto) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await config.activar(dto);
      await loadEmpresa();
      return true;
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al activar');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [config, loadEmpresa]);

  const handleDesactivar = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await config.desactivar(id);
      await loadEmpresa();
      return true;
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al desactivar. Puede tener productos asociados.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [config, loadEmpresa]);

  return {
    itemsEmpresa,
    itemsMaestros,
    isLoadingEmpresa,
    isLoadingMaestros,
    isSubmitting,
    error,
    setError,
    handleActivar,
    handleDesactivar,
    reload: loadEmpresa,
  };
}
