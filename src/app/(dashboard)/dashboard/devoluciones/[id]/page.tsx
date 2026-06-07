'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Devolucion } from '@/core/types/devolucion';
import {
  ESTADO_DEVOLUCION_CONFIG, MOTIVO_DEVOLUCION_LABEL, ESTADO_PRODUCTO_LABEL,
  ACCION_DEVOLUCION_LABEL, TIPO_REEMBOLSO_LABEL,
  puedeAprobar, puedeProcesar, puedeRechazar, puedeCancelar,
} from '@/core/types/devolucion';
import * as devolucionService from '@/features/devoluciones/services/devolucion-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DevolucionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageDevoluciones;

  const [dev, setDev] = useState<Devolucion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accionMsg, setAccionMsg] = useState('');
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDev(await devolucionService.getDevolucion(id));
    } catch {
      setError('No se pudo cargar la devolución');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const ejecutar = async (fn: () => Promise<Devolucion>, okMsg: string) => {
    setBusy(true);
    setError(null);
    try {
      const actualizada = await fn();
      setDev(actualizada);
      flash(okMsg);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo completar la acción');
      cargar();
    } finally {
      setBusy(false);
    }
  };

  const onProcesar = () => {
    if (!confirm('Se actualizará el stock según las acciones definidas para cada ítem y se registrará el reembolso en caja si corresponde. ¿Continuar?')) return;
    ejecutar(() => devolucionService.procesarDevolucion(id), 'Devolución procesada');
  };
  const onRechazar = () => {
    ejecutar(() => devolucionService.rechazarDevolucion(id, motivoRechazo.trim() || undefined), 'Devolución rechazada');
    setRechazarOpen(false);
    setMotivoRechazo('');
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }
  if (!dev) {
    return (
      <div className="space-y-3">
        <button onClick={() => router.push('/dashboard/devoluciones')} className="text-sm text-[#437EFF]">← Devoluciones</button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error ?? 'Devolución no encontrada'}</p></div>
      </div>
    );
  }

  const cfg = ESTADO_DEVOLUCION_CONFIG[dev.estado];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/dashboard/devoluciones')} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="font-mono text-xl font-bold text-gray-900">{dev.codigo}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
        {dev.esReversionTotal && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Reversión total</span>}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {dev.pendienteRegistroCaja && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-amber-700">⚠ Reembolso pendiente de registro en caja/tesorería (procesado por admin sin caja abierta).</p></div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <div><p className="text-[10px] uppercase text-gray-400">Venta</p>
          {dev.venta ? (
            <button onClick={() => dev.venta && router.push(`/dashboard/ventas/${dev.venta.id}`)} className="font-mono text-xs font-semibold text-[#437EFF] hover:underline">{dev.venta.codigo}</button>
          ) : <p className="text-xs text-gray-400">—</p>}
        </div>
        <div><p className="text-[10px] uppercase text-gray-400">Cliente</p><p className="text-xs font-medium text-gray-700 truncate">{dev.venta?.nombreCliente ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Reembolso</p><p className="text-xs font-medium text-gray-700">{TIPO_REEMBOLSO_LABEL[dev.tipoReembolso] ?? dev.tipoReembolso}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Sede</p><p className="text-xs font-medium text-gray-700">{dev.sede?.nombre ?? '—'}</p></div>
      </div>

      {/* Timeline */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 text-xs">
        <div><span className="text-gray-400">Creada:</span> <span className="text-gray-700">{fmtFecha(dev.creadoEn)}</span></div>
        {dev.aprobadoEn && <div><span className="text-gray-400">Aprobada:</span> <span className="text-gray-700">{fmtFecha(dev.aprobadoEn)}</span></div>}
        {dev.procesadoEn && <div><span className="text-gray-400">Procesada:</span> <span className="text-gray-700">{fmtFecha(dev.procesadoEn)}</span></div>}
      </div>

      {dev.motivo && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase text-gray-400">Motivo</p>
          <p className="text-sm text-gray-700">{dev.motivo}</p>
          {dev.observaciones && <p className="mt-1 text-xs text-gray-500">{dev.observaciones}</p>}
        </div>
      )}

      {/* Ítems */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-gray-900">Ítems devueltos</p>
        <div className="space-y-2">
          {(dev.items ?? []).map(it => (
            <div key={it.id} className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-medium text-gray-800">
                {it.producto?.nombre ?? it.variante?.nombre ?? 'Producto'}
                {it.variante?.nombre && it.producto?.nombre && <span className="text-gray-400"> · {it.variante.nombre}</span>}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">Cant: {it.cantidad}</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{MOTIVO_DEVOLUCION_LABEL[it.motivo] ?? it.motivo}</span>
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700">{ESTADO_PRODUCTO_LABEL[it.estadoProducto] ?? it.estadoProducto}</span>
                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">{ACCION_DEVOLUCION_LABEL[it.accion] ?? it.accion}</span>
              </div>
              {(it.productoReemplazo || it.varianteReemplazo) && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span className="text-indigo-600">🔄 Cambio por: {it.productoReemplazo?.nombre ?? it.varianteReemplazo?.nombre}</span>
                  {it.diferenciaPrecio != null && Number(it.diferenciaPrecio) !== 0 && (
                    <span className={Number(it.diferenciaPrecio) > 0 ? 'text-red-600' : 'text-green-600'}>
                      {Number(it.diferenciaPrecio) > 0 ? '+' : ''}{fmt(it.diferenciaPrecio)}
                    </span>
                  )}
                </div>
              )}
              {it.observaciones && <p className="mt-1 text-[11px] text-gray-500">{it.observaciones}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      {puedeGestionar && (puedeAprobar(dev) || puedeProcesar(dev) || puedeRechazar(dev) || puedeCancelar(dev)) && (
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
          {puedeCancelar(dev) && (
            <button onClick={() => ejecutar(() => devolucionService.cancelarDevolucion(id), 'Devolución cancelada')} disabled={busy}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          )}
          {puedeRechazar(dev) && (
            <button onClick={() => setRechazarOpen(true)} disabled={busy}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Rechazar</button>
          )}
          {puedeAprobar(dev) && (
            <button onClick={() => ejecutar(() => devolucionService.aprobarDevolucion(id), 'Devolución aprobada')} disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">Aprobar</button>
          )}
          {puedeProcesar(dev) && (
            <button onClick={onProcesar} disabled={busy}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">Procesar stock</button>
          )}
        </div>
      )}

      {/* Modal rechazar */}
      {rechazarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRechazarOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900">Rechazar devolución</h3>
            <label className="mt-3 mb-1 block text-xs font-medium text-gray-600">Motivo (opcional)</label>
            <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] resize-none" rows={3}
              value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Razón del rechazo" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRechazarOpen(false)} disabled={busy} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={onRechazar} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
