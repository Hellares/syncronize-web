'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { VentaAnalyticsDashboard, AnalyticsProductoRow, PeriodoAgrupacion } from '@/core/types/venta-analytics';
import { CANAL_LABEL, TIPO_ENTREGA_LABEL } from '@/core/types/venta-analytics';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as ventaService from '@/features/venta/services/venta-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

// Paleta validada CVD del sprint de analytics — el color sigue a la ENTIDAD
// (canal / tipo de entrega), nunca a su posición en la lista.
const AZUL = '#1976D2';
const NARANJA = '#EF6C00';
const TEAL = '#009688';
const PURPURA = '#AB47BC';
const COLOR_CANAL: Record<string, string> = { POS: AZUL, ONLINE: NARANJA, WHATSAPP_IA: PURPURA, COTIZACION: TEAL };
const COLOR_ENTREGA: Record<string, string> = { ENVIO: AZUL, DELIVERY: NARANJA, RECOJO: TEAL, FISICA: PURPURA };

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Atajos de periodo */
function rangoAtajo(atajo: string): { desde: string; hasta: string } {
  const hoy = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  switch (atajo) {
    case 'hoy': return { desde: d(hoy), hasta: d(hoy) };
    case 'semana': { const s = new Date(hoy); s.setDate(s.getDate() - s.getDay() + 1); return { desde: d(s), hasta: d(hoy) }; }
    case 'mes': return { desde: d(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: d(hoy) };
    case '3meses': return { desde: d(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), hasta: d(hoy) };
    default: return { desde: '', hasta: '' };
  }
}

function BarRow({ label, value, max, monto, color = AZUL, esMonto = false }: {
  label: string; value: number; max: number; monto?: number; color?: string; esMonto?: boolean;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="group flex items-center gap-2 py-0.5" title={`${label}: ${esMonto ? fmt(value) : value}${monto !== undefined ? ` · ${fmt(monto)}` : ''}`}>
      <span className="w-36 shrink-0 truncate text-xs text-gray-600">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-r bg-gray-50">
        <div className="h-full rounded-r transition-all group-hover:opacity-80" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-semibold text-gray-800">{esMonto ? fmt(value).replace('S/ ', '') : value}</span>
      {monto !== undefined && <span className="w-20 shrink-0 text-right text-[10px] text-gray-400">{fmt(monto)}</span>}
    </div>
  );
}

function Tile({ label, value, sub, alerta, positivo }: { label: string; value: string; sub?: string; alerta?: boolean; positivo?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${alerta ? 'text-red-700' : positivo ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

/** Ranking de productos con desglose de variantes expandible (details nativo) */
function ProductosRanking({ titulo, items, nota }: { titulo: string; items: AnalyticsProductoRow[]; nota?: string }) {
  const max = Math.max(1, ...items.map(p => p.ingresoTotal));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800">{titulo}</p>
      {nota && <p className="mb-1 text-[10px] text-gray-400">{nota}</p>}
      {items.length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin datos</p> : (
        <div className="mt-1 space-y-0.5">
          {items.map(p => (
            <details key={p.productoId} className={p.variantes.length ? '' : 'pointer-events-none'}>
              <summary className={`list-none rounded px-1 py-0.5 ${p.variantes.length ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                <div className="flex items-center gap-2" title={`${p.nombre} · ${p.cantidadVendida} und · margen ${fmt(p.margenTotal)} (${p.margenPorcentaje}%)`}>
                  <span className="w-40 shrink-0 truncate text-xs text-gray-600">
                    {p.variantes.length > 0 && <span className="mr-0.5 text-gray-300">▸</span>}{p.nombre}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-r bg-gray-50">
                    <div className="h-full rounded-r" style={{ width: `${Math.max(2, (p.ingresoTotal / max) * 100)}%`, backgroundColor: AZUL }} />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-800">{p.cantidadVendida}</span>
                  <span className="w-20 shrink-0 text-right text-[10px] text-gray-400">{fmt(p.ingresoTotal)}</span>
                </div>
                <p className="pl-1 text-[9px] text-gray-400">M: {fmt(p.margenTotal)} · {p.margenPorcentaje}%{p.categoria !== 'Sin categoria' ? ` · ${p.categoria}` : ''}</p>
              </summary>
              {p.variantes.length > 0 && (
                <div className="mb-1 ml-6 space-y-0.5 border-l-2 border-gray-100 pl-2">
                  {p.variantes.map(v => (
                    <div key={v.varianteId ?? 'BASE'} className="flex justify-between text-[10px] text-gray-500">
                      <span className="truncate">{v.nombre}</span>
                      <span className="shrink-0">{v.cantidadVendida} und · {fmt(v.ingresoTotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VentaAnalyticsPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const [data, setData] = useState<VentaAnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [fechaDesde, setFechaDesde] = useState(() => rangoAtajo('mes').desde);
  const [fechaHasta, setFechaHasta] = useState(() => rangoAtajo('mes').hasta);
  const [atajo, setAtajo] = useState('mes');
  const [sedeId, setSedeId] = useState('');
  const [canal, setCanal] = useState('');
  const [periodo, setPeriodo] = useState<PeriodoAgrupacion>('DIARIO');

  const fetch = useCallback(async () => {
    setError('');
    setRefreshing(true);
    try {
      setData(await ventaService.getAnalyticsDashboard({
        fechaInicio: fechaDesde || undefined,
        fechaFin: fechaHasta || undefined,
        sedeId: sedeId || undefined,
        canalVenta: canal || undefined,
        periodo,
      }));
    } catch {
      setError('Error al cargar las estadísticas');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fechaDesde, fechaHasta, sedeId, canal, periodo]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [fechaDesde, fechaHasta, sedeId, canal, periodo]);

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
        <Link href="/dashboard/ventas" className="mt-2 inline-block text-sm text-[#437EFF]">← Ventas</Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  const r = data?.resumen;
  const comp = data?.comparativo;
  const proy = data?.proyeccion;
  const maxPeriodo = Math.max(1, ...(data?.ventasPeriodo ?? []).map(p => p.total));
  const maxCanal = Math.max(1, ...(data?.porCanal.porCanal ?? []).map(c => c.monto));
  const maxEntrega = Math.max(1, ...(data?.entregas.porTipoEntrega ?? []).map(t => t.cantidad));
  const maxPago = Math.max(1, ...(data?.metodosPago ?? []).map(m => m.monto));
  const maxHora = Math.max(1, ...(data?.horasPico.porHora ?? []).map(h => h.cantidad));
  const maxDia = Math.max(1, ...(data?.horasPico.porDiaSemana ?? []).map(d => d.cantidad));
  const maxCat = Math.max(1, ...(data?.porCategoria ?? []).map(c => c.ingresoTotal));
  const maxMarca = Math.max(1, ...(data?.porMarca ?? []).map(m => m.ingresoTotal));
  const maxProv = Math.max(1, ...(data?.porProveedor ?? []).map(p => p.ingresoTotal));
  const maxEmisor = Math.max(1, ...(data?.porEmisor.emisores ?? []).map(e => e.monto));
  const horaPico = (data?.horasPico.porHora ?? []).reduce((a, b) => (b.cantidad > a.cantidad ? b : a), { hora: 0, cantidad: 0, monto: 0 });
  const diaPico = (data?.horasPico.porDiaSemana ?? []).reduce((a, b) => (b.cantidad > a.cantidad ? b : a), { dia: 1, cantidad: 0, monto: 0 });
  const criticos = (data?.reposicion ?? []).filter(x => x.nivel === 'CRITICO').length;

  return (
    <div className="space-y-4">
      {refreshing && <div className="h-0.5 w-full overflow-hidden rounded bg-gray-100"><div className="h-full w-1/3 animate-pulse rounded bg-[#437EFF]" /></div>}

      {/* Header + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/dashboard/ventas" className="text-sm text-gray-500 hover:text-[#004A94]">← Ventas</Link>
          <h1 className="text-xl font-bold text-gray-900">📊 Estadísticas de Ventas</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Este mes'], ['3meses', '3 meses'], ['', 'Todo']].map(([k, lbl]) => (
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
      <div className="flex flex-wrap items-center gap-2">
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={canal} onChange={e => setCanal(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]">
          <option value="">Todos los canales</option>
          {Object.entries(CANAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={periodo} onChange={e => setPeriodo(e.target.value as PeriodoAgrupacion)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]">
          <option value="DIARIO">Serie diaria</option>
          <option value="SEMANAL">Serie semanal</option>
          <option value="MENSUAL">Serie mensual</option>
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Alertas */}
      {(data?.alertas ?? []).map(a => (
        <div key={a.tipo} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-700">⚠ {a.mensaje}</p>
        </div>
      ))}

      {/* KPIs */}
      {r && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Tile label="Ventas" value={String(r.totalVentas)} sub={`${r.ventasPagadasCompleta} pagadas`} />
          <Tile label="Monto total" value={fmt(r.montoTotal)} sub={`ticket prom. ${fmt(r.ticketPromedio)}`} />
          <Tile label="Utilidad bruta" value={fmt(r.utilidadBruta)} sub={`margen ${r.margenPorcentaje}%`} positivo={r.utilidadBruta > 0} />
          <Tile label="Anuladas" value={String(r.ventasAnuladas)} sub={r.montoAnulado > 0 ? `${fmt(r.montoAnulado)} (no suman)` : 'no suman al total'} alerta={r.ventasAnuladas > 0} />
          <Tile label="Devoluciones" value={String(r.devoluciones)} sub={`${r.itemsDevueltos} items`} alerta={r.devoluciones > 0} />
          <Tile label="Borradores" value={String(r.ventasBorrador)} />
        </div>
      )}

      {/* Comparativo + proyección */}
      <div className="grid gap-4 lg:grid-cols-2">
        {comp && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">Comparativo vs periodo anterior</p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase text-gray-400">Anterior ({comp.periodoAnterior.totalVentas} ventas)</p>
                <p className="text-base font-bold text-gray-500">{fmt(comp.periodoAnterior.montoTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Actual ({comp.periodoActual.totalVentas} ventas)</p>
                <p className="text-base font-bold text-gray-900">{fmt(comp.periodoActual.montoTotal)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${comp.porcentajeCambio >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {comp.porcentajeCambio >= 0 ? '▲' : '▼'} {Math.abs(comp.porcentajeCambio)}%
              </span>
            </div>
          </div>
        )}
        {proy && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">Proyección del mes</p>
            {!proy.suficiente ? (
              <p className="text-xs text-gray-400">Historia insuficiente ({proy.diasHistoria} días) — va {fmt(proy.ventasActual)} en el mes.</p>
            ) : (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Va (día {proy.diasTranscurridos}/{proy.diasEnMes})</p>
                  <p className="text-base font-bold text-gray-900">{fmt(proy.ventasActual)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Cierre estimado</p>
                  <p className="text-base font-bold" style={{ color: AZUL }}>{fmt(proy.proyeccionCierre)}</p>
                  <p className="text-[10px] text-gray-400">{fmt(proy.proyeccionMin)} – {fmt(proy.proyeccionMax)}</p>
                </div>
                {proy.variacionPct != null && (
                  <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${proy.variacionPct >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                    title={`Mes anterior: ${fmt(proy.mesAnterior)}`}>
                    {proy.variacionPct >= 0 ? '▲' : '▼'} {Math.abs(proy.variacionPct)}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Serie por periodo */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Ventas por periodo</p>
          {(data?.ventasPeriodo ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin ventas en el periodo</p> :
            data!.ventasPeriodo.slice(-20).map(p => (
              <BarRow key={p.periodo} label={p.periodo} value={p.total} max={maxPeriodo} esMonto monto={undefined}
                color={AZUL} />
            ))}
        </div>

        {/* Por canal + entregas */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Por canal de venta</p>
          {(data?.porCanal.porCanal ?? []).map(c => (
            <BarRow key={c.canal} label={CANAL_LABEL[c.canal] ?? c.canal} value={c.monto} max={maxCanal} esMonto
              color={COLOR_CANAL[c.canal] ?? AZUL} />
          ))}
          <p className="mb-1 mt-3 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-700">Tipo de entrega</p>
          {(data?.entregas.porTipoEntrega ?? []).map(t => (
            <BarRow key={t.tipo} label={TIPO_ENTREGA_LABEL[t.tipo] ?? t.tipo} value={t.cantidad} max={maxEntrega}
              monto={t.monto} color={COLOR_ENTREGA[t.tipo] ?? AZUL} />
          ))}
        </div>

        {/* Métodos de pago */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Métodos de pago (lo cobrado)</p>
          {(data?.metodosPago ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin pagos en el periodo</p> :
            data!.metodosPago.map(m => (
              <BarRow key={m.metodo} label={`${METODO_PAGO_LABEL[m.metodo as keyof typeof METODO_PAGO_LABEL] ?? m.metodo} (${m.cantidad})`}
                value={m.monto} max={maxPago} esMonto color={AZUL} />
            ))}
          <p className="mt-1 text-[9px] text-gray-400">Pago mixto suma a cada método; crédito aparece al cobrarse.</p>
        </div>

        {/* Horas pico */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-gray-800">Horas pico</p>
          <p className="mb-2 text-[10px] text-gray-400">
            Pico: <strong className="text-gray-600">{String(horaPico.hora).padStart(2, '0')}:00</strong> · <strong className="text-gray-600">{DIAS_SEMANA[diaPico.dia - 1]}</strong> (hora Perú)
          </p>
          <div className="flex h-20 items-end gap-[2px]">
            {(data?.horasPico.porHora ?? []).map(h => (
              <div key={h.hora} className="group relative flex-1 rounded-t"
                title={`${String(h.hora).padStart(2, '0')}:00 — ${h.cantidad} ventas · ${fmt(h.monto)}`}
                style={{ height: `${Math.max(2, (h.cantidad / maxHora) * 100)}%`, backgroundColor: h.hora === horaPico.hora ? AZUL : '#BBDEFB' }} />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-[8px] text-gray-400"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>
          <div className="mt-2 space-y-0.5">
            {(data?.horasPico.porDiaSemana ?? []).map(d => (
              <BarRow key={d.dia} label={DIAS_SEMANA[d.dia - 1]} value={d.cantidad} max={maxDia} monto={d.monto}
                color={d.dia === diaPico.dia ? AZUL : '#BBDEFB'} />
            ))}
          </div>
        </div>

        {/* Rankings productos */}
        <ProductosRanking titulo="Productos más vendidos" items={data?.topProductos ?? []}
          nota="▸ = con desglose por variante (clic para abrir) · M = margen" />
        <ProductosRanking titulo="Productos menos vendidos" items={data?.menosVendidos ?? []}
          nota="Solo productos con al menos una venta en el periodo" />

        {/* Top clientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Top clientes</p>
          {(data?.topClientes ?? []).length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Sin datos</p> : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] uppercase text-gray-400">
                  <th className="py-1.5">Cliente</th>
                  <th className="py-1.5 text-right">Compras</th>
                  <th className="py-1.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data!.topClientes.map((c, i) => (
                  <tr key={c.clienteId ?? c.nombre}>
                    <td className="py-1.5 text-gray-700">{i + 1}. {c.nombre}</td>
                    <td className="py-1.5 text-right text-gray-600">{c.totalCompras}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-800">{fmt(c.montoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Zonas de entrega */}
        {((data?.entregas.zonasEnvio ?? []).length > 0 || (data?.entregas.zonasDelivery ?? []).length > 0) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">Zonas de entrega</p>
            {(data?.entregas.zonasEnvio ?? []).length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase text-gray-400">🚚 Envíos por destino</p>
                {data!.entregas.zonasEnvio.map(z => (
                  <div key={z.zona} className="flex justify-between py-0.5 text-xs text-gray-600">
                    <span className="truncate">{z.zona}</span><span className="shrink-0">{z.cantidad} · {fmt(z.monto)}</span>
                  </div>
                ))}
              </>
            )}
            {(data?.entregas.zonasDelivery ?? []).length > 0 && (
              <>
                <p className="mt-2 text-[10px] font-semibold uppercase text-gray-400">🛵 Delivery por distrito</p>
                {data!.entregas.zonasDelivery.map(z => (
                  <div key={z.zona} className="flex justify-between py-0.5 text-xs text-gray-600">
                    <span className="truncate">{z.zona}</span><span className="shrink-0">{z.cantidad} · {fmt(z.monto)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Por categoría / marca / proveedor */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Por categoría</p>
          {(data?.porCategoria ?? []).slice(0, 10).map(c => (
            <BarRow key={c.categoriaId ?? 'SIN'} label={c.categoria} value={c.ingresoTotal} max={maxCat} esMonto color={AZUL} />
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Por marca</p>
          {(data?.porMarca ?? []).slice(0, 10).map(m => (
            <BarRow key={m.marcaId ?? 'SIN'} label={m.marca} value={m.ingresoTotal} max={maxMarca} esMonto color={AZUL} />
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Por proveedor</p>
          <p className="mb-1 text-[9px] text-gray-400">Atribuido al proveedor preferido del producto (marca el preferido para afinar).</p>
          {(data?.porProveedor ?? []).slice(0, 10).map(p => (
            <BarRow key={p.proveedorId ?? 'SIN'} label={p.proveedor} value={p.ingresoTotal} max={maxProv} esMonto color={AZUL} />
          ))}
        </div>
      </div>

      {/* Ventas por emisor (multi-RUC) */}
      {data?.porEmisor.multiEmisor && (
        <div className="rounded-xl border border-teal-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-teal-700">Ventas por emisor (RUC)</p>
          {data.porEmisor.emisores.map(e => (
            <Link key={e.ruc} href={`/dashboard/ventas`} className="block hover:bg-teal-50/50 rounded" title={`${e.ruc} — ver ventas`}>
              <BarRow label={`${e.razonSocial}${e.esPrincipal ? ' ★' : ''}`} value={e.monto} max={maxEmisor} esMonto color={TEAL} />
            </Link>
          ))}
          {data.porEmisor.sinComprobante.ventas > 0 && (
            <p className="mt-1 text-[10px] text-gray-400">
              Ticket sin comprobante: {data.porEmisor.sinComprobante.ventas} ventas · {fmt(data.porEmisor.sinComprobante.monto)}
            </p>
          )}
        </div>
      )}

      {/* Reposición sugerida */}
      {(data?.reposicion ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">Reposición sugerida</p>
            {criticos > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{criticos} críticos</span>}
          </div>
          <p className="mb-2 text-[10px] text-gray-400">Velocidad de venta de los últimos 30 días vs stock actual (por variante) — independiente del periodo del dashboard.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] uppercase text-gray-400">
                  <th className="py-1.5">Producto</th>
                  <th className="py-1.5 text-right">Venta/día</th>
                  <th className="py-1.5 text-right">Stock</th>
                  <th className="py-1.5 text-right">Cobertura</th>
                  <th className="py-1.5 text-right">Comprar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data!.reposicion.map(x => {
                  const agota = x.diasCobertura <= 30
                    ? new Date(Date.now() + x.diasCobertura * 86400000).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
                    : null;
                  return (
                    <tr key={x.varianteId ?? x.productoId}>
                      <td className="py-1.5 text-gray-700">
                        <span className={`mr-1 rounded px-1 text-[9px] font-bold ${x.nivel === 'CRITICO' ? 'bg-red-100 text-red-700' : x.nivel === 'BAJO' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{x.nivel}</span>
                        {x.nombre}
                      </td>
                      <td className="py-1.5 text-right text-gray-600">{x.ventaDiaria}</td>
                      <td className="py-1.5 text-right text-gray-600">{x.stockActual}</td>
                      <td className="py-1.5 text-right text-gray-600">{x.diasCobertura} d{agota ? ` (se agota ~${agota})` : ''}</td>
                      <td className="py-1.5 text-right font-bold text-gray-800">{x.sugeridoComprar > 0 ? x.sugeridoComprar : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
