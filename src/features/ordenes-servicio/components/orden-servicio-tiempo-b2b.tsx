'use client';

// Cronómetro de tiempo (total + por estado) y panel B2B/tercerización de la orden.
// Paridad con cronometro_servicio_calculator + vista B2B de Flutter.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { OrdenServicio, HistorialOS, EstadoOrdenServicio, TercerizacionRef } from '@/core/types/orden-servicio';
import { ESTADO_OS_CONFIG, ESTADO_TERCERIZACION_CONFIG } from '@/core/types/orden-servicio';
import { CARD_BASE } from '@/components/ui/Card';

const TERMINALES: EstadoOrdenServicio[] = ['FINALIZADO', 'CANCELADO'];

function fmtDur(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtFechaCorta(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Cronómetro: tiempo total + desglose por estado (recorriendo el historial). */
export function TiempoServicioCard({ orden, historial }: { orden: OrdenServicio; historial: HistorialOS[] }) {
  const esTerminal = TERMINALES.includes(orden.estado);
  // "Ahora" se calcula tras montar (Date.now es impuro en render) y refresca cada minuto → cronómetro en vivo.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (esTerminal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [esTerminal]);

  const inicio = new Date(orden.creadoEn).getTime();
  const fin = esTerminal && orden.actualizadoEn
    ? new Date(orden.actualizadoEn).getTime()
    : (now ?? inicio);
  const totalMs = fin - inicio;

  // Desglose por estado
  const orden_hist = [...historial].sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
  const tiempos: Record<string, number> = {};
  let prevTime = inicio;
  let prevEstado: string = 'RECIBIDO';
  for (const h of orden_hist) {
    const t = new Date(h.creadoEn).getTime();
    tiempos[prevEstado] = (tiempos[prevEstado] ?? 0) + Math.max(0, t - prevTime);
    prevEstado = h.estadoNuevo;
    prevTime = t;
  }
  tiempos[prevEstado] = (tiempos[prevEstado] ?? 0) + Math.max(0, fin - prevTime);
  const desglose = Object.entries(tiempos).filter(([, ms]) => ms > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`${CARD_BASE} p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-gray-400">Tiempo en taller</p>
        <span className="text-sm font-bold text-[#004A94]">{fmtDur(totalMs)}{esTerminal ? '' : ' ⏱'}</span>
      </div>
      {desglose.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {desglose.map(([estado, ms]) => {
            const cfg = ESTADO_OS_CONFIG[estado as EstadoOrdenServicio];
            return (
              <span key={estado} className={`rounded px-1.5 py-0.5 text-[10px] ${cfg?.text ?? 'text-gray-600'} ${cfg?.bg ?? 'bg-gray-100'}`}>
                {cfg?.label ?? estado}: {fmtDur(ms)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TercerizacionBloque({ t, rol }: { t: TercerizacionRef; rol: 'enviada' | 'recibida' }) {
  // Enviada: la empresa partner es empresaDestino (quien ejecuta). Recibida: empresaOrigen (quien envió).
  const partner = rol === 'enviada' ? t.empresaDestino : t.empresaOrigen;
  const cfg = ESTADO_TERCERIZACION_CONFIG[t.estado];
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-purple-800">
          {rol === 'enviada' ? '📤 Tercerizada a' : '📥 Recibida de'} {partner?.nombre ?? '—'}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg?.text} ${cfg?.bg}`}>{cfg?.label ?? t.estado}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
        {partner?.telefono && <p>Tel: {partner.telefono}</p>}
        {(t.precioB2B ?? 0) > 0 && <p>Precio B2B: S/ {Number(t.precioB2B).toFixed(2)}{t.metodoPagoB2B ? ` · ${t.metodoPagoB2B}` : ''}</p>}
        <p>Solicitud: {fmtFechaCorta(t.fechaSolicitud)}{t.fechaRespuesta ? ` · Respuesta: ${fmtFechaCorta(t.fechaRespuesta)}` : ''}</p>
        {t.notasOrigen && <p>Notas origen: {t.notasOrigen}</p>}
        {t.notasDestino && <p>Notas destino: {t.notasDestino}</p>}
        {t.motivoRechazo && <p className="text-red-600">Motivo rechazo: {t.motivoRechazo}</p>}
      </div>
      <Link href={`/dashboard/tercerizacion/${t.id}`} className="mt-2 inline-block text-[11px] font-semibold text-purple-700 hover:underline">
        Ver detalle (bitácora, pago, hoja de derivación) →
      </Link>
    </div>
  );
}

/** Panel de tercerización (si la orden está vinculada a un flujo B2B). */
export function TercerizacionCard({ orden }: { orden: OrdenServicio }) {
  const enviada = orden.tercerizacionOrigen;
  const recibida = orden.tercerizacionDestino;
  if (!enviada && !recibida) return null;
  return (
    <div className={`${CARD_BASE} p-4`}>
      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Tercerización B2B</p>
      <div className="space-y-2">
        {enviada && <TercerizacionBloque t={enviada} rol="enviada" />}
        {recibida && <TercerizacionBloque t={recibida} rol="recibida" />}
      </div>
    </div>
  );
}
