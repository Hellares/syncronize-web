'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { TesoreriaResumen, TesoreriaMovimiento, TesoreriaFiltros } from '@/core/types/tesoreria';
import type { TipoMovimientoCaja, MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL, CATEGORIA_MOVIMIENTO_LABEL } from '@/core/types/caja';
import * as tesoreriaService from '@/features/tesoreria/services/tesoreria-service';
import AjusteTesoreriaDialog from '@/features/tesoreria/components/AjusteTesoreriaDialog';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const TIPOS: Array<{ value: TipoMovimientoCaja | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'INGRESO', label: 'Ingresos' },
  { value: 'EGRESO', label: 'Egresos' },
];
const CATEGORIAS_TESORERIA = ['DEPOSITO_TESORERIA', 'RETIRO_TESORERIA', 'REVERSO_CAJA_CERRADA', 'AJUSTE_TESORERIA', 'DEVOLUCION_ADELANTO_COTIZACION'];
const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];
const PAGE_SIZE = 50;

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function nombreRegistrador(m: TesoreriaMovimiento): string {
  if (m.registradoPorNombre) return m.registradoPorNombre;
  const p = m.registradoPor?.persona;
  return p ? [p.nombres, p.apellidos].filter(Boolean).join(' ') : '';
}
function cajaOrigen(m: TesoreriaMovimiento): string | null {
  const meta = m.metadata ?? {};
  return (meta.cajaOrigenCodigo as string) ?? (meta.cajaAperturaCodigo as string) ?? null;
}

export default function TesoreriaPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageCaja;
  const sedesActivas = sedes.filter(s => s.isActive);

  const [sedeId, setSedeId] = useState<string>('');
  const [resumen, setResumen] = useState<TesoreriaResumen | null>(null);
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');

  const [tipo, setTipo] = useState<TipoMovimientoCaja | ''>('');
  const [categoria, setCategoria] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta | ''>('');
  const [q, setQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);

  // Default sede = primera activa
  useEffect(() => {
    if (!sedeId && sedesActivas.length > 0) setSedeId(sedesActivas[0].id);
  }, [sedesActivas, sedeId]);

  const fetchResumen = useCallback(async (sId: string) => {
    try { setResumen(await tesoreriaService.getResumen(sId)); } catch { setResumen(null); }
  }, []);

  const fetchMovimientos = useCallback(async (sId: string, opts?: { page?: number; q?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const filtros: TesoreriaFiltros = {
        tipo: tipo || undefined,
        categoria: categoria || undefined,
        metodoPago: metodoPago || undefined,
        q: (opts?.q ?? q) || undefined,
        page: opts?.page ?? page,
        pageSize: PAGE_SIZE,
      };
      const res = await tesoreriaService.getMovimientos(sId, filtros);
      setMovimientos(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError('Error al cargar los movimientos de tesorería');
    } finally {
      setIsLoading(false);
    }
  }, [tipo, categoria, metodoPago, q, page]);

  // Carga inicial + cambio de sede
  useEffect(() => {
    if (!sedeId) return;
    fetchResumen(sedeId);
    setPage(1);
    fetchMovimientos(sedeId, { page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId]);

  // Cambio de filtros (reinicia página)
  useEffect(() => {
    if (!sedeId) return;
    setPage(1);
    fetchMovimientos(sedeId, { page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, categoria, metodoPago]);

  // Cambio de página
  useEffect(() => {
    if (!sedeId) return;
    fetchMovimientos(sedeId, { page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); if (sedeId) fetchMovimientos(sedeId, { page: 1, q: value }); }, 400);
  };

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };
  const onAjusteSuccess = () => {
    setAjusteOpen(false);
    flash('Ajuste registrado');
    if (sedeId) { fetchResumen(sedeId); fetchMovimientos(sedeId); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tesorería</h1>
          <p className="text-sm text-gray-500">Caja central · {resumen?.sede.nombre ?? 'consolidado por sede'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/tesoreria/consolidado"
            className="rounded-lg border border-[#004A94] px-4 py-2 text-sm font-medium text-[#004A94] hover:bg-blue-50">
            Bancos / Consolidado
          </Link>
          {sedesActivas.length > 1 && (
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
              {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          {puedeGestionar && sedeId && (
            <button onClick={() => setAjusteOpen(true)}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
              + Ajuste manual
            </button>
          )}
        </div>
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Saldos */}
      {resumen && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div className="rounded-xl border border-[#437EFF]/30 bg-[#437EFF]/5 p-3">
            <p className="text-lg font-bold text-[#004A94]">{fmt(resumen.saldoTotal)}</p>
            <p className="text-[11px] text-gray-500">Saldo total</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-gray-900">{fmt(resumen.saldoEfectivo)}</p>
            <p className="text-[11px] text-gray-500">Efectivo</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-gray-900">{fmt(resumen.saldoDigital)}</p>
            <p className="text-[11px] text-gray-500">Digital</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-green-600">{fmt(resumen.totalIngresos)}</p>
            <p className="text-[11px] text-gray-500">Ingresos</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-red-600">{fmt(resumen.totalEgresos)}</p>
            <p className="text-[11px] text-gray-500">Egresos</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={q} onChange={e => handleSearch(e.target.value)} placeholder="Buscar en descripción..." />
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
          <option value="">Todas las categorías</option>
          {CATEGORIAS_TESORERIA.map(c => <option key={c} value={c}>{CATEGORIA_MOVIMIENTO_LABEL[c] ?? c}</option>)}
        </select>
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPagoVenta | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
          <option value="">Todos los métodos</option>
          {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map(t => (
          <button key={t.value} onClick={() => setTipo(t.value)}
            className={`rounded-full border px-3 py-1 text-xs ${tipo === t.value ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-gray-400">{isLoading ? 'Cargando...' : `${total} movimientos`}</span>
      </div>

      {/* Movimientos */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : movimientos.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🏦</p><p className="text-gray-400">Sin movimientos con estos filtros</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Concepto</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Método</th>
                <th className="px-4 py-2.5 hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movimientos.map(m => {
                const esIngreso = m.tipo === 'INGRESO';
                const ref = m.venta ?? m.devolucion ?? m.compra ?? m.cotizacion;
                const origen = cajaOrigen(m);
                const registrador = nombreRegistrador(m);
                return (
                  <tr key={m.id} className={`align-top hover:bg-[#437EFF]/5 ${m.anulado ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">{CATEGORIA_MOVIMIENTO_LABEL[m.categoria as string] ?? m.categoria}</span>
                        {origen && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">{origen}</span>}
                        {m.anulado && <span className="text-[9px] font-semibold text-red-500">ANULADO</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-700">{m.descripcion ?? '—'}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {ref && (
                          <button onClick={() => { if (m.venta) router.push(`/dashboard/ventas/${m.venta.id}`); }}
                            className="font-mono text-[10px] text-[#437EFF] hover:underline">{ref.codigo}</button>
                        )}
                        {registrador && <span className="text-[10px] text-gray-400">por {registrador}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{METODO_PAGO_LABEL[m.metodoPago] ?? m.metodoPago}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{fmtFecha(m.fechaMovimiento)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-sm font-bold ${esIngreso ? 'text-green-600' : 'text-red-600'} ${m.anulado ? 'line-through' : ''}`}>
                        {esIngreso ? '+' : '−'}{fmt(m.monto)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      {ajusteOpen && sedeId && (
        <AjusteTesoreriaDialog isOpen sedeId={sedeId} onClose={() => setAjusteOpen(false)} onSuccess={onAjusteSuccess} />
      )}
    </div>
  );
}
