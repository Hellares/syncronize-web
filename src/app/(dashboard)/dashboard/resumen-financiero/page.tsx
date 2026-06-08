'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { ResumenFinanciero, PuntoGraficoDiario } from '@/core/types/reportes';
import * as reportesService from '@/features/reportes/services/reportes-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function inicioMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hoy(): string { return new Date().toISOString().slice(0, 10); }
function fechaPunto(p: PuntoGraficoDiario): string {
  const v = p.fecha ?? p.date ?? '';
  return v ? new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : '';
}

export default function ResumenFinancieroPage() {
  const permissions = usePermissions();
  const [fechaDesde, setFechaDesde] = useState(inicioMes());
  const [fechaHasta, setFechaHasta] = useState(hoy());

  const [data, setData] = useState<ResumenFinanciero | null>(null);
  const [grafico, setGrafico] = useState<PuntoGraficoDiario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState('');

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [r, g] = await Promise.all([
        reportesService.getResumenFinanciero({ fechaDesde, fechaHasta }),
        reportesService.getGraficoDiario({ fechaDesde, fechaHasta }),
      ]);
      setData(r); setGrafico(g);
    } catch {
      setError('Error al cargar el resumen financiero');
    } finally {
      setIsLoading(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const exportar = async (key: string, fn: () => Promise<void>) => {
    setExportBusy(key);
    setExportMsg('');
    try { await fn(); setExportMsg('Archivo descargado'); setTimeout(() => setExportMsg(''), 3000); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(typeof msg === 'string' ? msg : 'No se pudo generar el archivo');
    } finally { setExportBusy(null); }
  };

  const maxGrafico = Math.max(1, ...grafico.map(p => Math.max(Number(p.ingresos ?? 0), Number(p.egresos ?? 0))));
  const r = data?.resumen;
  const utilidadPos = (r?.flujoNeto ?? 0) >= 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Resumen Financiero</h1>
        <p className="text-sm text-gray-500">Ingresos, egresos y flujo neto del periodo</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        <span className="text-gray-400">→</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {exportMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{exportMsg}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : (
        <>
          {/* KPIs */}
          {r && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xl font-bold text-green-700">{fmt(r.totalIngresos)}</p>
                <p className="text-xs text-gray-500">Ingresos</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xl font-bold text-red-700">{fmt(r.totalEgresos)}</p>
                <p className="text-xs text-gray-500">Egresos</p>
              </div>
              <div className={`rounded-xl border p-4 ${utilidadPos ? 'border-[#437EFF]/30 bg-[#437EFF]/5' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`text-xl font-bold ${utilidadPos ? 'text-[#004A94]' : 'text-amber-700'}`}>{fmt(r.flujoNeto)}</p>
                <p className="text-xs text-gray-500">Flujo neto (utilidad)</p>
              </div>
            </div>
          )}

          {/* Gráfico diario */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-gray-400">Ingresos vs egresos por día</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Egresos</span>
              </div>
            </div>
            {grafico.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Sin movimientos en el rango</p>
            ) : (
              <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: 180 }}>
                {grafico.map((p, i) => (
                  <div key={i} className="flex min-w-[20px] flex-1 flex-col items-center justify-end gap-1" title={`${fechaPunto(p)} · +${fmt(p.ingresos)} / −${fmt(p.egresos)}`}>
                    <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 140 }}>
                      <div className="w-1/2 rounded-t bg-green-500/80" style={{ height: `${Math.max(1, (Number(p.ingresos ?? 0) / maxGrafico) * 140)}px` }} />
                      <div className="w-1/2 rounded-t bg-red-500/80" style={{ height: `${Math.max(1, (Number(p.egresos ?? 0) / maxGrafico) * 140)}px` }} />
                    </div>
                    <span className="text-[8px] text-gray-400">{fechaPunto(p)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desglose ventas / compras */}
          {data && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Ventas ({data.ventas.cantidad})</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Total ventas</span><span>{fmt(data.ventas.totalVentas)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Cobrado</span><span>{fmt(data.ventas.totalCobrado)}</span></div>
                  <div className="flex justify-between text-amber-600"><span>Pendiente de cobro</span><span>{fmt(data.ventas.pendienteCobro)}</span></div>
                  <div className="flex justify-between text-[11px] text-gray-400"><span>Contado / crédito</span><span>{data.ventas.ventasContado ?? 0} / {data.ventas.ventasCredito ?? 0}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Compras ({data.compras.cantidad})</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Total compras</span><span>{fmt(data.compras.totalCompras)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Pagado</span><span>{fmt(data.compras.totalPagado)}</span></div>
                  <div className="flex justify-between text-amber-600"><span>Pendiente de pago</span><span>{fmt(data.compras.pendientePago)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Exports */}
          {permissions.canViewReports && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Exportar a Excel</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <select value={mes} onChange={e => setMes(Number(e.target.value))} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#437EFF]">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                  </select>
                  <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-[#437EFF]" />
                  <button onClick={() => exportar('libro', () => reportesService.exportLibroContable(mes, anio))} disabled={exportBusy !== null}
                    className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">
                    {exportBusy === 'libro' ? '...' : 'Libro contable'}
                  </button>
                </div>
                <button onClick={() => exportar('cobrar', reportesService.exportCuentasCobrar)} disabled={exportBusy !== null}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {exportBusy === 'cobrar' ? '...' : 'Cuentas por cobrar'}
                </button>
                <button onClick={() => exportar('pagar', reportesService.exportCuentasPagar)} disabled={exportBusy !== null}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {exportBusy === 'pagar' ? '...' : 'Cuentas por pagar'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
