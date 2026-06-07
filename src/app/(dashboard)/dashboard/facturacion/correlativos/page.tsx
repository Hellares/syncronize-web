'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReporteCorrelativos, ResultadoSincronizacion } from '@/core/types/facturacion';
import { TIPO_COMPROBANTE_LABEL } from '@/core/types/facturacion';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import SincronizarSeriesDialog from '@/features/facturacion/components/SincronizarSeriesDialog';

const ESTADO_SERIE: Record<string, { label: string; text: string; bg: string }> = {
  OK: { label: 'OK', text: 'text-green-700', bg: 'bg-green-100' },
  GAPS: { label: 'Con saltos', text: 'text-amber-700', bg: 'bg-amber-100' },
  DESINCRONIZADO: { label: 'Desincronizado', text: 'text-red-700', bg: 'bg-red-100' },
};

export default function CorrelativosPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageInvoices || permissions.canManageSettings;
  const sedesActivas = sedes.filter(s => s.isActive);

  const [sedeId, setSedeId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reporte, setReporte] = useState<ReporteCorrelativos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');
  const [syncOpen, setSyncOpen] = useState(false);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await facturacionService.getReporteCorrelativos({
        sedeId: sedeId || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      setReporte(r);
    } catch {
      setError('No se pudo cargar el reporte de correlativos');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, fechaDesde, fechaHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const onSyncSuccess = (res: ResultadoSincronizacion) => {
    setSyncOpen(false);
    setAccionMsg(`Sincronización: ${res.aplicados} aplicadas, ${res.omitidos} omitidas${res.rechazados ? `, ${res.rechazados} rechazadas` : ''}`);
    setTimeout(() => setAccionMsg(''), 5000);
    cargar();
  };

  const r = reporte?.resumen;
  const sedeNombre = sedesActivas.find(s => s.id === sedeId)?.nombre;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Correlativos</h1>
          <p className="text-sm text-gray-500">Integridad de series: saltos, duplicados y desincronización con el proveedor</p>
        </div>
        {puedeGestionar && sedeId && (
          <button onClick={() => setSyncOpen(true)}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            ↻ Sincronizar series
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {sedesActivas.length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        {(fechaDesde || fechaHasta) && (
          <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50">✕ Limpiar</button>
        )}
        {!sedeId && puedeGestionar && (
          <span className="text-[11px] text-gray-400">Selecciona una sede para sincronizar sus series</span>
        )}
      </div>

      {/* Resumen */}
      {r && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: 'Series', val: r.totalSeries, color: 'text-gray-900' },
            { label: 'OK', val: r.seriesOk, color: 'text-green-600' },
            { label: 'Con saltos', val: r.seriesConGaps, color: 'text-amber-600' },
            { label: 'Desincronizadas', val: r.seriesDesincronizadas, color: 'text-red-600' },
            { label: 'Faltantes', val: r.totalFaltantes, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : !reporte || reporte.series.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🔢</p><p className="text-gray-400">Sin series para mostrar</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Serie</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Sede</th>
                <th className="px-4 py-2.5 text-right">Rango</th>
                <th className="px-4 py-2.5 text-right">Contador sede</th>
                <th className="px-4 py-2.5 text-right">Emitidos</th>
                <th className="px-4 py-2.5 text-right">Faltantes</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reporte.series.map(s => {
                const cfg = ESTADO_SERIE[s.estado] ?? { label: s.estado, text: 'text-gray-600', bg: 'bg-gray-100' };
                return (
                  <tr key={`${s.serie}-${s.sedeId ?? ''}`} className="hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs font-semibold text-gray-900">{s.serie}</p>
                      <p className="text-[10px] text-gray-400">{TIPO_COMPROBANTE_LABEL[s.tipoComprobante] ?? s.tipoComprobante}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{s.sedeNombre}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-600">
                      {s.totalEmitidos > 0 ? `${s.primerCorrelativo}–${s.ultimoCorrelativo}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-mono text-xs ${s.desincronizado ? 'font-bold text-red-600' : 'text-gray-700'}`}>{s.contadorSede}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-700">
                      {s.totalEmitidos}
                      {s.totalAnulados > 0 && <span className="text-[10px] text-gray-400"> ({s.totalAnulados} anul.)</span>}
                      {s.duplicados > 0 && <span className="ml-1 text-[10px] font-semibold text-red-500">{s.duplicados} dup.</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {s.totalFaltantes > 0 ? (
                        <span className="text-xs font-semibold text-red-600" title={s.faltantes.join(', ')}>{s.totalFaltantes}</span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {syncOpen && sedeId && (
        <SincronizarSeriesDialog isOpen sedeId={sedeId} sedeNombre={sedeNombre} onClose={() => setSyncOpen(false)} onSuccess={onSyncSuccess} />
      )}
    </div>
  );
}
