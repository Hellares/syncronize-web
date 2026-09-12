'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import type { Lote } from '@/core/types/lote';
import { formatearDiaCalendario, nombreDeLote } from '@/core/types/lote';
import { corregirVencimientoLote } from '@/features/compras/services/lote-service';

const INPUT =
  'h-[30px] w-full rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200';

interface Props {
  empresaId: string;
  lote: Lote;
  onClose: () => void;
  onHecho: () => void;
}

const aInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

/**
 * Corregir una fecha de vencimiento mal cargada.
 *
 * 🔑 Es la otra salida del bloqueo por CADUCIDAD, y la correcta cuando el
 * problema es el DATO y no la mercadería: si el envase dice diciembre y
 * alguien tipeó agosto, no hay que tirar nada.
 *
 * 🔴 Queda rastro. Se avisa en pantalla a propósito: cambiar un vencimiento es
 * exactamente lo que haría alguien para saltarse el bloqueo, y quien lo hace
 * de buena fe tiene que saber que la corrección se puede auditar.
 */
export default function CorregirVencimientoDialog({ empresaId, lote, onClose, onHecho }: Props) {
  const [fecha, setFecha] = useState(aInput(lote.fechaVencimiento));
  const [sinVencimiento, setSinVencimiento] = useState(!lote.fechaVencimiento);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambio = sinVencimiento
    ? !!lote.fechaVencimiento
    : fecha !== aInput(lote.fechaVencimiento) && !!fecha;
  const valido = cambio && motivo.trim().length > 0;

  // Avisar si la fecha nueva TAMBIÉN está vencida: no revive el lote, y quien
  // la tipea suele estar creyendo que sí.
  const nuevaYaPaso = !sinVencimiento && !!fecha && new Date(fecha) < new Date(new Date().toDateString());

  const confirmar = async () => {
    if (!valido) return;
    setGuardando(true);
    setError('');
    try {
      await corregirVencimientoLote(empresaId, lote.id, {
        fechaVencimiento: sinVencimiento ? null : fecha,
        motivo: motivo.trim(),
      });
      onHecho();
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo corregir');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-[#004A94]">Corregir el vencimiento</h3>
        <p className="mt-1 truncate text-xs text-gray-600">
          <span className="font-medium">{nombreDeLote(lote)}</span>
          <span className="font-mono text-[11px] text-gray-400"> · {lote.codigo}</span>
        </p>

        <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600">
          Hoy dice:{' '}
          <b>
            {lote.fechaVencimiento
              ? formatearDiaCalendario(lote.fechaVencimiento)
              : 'sin vencimiento'}
          </b>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-medium text-gray-600">
            La fecha del envase
          </span>
          <input type="date" className={INPUT} value={fecha} disabled={sinVencimiento}
            onChange={(e) => setFecha(e.target.value)} />
        </label>

        <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
          <input type="checkbox" checked={sinVencimiento}
            onChange={(e) => setSinVencimiento(e.target.checked)}
            className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
          Este lote no vence (se le cargó una fecha por error)
        </label>

        {nuevaYaPaso && (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
            Esa fecha también ya pasó: el lote va a seguir vencido.
          </p>
        )}

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-medium text-gray-600">Por qué se corrige</span>
          <input className={INPUT} value={motivo} autoFocus
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Se cargó mal al recibir…" />
        </label>

        <p className="mt-2 text-[10px] text-gray-500">
          Queda registrado qué decía antes, qué dice ahora, quién y por qué.
        </p>

        {error && <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!valido || guardando}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:bg-gray-200 disabled:text-gray-400">
            {guardando ? 'Guardando…' : 'Corregir'}
          </button>
        </div>
      </div>
    </div>
  );
}
