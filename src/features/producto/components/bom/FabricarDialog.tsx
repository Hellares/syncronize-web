'use client';

import { useState, useMemo, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { ComponenteBOM, FabricarResponse } from '@/core/types/bom';
import * as bomService from '../../services/bom-service';

interface Props {
  isOpen: boolean;
  productoId: string;
  productoNombre: string;
  varianteId?: string | null;
  sedeId: string;
  componentes: ComponenteBOM[];
  onFabricado: (res: FabricarResponse) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

/**
 * Fabricar N unidades — paridad _FabricarDialog Flutter:
 * preview de consumo por insumo, validación fraccionarios y stock, modo retroactivo, M.O. total del lote.
 */
export default function FabricarDialog({ isOpen, productoId, productoNombre, varianteId, sedeId, componentes, onFabricado, onClose }: Props) {
  const [cantidad, setCantidad] = useState('1');
  const [soloConsumir, setSoloConsumir] = useState(false);
  const [costoManoObra, setCostoManoObra] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setCantidad('1'); setSoloConsumir(false); setCostoManoObra(''); setObservaciones(''); setError(''); }
  }, [isOpen]);

  const n = parseInt(cantidad) || 0;

  // Preview de consumo (mismas validaciones que Flutter: fraccionarios y stock)
  const consumos = useMemo(() => componentes.map(c => {
    const consumida = Number(c.cantidad) * n;
    const redondeado = Math.round(consumida);
    const esEntero = Math.abs(consumida - redondeado) < 1e-6;
    const stockOk = c.stockDisponible == null || redondeado <= Number(c.stockDisponible);
    return { c, consumida, redondeado, esEntero, stockOk };
  }), [componentes, n]);

  const hayFraccionarios = consumos.some(x => !x.esEntero);
  const hayStockInsuficiente = consumos.some(x => x.esEntero && !x.stockOk);
  const costoInsumosPreview = useMemo(() =>
    consumos.reduce((acc, x) => acc + (x.c.precioCostoUnitario != null ? x.consumida * Number(x.c.precioCostoUnitario) : 0), 0),
    [consumos]);

  const handleSubmit = async () => {
    setError('');
    if (n < 1) { setError('La cantidad debe ser al menos 1'); return; }
    if (hayFraccionarios) { setError('Hay consumos fraccionarios — ajusta el lote o cambia la unidad del insumo (ej: KG → GR)'); return; }
    if (hayStockInsuficiente) { setError('Stock insuficiente en uno o más insumos'); return; }
    setIsSubmitting(true);
    try {
      const res = await bomService.fabricar(productoId, {
        sedeId,
        varianteId: varianteId || undefined,
        cantidad: n,
        soloConsumirInsumos: soloConsumir || undefined,
        costoManoObra: !soloConsumir && costoManoObra ? parseFloat(costoManoObra) : undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onFabricado(res);
    } catch (err) {
      const data = err instanceof AxiosError ? err.response?.data : undefined;
      setError(data?.message || 'Error al fabricar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">🏭 Fabricar</h3>
        <p className="mt-1 text-xs text-gray-500">{productoNombre}</p>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad a fabricar *</label>
              <input className={inputClass} type="number" min="1" step="1" value={cantidad}
                onChange={e => setCantidad(e.target.value)} />
            </div>
            {!soloConsumir && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Mano de obra (lote)</label>
                <input className={inputClass} type="number" step="0.01" min="0" value={costoManoObra}
                  onChange={e => setCostoManoObra(e.target.value)} placeholder="S/ opcional" />
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={soloConsumir} onChange={e => setSoloConsumir(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#437EFF]" />
            <span>
              <strong>Solo descontar insumos</strong> (producción previa: el stock terminado ya existe — no suma stock ni recalcula costo)
            </span>
          </label>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones</label>
            <input className={inputClass} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" />
          </div>

          {/* Preview de consumo */}
          {n >= 1 && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-medium uppercase text-gray-400 mb-2">Consumo de insumos ({n} unidad{n > 1 ? 'es' : ''})</p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {consumos.map(({ c, consumida, esEntero, stockOk }) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-gray-700">
                      {c.componente.nombre}{c.componente.varianteNombre ? ` (${c.componente.varianteNombre})` : ''}
                    </span>
                    <span className={`shrink-0 font-medium ${!esEntero ? 'text-amber-600' : !stockOk ? 'text-red-600' : 'text-gray-800'}`}>
                      {consumida} {c.componente.unidadMedida ?? ''}
                      {c.componente.factorCompra && c.componente.unidadCompraSimbolo && consumida >= Number(c.componente.factorCompra) && (
                        <span className="ml-1 text-gray-400">({(consumida / Number(c.componente.factorCompra)).toFixed(2)} {c.componente.unidadCompraSimbolo})</span>
                      )}
                      {' '}/ {c.stockDisponible ?? '—'}
                      {!esEntero && ' ⚠️'}
                      {esEntero && !stockOk && ' ✗'}
                    </span>
                  </div>
                ))}
              </div>
              {costoInsumosPreview > 0 && (
                <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
                  Costo insumos estimado: <strong>S/ {costoInsumosPreview.toFixed(2)}</strong>
                  {!soloConsumir && costoManoObra && parseFloat(costoManoObra) > 0 && (
                    <> + M.O. S/ {parseFloat(costoManoObra).toFixed(2)} = <strong>S/ {(costoInsumosPreview + parseFloat(costoManoObra)).toFixed(2)}</strong></>
                  )}
                </p>
              )}
              {hayFraccionarios && (
                <p className="mt-1 text-[10px] text-amber-600">⚠ Consumos fraccionarios: el stock se maneja en enteros — cambia la unidad del insumo o ajusta el lote.</p>
              )}
              {hayStockInsuficiente && (
                <p className="mt-1 text-[10px] text-red-600">✗ Stock insuficiente en los insumos marcados.</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting || n < 1 || hayFraccionarios || hayStockInsuficiente}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Fabricando...' : soloConsumir ? 'Descontar insumos' : 'Fabricar'}
          </button>
        </div>
      </div>
    </div>
  );
}
