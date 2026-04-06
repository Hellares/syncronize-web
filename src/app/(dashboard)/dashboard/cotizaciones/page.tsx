'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCotizaciones } from '@/features/cotizacion/hooks/use-cotizaciones';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import type { Cotizacion, EstadoCotizacion } from '@/core/types/cotizacion';
import { ESTADO_COTIZACION_CONFIG } from '@/core/types/cotizacion';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: EstadoCotizacion[] = ['BORRADOR', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA'];

function formatCurrency(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-PE');
}

function getVendedorName(cotizacion: Cotizacion): string {
  const persona = cotizacion.vendedor?.persona;
  if (!persona) return '—';
  return `${persona.nombres} ${persona.apellidos}`;
}

function getClienteName(cotizacion: Cotizacion): string {
  return cotizacion.nombreCliente || '—';
}

/* ---------- Skeleton rows for loading state ---------- */
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
          <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
        </tr>
      ))}
    </>
  );
}

/* ---------- Empty state ---------- */
function EmptyState() {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-500">No se encontraron cotizaciones</p>
        <p className="text-xs text-gray-400">Ajusta los filtros o crea una nueva cotizacion</p>
      </td>
    </tr>
  );
}

export default function CotizacionesPage() {
  const { cotizaciones, meta, filtros, isLoading, error, updateFiltros, setPage, reload, resetFiltros } = useCotizaciones();
  const permissions = usePermissions();
  const [deleteTarget, setDeleteTarget] = useState<Cotizacion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  /* ---------- Handlers ---------- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await cotizacionService.deleteCotizacion(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch {
      // silent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (cotizacion: Cotizacion) => {
    setIsDuplicating(cotizacion.id);
    try {
      await cotizacionService.duplicarCotizacion(cotizacion.id);
      reload();
    } catch {
      // silent
    } finally {
      setIsDuplicating(null);
    }
  };

  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? 1;

  return (
    <div className="space-y-4">
      {/* ========== Header ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500">{meta ? `${meta.total} cotizaciones` : 'Cargando...'}</p>
        </div>
        {permissions.canManageCotizaciones && (
          <Link
            href="/dashboard/cotizaciones/nuevo"
            className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] transition-colors"
          >
            + Nueva Cotizacion
          </Link>
        )}
      </div>

      {/* ========== Filters ========== */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">Buscar</label>
          <input
            type="text"
            placeholder="Codigo, cliente..."
            value={filtros.search ?? ''}
            onChange={e => updateFiltros({ search: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
          />
        </div>

        {/* Estado */}
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">Estado</label>
          <select
            value={filtros.estado ?? ''}
            onChange={e => updateFiltros({ estado: (e.target.value || undefined) as EstadoCotizacion | undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
          >
            <option value="">Todos</option>
            {ESTADOS.map(est => (
              <option key={est} value={est}>{ESTADO_COTIZACION_CONFIG[est].label}</option>
            ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={filtros.fechaDesde ?? ''}
            onChange={e => updateFiltros({ fechaDesde: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
          />
        </div>

        {/* Fecha hasta */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={filtros.fechaHasta ?? ''}
            onChange={e => updateFiltros({ fechaHasta: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
          />
        </div>

        {/* Reset */}
        <button
          onClick={resetFiltros}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* ========== Error ========== */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ========== Table ========== */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Codigo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Monto</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vendedor</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <TableSkeleton />
            ) : cotizaciones.length === 0 ? (
              <EmptyState />
            ) : (
              cotizaciones.map(cot => {
                const estadoCfg = ESTADO_COTIZACION_CONFIG[cot.estado];
                const isBorrador = cot.estado === 'BORRADOR';
                return (
                  <tr key={cot.id} className="hover:bg-gray-50 transition-colors">
                    {/* Codigo */}
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {cot.codigo}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {getClienteName(cot)}
                    </td>

                    {/* Monto */}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(cot.total)}
                    </td>

                    {/* Estado */}
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoCfg.color} ${estadoCfg.bg}`}>
                        {estadoCfg.label}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(cot.fechaEmision)}
                    </td>

                    {/* Vendedor */}
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {getVendedorName(cot)}
                    </td>

                    {/* Acciones */}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver */}
                        <Link
                          href={`/dashboard/cotizaciones/${cot.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-[#004A94] hover:bg-blue-50 transition-colors"
                        >
                          Ver
                        </Link>

                        {/* Editar (solo borrador) */}
                        {isBorrador && permissions.canManageCotizaciones && (
                          <Link
                            href={`/dashboard/cotizaciones/${cot.id}/editar`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Editar
                          </Link>
                        )}

                        {/* Duplicar */}
                        {permissions.canManageCotizaciones && (
                          <button
                            onClick={() => handleDuplicate(cot)}
                            disabled={isDuplicating === cot.id}
                            className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {isDuplicating === cot.id ? 'Duplicando...' : 'Duplicar'}
                          </button>
                        )}

                        {/* Eliminar (solo borrador) */}
                        {isBorrador && permissions.canManageCotizaciones && (
                          <button
                            onClick={() => setDeleteTarget(cot)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========== Pagination ========== */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-600">
            Pagina {currentPage} de {totalPages} ({meta.total} resultados)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage <= 1}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Primera
            </button>
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'dots' ? (
                  <span key={`dots-${idx}`} className="px-1 text-gray-400">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      currentPage === item
                        ? 'bg-[#004A94] text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ultima
            </button>
          </div>
        </div>
      )}

      {/* ========== Delete Confirmation Dialog ========== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Eliminar cotizacion</h3>
            <p className="mt-2 text-sm text-gray-600">
              Esta accion no se puede deshacer. Se eliminara la cotizacion{' '}
              <span className="font-semibold">{deleteTarget.codigo}</span> de forma permanente.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
