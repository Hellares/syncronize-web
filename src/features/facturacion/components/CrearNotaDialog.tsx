'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { ComprobanteItem, MotivoNota, TipoNota, CrearNotaDto, CrearNotaItem } from '@/core/types/facturacion';
import { TIPO_COMPROBANTE_LABEL } from '@/core/types/facturacion';
import * as facturacionService from '../services/facturacion-service';

interface Props {
  isOpen: boolean;
  comprobante: ComprobanteItem;
  tipoNota: TipoNota;
  onSuccess: (nota: ComprobanteItem) => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

interface ItemForm { descripcion: string; cantidad: string; valorUnitario: string; precioUnitario: string; }

/**
 * Crear nota de crédito o débito sobre un comprobante ACEPTADO.
 * NC sin items = crédito total (copia el original). ND admite cargos adicionales.
 */
export default function CrearNotaDialog({ isOpen, comprobante, tipoNota, onSuccess, onClose }: Props) {
  const esDebito = tipoNota === 'NOTA_DEBITO';
  const titulo = esDebito ? 'Nota de Débito' : 'Nota de Crédito';

  const [motivos, setMotivos] = useState<MotivoNota[]>([]);
  const [loadingMotivos, setLoadingMotivos] = useState(true);
  const [tipoNotaCodigo, setTipoNotaCodigo] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTipoNotaCodigo(null);
    setMotivo('');
    setItems([]);
    setError('');
    setLoadingMotivos(true);
    facturacionService.getMotivosNota(tipoNota)
      .then((m) => {
        setMotivos(m);
        if (m.length > 0) setTipoNotaCodigo(m[0].codigo);
      })
      .catch(() => setError('No se pudieron cargar los motivos'))
      .finally(() => setLoadingMotivos(false));
  }, [isOpen, tipoNota]);

  const addItem = () => setItems(prev => [...prev, { descripcion: '', cantidad: '1', valorUnitario: '', precioUnitario: '' }]);
  const updateItem = (i: number, patch: Partial<ItemForm>) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError('');
    if (tipoNotaCodigo == null) { setError('Selecciona un motivo'); return; }
    if (motivo.trim().length < 3) { setError('La descripción del motivo debe tener al menos 3 caracteres'); return; }
    if (!comprobante.sedeId) { setError('El comprobante no tiene sede asignada'); return; }

    let itemsPayload: CrearNotaItem[] | undefined;
    if (esDebito && items.length > 0) {
      const parsed: CrearNotaItem[] = [];
      for (const it of items) {
        const cantidad = parseFloat(it.cantidad);
        const valorUnitario = parseFloat(it.valorUnitario);
        const precioUnitario = parseFloat(it.precioUnitario);
        if (!it.descripcion.trim()) { setError('Cada cargo adicional requiere descripción'); return; }
        if (isNaN(cantidad) || cantidad <= 0) { setError('Cantidad inválida en un cargo'); return; }
        if (isNaN(valorUnitario) || valorUnitario < 0) { setError('Valor unitario inválido en un cargo'); return; }
        if (isNaN(precioUnitario) || precioUnitario < 0) { setError('Precio unitario inválido en un cargo'); return; }
        parsed.push({ descripcion: it.descripcion.trim(), cantidad, valorUnitario, precioUnitario });
      }
      itemsPayload = parsed;
    }

    const dto: CrearNotaDto = {
      sedeId: comprobante.sedeId,
      tipoNota: tipoNotaCodigo,
      motivo: motivo.trim(),
      ...(itemsPayload ? { items: itemsPayload } : {}),
    };

    setIsSubmitting(true);
    try {
      const nota = esDebito
        ? await facturacionService.crearNotaDebito(comprobante.id, dto)
        : await facturacionService.crearNotaCredito(comprobante.id, dto);
      onSuccess(nota);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || `No se pudo crear la ${titulo.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Sobre {TIPO_COMPROBANTE_LABEL[comprobante.tipoComprobante]} <span className="font-mono">{comprobante.codigoGenerado}</span>
        </p>

        {loadingMotivos ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelClass}>Motivo *</label>
              <select className={selectClass} value={tipoNotaCodigo ?? ''} onChange={e => setTipoNotaCodigo(Number(e.target.value))}>
                {motivos.map(m => <option key={m.codigo} value={m.codigo}>{m.codigoString} · {m.descripcion}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Descripción / sustento *</label>
              <textarea className={`${inputClass} resize-none`} rows={2} value={motivo} maxLength={250}
                onChange={e => setMotivo(e.target.value)} placeholder="Detalle del motivo (mín. 3 caracteres)" />
              <p className="mt-0.5 text-right text-[10px] text-gray-400">{motivo.length}/250</p>
            </div>

            {esDebito ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Cargos adicionales</label>
                  <button type="button" onClick={addItem} className="text-[11px] font-semibold text-[#437EFF]">+ Agregar</button>
                </div>
                {items.length === 0 ? (
                  <p className="text-[11px] text-gray-400">Sin cargos: la nota de débito tomará los conceptos del comprobante original.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 p-2">
                        <div className="flex items-center gap-2">
                          <input className={inputClass} value={it.descripcion} onChange={e => updateItem(i, { descripcion: e.target.value })} placeholder="Descripción del cargo" />
                          <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                          <input className={inputClass} type="number" step="0.01" min="0.01" value={it.cantidad} onChange={e => updateItem(i, { cantidad: e.target.value })} placeholder="Cant." />
                          <input className={inputClass} type="number" step="0.01" min="0" value={it.valorUnitario} onChange={e => updateItem(i, { valorUnitario: e.target.value })} placeholder="V. unit." />
                          <input className={inputClass} type="number" step="0.01" min="0" value={it.precioUnitario} onChange={e => updateItem(i, { precioUnitario: e.target.value })} placeholder="P. unit." />
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400">V. unit. = sin IGV · P. unit. = con IGV.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">La nota de crédito anulará el total del comprobante original (crédito completo).</p>
              </div>
            )}

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting || loadingMotivos}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Emitiendo...' : `Emitir ${titulo}`}
          </button>
        </div>
      </div>
    </div>
  );
}
