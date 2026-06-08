'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ResumenVentas, VentaPeriodo, TopProducto, TopCliente, PeriodoAgrupacion, AnalyticsFiltros } from '@/core/types/reportes';
import * as reportesService from '@/features/reportes/services/reportes-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function inicioMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

const PERIODOS: PeriodoAgrupacion[] = ['DIARIO', 'SEMANAL', 'MENSUAL'];

export default function ReportesVentasPage() {
  const { sedes } = useEmpresa();
  const sedesActivas = sedes.filter(s => s.isActive);

  const [fechaInicio, setFechaInicio] = useState(inicioMes());
  const [fechaFin, setFechaFin] = useState(hoy());
  const [sedeId, setSedeId] = useState('');
  const [periodo, setPeriodo] = useState<PeriodoAgrupacion>('DIARIO');

  const [resumen, setResumen] = useState<ResumenVentas | null>(null);
  const [serie, setSerie] = useState<VentaPeriodo[]>([]);
  const [productos, setProductos] = useState<TopProducto[]>([]);
  const [clientes, setClientes] = useState<TopCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const f: AnalyticsFiltros = {
      sedeId: sedeId || undefined,
      fechaInicio: fechaInicio ? new Date(`${fechaInicio}T00:00:00`).toISOString() : undefined,
      fechaFin: fechaFin ? new Date(`${fechaFin}T23:59:59.999`).toISOString() : undefined,
      periodo,
    };
    try {
      const [r, s, p, c] = await Promise.all([
        reportesService.getResumenVentas(f),
        reportesService.getVentasPorPeriodo(f),
        reportesService.getTopProductos(f),
        reportesService.getTopClientes(f),
      ]);
      setResumen(r); setSerie(s); setProductos(p); setClientes(c);
    } catch {
      setError('Error al cargar los reportes de ventas');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, fechaInicio, fechaFin, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const maxSerie = Math.max(1, ...serie.map(s => s.total));
  const maxProd = Math.max(1, ...productos.map(p => p.ingresoTotal));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reportes de Ventas</h1>
        <p className="text-sm text-gray-500">Analítica del periodo seleccionado</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        <span className="text-gray-400">→</span>
        <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        {sedesActivas.length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={periodo} onChange={e => setPeriodo(e.target.value as PeriodoAgrupacion)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
          {PERIODOS.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : (
        <>
          {/* Cards resumen */}
          {resumen && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Monto total', val: fmt(resumen.montoTotal), color: 'text-[#004A94]' },
                { label: 'Ventas', val: String(resumen.totalVentas), color: 'text-gray-900' },
                { label: 'Ticket promedio', val: fmt(resumen.ticketPromedio), color: 'text-gray-900' },
                { label: 'Pagadas / borrador', val: `${resumen.ventasPagadasCompleta} / ${resumen.ventasBorrador}`, color: 'text-gray-900' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ventas por periodo (bar chart) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Ventas por periodo</p>
            {serie.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Sin ventas en el rango</p>
            ) : (
              <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 180 }}>
                {serie.map(s => (
                  <div key={s.periodo} className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1" title={`${s.periodo}: ${fmt(s.total)} (${s.cantidad})`}>
                    <span className="text-[8px] text-gray-400">{fmt(s.total).replace('S/ ', '')}</span>
                    <div className="w-full rounded-t bg-[#437EFF]/80" style={{ height: `${Math.max(2, (s.total / maxSerie) * 140)}px` }} />
                    <span className="max-w-[44px] truncate text-[8px] text-gray-500">{s.periodo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Top productos */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Top productos</p>
              {productos.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {productos.slice(0, 10).map((p, i) => (
                    <div key={p.productoId}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-gray-700">{i + 1}. {p.nombre}</span>
                        <span className="ml-2 shrink-0 font-semibold text-gray-900">{fmt(p.ingresoTotal)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#004A94]" style={{ width: `${(p.ingresoTotal / maxProd) * 100}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400">{p.cantidadVendida} uds · prom. {fmt(p.precioPromedio)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top clientes */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Top clientes</p>
              {clientes.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-1">
                  {clientes.slice(0, 10).map((c, i) => (
                    <div key={(c.clienteId ?? c.nombre) + i} className="flex items-center justify-between rounded-md px-1 py-1 text-xs hover:bg-gray-50">
                      <span className="truncate text-gray-700">{i + 1}. {c.nombre}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{c.totalCompras} compras</span>
                        <strong className="text-gray-900">{fmt(c.montoTotal)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
