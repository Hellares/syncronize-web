'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { OrdenServicio, EstadoOrdenServicio, TipoServicio, PrioridadServicio } from '@/core/types/orden-servicio';
import {
  ESTADO_OS_CONFIG, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_CONFIG,
  TIPOS_SERVICIO, PRIORIDADES, saldoOrden, nombreClienteOrden,
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

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
        {permissions.canManageOrders && (
          <button onClick={() => router.push('/dashboard/servicios/nueva')}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nueva orden
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por código o problema..." />
        <select value={tipoServicio} onChange={e => setTipoServicio(e.target.value as TipoServicio | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
          <option value="">Todos los tipos</option>
          {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</option>)}
        </select>
        <select value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadServicio | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
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
        <div className="grid gap-2 md:grid-cols-2">
          {items.map(o => {
            const cfg = ESTADO_OS_CONFIG[o.estado];
            const prio = PRIORIDAD_CONFIG[o.prioridad];
            const saldo = saldoOrden(o);
            return (
              <button key={o.id} onClick={() => router.push(`/dashboard/servicios/${o.id}`)}
                className="rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-[#437EFF]/40 hover:bg-[#437EFF]/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-gray-900">{o.codigo}</span>
                    {(o.mensajesNoLeidos ?? 0) > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{o.mensajesNoLeidos}</span>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-800 truncate">{nombreClienteOrden(o)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {TIPO_SERVICIO_LABEL[o.tipoServicio]}
                  {o.tipoEquipo ? ` · ${o.tipoEquipo}` : ''}{o.marcaEquipo ? ` ${o.marcaEquipo}` : ''}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${prio.text} ${prio.bg}`}>{PRIORIDAD_LABEL[o.prioridad]}</span>
                    <span className="text-[10px] text-gray-400">{fmtFecha(o.creadoEn)}</span>
                  </div>
                  {(o.costoTotal ?? 0) > 0 && (
                    <span className={`text-xs font-bold ${saldo > 0.005 ? 'text-amber-600' : 'text-green-600'}`}>
                      {saldo > 0.005 ? `Saldo ${fmt(saldo)}` : 'Pagado'}
                    </span>
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
