'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { OrdenServicio, EstadoOrdenServicio, TipoServicio, PrioridadServicio } from '@/core/types/orden-servicio';
import {
  ESTADO_OS_CONFIG, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_CONFIG,
  TIPOS_SERVICIO, PRIORIDADES, costoFinalOrden, saldoPendienteOrden, nombreClienteOrden,
  estaCobradaOrden,
} from '@/core/types/orden-servicio';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: Array<{ value: EstadoOrdenServicio | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'RECIBIDO', label: 'Recibido' },
  { value: 'EN_DIAGNOSTICO', label: 'En diagnóstico' },
  { value: 'ESPERANDO_APROBACION', label: 'Esperando aprob.' },
  { value: 'EN_REPARACION', label: 'En reparación' },
  { value: 'PENDIENTE_PIEZAS', label: 'Pend. piezas' },
  { value: 'REPARADO', label: 'Reparado' },
  { value: 'LISTO_ENTREGA', label: 'Listo entrega' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];
const LIMIT = 15;

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo del buscador de productos y del modulo de compras. En la barra de
// filtros los controles NO son w-full: el ancho lo pone cada uno.
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
/** La fecha pactada es un día, no un instante: mostrarla con hora confunde. */
function fmtSoloFecha(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}
/**
 * Se pasó la fecha pactada con el cliente y el equipo sigue en el taller.
 * Lo que cierra el atraso es la ENTREGA, no el pago.
 */
function prometidaVencidaOrden(o: OrdenServicio): boolean {
  if (!o.fechaPrometida || o.fechaEntrega || o.estado === 'CANCELADO') return false;
  return new Date(o.fechaPrometida) < new Date();
}

export default function ServiciosPage() {
  const router = useRouter();
  const permissions = usePermissions();

  const [items, setItems] = useState<OrdenServicio[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState<EstadoOrdenServicio | ''>('');
  const [tipoServicio, setTipoServicio] = useState<TipoServicio | ''>('');
  const [prioridad, setPrioridad] = useState<PrioridadServicio | ''>('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (opts?: { page?: number; search?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await osService.getOrdenes({
        estado: estado || undefined,
        tipoServicio: tipoServicio || undefined,
        prioridad: prioridad || undefined,
        search: (opts?.search ?? search) || undefined,
        page: opts?.page ?? page,
        limit: LIMIT,
      });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError('Error al cargar las órdenes de servicio');
    } finally {
      setIsLoading(false);
    }
  }, [estado, tipoServicio, prioridad, search, page]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); fetchData({ page: 1 }); }, [estado, tipoServicio, prioridad]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData({ page }); }, [page]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchData({ page: 1, search: q }); }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Órdenes de Servicio</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${total} órdenes`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permissions.canViewStatistics && (
            <button onClick={() => router.push('/dashboard/servicios/estadisticas')}
              className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5">
              📊 Estadísticas
            </button>
          )}
          {permissions.canManageOrders && (
            <button onClick={() => router.push('/dashboard/servicios/nueva')}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
              + Nueva orden
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className={`${INPUT_STD} w-full pl-9`}
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por código o problema..." />
        </div>
        <select value={tipoServicio} onChange={e => setTipoServicio(e.target.value as TipoServicio | '')}
          className={INPUT_STD}>
          <option value="">Todos los tipos</option>
          {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</option>)}
        </select>
        <select value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadServicio | '')}
          className={INPUT_STD}>
          <option value="">Toda prioridad</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
        </select>
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
      ) : items.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🛠️</p><p className="text-gray-400">Sin órdenes con estos filtros</p></div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map(o => {
            const cfg = ESTADO_OS_CONFIG[o.estado];
            const prio = PRIORIDAD_CONFIG[o.prioridad];
            const total = costoFinalOrden(o);              // total al cliente = servicio + componentes − descuento
            const saldo = saldoPendienteOrden(o) ?? 0;
            return (
              <button key={o.id} onClick={() => router.push(`/dashboard/servicios/${o.id}`)}
                className="borde-degradado relative rounded-xl bg-white p-3 text-left ring-1 ring-blue-400/40 shadow-sm transition-all duration-300 hover:bg-[#437EFF]/5 hover:shadow-[0_0_30px_1px_rgba(0,255,117,0.30)] hover:ring-transparent">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#437EFF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#004A94]">{o.codigo}</span>
                    {(o.mensajesNoLeidos ?? 0) > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{o.mensajesNoLeidos}</span>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                </div>
                <p className="mt-1 text-[12px] font-medium text-gray-800 truncate">{nombreClienteOrden(o)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {TIPO_SERVICIO_LABEL[o.tipoServicio]}
                  {o.tipoEquipo ? ` · ${o.tipoEquipo}` : ''}{o.marcaEquipo ? ` ${o.marcaEquipo}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${prio.text} ${prio.bg}`}>{PRIORIDAD_LABEL[o.prioridad]}</span>
                    <span className="text-[10px] text-gray-400">{fmtFecha(o.creadoEn)}</span>
                    {/* Un solo chip, en orden de urgencia: ya salió → atrasada →
                        pagada sin retirar → pactada. Sin esto había que entrar
                        orden por orden para saber qué falta entregar. */}
                    {o.fechaEntrega ? (
                      <span className="rounded bg-[#437EFF]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#004A94]">Entregado {fmtFecha(o.fechaEntrega)}</span>
                    ) : prometidaVencidaOrden(o) ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Atrasado {fmtSoloFecha(o.fechaPrometida)}</span>
                    ) : estaCobradaOrden(o) ? (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">Sin retirar</span>
                    ) : o.fechaPrometida ? (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">F. Solución {fmtSoloFecha(o.fechaPrometida)}</span>
                    ) : null}
                  </div>
                  {total != null && total > 0 && (
                    (o.adelanto ?? 0) > 0 ? (
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400">Total {fmt(total)}</p>
                        <p className={`text-xs font-bold ${saldo > 0.005 ? 'text-amber-600' : 'text-green-600'}`}>
                          {saldo > 0.005 ? `Saldo ${fmt(saldo)}` : 'Pagado'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#004A94]">{fmt(total)}</span>
                    )
                  )}
                </div>
              </button>
            );
          })}
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
    </div>
  );
}
