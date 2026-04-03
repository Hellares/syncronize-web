'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TransferenciaStock } from '@/core/types/stock';
import * as transferenciaService from '../services/transferencia-service';

export function useTransferenciaDetail(id: string) {
  const [transferencia, setTransferencia] = useState<TransferenciaStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await transferenciaService.getTransferencia(id);
      setTransferencia(data);
    } catch {
      setError('Error al cargar la transferencia');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const execute = useCallback(async (action: () => Promise<TransferenciaStock>, msg: string) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await action();
      setTransferencia(updated);
      setSuccess(msg);
    } catch {
      setError('Error al procesar la transferencia');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const aprobar = useCallback(() => execute(() => transferenciaService.aprobarTransferencia(id), 'Transferencia aprobada'), [id, execute]);
  const enviar = useCallback(() => execute(() => transferenciaService.enviarTransferencia(id), 'Transferencia enviada'), [id, execute]);
  const recibir = useCallback(() => execute(() => transferenciaService.recibirTransferencia(id), 'Transferencia recibida'), [id, execute]);
  const rechazar = useCallback((motivo: string) => execute(() => transferenciaService.rechazarTransferencia(id, motivo), 'Transferencia rechazada'), [id, execute]);
  const cancelar = useCallback((motivo: string) => execute(() => transferenciaService.cancelarTransferencia(id, motivo), 'Transferencia cancelada'), [id, execute]);
  const procesarCompleto = useCallback(() => execute(() => transferenciaService.procesarCompletoTransferencia(id), 'Transferencia procesada completamente'), [id, execute]);

  return { transferencia, isLoading, isSubmitting, error, success, reload: load, aprobar, enviar, recibir, rechazar, cancelar, procesarCompleto };
}
