'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Caja, ResumenCaja, CierreCaja, MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL, DIFERENCIA_THRESHOLD } from '@/core/types/caja';
import * as cajaService from '@/features/caja/services/caja-service';

const inputClass = "w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

function fmtMoney(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CerrarCajaPage() {
  const router = useRouter();
  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [conteos, setConteos] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cierreResult, setCierreResult] = useState<CierreCaja | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await cajaService.getCajaActiva().catch(() => null);
        if (!c?.id) { setError('No tienes una caja abierta'); setIsLoading(false); return; }
        setCaja(c);
        const r = await cajaService.getResumen(c.id);
        setResumen(r);
        // Inicializa conteos vacíos por método con saldo (incluye EFECTIVO siempre)
        const init: Record<string, string> = {};
        const metodos = new Set<string>(['EFECTIVO', ...(r.detalles ?? []).map(d => d.metodoPago)]);
        metodos.forEach(m => { init[m] = ''; });
        setConteos(init);
      } catch {
        setError('Error al cargar la caja');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Esperado por método = saldo del detalle TAL CUAL: el backend YA suma la
  // apertura al EFECTIVO (caja.service getResumen línea ~1049). Sumarla aquí
  // otra vez duplicaba la apertura (bug CAJA-00000063: esperado 330 vs 280).
  const esperadoPorMetodo = useCallback((metodo: string): number => {
    const det = resumen?.detalles?.find(d => d.metodoPago === metodo);
    return Number(det?.saldo ?? 0);
  }, [resumen]);

  const filas = useMemo(() => Object.keys(conteos).map(metodo => {
    const esperado = esperadoPorMetodo(metodo);
    const valor = conteos[metodo];
    // Campo vacío = 0 (paridad Flutter: no obliga a tipear 0 en cada método)
    const conteo = valor === '' ? 0 : (parseFloat(valor) || 0);
    const diferencia = conteo - esperado;
    // Threshold floating-point del fix histórico: |dif| < 0.005 = cuadre exacto
    const hayDiferencia = Math.abs(diferencia) >= DIFERENCIA_THRESHOLD;
    const tocado = valor !== '';
    return { metodo, esperado, conteo, diferencia, hayDiferencia, tocado };
  }), [conteos, esperadoPorMetodo]);

  const hayDiscrepancias = filas.some(f => f.hayDiferencia);
  const diferenciTotal = filas.reduce((acc, f) => acc + (f.diferencia ?? 0), 0);

  const handleCerrar = async () => {
    if (!caja) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await cajaService.cerrarCaja(caja.id, {
        conteos: filas.map(f => ({ metodoPago: f.metodo as MetodoPagoVenta, conteoFisico: f.conteo })),
        observaciones: observaciones.trim() || undefined,
      });
      setCierreResult(res.cierre ?? null);
      setShowConfirm(false);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al cerrar la caja');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  // --- Resultado del cierre ---
  if (cierreResult || (!caja && !error)) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-5xl">✅</p>
        <h1 className="text-xl font-bold text-gray-900">Caja cerrada</h1>
        {cierreResult && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-left space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Esperado</span><span className="font-medium">{fmtMoney(cierreResult.totalEsperado)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Conteo físico</span><span className="font-medium">{fmtMoney(cierreResult.totalConteoFisico)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1">
              <span className="font-semibold text-gray-700">Diferencia</span>
              <span className={`font-bold ${Math.abs(cierreResult.diferencia) < DIFERENCIA_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(cierreResult.diferencia) < DIFERENCIA_THRESHOLD ? 'Cuadre exacto ✓' : fmtMoney(cierreResult.diferencia)}
              </span>
            </div>
          </div>
        )}
        <button onClick={() => router.push('/dashboard/caja')}
          className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570]">
          Volver a Caja
        </button>
      </div>
    );
  }

  if (error && !caja) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">{error}</p>
        <Link href="/dashboard/caja" className="mt-2 inline-block text-sm text-[#437EFF]">← Volver a Caja</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/caja" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cerrar Caja</h1>
          <p className="text-sm text-gray-500">Cuenta el dinero físico por método y compáralo con lo esperado</p>
        </div>
      </div>

      {/* Resumen del sistema */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] uppercase text-gray-400">Apertura</p>
            <p className="text-base font-bold text-gray-900">{fmtMoney(caja?.montoApertura)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] uppercase text-gray-400">Ingresos − Egresos</p>
            <p className="text-base font-bold text-gray-900">{fmtMoney(resumen.saldo)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[10px] uppercase text-gray-400">Efectivo esperado</p>
            <p className="text-base font-bold text-[#004A94]">{fmtMoney(resumen.saldoEfectivo)}</p>
          </div>
        </div>
      )}

      {/* Conteos por método */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-800">Conteo físico por método</p>
        </div>
        <div className="divide-y divide-gray-50">
          {filas.map(({ metodo, esperado, diferencia, hayDiferencia, conteo }) => (
            <div key={metodo} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{METODO_PAGO_LABEL[metodo] ?? metodo}</p>
                <p className="text-xs text-gray-400">Esperado: {fmtMoney(esperado)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Badge solo si tipeó algo o hay diferencia (vacío = 0) */}
                {(filas.find(f => f.metodo === metodo)?.tocado || hayDiferencia) && (
                  hayDiferencia ? (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${(diferencia ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {(diferencia ?? 0) > 0 ? 'Sobra' : 'Falta'} {fmtMoney(Math.abs(diferencia ?? 0))}
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">✓ Cuadra</span>
                  )
                )}
                <input className={inputClass} type="number" step="0.01" min="0" value={conteos[metodo]}
                  onChange={e => setConteos(prev => ({ ...prev, [metodo]: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones del cierre</label>
        <textarea
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[60px]"
          value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      <button onClick={() => setShowConfirm(true)} disabled={isSubmitting}
        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
        Cerrar Caja
      </button>
      <p className="text-center text-[10px] text-gray-400">Los métodos sin conteo se registran como 0.</p>

      {/* Confirmación (pre-check conforme/diferencias, paridad Flutter) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            {hayDiscrepancias ? (
              <>
                <h3 className="text-sm font-semibold text-red-700">⚠ Se detectaron diferencias</h3>
                <div className="mt-2 space-y-1">
                  {filas.filter(f => f.hayDiferencia).map(f => (
                    <p key={f.metodo} className="text-xs text-gray-600">
                      {METODO_PAGO_LABEL[f.metodo] ?? f.metodo}: {(f.diferencia ?? 0) > 0 ? 'sobra' : 'falta'} <strong>{fmtMoney(Math.abs(f.diferencia ?? 0))}</strong>
                    </p>
                  ))}
                  <p className="pt-1 text-xs font-semibold text-gray-800">
                    Diferencia total: {fmtMoney(diferenciTotal)}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">La diferencia quedará registrada en el cierre para auditoría.</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-green-700">✓ Conteo conforme</h3>
                <p className="mt-2 text-xs text-gray-600">Todos los métodos cuadran con lo esperado. ¿Cerrar la caja?</p>
              </>
            )}
            <p className="mt-2 text-[11px] text-amber-600">Después del cierre no podrás registrar más movimientos ni cobrar con esta caja.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleCerrar} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Cerrando...' : hayDiscrepancias ? 'Cerrar igual' : 'Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
