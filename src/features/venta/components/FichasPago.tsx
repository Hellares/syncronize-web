'use client';

import { useId, useState } from 'react';

/**
 * Rejilla de pagos del cobro: una ficha por método, de a dos. Mismo diseño que
 * el app (Venta Rápida → cobro): Efectivo, Yape y Plin fijas, los agregados
 * (tarjeta, transferencia) con su ✕ y al final "Otro método".
 *
 * Cada ficha ES el pago: el monto se escribe en ella (teclado o numpad) y se
 * corrige ahí mismo. Sin borde: fondo suave del color del método, que también
 * pinta el monto. Yape y Plin llevan el N° de operación al lado del logo; los
 * demás, debajo de la rejilla junto con el banco.
 */

export interface FichaPagoState {
  id: string;
  metodo: string;
  monto: string;
  referencia: string;
  banco: string;
  /** Efectivo, Yape, Plin: siempre visibles, sin ✕. */
  fija: boolean;
}

export const METODOS_OTROS = [
  { metodo: 'TARJETA', label: 'Tarjeta' },
  { metodo: 'TRANSFERENCIA', label: 'Transferencia' },
] as const;

/** Los que llevan el N° op. dentro de la ficha (tienen logo y lugar). */
const REF_EN_FICHA = ['YAPE', 'PLIN'];

const ESTILO: Record<string, { color: string; intensidad?: number; logo?: string; label: string }> = {
  // El verde satura más que el morado o el azul: su fondo va más suave.
  EFECTIVO: { color: '#088A24', intensidad: 0.75, label: 'Efectivo' },
  YAPE: { color: '#9117A0', logo: '/img/pagos/yape.svg', label: 'Yape' },
  // Algo más oscuro que el celeste del logo, para que el número se lea.
  PLIN: { color: '#1F6FD9', logo: '/img/pagos/plin.svg', label: 'Plin' },
  TARJETA: { color: '#1c2430', label: 'Tarjeta' },
  TRANSFERENCIA: { color: '#1c2430', label: 'Transferencia' },
};

export function nombreMetodo(metodo: string): string {
  return ESTILO[metodo]?.label ?? metodo;
}

export function montoDeFicha(f: FichaPagoState): number {
  const n = parseFloat(f.monto.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const inputClass =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

interface Props {
  fichas: FichaPagoState[];
  activa: string;
  /** El numpad está a la vista: los campos no abren el teclado del sistema. */
  numpadVisible: boolean;
  onActivar: (id: string) => void;
  onCambiar: (id: string, cambio: Partial<FichaPagoState>) => void;
  onQuitar: (id: string) => void;
  onAgregar: (metodo: string) => void;
}

export default function FichasPago({ fichas, activa, numpadVisible, onActivar, onCambiar, onQuitar, onAgregar }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const conDetalleAbajo = fichas.filter(f => !REF_EN_FICHA.includes(f.metodo) && f.metodo !== 'EFECTIVO' && montoDeFicha(f) > 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {fichas.map(f => (
          <Ficha
            key={f.id}
            ficha={f}
            seleccionada={f.id === activa}
            numpadVisible={numpadVisible}
            onActivar={() => onActivar(f.id)}
            onCambiar={cambio => onCambiar(f.id, cambio)}
            onQuitar={f.fija ? undefined : () => onQuitar(f.id)}
          />
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto(v => !v)}
            onBlur={() => setTimeout(() => setMenuAbierto(false), 150)}
            className="flex h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-[6px] border-[0.5px] border-[#81B3E6] text-xs font-semibold text-[#004A94] transition-colors hover:bg-[#004A94]/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Otro método
          </button>
          {menuAbierto && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[6px] bg-white shadow-lg ring-1 ring-blue-400/40">
              {METODOS_OTROS.map(m => (
                <button
                  key={m.metodo}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setMenuAbierto(false); onAgregar(m.metodo); }}
                  className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50"
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta / transferencia con monto: N° op. y banco (obligatorio). */}
      {conDetalleAbajo.map(f => (
        <div key={f.id} className="grid grid-cols-[80px_1fr_1fr] items-center gap-1.5">
          <span className="truncate text-[11px] font-medium text-gray-600">{nombreMetodo(f.metodo)}</span>
          <input className={inputClass} value={f.referencia} placeholder="N° operación"
            aria-label={`N° de operación ${nombreMetodo(f.metodo)}`}
            onChange={e => onCambiar(f.id, { referencia: e.target.value })} />
          <input className={inputClass} value={f.banco} placeholder="Banco *"
            aria-label={`Banco ${nombreMetodo(f.metodo)}`}
            onChange={e => onCambiar(f.id, { banco: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

function Ficha({ ficha, seleccionada, numpadVisible, onActivar, onCambiar, onQuitar }: {
  ficha: FichaPagoState;
  seleccionada: boolean;
  numpadVisible: boolean;
  onActivar: () => void;
  onCambiar: (cambio: Partial<FichaPagoState>) => void;
  onQuitar?: () => void;
}) {
  const montoId = useId();
  const estilo = ESTILO[ficha.metodo] ?? { color: '#1c2430', label: ficha.metodo };
  const alpha = (seleccionada ? 0.16 : 0.07) * (estilo.intensidad ?? 1);
  const conRef = REF_EN_FICHA.includes(ficha.metodo) && montoDeFicha(ficha) > 0;

  return (
    // `htmlFor` y no un label que envuelve a secas: con el N° op. antes que el
    // monto, el label le daría el foco al N° op. al tocar el fondo.
    <label
      htmlFor={montoId}
      onMouseDown={onActivar}
      className="flex h-[68px] cursor-text flex-col justify-between rounded-[6px] px-2.5 pb-1 pt-1.5 transition-colors"
      style={{ background: rgba(estilo.color, alpha) }}
    >
      <span className="flex h-[26px] items-center gap-2">
        {estilo.logo ? (
          <img src={estilo.logo} alt={estilo.label} className={ficha.metodo === 'YAPE' ? 'h-[26px] w-auto' : 'h-[22px] w-auto'} />
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold" style={{ color: estilo.color }}>
            <IconoMetodo metodo={ficha.metodo} />
            <span className="truncate">{estilo.label}</span>
          </span>
        )}
        {conRef && (
          <span className="flex h-6 min-w-0 flex-1 items-center gap-1 rounded-[6px] bg-white px-1.5">
            <span className="text-[10px] text-gray-500">Op.</span>
            <input
              value={ficha.referencia}
              onChange={e => onCambiar({ referencia: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              onMouseDown={e => e.stopPropagation()}
              placeholder="000"
              inputMode="numeric"
              aria-label={`N° de operación ${estilo.label}`}
              className="min-w-0 flex-1 bg-transparent text-right text-xs font-semibold tracking-wide text-gray-900 outline-none"
            />
          </span>
        )}
        {onQuitar && (
          <button type="button" onClick={e => { e.preventDefault(); onQuitar(); }}
            aria-label={`Quitar ${estilo.label}`}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </span>
      <span className="flex items-center gap-1">
        <span className="text-xs text-gray-400">S/</span>
        {/* 🔴 `type="text"`: con `number` varios navegadores móviles ignoran
            `inputMode` y abren su teclado aunque el numpad esté a la vista. */}
        <input
          id={montoId}
          type="text"
          value={ficha.monto}
          inputMode={numpadVisible ? 'none' : 'decimal'}
          onFocus={onActivar}
          onChange={e => onCambiar({ monto: e.target.value.replace(/[^\d.]/g, '') })}
          placeholder="0.00"
          aria-label={`Monto ${estilo.label}`}
          className="min-w-0 flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-gray-300"
          style={{ color: estilo.color, caretColor: estilo.color }}
        />
      </span>
    </label>
  );
}

function IconoMetodo({ metodo }: { metodo: string }) {
  const comun = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const };
  if (metodo === 'EFECTIVO') {
    return <svg {...comun}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>;
  }
  if (metodo === 'TARJETA') {
    return <svg {...comun}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>;
  }
  return <svg {...comun}><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" /></svg>;
}
