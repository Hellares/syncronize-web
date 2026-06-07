'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { CajaMonitorData } from '@/core/types/caja';
import { CATEGORIA_MOVIMIENTO_LABEL } from '@/core/types/caja';
import * as cajaService from '@/features/caja/services/caja-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

function fmtMoney(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHora(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export default function CajaMonitorPage() {
  const { sedes } = useEmpresa();
  const [data, setData] = useState<CajaMonitorData | null>(null);
  const [sedeId, setSedeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cajaService.getMonitor(sedeId || undefined);
      setData(res);
    } catch {
      setError('Error al cargar el monitor');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => {
    fetch();
    // Refresco suave cada 60s (monitor en vivo)
    const t = setInterval(fetch, 60000);
    return () => clearInterval(t);
  }, [fetch]);

  const r = data?.resumen;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/caja" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Monitor de Cajas</h1>
            <p className="text-sm text-gray-500">Cajas abiertas en tiempo real (refresco 60s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sedes.filter(s => s.isActive).length > 1 && (
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
              <option value="">Todas las sedes</option>
              {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          <button onClick={fetch} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" title="Recargar">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading && !data ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : !data ? null : (
        <>
          {/* Resumen global */}
          {r && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{r.totalCajasAbiertas}</p>
                <p className="text-[10px] text-gray-400">Cajas abiertas</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-green-600">+{fmtMoney(r.totalIngresos)}</p>
                <p className="text-[10px] text-gray-400">Ingresos</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-red-500">−{fmtMoney(r.totalEgresos)}</p>
                <p className="text-[10px] text-gray-400">Egresos</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{fmtMoney(r.totalSaldo)}</p>
                <p className="text-[10px] text-gray-400">Saldo total</p>
              </div>
              <div className="rounded-xl border border-[#437EFF]/30 bg-[#437EFF]/5 p-3 text-center">
                <p className="text-lg font-bold text-[#004A94]">{fmtMoney(r.totalSaldoEfectivo)}</p>
                <p className="text-[10px] text-gray-400">Efectivo total</p>
              </div>
            </div>
          )}

          {/* Cajas */}
          {data.cajas.length === 0 ? (
            <div className="py-16 text-center"><p className="text-4xl mb-2">💤</p><p className="text-gray-400">No hay cajas abiertas</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.cajas.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.usuarioNombre ?? 'Cajero'}</p>
                      <p className="text-[10px] text-gray-400">
                        <span className="font-mono">{c.codigo ?? c.id.slice(0, 8)}</span>
                        {c.sedeNombre ? ` · ${c.sedeNombre}` : ''} · abierta {fmtHora(c.fechaApertura)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">ABIERTA</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-green-600">+{fmtMoney(c.totalIngresos)}</p>
                      <p className="text-[9px] text-gray-400">Ingresos</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-500">−{fmtMoney(c.totalEgresos)}</p>
                      <p className="text-[9px] text-gray-400">Egresos</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#004A94]">{fmtMoney(c.saldoEfectivo)}</p>
                      <p className="text-[9px] text-gray-400">Efectivo</p>
                    </div>
                  </div>
                  {c.ultimoMovimiento && (
                    <p className="mt-2 truncate rounded-md bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
                      Último: {c.ultimoMovimiento.tipo === 'INGRESO' ? '+' : '−'}{fmtMoney(c.ultimoMovimiento.monto)}{' '}
                      {CATEGORIA_MOVIMIENTO_LABEL[c.ultimoMovimiento.categoria] ?? c.ultimoMovimiento.categoria} · {fmtHora(c.ultimoMovimiento.fechaMovimiento)}
                    </p>
                  )}
                  <p className="mt-1 text-right text-[10px] text-gray-400">{c.totalMovimientos} movimientos</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
