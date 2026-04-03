'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTransferenciaDetail } from '@/features/stock/hooks/use-transferencia-detail';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import TransferenciaEstadoBadge from '@/features/stock/components/transferencias/TransferenciaEstadoBadge';

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TransferenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { transferencia, isLoading, isSubmitting, error, success, aprobar, enviar, recibir, rechazar, cancelar, procesarCompleto } = useTransferenciaDetail(id);
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRechazo, setShowRechazo] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
      </div>
    );
  }

  if (!transferencia) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || 'Transferencia no encontrada'}</p>
        <Link href="/dashboard/transferencias" className="mt-4 inline-block text-sm text-[#437EFF] hover:underline">Volver</Link>
      </div>
    );
  }

  const t = transferencia;
  const estado = t.estado;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/transferencias" className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Transferencias</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{t.codigo}</h1>
          <TransferenciaEstadoBadge estado={estado} />
        </div>
      </div>

      {/* Messages */}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{success}</p></div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Información</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Origen:</span> <span className="font-medium">{t.sedeOrigen?.nombre ?? '-'}</span></div>
            <div><span className="text-gray-500">Destino:</span> <span className="font-medium">{t.sedeDestino?.nombre ?? '-'}</span></div>
            <div><span className="text-gray-500">Items:</span> <span className="font-medium">{t.totalItems}</span></div>
            <div><span className="text-gray-500">Aprobados:</span> <span className="font-medium">{t.itemsAprobados}</span></div>
          </div>
          {t.motivo && <div className="text-sm"><span className="text-gray-500">Motivo:</span> <span>{t.motivo}</span></div>}
          {t.observaciones && <div className="text-sm"><span className="text-gray-500">Observaciones:</span> <span>{t.observaciones}</span></div>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Solicitado:</span><span>{t.solicitadoPorNombre || '-'} — {formatDate(t.fechaSolicitud || t.creadoEn)}</span></div>
            {t.fechaAprobacion && <div className="flex justify-between"><span className="text-gray-500">Aprobado:</span><span>{t.aprobadoPorNombre || '-'} — {formatDate(t.fechaAprobacion)}</span></div>}
            {t.fechaEnvio && <div className="flex justify-between"><span className="text-gray-500">Enviado:</span><span>{formatDate(t.fechaEnvio)}</span></div>}
            {t.fechaRecepcion && <div className="flex justify-between"><span className="text-gray-500">Recibido:</span><span>{t.recibidoPorNombre || '-'} — {formatDate(t.fechaRecepcion)}</span></div>}
          </div>
        </div>
      </div>

      {/* Items */}
      {t.items && t.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Items ({t.items.length})</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-center">Solicitada</th>
                <th className="px-4 py-2 text-center">Aprobada</th>
                <th className="px-4 py-2 text-center">Enviada</th>
                <th className="px-4 py-2 text-center">Recibida</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {t.items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">{item.productoNombre || 'Producto'}</p>
                    {item.varianteNombre && <p className="text-xs text-[#437EFF]">{item.varianteNombre}</p>}
                  </td>
                  <td className="px-4 py-2 text-center">{item.cantidadSolicitada}</td>
                  <td className="px-4 py-2 text-center">{item.cantidadAprobada}</td>
                  <td className="px-4 py-2 text-center">{item.cantidadEnviada}</td>
                  <td className="px-4 py-2 text-center">{item.cantidadRecibida}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{item.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Acciones</h3>
          <div className="flex flex-wrap gap-2">
            {(estado === 'PENDIENTE' || estado === 'BORRADOR') && (
              <>
                <button onClick={aprobar} disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  Aprobar
                </button>
                <button onClick={() => setShowRechazo(true)} disabled={isSubmitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  Rechazar
                </button>
                <button onClick={() => setShowCancelar(true)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={procesarCompleto} disabled={isSubmitting} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  Procesar Completo
                </button>
              </>
            )}
            {estado === 'APROBADA' && (
              <>
                <button onClick={enviar} disabled={isSubmitting} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                  Marcar como Enviada
                </button>
                <button onClick={() => setShowCancelar(true)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Cancelar
                </button>
              </>
            )}
            {estado === 'EN_TRANSITO' && (
              <button onClick={recibir} disabled={isSubmitting} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                Marcar como Recibida
              </button>
            )}
          </div>

          {/* Rechazo dialog inline */}
          {showRechazo && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <input value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Motivo del rechazo"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <button onClick={() => { rechazar(motivoRechazo); setShowRechazo(false); }} disabled={!motivoRechazo.trim() || isSubmitting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Confirmar Rechazo</button>
                <button onClick={() => setShowRechazo(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
              </div>
            </div>
          )}
          {showCancelar && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              <input value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Motivo de cancelación"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <button onClick={() => { cancelar(motivoRechazo); setShowCancelar(false); }} disabled={!motivoRechazo.trim() || isSubmitting}
                  className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Confirmar Cancelación</button>
                <button onClick={() => setShowCancelar(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Volver</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
