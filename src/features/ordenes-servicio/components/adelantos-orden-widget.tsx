'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import type { OrdenServicio, AdelantoOrden } from '@/core/types/orden-servicio';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as osService from '../services/orden-servicio-service';

const METODOS_ADELANTO = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'] as const;

interface Props {
  orden: OrdenServicio;
  canManage: boolean;
  onChanged: () => void;
}

function fmt(n: number): string {
  return `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Libro de adelantos de la orden (paridad adelantos_orden_widget.dart):
 * modelo ACUMULATIVO — cada abono suma (INGRESO en caja con su método),
 * anular resta (EGRESO). OrdenServicio.adelanto = Σ filas no anuladas.
 * Bloqueado si la orden está cobrada o cancelada.
 */
export default function AdelantosOrdenWidget({ orden, canManage, onChanged }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [anulando, setAnulando] = useState<AdelantoOrden | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adelantos = orden.adelantos ?? [];
  const estaCobrada = !!(orden.comprobanteId || orden.ventaDetalle);
  const bloqueado = estaCobrada || orden.estado === 'CANCELADO';
  const totalVigente = Number(orden.adelanto ?? 0);

  const anular = async () => {
    if (!anulando) return;
    setIsSubmitting(true);
    setError('');
    try {
      await osService.anularAdelanto(orden.id, anulando.id);
      setAnulando(null);
      onChanged();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo anular el abono');
      setAnulando(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green-700">💰 Adelantos</p>
          <p className="text-lg font-bold text-green-800">{fmt(totalVigente)}</p>
        </div>
        {canManage && !bloqueado && (
          <button onClick={() => setShowForm(true)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
            + Registrar abono
          </button>
        )}
        {bloqueado && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {estaCobrada ? 'Orden cobrada — adelantos cerrados' : 'Orden cancelada'}
          </span>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {adelantos.length === 0 ? (
        <p className="text-xs text-gray-400">Sin abonos registrados.</p>
      ) : (
        <div className="space-y-1.5">
          {adelantos.map(a => {
            const esAjuste = Number(a.monto) < 0;
            return (
              <div key={a.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${a.anulado ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-green-100 bg-white'}`}>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${a.anulado ? 'text-gray-400 line-through' : esAjuste ? 'text-amber-700' : 'text-green-700'}`}>
                    {esAjuste ? '' : '+'}{fmt(Number(a.monto))}
                    <span className="ml-1.5 text-[10px] font-normal text-gray-500">{METODO_PAGO_LABEL[a.metodoPago ?? 'EFECTIVO'] ?? a.metodoPago}</span>
                    {esAjuste && <span className="ml-1 rounded bg-amber-100 px-1 text-[8px] font-bold text-amber-700">AJUSTE</span>}
                    {a.anulado && <span className="ml-1 rounded bg-red-100 px-1 text-[8px] font-bold text-red-600">ANULADO</span>}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(a.creadoEn).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {a.creadoPorNombre ? ` · ${a.creadoPorNombre}` : ''}
                    {a.nota ? ` · ${a.nota}` : ''}
                  </p>
                </div>
                {canManage && !bloqueado && !a.anulado && !esAjuste && (
                  <button onClick={() => setAnulando(a)} title="Anular abono (EGRESO en caja)"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AbonoFormDialog
          ordenId={orden.id}
          onSaved={() => { setShowForm(false); onChanged(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {anulando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAnulando(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-red-700">Anular abono</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Anular el abono de <strong>{fmt(Number(anulando.monto))}</strong> ({METODO_PAGO_LABEL[anulando.metodoPago ?? 'EFECTIVO']})?
              Se registrará un egreso en caja y se restará del adelanto de la orden.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAnulando(null)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={anular} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Anulando...' : 'Anular abono'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Registrar abono (POST /ordenes-servicio/:id/adelantos) --- */
function AbonoFormDialog({ ordenId, onSaved, onClose }: { ordenId: string; onSaved: () => void; onClose: () => void }) {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Ingresa un monto mayor a 0'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await osService.agregarAdelanto(ordenId, {
        monto: m,
        metodoPago,
        nota: nota.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Registrar abono</h3>
        <p className="mt-0.5 text-xs text-gray-500">El abono SUMA al adelanto acumulado y entra a tu caja como ingreso.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
            <input type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="0.00" autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Método de pago</label>
            <div className="flex flex-wrap gap-1.5">
              {METODOS_ADELANTO.map(m => (
                <button key={m} type="button" onClick={() => setMetodoPago(m)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoPago === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {METODO_PAGO_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nota</label>
            <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Registrar abono'}
          </button>
        </div>
      </div>
    </div>
  );
}
