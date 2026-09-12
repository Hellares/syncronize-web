'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import type { Lote } from '@/core/types/lote';
import { diasParaVencer, formatearDiaCalendario, nombreDeLote } from '@/core/types/lote';
import { darDeBajaLote } from '@/features/compras/services/lote-service';

const INPUT =
  'h-[30px] w-full rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200';

interface Props {
  empresaId: string;
  lote: Lote;
  onClose: () => void;
  onHecho: () => void;
}

/**
 * Sacar un lote del inventario.
 *
 * 🔴 Es la salida del bloqueo por CADUCIDAD: la venta lo frena sin
 * autorización posible y, como FEFO pone lo vencido primero en la fila, ese
 * lote traba TODAS las ventas de ese producto hasta que se dé de baja.
 *
 * Arranca con la cantidad completa porque el caso normal es "venció, se tira
 * todo"; se puede bajar si solo se rompió una parte.
 */
export default function BajaLoteDialog({ empresaId, lote, onClose, onHecho }: Props) {
  const dias = diasParaVencer(lote.fechaVencimiento);
  const vencido = dias != null && dias < 0;

  const [cantidad, setCantidad] = useState(String(lote.cantidadActual));
  const [motivo, setMotivo] = useState(
    vencido ? `Vencido el ${formatearDiaCalendario(lote.fechaVencimiento)}, se descartó` : '',
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const n = Number(cantidad);
  const valido = n > 0 && n <= lote.cantidadActual && motivo.trim().length > 0;

  const confirmar = async () => {
    if (!valido) return;
    setGuardando(true);
    setError('');
    try {
      await darDeBajaLote(empresaId, lote.id, { cantidad: n, motivo: motivo.trim() });
      onHecho();
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo dar de baja');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-red-700">Dar de baja el lote</h3>
        <p className="mt-1 truncate text-xs text-gray-600">
          <span className="font-medium">{nombreDeLote(lote)}</span>
          <span className="font-mono text-[11px] text-gray-400"> · {lote.codigo}</span>
        </p>

        <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600">
          Quedan <b>{lote.cantidadActual}</b> de {lote.cantidadInicial} · costo S/{' '}
          {Number(lote.precioCosto).toFixed(2)} c/u
          {vencido && (
            <span className="mt-1 block font-medium text-red-700">
              Venció hace {-dias!} día{-dias! === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-medium text-gray-600">Cuántas dar de baja</span>
          <input type="number" min={1} max={lote.cantidadActual} className={INPUT}
            value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>

        <label className="mt-2 block">
          <span className="mb-1 block text-[11px] font-medium text-gray-600">Por qué</span>
          <input className={INPUT} value={motivo} autoFocus
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Vencido, roto, se perdió…" />
        </label>

        <p className="mt-2 text-[10px] text-gray-500">
          Sale del stock y del lote a la vez, y queda un movimiento de baja con
          tu nombre. No se puede deshacer.
        </p>

        {error && <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!valido || guardando}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400">
            {guardando ? 'Dando de baja…' : `Dar de baja ${n > 0 ? n : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
