'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { TipoMovimientoCaja, MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as tesoreriaService from '../services/tesoreria-service';

interface Props {
  isOpen: boolean;
  sedeId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white';
const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

export default function AjusteTesoreriaDialog({ isOpen, sedeId, onSuccess, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>('INGRESO');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('EFECTIVO');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setTipo('INGRESO'); setMetodoPago('EFECTIVO'); setMonto(''); setDescripcion(''); setError(''); }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError('');
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Ingresa un monto mayor a 0'); return; }
    if (!descripcion.trim()) { setError('El motivo es obligatorio'); return; }
    setIsSubmitting(true);
    try {
      await tesoreriaService.crearAjuste(sedeId, { tipo, metodoPago, monto: m, descripcion: descripcion.trim() });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el ajuste');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Ajuste de tesorería</h3>
        <p className="mt-0.5 text-xs text-gray-500">Depósito o retiro manual sobre la caja central.</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTipo('INGRESO')}
              className={`rounded-lg border p-2 text-center text-xs font-medium ${tipo === 'INGRESO' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              ▲ Depósito (ingreso)
            </button>
            <button type="button" onClick={() => setTipo('EGRESO')}
              className={`rounded-lg border p-2 text-center text-xs font-medium ${tipo === 'EGRESO' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              ▼ Retiro (egreso)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Método *</label>
              <select className={selectClass} value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPagoVenta)}>
                {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
              <input className={inputClass} type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Motivo *</label>
            <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej. Depósito a banco, reposición inicial" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${tipo === 'INGRESO' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {isSubmitting ? 'Registrando...' : 'Registrar ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}
