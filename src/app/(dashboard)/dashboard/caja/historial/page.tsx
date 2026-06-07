'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { Caja, CierreCaja } from '@/core/types/caja';
import { DIFERENCIA_THRESHOLD } from '@/core/types/caja';
import * as cajaService from '@/features/caja/services/caja-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

function fmtMoney(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function HistorialCajaPage() {
  const { sedes } = useEmpresa();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cajaService.getHistorial({
        sedeId: sedeId || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      setCajas(data);
    } catch {
      setError('Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, fechaDesde, fechaHasta]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/caja" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial de Cajas</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${cajas.length} cajas`}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]" />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : cajas.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">📂</p><p className="text-gray-400">Sin cajas en el historial</p></div>
      ) : (
        <div className="space-y-2">
          {cajas.map((c) => {
            const cierre = (c as { cierre?: CierreCaja }).cierre;
            const dif = cierre?.diferencia;
            const cuadre = dif != null && Math.abs(dif) < DIFERENCIA_THRESHOLD;
            return (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">{c.codigo ?? c.id.slice(0, 8)}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.estado === 'ABIERTA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.estado}
                      </span>
                      {cierre && (
                        cuadre
                          ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">✓ Cuadre exacto</span>
                          : dif != null && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${dif > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {dif > 0 ? 'Sobró' : 'Faltó'} {fmtMoney(Math.abs(dif))}
                            </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {(c as { sedeNombre?: string }).sedeNombre ?? c.sede?.nombre ?? ''}
                      {(c as { usuarioNombre?: string }).usuarioNombre ? ` · ${(c as { usuarioNombre?: string }).usuarioNombre}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {fmtFecha(c.fechaApertura)} → {fmtFecha(c.fechaCierre)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="text-gray-400">Apertura {fmtMoney(c.montoApertura)}</p>
                    {cierre && (
                      <>
                        <p className="text-gray-600">Esperado <strong>{fmtMoney(cierre.totalEsperado)}</strong></p>
                        <p className="text-gray-600">Contado <strong>{fmtMoney(cierre.totalConteoFisico)}</strong></p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
