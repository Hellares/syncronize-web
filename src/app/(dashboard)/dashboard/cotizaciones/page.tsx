'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCotizaciones } from '@/features/cotizacion/hooks/use-cotizaciones';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import type { Cotizacion, EstadoCotizacion } from '@/core/types/cotizacion';
import { ESTADO_COTIZACION_CONFIG, estadoEfectivoCotizacion } from '@/core/types/cotizacion';
import { usePermissions, useEmpresa } from '@/features/empresa/context/empresa-context';

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
          <td className="px-4 py-2"><div className="h-4 w-24 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-32 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-28 rounded bg-gray-200" /></td>
          <td className="px-4 py-2"><div className="h-4 w-24 rounded bg-gray-200" /></td>
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

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de Productos, Ventas y Compras. Los filtros van un escalon por debajo
// del buscador: es donde se escribe, y si compiten la barra no se lee.
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const SELECT_FILTRO =
  'bg-zinc-100 text-[#004A94] font-sans text-[10px] ring-1 ring-blue-400 outline-none transition-all duration-300 rounded-[6px] h-[26px] px-2.5 shadow-md focus:shadow-lg focus:shadow-blue-200';

export default function CotizacionesPage() {
  const { cotizaciones, filtros, isLoading, cargandoMas, hasMore, error, updateFiltros, cargarMas, reload, resetFiltros } = useCotizaciones();
  const permissions = usePermissions();
  const { sedes } = useEmpresa();
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

  return (
    <div className="space-y-4">
      {/* ========== Header ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando...'
              : `${cotizaciones.length} ${cotizaciones.length === 1 ? 'cotización' : 'cotizaciones'}${hasMore ? ' (hay más)' : ''}`}
          </p>
        </div>
        {permissions.canManageCotizaciones && (
          <Link
            href="/dashboard/cotizaciones/nuevo"
            className="inline-flex h-[30px] items-center gap-1.5 rounded-md bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva Cotizacion
          </Link>
        )}
      </div>

      {/* ========== Filters ========== */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-blue-400/40">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Buscar</label>
          <input
            type="text"
            placeholder="Codigo, cliente..."
            value={filtros.search ?? ''}
            onChange={e => updateFiltros({ search: e.target.value || undefined })}
            className={`${INPUT_STD} w-full`}
          />
        </div>

        {/* Estado */}
        <div className="min-w-[140px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Estado</label>
          <select
            value={filtros.estado ?? ''}
            onChange={e => updateFiltros({ estado: (e.target.value || undefined) as EstadoCotizacion | undefined })}
            className={`${SELECT_FILTRO} w-full`}
          >
            <option value="">Todos</option>
            {ESTADOS.map(est => (
              <option key={est} value={est}>{ESTADO_COTIZACION_CONFIG[est].label}</option>
            ))}
          </select>
        </div>

        {/* Sede */}
        <div className="min-w-[140px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Sede</label>
          <select
            value={filtros.sedeId ?? ''}
            onChange={e => updateFiltros({ sedeId: e.target.value || undefined })}
            className={`${SELECT_FILTRO} w-full`}
          >
            <option value="">Todas</option>
            {sedes
              .filter((s) => s.isActive)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Desde</label>
          <input
            type="date"
            value={filtros.fechaDesde ?? ''}
            onChange={e => updateFiltros({ fechaDesde: e.target.value || undefined })}
            className={`${SELECT_FILTRO} w-full`}
          />
        </div>

        {/* Fecha hasta */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            value={filtros.fechaHasta ?? ''}
            onChange={e => updateFiltros({ fechaHasta: e.target.value || undefined })}
            className={`${SELECT_FILTRO} w-full`}
          />
        </div>

        {/* Reset */}
        <button
          onClick={resetFiltros}
          className="inline-flex h-[26px] items-center rounded-[6px] px-2.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
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
      {/* Misma firma que Productos, Ventas y las dos cuentas: ring azul --el
          borde gris no se ve sobre el #f5f7fa del dashboard--, cabecera
          #eaf2fd fija y 12 px. */}
      <div className="max-h-[calc(100vh-26rem)] min-h-[16rem] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
        <table className="min-w-full text-left text-[12px]">
          <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
            <tr>
              <th className="px-4 py-2 font-medium text-[#004A94]">Codigo</th>
              <th className="px-4 py-2 font-medium text-[#004A94]">Cliente</th>
              <th className="whitespace-nowrap px-4 py-2 text-right font-medium text-[#004A94]">Monto</th>
              <th className="px-4 py-2 text-center font-medium text-[#004A94]">Estado</th>
              <th className="whitespace-nowrap px-4 py-2 font-medium text-[#004A94]">Fecha</th>
              <th className="px-4 py-2 font-medium text-[#004A94]">Vendedor</th>
              <th className="px-4 py-2 text-right font-medium text-[#004A94]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <TableSkeleton />
            ) : cotizaciones.length === 0 ? (
              <EmptyState />
            ) : (
              cotizaciones.map(cot => {
                // VENCIDA es computada en el front (fechaVencimiento < hoy), paridad Flutter
                const estadoCfg = ESTADO_COTIZACION_CONFIG[estadoEfectivoCotizacion(cot)];
                const isBorrador = cot.estado === 'BORRADOR';
                return (
                  <tr key={cot.id} className="transition-colors hover:bg-gray-50/50">
                    {/* Codigo */}
                    <td className="whitespace-nowrap px-4 py-2 text-[11px] font-medium tracking-tight text-gray-700">
                      {cot.codigo}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-2 text-gray-700 max-w-[200px] truncate">
                      {getClienteName(cot)}
                    </td>

                    {/* Monto (con adelanto si existe) */}
                    <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(cot.total)}
                      {(cot.adelantoMonto ?? 0) > 0 && (
                        <div className="text-[10px] font-normal text-green-600">
                          Adelanto: {formatCurrency(Number(cot.adelantoMonto))}
                        </div>
                      )}
                    </td>

                    {/* Estado (+ badge Reservado, paridad Flutter) */}
                    <td className="whitespace-nowrap px-4 py-2 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoCfg.color} ${estadoCfg.bg}`}>
                        {estadoCfg.label}
                      </span>
                      {cot.tieneReservaActiva && (
                        <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700" title="Stock apartado para este cliente">
                          🔖 Reservado
                        </span>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                      {formatDate(cot.fechaEmision)}
                    </td>

                    {/* Vendedor */}
                    <td className="px-4 py-2 text-gray-600 max-w-[180px] truncate">
                      {getVendedorName(cot)}
                    </td>

                    {/* Acciones */}
                    <td className="whitespace-nowrap px-4 py-2 text-right">
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

      {/* ========== Cargar más ==========
           El backend pagina por CURSOR y no manda un total, así que no hay
           "página 3 de 12" que mostrar: hay más o no hay más. */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={cargarMas}
            disabled={cargandoMas}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </button>
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
