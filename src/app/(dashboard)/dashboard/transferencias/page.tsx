'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTransferencias } from '@/features/stock/hooks/use-transferencias';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import TransferenciaEstadoBadge from '@/features/stock/components/transferencias/TransferenciaEstadoBadge';
import type { EstadoTransferencia } from '@/core/types/stock';

const TABS: Array<{ label: string; value: EstadoTransferencia | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Aprobadas', value: 'APROBADA' },
  { label: 'En Tránsito', value: 'EN_TRANSITO' },
  { label: 'Recibidas', value: 'RECIBIDA' },
  { label: 'Rechazadas', value: 'RECHAZADA' },
];

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TransferenciasPage() {
  const [estadoTab, setEstadoTab] = useState<EstadoTransferencia | ''>('');
  const { transferencias, meta, isLoading, error, updateFiltros, setPage } = useTransferencias();
  const permissions = usePermissions();

  const handleTab = (estado: EstadoTransferencia | '') => {
    setEstadoTab(estado);
    updateFiltros({ estado: estado || undefined });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transferencias de Stock</h1>
          <p className="text-sm text-gray-500">Movimientos entre sedes</p>
        </div>
        {permissions.canManageProducts && (
          <Link href="/dashboard/transferencias/nueva"
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nueva Transferencia
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {TABS.map(tab => (
          <button key={tab.value} onClick={() => handleTab(tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${estadoTab === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : transferencias.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No hay transferencias</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Origen → Destino</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Items</th>
                <th className="px-4 py-3">Estado</th>
                <th className="hidden px-4 py-3 md:table-cell">Solicitado por</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{t.codigo}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{t.sedeOrigen?.nombre ?? '—'}</span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span className="text-sm">{t.sedeDestino?.nombre ?? '—'}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-center md:table-cell">{t.totalItems}</td>
                  <td className="px-4 py-3"><TransferenciaEstadoBadge estado={t.estado} /></td>
                  <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">{t.solicitadoPorNombre || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.creadoEn)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/transferencias/${t.id}`} className="text-xs font-medium text-[#437EFF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">{meta.total} transferencias</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(meta.page - 1)} disabled={!meta.hasPrevious}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
                <span className="text-xs text-gray-500">{meta.page} / {meta.totalPages}</span>
                <button onClick={() => setPage(meta.page + 1)} disabled={!meta.hasNext}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
