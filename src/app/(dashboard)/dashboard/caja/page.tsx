'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { Caja, ResumenCaja, MovimientoCaja } from '@/core/types/caja';
import { METODO_PAGO_LABEL, CATEGORIA_MOVIMIENTO_LABEL } from '@/core/types/caja';
import * as cajaService from '@/features/caja/services/caja-service';
import NuevoMovimientoDialog from '@/features/caja/components/NuevoMovimientoDialog';
import ArqueoDialog from '@/features/caja/components/ArqueoDialog';
import AnularMovimientoDialog from '@/features/caja/components/AnularMovimientoDialog';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

function fmtMoney(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHora(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

/** Grupo de movimientos: una venta multi-pago (MIXTO) = 1 card con chips por método.
 *  Paridad exacta con movimiento_grouping.dart de Flutter. */
interface MovimientoGroup {
  items: MovimientoCaja[];
}

function groupMovimientosByVenta(movs: MovimientoCaja[]): MovimientoGroup[] {
  if (!movs.length) return [];
  const counts: Record<string, number> = {};
  for (const m of movs) {
    if (m.ventaId) counts[m.ventaId] = (counts[m.ventaId] ?? 0) + 1;
  }
  const groups: MovimientoGroup[] = [];
  const pending: Record<string, MovimientoCaja[]> = {};
  const seen = new Set<string>();
  for (const m of movs) {
    const vid = m.ventaId;
    const agrupable = vid != null && (counts[vid] ?? 0) > 1;
    if (!agrupable) {
      groups.push({ items: [m] });
      continue;
    }
    (pending[vid!] ??= []).push(m);
    if (!seen.has(vid!)) {
      seen.add(vid!);
      groups.push({ items: pending[vid!] }); // misma referencia: se llena al acumular
    }
  }
  return groups;
}

export default function CajaPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [nuevoMovOpen, setNuevoMovOpen] = useState(false);
  const [arqueoOpen, setArqueoOpen] = useState(false);
  const [anularTarget, setAnularTarget] = useState<MovimientoCaja | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const c = await cajaService.getCajaActiva().catch((err) => {
        // 404 = sin caja abierta (comportamiento esperado del guard)
        if (err instanceof AxiosError && err.response?.status === 404) return null;
        throw err;
      });
      setCaja(c?.id ? c : null);
      if (c?.id) {
        const [r, movs] = await Promise.all([
          cajaService.getResumen(c.id).catch(() => null),
          cajaService.getMovimientos(c.id).catch(() => []),
        ]);
        setResumen(r);
        setMovimientos(movs);
      } else {
        setResumen(null);
        setMovimientos([]);
      }
    } catch {
      setError('Error al cargar la caja');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  if (isLoading && !caja) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Caja</h1>
          <p className="text-sm text-gray-500">
            {caja
              ? <>Caja <span className="font-mono">{caja.codigo ?? caja.id.slice(0, 8)}</span> · {caja.sede?.nombre ?? (caja as { sedeNombre?: string }).sedeNombre ?? ''} · abierta {fmtHora(caja.fechaApertura)}</>
              : 'No tienes una caja abierta'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canViewCaja && (
            <>
              <Link href="/dashboard/caja/historial" className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Historial</Link>
              <Link href="/dashboard/caja/monitor" className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Monitor</Link>
            </>
          )}
          {caja && permissions.canManageCaja && (
            <>
              <button onClick={() => setArqueoOpen(true)}
                className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5">
                Arqueo
              </button>
              <Link href="/dashboard/caja/cerrar"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                Cerrar Caja
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {info && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{info}</p></div>}

      {!caja ? (
        <AperturaForm
          sedes={sedes.filter(s => s.isActive).map(s => ({ id: s.id, nombre: s.nombre, esPrincipal: s.esPrincipal }))}
          canManage={permissions.canManageCaja}
          onOpened={() => { setInfo('Caja abierta correctamente — ya puedes cobrar ventas y cotizaciones'); reload(); }}
        />
      ) : (
        <>
          {/* Resumen */}
          {resumen && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] uppercase text-gray-400">Apertura</p>
                <p className="text-lg font-bold text-gray-900">{fmtMoney(caja.montoApertura)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] uppercase text-gray-400">Ingresos</p>
                <p className="text-lg font-bold text-green-600">+{fmtMoney(resumen.totalIngresos)}</p>
                {(resumen.egresoAnulacionVenta ?? 0) > 0 && (
                  <p className="text-[10px] text-red-400">(−{fmtMoney(resumen.egresoAnulacionVenta)} anulados)</p>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] uppercase text-gray-400">Egresos</p>
                <p className="text-lg font-bold text-red-500">−{fmtMoney(resumen.totalEgresos)}</p>
              </div>
              <div className="rounded-xl border border-[#437EFF]/30 bg-[#437EFF]/5 p-4">
                <p className="text-[10px] uppercase text-gray-400">Efectivo esperado</p>
                <p className="text-lg font-bold text-[#004A94]">{fmtMoney(resumen.saldoEfectivo)}</p>
                <p className="text-[10px] text-gray-400">Saldo total: {fmtMoney(resumen.saldo)}</p>
              </div>
            </div>
          )}

          {/* Desglose por método + categorías */}
          {resumen && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">Por método de pago</p>
                <div className="space-y-1">
                  {(resumen.detalles ?? []).map((d) => (
                    <div key={d.metodoPago} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-gray-700">{METODO_PAGO_LABEL[d.metodoPago] ?? d.metodoPago}</span>
                      <span className="text-gray-600">
                        <span className="text-green-600">+{fmtMoney(d.totalIngresos)}</span>
                        {' '}<span className="text-red-400">−{fmtMoney(d.totalEgresos)}</span>
                        {' = '}<strong className="text-gray-800">{fmtMoney(d.saldo)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">Egresos por categoría</p>
                {(resumen.egresosPorCategoria?.length ?? 0) === 0 ? (
                  <p className="text-xs text-gray-400">Sin egresos registrados</p>
                ) : (
                  <div className="space-y-1">
                    {resumen.egresosPorCategoria!.map((e, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                        <span className="text-gray-700">{e.label ?? CATEGORIA_MOVIMIENTO_LABEL[e.categoria] ?? e.categoria} <span className="text-gray-400">({e.cantidad})</span></span>
                        <span className="font-medium text-red-500">−{fmtMoney(e.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Movimientos */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Movimientos ({movimientos.length})</p>
              {permissions.canManageCaja && (
                <button onClick={() => setNuevoMovOpen(true)}
                  className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#003570]">
                  + Ingreso / Egreso
                </button>
              )}
            </div>
            {movimientos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Sin movimientos aún</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
                {groupMovimientosByVenta(movimientos).map((g) => g.items.length > 1 ? (
                  /* Venta multi-pago (MIXTO): 1 card con chips por método — paridad Flutter */
                  <div key={g.items[0].id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            {CATEGORIA_MOVIMIENTO_LABEL[g.items[0].categoria] ?? g.items[0].categoria}
                          </span>
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">MIXTO</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-700">
                          {g.items[0].descripcion ?? (g.items[0].ventaCodigo ? `Venta ${g.items[0].ventaCodigo}` : '')}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {g.items.map((m) => (
                            <span key={m.id} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                              {METODO_PAGO_LABEL[m.metodoPago] ?? m.metodoPago} {fmtMoney(m.monto)}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {fmtHora(g.items[0].fechaMovimiento)}{g.items[0].registradoPorNombre ? ` · ${g.items[0].registradoPorNombre}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${g.items[0].tipo === 'INGRESO' ? 'text-green-600' : 'text-red-500'}`}>
                        {g.items[0].tipo === 'INGRESO' ? '+' : '−'}{fmtMoney(g.items.reduce((s, m) => s + Number(m.monto), 0))}
                      </span>
                    </div>
                  </div>
                ) : (() => { const m = g.items[0]; return (
                  <div key={m.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${m.anulado ? 'opacity-50' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {CATEGORIA_MOVIMIENTO_LABEL[m.categoria] ?? m.categoria}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{METODO_PAGO_LABEL[m.metodoPago] ?? m.metodoPago}</span>
                        {m.ventaCodigo && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{m.ventaCodigo}</span>}
                        {m.ordenServicioCodigo && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">{m.ordenServicioCodigo}</span>}
                        {m.cotizacionCodigo && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{m.cotizacionCodigo}</span>}
                        {m.anulado && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">ANULADO</span>}
                      </div>
                      {m.descripcion && <p className="mt-0.5 truncate text-xs text-gray-500">{m.descripcion}</p>}
                      <p className="text-[10px] text-gray-400">
                        {fmtHora(m.fechaMovimiento)}{m.registradoPorNombre ? ` · ${m.registradoPorNombre}` : ''}
                        {m.anulado && m.motivoAnulacion ? ` · Motivo: ${m.motivoAnulacion}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-sm font-bold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-500'} ${m.anulado ? 'line-through' : ''}`}>
                        {m.tipo === 'INGRESO' ? '+' : '−'}{fmtMoney(m.monto)}
                      </span>
                      {permissions.canManageCaja && m.esManual && !m.anulado && (
                        <button onClick={() => setAnularTarget(m)} title="Anular movimiento"
                          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ); })())}
              </div>
            )}
          </div>

          {/* Dialogs */}
          <ArqueoDialog
            isOpen={arqueoOpen}
            cajaId={caja.id}
            resumen={resumen}
            onSuccess={() => { setArqueoOpen(false); setInfo('Arqueo registrado'); reload(); }}
            onClose={() => setArqueoOpen(false)}
          />
          <NuevoMovimientoDialog
            isOpen={nuevoMovOpen}
            cajaId={caja.id}
            onSuccess={() => { setNuevoMovOpen(false); reload(); }}
            onClose={() => setNuevoMovOpen(false)}
          />
          <AnularMovimientoDialog
            isOpen={!!anularTarget}
            cajaId={caja.id}
            movimiento={anularTarget}
            onSuccess={() => { setAnularTarget(null); reload(); }}
            onClose={() => setAnularTarget(null)}
          />
        </>
      )}
    </div>
  );
}

/* --- Apertura --- */
function AperturaForm({ sedes, canManage, onOpened }: {
  sedes: Array<{ id: string; nombre: string; esPrincipal?: boolean }>;
  canManage: boolean;
  onOpened: () => void;
}) {
  const [sedeId, setSedeId] = useState(sedes.find(s => s.esPrincipal)?.id ?? sedes[0]?.id ?? '');
  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAbrir = async () => {
    setError('');
    const m = parseFloat(monto);
    if (monto === '' || isNaN(m) || m < 0) { setError('Ingresa el monto de apertura (≥ 0)'); return; }
    if (!sedeId) { setError('Selecciona la sede'); return; }
    setIsSubmitting(true);
    try {
      await cajaService.abrirCaja({
        sedeId,
        montoApertura: m,
        observaciones: observaciones.trim() || undefined,
      });
      onOpened();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al abrir la caja');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-600 font-medium">No tienes permisos para abrir caja</p>
        <p className="mt-1 text-sm text-gray-400">Pide a tu administrador el permiso de caja.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6">
      <div className="text-center mb-4">
        <p className="text-4xl mb-2">💵</p>
        <h2 className="text-base font-bold text-gray-900">Abrir Caja</h2>
        <p className="text-xs text-gray-500">Necesitas una caja abierta para cobrar ventas y cotizaciones</p>
      </div>
      <div className="space-y-3">
        {sedes.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sede *</label>
            <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.esPrincipal ? ' (Principal)' : ''}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Monto de apertura (efectivo) *</label>
          <input className={inputClass} type="number" step="0.01" min="0" value={monto}
            onChange={e => setMonto(e.target.value)} placeholder="0.00" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones</label>
          <input className={inputClass} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={handleAbrir} disabled={isSubmitting}
          className="w-full rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
        </button>
      </div>
    </div>
  );
}
