'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateTransferenciaDto } from '@/core/types/stock';
import * as transferenciaService from '../services/transferencia-service';

interface TransferenciaItemForm {
  productoId: string;
  productoNombre: string;
  cantidad: number;
}

export function useCrearTransferencia() {
  const router = useRouter();
  const [sedeOrigenId, setSedeOrigenId] = useState('');
  const [sedeDestinoId, setSedeDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<TransferenciaItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCallback((productoId: string, productoNombre: string, cantidad: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === productoId);
      if (existing) {
        return prev.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad + cantidad } : i);
      }
      return [...prev, { productoId, productoNombre, cantidad }];
    });
  }, []);

  const removeItem = useCallback((productoId: string) => {
    setItems(prev => prev.filter(i => i.productoId !== productoId));
  }, []);

  const updateItemCantidad = useCallback((productoId: string, cantidad: number) => {
    setItems(prev => prev.map(i => i.productoId === productoId ? { ...i, cantidad } : i));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sedeOrigenId || !sedeDestinoId) { setError('Selecciona sede origen y destino'); return; }
    if (sedeOrigenId === sedeDestinoId) { setError('Las sedes deben ser diferentes'); return; }
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      if (items.length === 1) {
        const item = items[0];
        const dto: CreateTransferenciaDto = {
          sedeOrigenId,
          sedeDestinoId,
          productoId: item.productoId,
          cantidad: item.cantidad,
          ...(motivo && { motivo }),
          ...(observaciones && { observaciones }),
        };
        await transferenciaService.createTransferencia(dto);
      } else {
        await transferenciaService.createTransferenciasMultiples({
          sedeOrigenId,
          sedeDestinoId,
          productos: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
          ...(motivo && { motivoGeneral: motivo }),
          ...(observaciones && { observaciones }),
        });
      }
      router.push('/dashboard/transferencias');
    } catch {
      setError('Error al crear la transferencia');
    } finally {
      setIsSubmitting(false);
    }
  }, [sedeOrigenId, sedeDestinoId, items, motivo, observaciones, router]);

  return {
    sedeOrigenId, setSedeOrigenId,
    sedeDestinoId, setSedeDestinoId,
    motivo, setMotivo,
    observaciones, setObservaciones,
    items, addItem, removeItem, updateItemCantidad,
    isSubmitting, error, handleSubmit,
  };
}
