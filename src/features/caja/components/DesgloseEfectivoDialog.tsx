'use client';

import { useState, useMemo } from 'react';
import { DENOMINACIONES_PEN } from '@/core/types/caja';

interface Props {
  isOpen: boolean;
  /** Desglose previo (denominación → cantidad) para editar */
  initial?: Record<string, number> | null;
  /** Devuelve el desglose y su total (para autocompletar el conteo de EFECTIVO) */
  onConfirm: (desglose: Record<string, number>, total: number) => void;
  onClose: () => void;
}

/**
 * Contador de billetes/monedas (paridad desglose_efectivo_sheet Flutter).
 * La suma autocompleta el conteo físico de EFECTIVO; el backend valida
 * que cuadre con tolerancia de 1 centavo.
 */
export default function DesgloseEfectivoDialog({ isOpen, initial, onConfirm, onClose }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const d of DENOMINACIONES_PEN) base[String(d)] = initial?.[String(d)] ?? 0;
    return base;
  });

  const total = useMemo(
    () => DENOMINACIONES_PEN.reduce((acc, d) => acc + d * (cantidades[String(d)] || 0), 0),
    [cantidades],
  );

  if (!isOpen) return null;

  const setCant = (denom: number, value: string) => {
    const n = Math.max(0, parseInt(value) || 0);
    setCantidades(prev => ({ ...prev, [String(denom)]: n }));
  };

  const confirmar = () => {
    // Solo denominaciones con cantidad > 0 (mismo shape que Flutter serializa)
    const limpio: Record<string, number> = {};
    for (const d of DENOMINACIONES_PEN) {
      const c = cantidades[String(d)] || 0;
      if (c > 0) limpio[String(d)] = c;
    }
    onConfirm(limpio, Number(total.toFixed(2)));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Contar billetes y monedas</h3>
        <p className="mt-0.5 text-xs text-gray-500">La suma autocompleta el conteo de EFECTIVO.</p>

        <div className="mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {DENOMINACIONES_PEN.map(d => (
            <div key={d} className="flex items-center gap-2">
              <span className={`w-20 shrink-0 rounded px-2 py-1 text-center text-xs font-bold ${d >= 10 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                S/ {d >= 1 ? d : d.toFixed(2)}
              </span>
              <span className="text-xs text-gray-400">×</span>
              <input
                type="number" min={0} step={1}
                value={cantidades[String(d)] || ''}
                onChange={e => setCant(d, e.target.value)}
                placeholder="0"
                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-[#437EFF]"
              />
              <span className="ml-auto text-xs font-medium text-gray-600">
                {(d * (cantidades[String(d)] || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <span className="text-sm font-semibold text-gray-700">Total contado</span>
          <span className="text-lg font-bold text-[#004A94]">S/ {total.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={confirmar} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">
            Usar S/ {total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
