'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { TransferenciaStock, TipoIncidenciaTransferencia, RecibirItemConIncidenciasDto } from '@/core/types/stock';
import { TIPO_INCIDENCIA_LABEL } from '@/core/types/stock';
import * as transferenciaService from '../services/transferencia-service';

interface Props {
  isOpen: boolean;
  transferencia: TransferenciaStock | null;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#437EFF] bg-white";

interface ItemState {
  itemId: string;
  nombre: string;
  enviada: number;
  buenEstado: string;
  incidencias: Array<{ tipo: TipoIncidenciaTransferencia; cantidad: string; descripcion: string }>;
}

/**
 * Recepción item por item con registro de incidencias (paridad recibir_transferencia_con_incidencias_page).
 * Regla: buenEstado + suma(incidencias) ≤ cantidad enviada por item.
 */
export default function RecibirConIncidenciasDialog({ isOpen, transferencia, onSuccess, onClose }: Props) {
  const [items, setItems] = useState<ItemState[]>([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [marcarCompletada, setMarcarCompletada] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && transferencia?.items) {
      setItems(transferencia.items
        .filter(it => it.estado !== 'RECIBIDO' && it.estado !== 'RECHAZADO')
        .map(it => ({
          itemId: it.id,
          nombre: it.varianteNombre ?? it.productoNombre ?? 'Producto',
          enviada: it.cantidadEnviada || it.cantidadAprobada || it.cantidadSolicitada,
          buenEstado: String(it.cantidadEnviada || it.cantidadAprobada || it.cantidadSolicitada),
          incidencias: [],
        })));
      setObservacionesGenerales('');
      setMarcarCompletada(true);
      setError('');
    }
  }, [isOpen, transferencia]);

  const updateItem = (idx: number, patch: Partial<ItemState>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const validarItem = (it: ItemState): string | null => {
    const buen = parseInt(it.buenEstado) || 0;
    const afectadas = it.incidencias.reduce((acc, inc) => acc + (parseInt(inc.cantidad) || 0), 0);
    if (buen < 0) return `${it.nombre}: cantidad inválida`;
    if (buen + afectadas > it.enviada) return `${it.nombre}: buen estado (${buen}) + incidencias (${afectadas}) supera lo enviado (${it.enviada})`;
    for (const inc of it.incidencias) {
      if (!inc.cantidad || (parseInt(inc.cantidad) || 0) < 1) return `${it.nombre}: cantidad de incidencia inválida`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!transferencia) return;
    setError('');
    for (const it of items) {
      const err = validarItem(it);
      if (err) { setError(err); return; }
    }
    setIsSubmitting(true);
    try {
      const dto: { items: RecibirItemConIncidenciasDto[]; observacionesGenerales?: string; marcarComoCompletada?: boolean } = {
        items: items.map(it => ({
          itemId: it.itemId,
          cantidadRecibidaBuenEstado: parseInt(it.buenEstado) || 0,
          incidencias: it.incidencias.length > 0 ? it.incidencias.map(inc => ({
            tipo: inc.tipo,
            cantidadAfectada: parseInt(inc.cantidad) || 0,
            descripcion: inc.descripcion.trim() || undefined,
          })) : undefined,
        })),
        observacionesGenerales: observacionesGenerales.trim() || undefined,
        marcarComoCompletada: marcarCompletada,
      };
      await transferenciaService.recibirConIncidencias(transferencia.id, dto);
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al recibir la transferencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !transferencia) return null;

  const totalIncidencias = items.reduce((acc, it) => acc + it.incidencias.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Recibir con incidencias</h3>
        <p className="mt-1 text-xs text-gray-500">
          {transferencia.codigo} · Indica cuánto llegó en buen estado por item y registra los problemas.
        </p>

        <div className="mt-4 space-y-3">
          {items.map((it, idx) => {
            const buen = parseInt(it.buenEstado) || 0;
            const afectadas = it.incidencias.reduce((acc, inc) => acc + (parseInt(inc.cantidad) || 0), 0);
            const excede = buen + afectadas > it.enviada;
            return (
              <div key={it.itemId} className={`rounded-lg border p-3 ${excede ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{it.nombre} <span className="text-xs text-gray-400">(enviado: {it.enviada})</span></p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Buen estado:</label>
                    <input className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right outline-none focus:border-[#437EFF]"
                      type="number" min="0" max={it.enviada} value={it.buenEstado}
                      onChange={e => updateItem(idx, { buenEstado: e.target.value })} />
                    <button type="button"
                      onClick={() => updateItem(idx, { incidencias: [...it.incidencias, { tipo: 'DANADO', cantidad: '1', descripcion: '' }] })}
                      className="rounded-lg border border-amber-300 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50">
                      + Incidencia
                    </button>
                  </div>
                </div>

                {it.incidencias.map((inc, incIdx) => (
                  <div key={incIdx} className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-amber-50 p-2">
                    <select className={selectClass} value={inc.tipo}
                      onChange={e => {
                        const next = [...it.incidencias];
                        next[incIdx] = { ...inc, tipo: e.target.value as TipoIncidenciaTransferencia };
                        updateItem(idx, { incidencias: next });
                      }}>
                      {Object.entries(TIPO_INCIDENCIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-right outline-none" type="number" min="1"
                      value={inc.cantidad}
                      onChange={e => {
                        const next = [...it.incidencias];
                        next[incIdx] = { ...inc, cantidad: e.target.value };
                        updateItem(idx, { incidencias: next });
                      }} />
                    <input className="flex-1 min-w-[120px] rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
                      placeholder="Descripción del problema..."
                      value={inc.descripcion}
                      onChange={e => {
                        const next = [...it.incidencias];
                        next[incIdx] = { ...inc, descripcion: e.target.value };
                        updateItem(idx, { incidencias: next });
                      }} />
                    <button type="button" onClick={() => updateItem(idx, { incidencias: it.incidencias.filter((_, i) => i !== incIdx) })}
                      className="rounded p-1 text-gray-400 hover:text-red-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}

                {excede && (
                  <p className="mt-1 text-[10px] text-red-600">⚠ Buen estado + incidencias ({buen + afectadas}) supera lo enviado ({it.enviada})</p>
                )}
                {!excede && buen + afectadas < it.enviada && (
                  <p className="mt-1 text-[10px] text-gray-400">Sin justificar: {it.enviada - buen - afectadas} unid. (agrega una incidencia FALTANTE si no llegaron)</p>
                )}
              </div>
            );
          })}

          <textarea className={`${inputClass} min-h-[50px]`} value={observacionesGenerales}
            onChange={e => setObservacionesGenerales(e.target.value)} placeholder="Observaciones generales de la recepción (opcional)" />

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={marcarCompletada} onChange={e => setMarcarCompletada(e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF]" />
            Marcar transferencia como completamente recibida
          </label>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-400">{totalIncidencias} incidencia{totalIncidencias !== 1 ? 's' : ''} a reportar</span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
              {isSubmitting ? 'Recibiendo...' : 'Recibir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
