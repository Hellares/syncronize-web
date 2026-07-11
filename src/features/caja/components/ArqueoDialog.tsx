'use client';

import { useState, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { ResumenCaja, TipoArqueoCaja, MetodoPagoVenta, ConteoMetodoPagoDto } from '@/core/types/caja';
import { METODO_PAGO_LABEL, DIFERENCIA_THRESHOLD } from '@/core/types/caja';
import * as cajaService from '../services/caja-service';
import DesgloseEfectivoDialog from './DesgloseEfectivoDialog';

interface Props {
  isOpen: boolean;
  cajaId: string;
  resumen: ResumenCaja | null;
  onSuccess: () => void;
  onClose: () => void;
}

const TIPOS: Array<{ value: TipoArqueoCaja; label: string; desc: string }> = [
  { value: 'RUTINARIO', label: 'Rutinario', desc: 'Conteo de control durante el turno' },
  { value: 'SORPRESIVO', label: 'Sorpresivo', desc: 'Verificación no anunciada (supervisión)' },
  { value: 'RELEVO', label: 'Relevo de turno', desc: 'Entrega de caja a otro cajero' },
];

/**
 * Arqueo de caja: conteo intermedio SIN cerrar (paridad realizar_arqueo_page Flutter).
 * RELEVO exige indicar a quién se entrega el turno.
 */
export default function ArqueoDialog({ isOpen, cajaId, resumen, onSuccess, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoArqueoCaja>('RUTINARIO');
  const [conteos, setConteos] = useState<Record<string, string>>({});
  const [desgloseEfectivo, setDesgloseEfectivo] = useState<Record<string, number> | null>(null);
  const [showDesglose, setShowDesglose] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nombre: string }>>([]);
  const [turnoEntregadoAId, setTurnoEntregadoAId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTipo('RUTINARIO'); setConteos({}); setDesgloseEfectivo(null);
    setObservaciones(''); setTurnoEntregadoAId(''); setError('');
    const init: Record<string, string> = {};
    const metodos = new Set<string>(['EFECTIVO', ...(resumen?.detalles ?? []).map(d => d.metodoPago)]);
    metodos.forEach(m => { init[m] = ''; });
    setConteos(init);
  }, [isOpen, resumen]);

  // Usuarios para el relevo de turno
  useEffect(() => {
    if (!isOpen || tipo !== 'RELEVO' || usuarios.length > 0) return;
    apiClient.get('/usuarios?limit=200').then(res => {
      const list = (Array.isArray(res.data) ? res.data : res.data?.data ?? []) as Array<{ id: string; persona?: { nombres?: string; apellidos?: string }; email?: string }>;
      setUsuarios(list.map(u => ({
        id: u.id,
        nombre: u.persona ? `${u.persona.nombres ?? ''} ${u.persona.apellidos ?? ''}`.trim() : (u.email ?? u.id),
      })));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tipo]);

  const esperado = (metodo: string) => Number(resumen?.detalles?.find(d => d.metodoPago === metodo)?.saldo ?? 0);

  const filas = useMemo(() => Object.keys(conteos).map(metodo => {
    const conteo = conteos[metodo] === '' ? 0 : (parseFloat(conteos[metodo]) || 0);
    const dif = conteo - esperado(metodo);
    return { metodo, conteo, esperado: esperado(metodo), dif, hayDif: Math.abs(dif) >= DIFERENCIA_THRESHOLD };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [conteos, resumen]);

  const handleSubmit = async () => {
    setError('');
    if (tipo === 'RELEVO' && !turnoEntregadoAId) { setError('Selecciona a quién entregas el turno'); return; }
    setIsSubmitting(true);
    try {
      const conteosDto: ConteoMetodoPagoDto[] = filas.map(f => ({ metodoPago: f.metodo as MetodoPagoVenta, conteoFisico: f.conteo }));
      await cajaService.crearArqueo(cajaId, {
        tipo,
        conteos: conteosDto,
        observaciones: observaciones.trim() || undefined,
        ...(tipo === 'RELEVO' && turnoEntregadoAId ? { turnoEntregadoAId } : {}),
        ...(desgloseEfectivo && Object.keys(desgloseEfectivo).length > 0 ? { desgloseEfectivo } : {}),
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al registrar el arqueo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Arqueo de caja</h3>
        <p className="mt-0.5 text-xs text-gray-500">Conteo de control sin cerrar la caja.</p>

        {/* Tipo */}
        <div className="mt-3 space-y-1.5">
          {TIPOS.map(t => (
            <label key={t.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 ${tipo === t.value ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200'}`}>
              <input type="radio" checked={tipo === t.value} onChange={() => setTipo(t.value)}
                className="mt-0.5 text-[#437EFF] focus:ring-[#437EFF]" />
              <span>
                <span className="block text-xs font-semibold text-gray-800">{t.label}</span>
                <span className="block text-[10px] text-gray-500">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {tipo === 'RELEVO' && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">Entregar turno a *</label>
            <select value={turnoEntregadoAId} onChange={e => setTurnoEntregadoAId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
              <option value="">Seleccionar cajero...</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Conteo por método */}
        <div className="mt-3 space-y-2">
          {filas.map(f => (
            <div key={f.metodo} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700">{METODO_PAGO_LABEL[f.metodo] ?? f.metodo}</p>
                <p className="text-[10px] text-gray-400">Esperado: S/ {f.esperado.toFixed(2)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {conteos[f.metodo] !== '' && (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${!f.hayDif ? 'bg-green-100 text-green-700' : f.dif > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {!f.hayDif ? '✓' : f.dif > 0 ? `+${f.dif.toFixed(2)}` : f.dif.toFixed(2)}
                  </span>
                )}
                {f.metodo === 'EFECTIVO' && (
                  <button type="button" onClick={() => setShowDesglose(true)} title="Contar billetes"
                    className={`rounded-lg border px-1.5 py-1 text-[10px] ${desgloseEfectivo ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                    💵
                  </button>
                )}
                <input type="number" step="0.01" min="0" value={conteos[f.metodo]}
                  onChange={e => {
                    setConteos(prev => ({ ...prev, [f.metodo]: e.target.value }));
                    if (f.metodo === 'EFECTIVO') setDesgloseEfectivo(null);
                  }}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:border-[#437EFF]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones</label>
          <input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Registrar Arqueo'}
          </button>
        </div>
      </div>

      {showDesglose && (
        <DesgloseEfectivoDialog
          isOpen={showDesglose}
          initial={desgloseEfectivo}
          onConfirm={(d, total) => {
            setDesgloseEfectivo(d);
            setConteos(prev => ({ ...prev, EFECTIVO: String(total) }));
            setShowDesglose(false);
          }}
          onClose={() => setShowDesglose(false)}
        />
      )}
    </div>
  );
}
