'use client';

import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type { CuentaPorCobrar, ResumenCuentasCobrar, EstadoCuenta, ConfiguracionMora } from '@/core/types/cuentas-cobrar';
import { ESTADO_CUENTA_CONFIG } from '@/core/types/cuentas-cobrar';
import * as cxcService from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import AbonoDialog from '@/features/cuentas-cobrar/components/abono-dialog';
import CuentaFilaDetalle from '@/features/cuentas-cobrar/components/CuentaFilaDetalle';
import MenuAcciones, { type AccionMenu } from '@/components/ui/MenuAcciones';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: Array<{ value: EstadoCuenta | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'VENCIDA', label: 'Vencidas' },
  { value: 'PAGADA', label: 'Pagadas' },
];
function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function CuentasCobrarPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageVentas;
  const sedesActivas = sedes.filter(s => s.isActive);

  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [resumen, setResumen] = useState<ResumenCuentasCobrar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');

  const [estado, setEstado] = useState<EstadoCuenta | ''>('');
  const [sedeId, setSedeId] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandido, setExpandido] = useState<string | null>(null);
  const [abonoTarget, setAbonoTarget] = useState<CuentaPorCobrar | null>(null);
  const [moraOpen, setMoraOpen] = useState(false);

  const fetchCuentas = useCallback(async (q?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cxcService.getCuentas({
        estado: estado || undefined,
        sedeId: sedeId || undefined,
        search: (q ?? search) || undefined,
      });
      setCuentas(data);
    } catch {
      setError('Error al cargar las cuentas por cobrar');
    } finally {
      setIsLoading(false);
    }
  }, [estado, sedeId, search]);

  const fetchResumen = useCallback(async () => {
    try { setResumen(await cxcService.getResumen()); } catch { /* noop */ }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCuentas(); }, [estado, sedeId]);
  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCuentas(q), 400);
  };

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const anularAbono = async (pagoId: string) => {
    const motivo = prompt('¿Anular este abono? Se revierte el ingreso (caja/banco) y se recomputan las cuotas. Motivo (opcional):');
    if (motivo === null) return;
    try {
      await cxcService.anularAbono(pagoId, motivo.trim() || undefined);
      flash('Abono anulado — ingreso revertido');
      fetchCuentas();
      fetchResumen();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo anular el abono');
    }
  };

  const onAbonoSuccess = () => {
    setAbonoTarget(null);
    flash('Abono registrado');
    fetchCuentas();
    fetchResumen();
  };

  const totalPorCobrar = (resumen?.totalPendiente ?? 0) + (resumen?.totalVencido ?? 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${cuentas.length} cuentas`}</p>
        </div>
        {puedeGestionar && (
          <button onClick={() => setMoraOpen(true)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            ⚙ Configurar mora
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Total por cobrar', val: totalPorCobrar, color: 'text-gray-900' },
            { label: `Pendiente (${resumen.cantidadPendientes})`, val: resumen.totalPendiente, color: 'text-amber-600' },
            { label: `Vencido (${resumen.cantidadVencidas})`, val: resumen.totalVencido, color: 'text-red-600' },
            { label: 'Mora acumulada', val: resumen.totalMora, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className={`text-lg font-bold ${s.color}`}>{fmt(s.val)}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top deudores + próximas a vencer */}
      {resumen && (resumen.topDeudores.length > 0 || resumen.proximasVencer.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {resumen.topDeudores.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Top deudores</p>
              <div className="space-y-1">
                {resumen.topDeudores.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate text-gray-700">{d.nombre} <span className="text-gray-400">({d.cantidad})</span></span>
                    <strong className="text-gray-900">{fmt(d.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {resumen.proximasVencer.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Próximas a vencer (7 días)</p>
              <div className="space-y-1">
                {resumen.proximasVencer.map(c => (
                  <div key={c.ventaId} className="flex items-center justify-between text-xs">
                    <span className="truncate text-gray-700">{c.codigo} · {c.nombreCliente}</span>
                    <span className="flex items-center gap-1">
                      <strong className="text-gray-900">{fmt(c.saldoPendiente)}</strong>
                      <span className="text-amber-600">{c.diasVencimiento}d</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por código o cliente..." />
        {sedesActivas.length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ESTADOS.map(e => (
          <button key={e.value} onClick={() => setEstado(e.value)}
            className={`rounded-full border px-3 py-1 text-xs ${estado === e.value ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : cuentas.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">💰</p><p className="text-gray-400">Sin cuentas por cobrar con estos filtros</p></div>
      ) : (
        /* Tabla, no tarjetas: son ventas comparables entre si --misma fecha,
           mismo cliente, mismo saldo-- y en columnas se barren de un vistazo.
           Mismo lenguaje que la lista de productos: ring azul, cabecera fija y
           la fila que se despliega. */
        <div className="max-h-[calc(100vh-26rem)] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
              <tr>
                <th className="w-px px-2 py-3" />
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Fecha</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Ticket</th>
                <th className="w-full px-4 py-3 font-medium text-[#004A94]">Cliente</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Total</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94] lg:table-cell">Pagado</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Saldo</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] md:table-cell">Vence</th>
                <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium text-[#004A94]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cuentas.map(c => {
                const cfg = ESTADO_CUENTA_CONFIG[c.estado];
                const abierta = expandido === c.ventaId;
                const vencido = (c.diasVencimiento ?? 0) < 0;

                // "Estado de cuenta" solo si sabemos a QUE cliente pertenece:
                // una venta a publico general no tiene a quien acumularle nada.
                const acciones: AccionMenu[] = [];
                if (c.clienteId || c.clienteEmpresaId) {
                  const q = new URLSearchParams(
                    // Prioridad clienteEmpresaId (B2B) sobre clienteId, paridad app
                    c.clienteEmpresaId ? { clienteEmpresaId: c.clienteEmpresaId } : { clienteId: c.clienteId! },
                  );
                  if (c.nombreCliente) q.set('nombre', c.nombreCliente);
                  acciones.push({
                    id: 'estado-cuenta',
                    label: 'Estado de cuenta',
                    href: `/dashboard/cuentas-cobrar/estado-cuenta?${q.toString()}`,
                    icono: (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" />
                      </svg>
                    ),
                  });
                }
                acciones.push({
                  id: 'venta',
                  label: 'Ver la venta',
                  href: `/dashboard/ventas/${c.ventaId}`,
                  icono: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" />
                    </svg>
                  ),
                });

                return (
                  <Fragment key={c.ventaId}>
                    <tr
                      onClick={() => setExpandido(abierta ? null : c.ventaId)}
                      className={`cursor-pointer transition-colors ${abierta ? 'bg-[#f9fbff]' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="w-px py-2 pl-3 pr-0">
                        <span
                          aria-hidden
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                            abierta ? 'bg-[#437EFF] text-white' : 'bg-blue-50 text-[#437EFF]'
                          }`}
                        >
                          <svg className={`h-3.5 w-3.5 transition-transform duration-150 ${abierta ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{fmtFecha(c.fechaVenta)}</td>

                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="font-mono text-xs font-semibold text-gray-900">{c.codigo}</span>
                        {(c.numeroCuotas ?? 0) > 0 && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                            {c.numeroCuotas} cuotas
                          </span>
                        )}
                      </td>

                      <td className="max-w-0 px-4 py-2">
                        <p className="truncate font-medium text-gray-900">{c.nombreCliente}</p>
                        {c.documentoCliente && (
                          <p className="truncate font-mono text-[10px] text-gray-400">{c.documentoCliente}</p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{fmt(c.totalVenta)}</td>

                      <td className="hidden whitespace-nowrap px-3 py-2 text-right text-green-700 lg:table-cell">
                        {c.totalPagado > 0.005 ? fmt(c.totalPagado) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* La mora va pegada al saldo y no en columna propia: casi
                          siempre es cero, pero cuando existe es lo mas
                          importante de la fila. */}
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <span className="font-bold text-gray-900">{fmt(c.saldoPendiente)}</span>
                        {(c.totalMora ?? 0) > 0 && (
                          <span className="block text-[10px] font-semibold text-red-500">+ {fmt(c.totalMora)} mora</span>
                        )}
                      </td>

                      <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell">
                        <span className="text-xs text-gray-600">{fmtFecha(c.fechaVencimiento)}</span>
                        {c.diasVencimiento != null && (
                          <span className={`block text-[10px] ${vencido ? 'font-semibold text-red-500' : 'text-gray-400'}`}>
                            {vencido ? `vencido ${Math.abs(c.diasVencimiento)}d` : `en ${c.diasVencimiento}d`}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* `stopPropagation` en toda la celda: sin esto cada boton
                          ademas despliega o cierra la fila. */}
                      <td className="whitespace-nowrap px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Abonar NO va al menu: es la razon de ser de esta
                              pantalla y tiene que estar a un solo toque. */}
                          {puedeGestionar && c.saldoPendiente > 0.005 && (
                            <button
                              type="button"
                              onClick={() => setAbonoTarget(c)}
                              className="hidden rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-green-700 sm:inline-flex"
                            >
                              Abonar
                            </button>
                          )}
                          <MenuAcciones acciones={acciones} titulo={`${c.codigo} · ${c.nombreCliente}`} />
                        </div>
                      </td>
                    </tr>

                    {abierta && (
                      <tr className="bg-[#f9fbff]">
                        <td colSpan={10} className="p-0">
                          <CuentaFilaDetalle
                            cuenta={c}
                            puedeGestionar={puedeGestionar}
                            onAnularAbono={anularAbono}
                          />
                          {/* En pantalla chica el boton verde de la fila no
                              entra: aca abajo, con area de dedo. */}
                          {puedeGestionar && c.saldoPendiente > 0.005 && (
                            <div className="px-4 pb-4 sm:hidden">
                              <button
                                type="button"
                                onClick={() => setAbonoTarget(c)}
                                className="h-11 w-full rounded-lg bg-green-600 text-xs font-bold text-white"
                              >
                                Abonar {fmt(c.saldoPendiente)}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {abonoTarget && (
        <AbonoDialog
          ventaId={abonoTarget.ventaId}
          codigo={abonoTarget.codigo}
          saldoPendiente={abonoTarget.saldoPendiente}
          totalMora={abonoTarget.totalMora ?? 0}
          tieneCuotas={(abonoTarget.cuotas ?? []).length > 0}
          onSuccess={onAbonoSuccess}
          onClose={() => setAbonoTarget(null)}
        />
      )}
      {moraOpen && <MoraConfigDialog onClose={() => setMoraOpen(false)} onSaved={() => { setMoraOpen(false); flash('Configuración de mora guardada'); fetchCuentas(); fetchResumen(); }} />}
    </div>
  );
}

/* --- Configuración de mora --- */
function MoraConfigDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [config, setConfig] = useState<ConfiguracionMora | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cxcService.getConfiguracionMora()
      .then(setConfig)
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!config) return;
    setIsSubmitting(true);
    setError('');
    try {
      await cxcService.updateConfiguracionMora({
        moraHabilitada: config.moraHabilitada,
        porcentajeMoraDiario: Number(config.porcentajeMoraDiario),
        moraMaximaPorcentaje: Number(config.moraMaximaPorcentaje),
        diasGraciaMora: Number(config.diasGraciaMora),
      });
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Configuración de mora</h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : config ? (
          <div className="mt-3 space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Mora habilitada</span>
              <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={config.moraHabilitada}
                onChange={e => setConfig({ ...config, moraHabilitada: e.target.checked })} />
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">% mora diario</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                type="number" step="0.01" min="0" value={config.porcentajeMoraDiario}
                onChange={e => setConfig({ ...config, porcentajeMoraDiario: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">% mora máxima (tope)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                type="number" step="0.01" min="0" value={config.moraMaximaPorcentaje}
                onChange={e => setConfig({ ...config, moraMaximaPorcentaje: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Días de gracia</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                type="number" step="1" min="0" value={config.diasGraciaMora}
                onChange={e => setConfig({ ...config, diasGraciaMora: Number(e.target.value) })} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        ) : <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting || !config}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
