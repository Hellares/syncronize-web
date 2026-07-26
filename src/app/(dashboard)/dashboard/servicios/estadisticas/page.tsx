'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { DashboardOS } from '@/core/types/orden-servicio';
import { ESTADO_OS_CONFIG, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_CONFIG } from '@/core/types/orden-servicio';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

// Paleta del sprint de analytics (validada CVD): azul = serie única,
// naranja = tercerizaciones ENVIADAS, teal = RECIBIDAS. Roles fijos.
const AZUL = '#1976D2';
const NARANJA = '#EF6C00';
const TEAL = '#009688';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${nombres[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

function fmtHoras(h: number | null): string {
  if (h == null) return '—';
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} días`;
}

/** Atajos de periodo (paridad dashboard Flutter) */
function rangoAtajo(atajo: string): { desde: string; hasta: string } {
  const hoy = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  switch (atajo) {
    case 'mes': return { desde: d(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: d(hoy) };
    case '3meses': return { desde: d(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), hasta: d(hoy) };
    case 'anio': return { desde: d(new Date(hoy.getFullYear(), 0, 1)), hasta: d(hoy) };
    default: return { desde: '', hasta: '' };
  }
}

/** Barra horizontal de serie única: la magnitud la lleva el largo, el texto va en tinta. */
function BarRow({ label, value, max, detail, color = AZUL, title }: {
  label: string; value: number; max: number; detail?: string; color?: string; title?: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="group flex items-center gap-2 py-0.5" title={title ?? `${label}: ${value}`}>
      <span className="w-36 shrink-0 truncate text-xs text-gray-600">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-r bg-gray-50">
        <div className="h-full rounded-r transition-all group-hover:opacity-80" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-gray-800">{value}</span>
      {detail !== undefined && <span className="w-24 shrink-0 text-right text-[10px] text-gray-400">{detail}</span>}
    </div>
  );
}

function Tile({ label, value, sub, alerta }: { label: string; value: string; sub?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${alerta ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function EstadisticasOSPage() {
  const permissions = usePermissions();

  const [data, setData] = useState<DashboardOS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [atajo, setAtajo] = useState('');

  const fetch = useCallback(async () => {
    setError('');
    setRefreshing(true);
    try {
      setData(await osService.getDashboardEstadisticas({
        fechaDesde: fechaDesde ? new Date(`${fechaDesde}T00:00:00`).toISOString() : undefined,
        fechaHasta: fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).toISOString() : undefined,
      }));
    } catch {
      setError('Error al cargar las estadísticas');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fechaDesde, fechaHasta]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [fechaDesde, fechaHasta]);

  const aplicarAtajo = (a: string) => {
    setAtajo(a);
    const { desde, hasta } = rangoAtajo(a);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  if (!permissions.canViewStatistics) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">No tienes permiso para ver estadísticas.</p>
        <Link href="/dashboard/servicios" className="mt-2 inline-block text-sm text-[#437EFF]">← Órdenes de servicio</Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  const r = data?.resumen;
  const maxEstado = Math.max(1, ...(data?.porEstado ?? []).map(e => e.cantidad));
  const maxTipo = Math.max(1, ...(data?.porTipo ?? []).map(t => t.cantidad));
  const maxMes = Math.max(1, ...(data?.porMes ?? []).map(m => m.cantidad));
  const maxEquipo = Math.max(1, ...(data?.topEquipos ?? []).map(e => e.cantidad));
  const terce = data?.tercerizaciones;
  const hayTerce = (terce?.enviadas.total ?? 0) > 0 || (terce?.recibidas.total ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Barra de recarga suave (paridad refreshing Flutter) */}
      {refreshing && <div className="h-0.5 w-full overflow-hidden rounded bg-gray-100"><div className="h-full w-1/3 animate-pulse rounded bg-[#437EFF]" /></div>}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/dashboard/servicios" className="text-sm text-gray-500 hover:text-[#004A94]">← Órdenes de servicio</Link>
          <h1 className="text-xl font-bold text-gray-900">📊 Estadísticas de Servicio Técnico</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[['', 'Todo'], ['mes', 'Este mes'], ['3meses', '3 meses'], ['anio', 'Este año']].map(([k, lbl]) => (
            <button key={k} onClick={() => aplicarAtajo(k)}
              className={`rounded-full border px-3 py-1 text-xs ${atajo === k ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
          <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setAtajo('x'); }}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#437EFF]" />
          <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setAtajo('x'); }}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#437EFF]" />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* KPIs */}
      {r && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Órdenes" value={String(r.totalOrdenes)} sub={`${r.enTaller} en taller`} />
          <Tile label="Entregadas" value={String(r.entregadas)} sub={r.canceladas > 0 ? `${r.canceladas} canceladas` : undefined} />
          <Tile label="Vencidas" value={String(r.vencidas)} sub="activas con fecha pasada" alerta={r.vencidas > 0} />
          <Tile label="Ingreso" value={fmt(r.ingresoTotal)} sub="órdenes cerradas con éxito" />
          <Tile label="Por cobrar" value={fmt(r.porCobrar)} sub={`adelantos ${fmt(r.adelantosCobrados)}`} />
          <Tile label="Reingresos" value={String(r.reingresos)} sub={`${r.reingresosPct}% del total`} alerta={r.reingresosPct > 10} />
          <Tile label="T. resolución" value={fmtHoras(r.tiempoPromedioResolucionHoras)} sub="promedio de cierre" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Embudo de estados */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Embudo de estados</p>
          {(data?.porEstado ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin órdenes en el periodo</p> :
            data!.porEstado.map(e => (
              <BarRow key={e.estado} label={ESTADO_OS_CONFIG[e.estado]?.label ?? e.estado} value={e.cantidad} max={maxEstado} />
            ))}
        </div>

        {/* Por tipo de servicio */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Por tipo de servicio</p>
          {(data?.porTipo ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin datos</p> :
            data!.porTipo.map(t => (
              <BarRow key={t.tipo} label={TIPO_SERVICIO_LABEL[t.tipo] ?? t.tipo} value={t.cantidad} max={maxTipo}
                detail={t.ingreso > 0 ? fmt(t.ingreso) : ''} title={`${TIPO_SERVICIO_LABEL[t.tipo] ?? t.tipo}: ${t.cantidad} órdenes · ${fmt(t.ingreso)}`} />
            ))}
          {/* Prioridades como chips de estado (colores reservados del sistema) */}
          {(data?.porPrioridad ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
              {data!.porPrioridad.map(p => {
                const cfg = PRIORIDAD_CONFIG[p.prioridad];
                return (
                  <span key={p.prioridad} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg?.text ?? 'text-gray-600'} ${cfg?.bg ?? 'bg-gray-100'}`}>
                    {PRIORIDAD_LABEL[p.prioridad] ?? p.prioridad}: {p.cantidad}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Serie mensual */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Órdenes por mes</p>
          {(data?.porMes ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin datos</p> :
            data!.porMes.slice(-12).map(m => (
              <BarRow key={m.mes} label={fmtMes(m.mes)} value={m.cantidad} max={maxMes}
                detail={m.ingreso > 0 ? fmt(m.ingreso) : ''} title={`${fmtMes(m.mes)}: ${m.cantidad} órdenes · ingreso ${fmt(m.ingreso)}`} />
            ))}
        </div>

        {/* Top técnicos */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Top técnicos</p>
          {(data?.topTecnicos ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin órdenes con técnico asignado</p> : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] uppercase text-gray-400">
                  <th className="py-1.5">Técnico</th>
                  <th className="py-1.5 text-right">Órdenes</th>
                  <th className="py-1.5 text-right">Cerradas</th>
                  <th className="py-1.5 text-right">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data!.topTecnicos.map(t => (
                  <tr key={t.tecnicoId}>
                    <td className="py-1.5 text-gray-700">{t.nombre}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-800">{t.ordenes}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.cerradas}</td>
                    <td className="py-1.5 text-right text-gray-600">{fmt(t.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top equipos */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <p className="mb-2 text-sm font-semibold text-gray-800">Equipos más atendidos</p>
          {(data?.topEquipos ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin datos de equipos</p> :
            data!.topEquipos.map(e => (
              <BarRow key={e.equipo} label={e.equipo} value={e.cantidad} max={maxEquipo} />
            ))}
        </div>
      </div>

      {/* Tercerizaciones B2B */}
      {hayTerce && terce && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-gray-800">🤝 Tercerizaciones B2B</p>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Enviadas: yo tercerizo a otros talleres */}
            <div className="rounded-lg border p-3" style={{ borderColor: `${NARANJA}40` }}>
              <p className="text-xs font-bold" style={{ color: NARANJA }}>↗ Enviadas ({terce.enviadas.total})</p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Costo B2B (pago a talleres)</span><strong>{fmt(terce.enviadas.costoB2B)}</strong></div>
                <div className="flex justify-between"><span>Ganancia estimada</span>
                  <strong className={terce.enviadas.gananciaEstimada >= 0 ? 'text-green-700' : 'text-red-600'}>{fmt(terce.enviadas.gananciaEstimada)}</strong></div>
                <div className="flex justify-between"><span>Por pagar</span><strong className="text-amber-600">{fmt(terce.enviadas.porPagarB2B)}</strong></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {terce.enviadas.porEstado.map(e => (
                  <span key={e.estado} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-600">{e.estado}: {e.cantidad}</span>
                ))}
              </div>
            </div>
            {/* Recibidas: otros talleres me mandan */}
            <div className="rounded-lg border p-3" style={{ borderColor: `${TEAL}40` }}>
              <p className="text-xs font-bold" style={{ color: TEAL }}>↙ Recibidas ({terce.recibidas.total})</p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Ingreso B2B</span><strong>{fmt(terce.recibidas.ingresoB2B)}</strong></div>
                <div className="flex justify-between"><span>Por cobrar</span><strong className="text-amber-600">{fmt(terce.recibidas.porCobrarB2B)}</strong></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {terce.recibidas.porEstado.map(e => (
                  <span key={e.estado} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-600">{e.estado}: {e.cantidad}</span>
                ))}
              </div>
            </div>
            {/* Talleres aliados */}
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-bold text-gray-700">Talleres aliados</p>
              {terce.partners.length === 0 ? <p className="mt-2 text-[10px] text-gray-400">Sin partners</p> : (
                <div className="mt-2 space-y-1">
                  {terce.partners.map(p => (
                    <div key={p.nombre} className="flex justify-between text-xs text-gray-600">
                      <span className="truncate">{p.nombre}</span>
                      <span className="shrink-0 text-[10px] text-gray-400">↗{p.enviadas} · ↙{p.recibidas}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">Rechazadas y canceladas cuentan en estados pero quedan fuera del dinero.</p>
        </div>
      )}
    </div>
  );
}
