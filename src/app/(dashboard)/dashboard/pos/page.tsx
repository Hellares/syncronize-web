'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ColaPOSItem } from '@/core/types/cotizacion';
import { ESTADO_COTIZACION_CONFIG } from '@/core/types/cotizacion';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

function tiempoEspera(creadoEn: string): string {
  const mins = Math.floor((Date.now() - new Date(creadoEn).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas} h ${mins % 60} min`;
  return `${Math.floor(horas / 24)} día(s)`;
}

export default function ColaPOSPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState(defaultSede?.id ?? '');
  const [items, setItems] = useState<ColaPOSItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cotizacionService.getColaPOS(sedeId || undefined);
      setItems(data);
    } catch {
      setError('Error al cargar la cola POS');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cola POS</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${items.length} cotizaciones por cobrar`}</p>
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

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">🧾</p>
          <p className="text-gray-400">No hay cotizaciones en cola</p>
          <p className="mt-1 text-xs text-gray-400">Las cotizaciones PENDIENTES y APROBADAS aparecen aquí para su cobro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const cfg = ESTADO_COTIZACION_CONFIG[c.estado];
            const reservado = (c as ColaPOSItem & { tieneReservaActiva?: boolean }).tieneReservaActiva;
            const esPendiente = c.estado === 'PENDIENTE';
            return (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                <button onClick={() => router.push(`/dashboard/cotizaciones/${c.id}`)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-gray-400">{c.codigo}</p>
                      <p className="font-semibold text-gray-900 truncate">{c.nombreCliente || 'Sin cliente'}</p>
                      <p className="text-[10px] text-gray-400">{c.vendedor}{c.sede ? ` · ${c.sede}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-gray-900">{c.moneda === 'USD' ? '$' : 'S/'} {Number(c.total).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">{c.totalItems} item{c.totalItems !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg?.color ?? 'text-gray-600'} ${cfg?.bg ?? 'bg-gray-100'}`}>
                        {cfg?.label ?? c.estado}
                      </span>
                      {reservado && (
                        <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">🔖 Reservado</span>
                      )}
                    </div>
                    <span className="text-[10px] text-amber-600">⏱ {tiempoEspera(c.creadoEn)}</span>
                  </div>
                </button>
                {/* Botón cobrar (paridad cola_pos Flutter: ámbar PENDIENTE, azul APROBADA) */}
                <button onClick={() => router.push(`/dashboard/pos/cobrar/${c.id}`)}
                  className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-bold text-white ${esPendiente ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#004A94] hover:bg-[#003570]'}`}>
                  {esPendiente ? '⚡ Aprobar y Cobrar' : '💵 Cobrar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
