'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCotizacionDetail } from '@/features/cotizacion/hooks/use-cotizacion-detail';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import { ESTADO_COTIZACION_CONFIG } from '@/core/types/cotizacion';
import type { EstadoCotizacion } from '@/core/types/cotizacion';
import { usePermissions } from '@/features/empresa/context/empresa-context';

// --- Helpers ---

function formatCurrency(amount: number | undefined | null, moneda?: string): string {
  if (amount == null) return '-';
  const symbol = moneda === 'USD' ? '$ ' : 'S/ ';
  return symbol + Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date?: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE');
}

type TransitionAction = {
  label: string;
  targetEstado: EstadoCotizacion;
  color: string;
  hoverColor: string;
};

function getTransitions(estado: EstadoCotizacion): TransitionAction[] {
  switch (estado) {
    case 'BORRADOR':
      return [{ label: 'Enviar', targetEstado: 'PENDIENTE', color: 'bg-orange-600', hoverColor: 'hover:bg-orange-700' }];
    case 'PENDIENTE':
      return [
        { label: 'Aprobar', targetEstado: 'APROBADA', color: 'bg-green-600', hoverColor: 'hover:bg-green-700' },
        { label: 'Rechazar', targetEstado: 'RECHAZADA', color: 'bg-red-600', hoverColor: 'hover:bg-red-700' },
      ];
    default:
      return [];
  }
}

// --- Component ---

export default function CotizacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { cotizacion, isLoading, error, reload, cambiarEstado, duplicar } = useCotizacionDetail(id);
  const permissions = usePermissions();
  const canManage = permissions.canManageCotizaciones;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState<TransitionAction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false);

  // --- Actions ---

  async function handleCambiarEstado() {
    if (!estadoTarget) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await cambiarEstado(estadoTarget.targetEstado);
      setSuccessMsg(`Cotización cambiada a "${ESTADO_COTIZACION_CONFIG[estadoTarget.targetEstado].label}"`);
      setShowEstadoModal(false);
      setEstadoTarget(null);
    } catch {
      setErrorMsg('Error al cambiar el estado de la cotización');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicar() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const dup = await duplicar();
      router.push(`/dashboard/cotizaciones/${dup.id}`);
    } catch {
      setErrorMsg('Error al duplicar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEliminar() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await cotizacionService.deleteCotizacion(id);
      router.push('/dashboard/cotizaciones');
    } catch {
      setErrorMsg('Error al eliminar la cotización');
      setShowDeleteModal(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Loading / Error states ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#004A94]" />
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || 'Cotización no encontrada'}</p>
        <Link href="/dashboard/cotizaciones" className="mt-4 inline-block text-sm text-[#004A94] hover:underline">
          Volver a cotizaciones
        </Link>
      </div>
    );
  }

  const c = cotizacion;
  const estadoConfig = ESTADO_COTIZACION_CONFIG[c.estado];
  const transitions = getTransitions(c.estado);
  const isBorrador = c.estado === 'BORRADOR';
  const vendedorNombre = c.vendedor?.persona
    ? `${c.vendedor.persona.nombres} ${c.vendedor.persona.apellidos}`
    : '-';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <Link href="/dashboard/cotizaciones" className="text-sm text-gray-500 hover:text-[#004A94]">
          &larr; Cotizaciones
        </Link>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{c.codigo}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoConfig.color} ${estadoConfig.bg}`}>
              {estadoConfig.label}
            </span>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Editar - only BORRADOR */}
              {isBorrador && (
                <Link
                  href={`/dashboard/cotizaciones/${c.id}/editar`}
                  className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]"
                >
                  Editar
                </Link>
              )}

              {/* Duplicar */}
              <button
                onClick={handleDuplicar}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Duplicar
              </button>

              {/* Cambiar Estado dropdown */}
              {transitions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowEstadoDropdown(!showEstadoDropdown)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cambiar Estado
                    <svg className="ml-1.5 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showEstadoDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div className="fixed inset-0 z-10" onClick={() => setShowEstadoDropdown(false)} />
                      <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {transitions.map((t) => (
                          <button
                            key={t.targetEstado}
                            onClick={() => {
                              setEstadoTarget(t);
                              setShowEstadoModal(true);
                              setShowEstadoDropdown(false);
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Eliminar - only BORRADOR */}
              {isBorrador && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}
      {(errorMsg || error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{errorMsg || error}</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1 - Informacion General */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Informaci&oacute;n General</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">C&oacute;digo:</span>{' '}
              <span className="font-medium">{c.codigo}</span>
            </div>
            {c.nombre && (
              <div>
                <span className="text-gray-500">Nombre:</span>{' '}
                <span className="font-medium">{c.nombre}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Vendedor:</span>{' '}
              <span className="font-medium">{vendedorNombre}</span>
            </div>
            <div>
              <span className="text-gray-500">Sede:</span>{' '}
              <span className="font-medium">{c.sede?.nombre ?? '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Fecha emisi&oacute;n:</span>{' '}
              <span className="font-medium">{formatDate(c.fechaEmision)}</span>
            </div>
            {c.fechaVencimiento && (
              <div>
                <span className="text-gray-500">Fecha vencimiento:</span>{' '}
                <span className="font-medium">{formatDate(c.fechaVencimiento)}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Moneda:</span>{' '}
              <span className="font-medium">{c.moneda}</span>
            </div>
            {c.tipoCambio != null && (
              <div>
                <span className="text-gray-500">Tipo cambio:</span>{' '}
                <span className="font-medium">{Number(c.tipoCambio).toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 - Cliente */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
          <div className="space-y-2 text-sm">
            <p className="text-base font-bold text-gray-900">{c.nombreCliente}</p>
            {c.documentoCliente && (
              <div>
                <span className="text-gray-500">Documento:</span>{' '}
                <span className="font-medium">{c.documentoCliente}</span>
              </div>
            )}
            {c.emailCliente && (
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="font-medium">{c.emailCliente}</span>
              </div>
            )}
            {c.telefonoCliente && (
              <div>
                <span className="text-gray-500">Tel&eacute;fono:</span>{' '}
                <span className="font-medium">{c.telefonoCliente}</span>
              </div>
            )}
            {c.direccionCliente && (
              <div>
                <span className="text-gray-500">Direcci&oacute;n:</span>{' '}
                <span className="font-medium">{c.direccionCliente}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      {c.detalles && c.detalles.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Items ({c.detalles.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-2 text-center w-10">#</th>
                  <th className="px-4 py-2">Descripci&oacute;n</th>
                  <th className="px-4 py-2 text-right">Cant.</th>
                  <th className="px-4 py-2 text-right">P. Unit.</th>
                  <th className="px-4 py-2 text-right">Desc.</th>
                  <th className="px-4 py-2 text-right">IGV</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {c.detalles
                  .sort((a, b) => a.orden - b.orden)
                  .map((det, idx) => (
                    <tr key={det.id} className="border-b border-gray-100">
                      <td className="px-4 py-2.5 text-center text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">{det.descripcion}</p>
                        {det.producto && (
                          <p className="text-xs text-gray-400">
                            {det.producto.codigoEmpresa || det.producto.sku || ''}
                          </p>
                        )}
                        {det.variante && (
                          <p className="text-xs text-[#004A94]">{det.variante.nombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">{det.cantidad}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(det.precioUnitario, c.moneda)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {det.descuento > 0 ? formatCurrency(det.descuento, c.moneda) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(det.igv, c.moneda)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(det.total, c.moneda)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Totals Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
            <div className="flex flex-col items-end space-y-1 text-sm">
              <div className="flex w-64 justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(c.subtotal, c.moneda)}</span>
              </div>
              {c.descuento > 0 && (
                <div className="flex w-64 justify-between">
                  <span className="text-gray-500">Descuento</span>
                  <span className="font-medium text-red-600">-{formatCurrency(c.descuento, c.moneda)}</span>
                </div>
              )}
              <div className="flex w-64 justify-between">
                <span className="text-gray-500">IGV</span>
                <span className="font-medium">{formatCurrency(c.impuestos, c.moneda)}</span>
              </div>
              <div className="flex w-64 justify-between border-t border-gray-300 pt-2">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(c.total, c.moneda)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observations & Conditions */}
      {(c.observaciones || c.condiciones) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {c.observaciones && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Observaciones</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{c.observaciones}</p>
            </div>
          )}
          {c.condiciones && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Condiciones</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{c.condiciones}</p>
            </div>
          )}
        </div>
      )}

      {/* State Change Modal */}
      {showEstadoModal && estadoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Confirmar cambio de estado</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Estás seguro de que deseas cambiar el estado de esta cotización a{' '}
              <span className="font-semibold">
                {ESTADO_COTIZACION_CONFIG[estadoTarget.targetEstado].label}
              </span>
              ?
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Cotización: {c.codigo}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEstadoModal(false);
                  setEstadoTarget(null);
                }}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCambiarEstado}
                disabled={isSubmitting}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${estadoTarget.color} ${estadoTarget.hoverColor}`}
              >
                {isSubmitting ? 'Procesando...' : estadoTarget.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Eliminar cotización</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar la cotización <span className="font-semibold">{c.codigo}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
