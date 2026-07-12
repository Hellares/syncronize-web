'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { CuentaPorCobrar, ResumenCuentasCobrar, EstadoCuenta, ConfiguracionMora, FuenteIngreso } from '@/core/types/cuentas-cobrar';
import { ESTADO_CUENTA_CONFIG } from '@/core/types/cuentas-cobrar';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { BancoEmpresa } from '@/core/types/compra';
import { getBancos } from '@/features/compras/services/compra-service';
import * as cxcService from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: Array<{ value: EstadoCuenta | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'VENCIDA', label: 'Vencidas' },
  { value: 'PAGADA', label: 'Pagadas' },
];
const METODOS_PAGO: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function CuentasCobrarPage() {
  const router = useRouter();
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
        <div className="space-y-2">
          {cuentas.map(c => {
            const cfg = ESTADO_CUENTA_CONFIG[c.estado];
            const abierta = expandido === c.ventaId;
            const totalConMora = c.saldoPendiente + (c.totalMora ?? 0);
            return (
              <div key={c.ventaId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button onClick={() => setExpandido(abierta ? null : c.ventaId)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-900">{c.codigo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                      {(c.numeroCuotas ?? 0) > 0 && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">{c.numeroCuotas} cuotas</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">{c.nombreCliente}{c.documentoCliente ? ` · ${c.documentoCliente}` : ''}</p>
                  </button>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(c.saldoPendiente)}</p>
                    <p className="text-[10px] text-gray-400">
                      de {fmt(c.totalVenta)}
                      {(c.totalMora ?? 0) > 0 && <span className="text-red-500"> · mora {fmt(c.totalMora)}</span>}
                    </p>
                    {c.diasVencimiento != null && (
                      <p className={`text-[10px] ${c.diasVencimiento < 0 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        {c.diasVencimiento < 0 ? `vencido ${Math.abs(c.diasVencimiento)}d` : `vence en ${c.diasVencimiento}d`} · {fmtFecha(c.fechaVencimiento)}
                      </p>
                    )}
                  </div>
                  {puedeGestionar && c.saldoPendiente > 0.005 && (
                    <button onClick={() => setAbonoTarget(c)}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Abonar</button>
                  )}
                  <button onClick={() => router.push(`/dashboard/ventas/${c.ventaId}`)}
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-500 hover:bg-gray-50">Venta</button>
                </div>

                {/* Cuotas */}
                {abierta && (c.cuotas ?? []).length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">Cuotas</p>
                    <div className="space-y-1">
                      {c.cuotas!.map(cu => (
                        <div key={cu.id} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-xs">
                          <span className="text-gray-600">
                            #{cu.numero} · vence {fmtFecha(cu.fechaVencimiento)}
                            {(cu.diasVencido ?? 0) > 0 && <span className="ml-1 font-semibold text-red-500">+{cu.diasVencido}d</span>}
                          </span>
                          <span className="flex items-center gap-2">
                            {(cu.montoMora ?? 0) > 0 && <span className="text-red-500">mora {fmt(cu.montoMora)}</span>}
                            <span className="text-gray-400">{fmt(cu.montoPagado)}/{fmt(cu.monto)}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${cu.saldoPendiente <= 0.005 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {cu.saldoPendiente <= 0.005 ? 'Pagada' : fmt(cu.saldoPendiente)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {abierta && (c.cuotas ?? []).length === 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-3 text-xs text-gray-500">
                    Crédito sin cuotas · saldo {fmt(c.saldoPendiente)} con vencimiento {fmtFecha(c.fechaVencimiento)}.
                    {(c.totalMora ?? 0) > 0 && <span className="text-red-500"> Total con mora: {fmt(totalConMora)}.</span>}
                  </div>
                )}

                {/* Historial de abonos */}
                {abierta && (c.pagos ?? []).length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">Abonos realizados</p>
                    <div className="space-y-1">
                      {c.pagos!.map(p => (
                        <div key={p.id} className={`flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-xs ${p.anulado ? 'opacity-50' : ''}`}>
                          <span className="text-gray-600">
                            {p.metodoPago} · {fmtFecha(p.fechaPago)}
                            {p.fuente && <span className="ml-1 text-[9px] text-gray-400">→ {p.fuente}</span>}
                            {p.anulado && <span className="ml-1 rounded bg-red-100 px-1 text-[8px] font-bold text-red-600">ANULADO</span>}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`font-semibold ${p.anulado ? 'text-gray-400 line-through' : 'text-green-700'}`}>{fmt(p.monto)}</span>
                            {puedeGestionar && !p.anulado && c.estado !== 'PAGADA' && (
                              <button onClick={() => anularAbono(p.id)} title="Anular abono (revierte el ingreso y recomputa cuotas)"
                                className="rounded p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-500">✕</button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {abonoTarget && (
        <AbonoDialog cuenta={abonoTarget} onSuccess={onAbonoSuccess} onClose={() => setAbonoTarget(null)} />
      )}
      {moraOpen && <MoraConfigDialog onClose={() => setMoraOpen(false)} onSaved={() => { setMoraOpen(false); flash('Configuración de mora guardada'); fetchCuentas(); fetchResumen(); }} />}
    </div>
  );
}

/* --- Registrar abono (endpoint canónico CxC con fuente de ingreso, paridad abono_cliente_sheet).
       El backend imputa en cascada mora → interés → principal sobre las cuotas. --- */
function AbonoDialog({ cuenta, onSuccess, onClose }: { cuenta: CuentaPorCobrar; onSuccess: () => void; onClose: () => void }) {
  const maxAbono = cuenta.saldoPendiente + (cuenta.totalMora ?? 0);

  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('EFECTIVO');
  const [fuente, setFuente] = useState<FuenteIngreso>('TESORERIA');
  const [bancoId, setBancoId] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [monto, setMonto] = useState(maxAbono > 0 ? maxAbono.toFixed(2) : '');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // EFECTIVO no entra a banco (paridad Flutter); digitales default BANCO
  const fuentesValidas: FuenteIngreso[] = metodoPago === 'EFECTIVO' ? ['TESORERIA', 'CAJA'] : ['BANCO', 'TESORERIA', 'CAJA'];

  useEffect(() => { getBancos().then(setBancos).catch(() => setBancos([])); }, []);
  useEffect(() => {
    if (fuente === 'BANCO' && !bancoId && bancos.length > 0) {
      const principal = bancos.find(b => b.esPrincipal) ?? bancos[0];
      setBancoId(principal.id);
    }
  }, [fuente, bancoId, bancos]);

  const onMetodo = (m: MetodoPagoVenta) => {
    setMetodoPago(m);
    const f: FuenteIngreso = m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO';
    setFuente(f);
    if (f !== 'BANCO') setBancoId('');
    // Bancarización: digitales llevan referencia (default 00000 como la app)
    if (m !== 'EFECTIVO' && !referencia) setReferencia('00000');
  };

  const submit = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Monto inválido'); return; }
    if (m > maxAbono + 0.005) { setError(`El abono no puede superar ${fmt(maxAbono)} (saldo + mora)`); return; }
    if (fuente === 'BANCO' && !bancoId) { setError('Selecciona la cuenta bancaria'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await cxcService.registrarAbono(cuenta.ventaId, {
        metodoPago,
        monto: m,
        referencia: metodoPago !== 'EFECTIVO' ? (referencia.trim() || '00000') : undefined,
        fuente,
        ...(fuente === 'BANCO' ? { bancoId } : {}),
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Abono a {cuenta.codigo}</h3>
        <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Saldo total: <strong>{fmt(cuenta.saldoPendiente)}</strong>{(cuenta.totalMora ?? 0) > 0 && <> · mora {fmt(cuenta.totalMora)}</>}
        </p>
        {(cuenta.cuotas ?? []).length > 0 && (
          <p className="mt-1.5 text-[10px] text-gray-400">El abono se imputa automáticamente en cascada: mora → interés → capital de las cuotas más antiguas.</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {METODOS_PAGO.map(m => (
            <button key={m} onClick={() => onMetodo(m)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoPago === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
              {METODO_PAGO_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-right text-sm outline-none focus:border-[#437EFF]"
            type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
          {metodoPago !== 'EFECTIVO' && (
            <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="N° operación" />
          )}
        </div>

        {/* Fuente del ingreso: a dónde ENTRA el dinero */}
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Entra a</label>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            value={fuente} onChange={e => { setFuente(e.target.value as FuenteIngreso); if (e.target.value !== 'BANCO') setBancoId(''); }}>
            {fuentesValidas.map(f => (
              <option key={f} value={f}>
                {f === 'TESORERIA' ? 'Tesorería (Caja Central)' : f === 'CAJA' ? 'Caja (mi caja abierta)' : 'Banco (cuenta de la empresa)'}
              </option>
            ))}
          </select>
        </div>
        {fuente === 'BANCO' && (
          bancos.length === 0 ? (
            <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">No hay cuentas bancarias. Crea una en Tesorería.</p>
          ) : (
            <select className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={bancoId} onChange={e => setBancoId(e.target.value)}>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta} ({b.moneda ?? 'PEN'})</option>)}
            </select>
          )
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Registrar abono'}
          </button>
        </div>
      </div>
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
