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
import { TONOS, TARJETA_CIFRA_BASE, BLOQUE_STD, TITULO_BLOQUE, type Tono } from '@/components/ui/tonos';

/**
 * Una cifra del turno.
 *
 * 🔴 El color de la cifra viaja como custom property `--tono-cifra` y no como
 * clase: Tailwind no genera utilidades para un color que sale de un objeto en
 * tiempo de ejecución, así que `text-[${t.cifra}]` compilaría a nada y la
 * cifra saldría negra sin que el build dijera una palabra.
 */
function TarjetaCifra({ tono, titulo, icono, pie, children }: {
  tono: Tono;
  titulo: string;
  icono: React.ReactNode;
  /** La línea chica de abajo. Se omite cuando no hay nada que aclarar. */
  pie?: string;
  children: React.ReactNode;
}) {
  const t = TONOS[tono];
  return (
    <div className={`${TARJETA_CIFRA_BASE} p-3 ${t.fondo}`} style={{ '--tono-cifra': t.cifra } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-lg ${t.chip}`}>{icono}</span>
        {/* 🔴 Peso 500: a 11px Amazon Ember manda cualquier 600 a la cara Bold
            y se empasta. La jerarquía la hace el color de la cifra. */}
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{titulo}</span>
      </div>
      <p className="mt-2 text-[24px] font-bold leading-none tracking-tight text-[color:var(--tono-cifra,#111827)]">{children}</p>
      {pie && <p className="mt-1.5 text-[10px] leading-3 text-gray-500">{pie}</p>}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

function fmtMoney(n: number | undefined | null): string {
  return `S/ ${monto(n)}`;
}

/** El número pelado, sin moneda: para las columnas de una tabla, donde repetir
 *  "S/" en cada celda solo gasta ancho. */
function monto(n: number | undefined | null): string {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          <h1 className="text-lg font-medium text-gray-900">Mi caja</h1>
          <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
            {caja
              ? <>Caja <span className="font-mono">{caja.codigo ?? caja.id.slice(0, 8)}</span> · {caja.sede?.nombre ?? (caja as { sedeNombre?: string }).sedeNombre ?? ''} · abierta {fmtHora(caja.fechaApertura)}</>
              : 'No tienes una caja abierta'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canViewCaja && (
            <>
              <Link href="/dashboard/caja/historial" className="inline-flex h-[30px] items-center rounded-md border border-gray-200 px-3 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Historial</Link>
              <Link href="/dashboard/caja/monitor" className="inline-flex h-[30px] items-center rounded-md border border-gray-200 px-3 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Monitor</Link>
            </>
          )}
          {caja && permissions.canManageCaja && (
            <>
              <button onClick={() => setArqueoOpen(true)}
                className="inline-flex h-[30px] items-center rounded-md border border-[#437EFF] px-3 text-[10px] font-medium text-[#437EFF] hover:bg-[#437EFF]/5">
                Arqueo
              </button>
              <Link href="/dashboard/caja/cerrar"
                className="inline-flex h-[30px] items-center rounded-md bg-red-600 px-3 text-[10px] font-medium text-white hover:bg-red-700">
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
          {/* Las cuatro cifras del turno, con el mismo lenguaje que las del
              Dashboard: degradado del blanco al tono, chip de 26px y la cifra
              teñida de SU tono. El color sale de `TONOS`, la misma tabla que
              usa el Dashboard —así las dos pantallas no pueden quedar con
              paletas distintas—.

              Los tonos no son decorativos:
              · Apertura, NEUTRO. Es un dato del pasado; no se mueve en todo el
                turno y no tiene por qué competir.
              · Ingresos, VERDE, y Egresos, NARANJA. `TONOS` no trae rojo, y el
                naranja ya es el color de la pérdida en el resto de la web.
              · Efectivo esperado, AZUL de marca: es la única de las cuatro que
                decide algo —es la que se compara contra el cajón—.

              🔴 Y va ACÁ, fuera de la rama: un comentario JSX como primer hijo
              de un `&&` no es un hijo sino una segunda expresión, y el parser
              corta ahí con "')' expected". */}
          {resumen && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TarjetaCifra tono="neutro" titulo="Apertura" icono={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
              }>
                {fmtMoney(caja.montoApertura)}
              </TarjetaCifra>

              <TarjetaCifra tono="verde" titulo="Ingresos" icono={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
              } pie={(resumen.egresoAnulacionVenta ?? 0) > 0
                ? `−${fmtMoney(resumen.egresoAnulacionVenta)} de ventas anuladas, ya descontados`
                : undefined}>
                {fmtMoney(resumen.totalIngresos)}
              </TarjetaCifra>

              <TarjetaCifra tono="naranja" titulo="Egresos" icono={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
              }>
                {fmtMoney(resumen.totalEgresos)}
              </TarjetaCifra>

              <TarjetaCifra tono="azul" titulo="Efectivo esperado" icono={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
              } pie={`Saldo total ${fmtMoney(resumen.saldo)}`}>
                {fmtMoney(resumen.saldoEfectivo)}
              </TarjetaCifra>
            </div>
          )}

          {/* Desglose por método + categorías */}
          {resumen && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={`${BLOQUE_STD} px-4 pb-4 pt-[7px]`}>
                <h2 className={`${TITULO_BLOQUE} mb-1.5`}>Por método de pago</h2>
                {/* La cuenta a la vista: cada fila es ingresos − egresos = total,
                    y el encabezado dice qué se le está restando a qué. Antes eso
                    viajaba apretado en una sola línea por método, donde las
                    cifras de dos filas distintas no caían una debajo de la otra.

                    🔴 Sin "S/" por celda: `fmtMoney` lo antepone siempre y aquí
                    multiplicaría por doce el ancho gastado en decir tres veces
                    lo mismo. `tabular-nums` alinea las unidades en columna. */}
                <table className="w-full text-left text-[11px] tabular-nums">
                  <thead>
                    <tr className="border-b border-[#d1e5ff]">
                      <th className="py-1 font-medium text-gray-500">Método</th>
                      <th className="py-1 text-right font-medium text-green-700">Ingresos</th>
                      <th className="py-1 text-right font-medium text-orange-700">Egresos</th>
                      <th className="py-1 text-right font-medium text-[#004A94]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1e5ff]">
                    {(resumen.detalles ?? []).map((d) => (
                      <tr key={d.metodoPago}>
                        <td className="py-1 text-gray-700">{METODO_PAGO_LABEL[d.metodoPago] ?? d.metodoPago}</td>
                        <td className="py-1 text-right text-green-700">{monto(d.totalIngresos)}</td>
                        <td className="py-1 text-right text-orange-700">−{monto(d.totalEgresos)}</td>
                        <td className="py-1 text-right font-medium text-gray-900">{monto(d.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`${BLOQUE_STD} p-4`}>
                <h2 className={`${TITULO_BLOQUE} mb-2`}>Egresos por categoría</h2>
                {(resumen.egresosPorCategoria?.length ?? 0) === 0 ? (
                  <p className="text-xs text-gray-400">Sin egresos registrados</p>
                ) : (
                  <div className="space-y-1">
                    {resumen.egresosPorCategoria!.map((e, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                        <span className="text-gray-700">{e.label ?? CATEGORIA_MOVIMIENTO_LABEL[e.categoria] ?? e.categoria} <span className="text-gray-400">({e.cantidad})</span></span>
                        <span className="font-medium text-orange-700">−{fmtMoney(e.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Movimientos */}
          <div className={BLOQUE_STD}>
            <div className="flex items-center justify-between border-b border-[#d1e5ff] px-4 py-2.5">
              <h2 className={TITULO_BLOQUE}>Movimientos <span className="text-gray-500">({movimientos.length})</span></h2>
              {permissions.canManageCaja && (
                <button onClick={() => setNuevoMovOpen(true)}
                  className="inline-flex h-[30px] items-center rounded-md bg-[#004A94] px-3 text-[10px] font-medium text-white hover:bg-[#003570]">
                  + Ingreso / Egreso
                </button>
              )}
            </div>
            {movimientos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Sin movimientos aún</p>
            ) : (
              <div className="divide-y divide-[#d1e5ff] max-h-[28rem] overflow-y-auto">
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
                      <span className={`shrink-0 text-sm font-medium ${g.items[0].tipo === 'INGRESO' ? 'text-green-700' : 'text-orange-700'}`}>
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
                      <span className={`text-sm font-medium ${m.tipo === 'INGRESO' ? 'text-green-700' : 'text-orange-700'} ${m.anulado ? 'line-through' : ''}`}>
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
