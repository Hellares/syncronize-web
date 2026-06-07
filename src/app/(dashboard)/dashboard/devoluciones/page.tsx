'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Devolucion, EstadoDevolucion } from '@/core/types/devolucion';
import { ESTADO_DEVOLUCION_CONFIG, TIPO_REEMBOLSO_LABEL } from '@/core/types/devolucion';
import * as devolucionService from '@/features/devoluciones/services/devolucion-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: Array<{ value: EstadoDevolucion | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'PROCESADA', label: 'Procesada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DevolucionesPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const sedesActivas = sedes.filter(s => s.isActive);

  const [items, setItems] = useState<Devolucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState<EstadoDevolucion | ''>('');
  const [sedeId, setSedeId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (q?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await devolucionService.getDevoluciones({
        estado: estado || undefined,
        sedeId: sedeId || undefined,
        search: (q ?? search) || undefined,
        fechaDesde: fechaDesde ? new Date(`${fechaDesde}T00:00:00`).toISOString() : undefined,
        fechaHasta: fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).toISOString() : undefined,
      });
      setItems(data);
    } catch {
      setError('Error al cargar las devoluciones');
    } finally {
      setIsLoading(false);
    }
  }, [estado, sedeId, search, fechaDesde, fechaHasta]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [estado, sedeId, fechaDesde, fechaHasta]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch(q), 400);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${items.length} devoluciones`}</p>
        </div>
        {permissions.canManageDevoluciones && (
          <button onClick={() => router.push('/dashboard/devoluciones/nueva')}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nueva devolución
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por código..." />
        {sedesActivas.length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        {(fechaDesde || fechaHasta) && (
          <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50">✕ Limpiar</button>
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

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">↩️</p><p className="text-gray-400">Sin devoluciones con estos filtros</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Venta</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Reembolso</th>
                <th className="px-4 py-2.5 hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-2.5 text-center">Ítems</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(d => {
                const cfg = ESTADO_DEVOLUCION_CONFIG[d.estado];
                const numItems = d._count?.items ?? d.items?.length ?? 0;
                return (
                  <tr key={d.id} onClick={() => router.push(`/dashboard/devoluciones/${d.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-semibold text-gray-900">{d.codigo}</span>
                      {d.esReversionTotal && <span className="ml-1 rounded bg-purple-100 px-1 py-0.5 text-[9px] text-purple-700">Reversión</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{d.venta?.codigo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 truncate max-w-[180px]">{d.venta?.nombreCliente ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{TIPO_REEMBOLSO_LABEL[d.tipoReembolso] ?? d.tipoReembolso}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{fmtFecha(d.creadoEn)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-700">{numItems}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
