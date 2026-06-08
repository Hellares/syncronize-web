'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { OrdenServicio, HistorialOS, EstadoOrdenServicio } from '@/core/types/orden-servicio';
import {
  ESTADO_OS_CONFIG, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_CONFIG,
  TRANSICIONES_VALIDAS, saldoOrden,
} from '@/core/types/orden-servicio';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

export default function OrdenDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const permissions = usePermissions();

  const [orden, setOrden] = useState<OrdenServicio | null>(null);
  const [historial, setHistorial] = useState<HistorialOS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');
  const [transicionOpen, setTransicionOpen] = useState(false);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [o, h] = await Promise.all([osService.getOrden(id), osService.getHistorial(id).catch(() => [])]);
      setOrden(o);
      setHistorial(h);
    } catch {
      setError('No se pudo cargar la orden');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }
  if (!orden) {
    return (
      <div className="space-y-3">
        <button onClick={() => router.push('/dashboard/servicios')} className="text-sm text-[#437EFF]">← Órdenes</button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error ?? 'Orden no encontrada'}</p></div>
      </div>
    );
  }

  const cfg = ESTADO_OS_CONFIG[orden.estado];
  const prio = PRIORIDAD_CONFIG[orden.prioridad];
  const saldo = saldoOrden(orden);
  const transiciones = (TRANSICIONES_VALIDAS[orden.estado] ?? []).filter(e => e !== 'TERCERIZADO');
  const tecnicoNombre = orden.tecnico?.persona ? [orden.tecnico.persona.nombres, orden.tecnico.persona.apellidos].filter(Boolean).join(' ') : null;
  const esEmpresa = !!orden.clienteEmpresa;
  const persona = orden.cliente?.persona;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.push('/dashboard/servicios')} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="font-mono text-xl font-bold text-gray-900">{orden.codigo}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${prio.text} ${prio.bg}`}>{PRIORIDAD_LABEL[orden.prioridad]}</span>
        {permissions.canManageOrders && transiciones.length > 0 && (
          <button onClick={() => setTransicionOpen(true)}
            className="ml-auto rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">
            Cambiar estado
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <div><p className="text-[10px] uppercase text-gray-400">Servicio</p><p className="text-xs font-medium text-gray-700">{TIPO_SERVICIO_LABEL[orden.tipoServicio]}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Creada</p><p className="text-xs font-medium text-gray-700">{fmtFecha(orden.creadoEn)}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Entrega</p><p className="text-xs font-medium text-gray-700">{fmtFecha(orden.fechaEntrega)}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Técnico</p><p className="text-xs font-medium text-gray-700">{tecnicoNombre ?? 'Sin asignar'}</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Cliente */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Cliente</p>
          {esEmpresa ? (
            <>
              <p className="text-sm font-medium text-gray-900">{orden.clienteEmpresa?.razonSocial}</p>
              <p className="text-xs text-gray-500">RUC {orden.clienteEmpresa?.ruc ?? orden.clienteEmpresa?.numeroDocumento}</p>
              {orden.clienteEmpresa?.telefono && <p className="text-xs text-gray-500">{orden.clienteEmpresa.telefono}</p>}
              {orden.contactoClienteEmpresa?.nombre && <p className="mt-1 text-[11px] text-gray-400">Contacto: {orden.contactoClienteEmpresa.nombre}{orden.contactoClienteEmpresa.cargo ? ` (${orden.contactoClienteEmpresa.cargo})` : ''}</p>}
            </>
          ) : persona ? (
            <>
              <p className="text-sm font-medium text-gray-900">{[persona.nombres, persona.apellidos].filter(Boolean).join(' ')}</p>
              {persona.dni && <p className="text-xs text-gray-500">DNI {persona.dni}</p>}
              {persona.telefono && <p className="text-xs text-gray-500">{persona.telefono}</p>}
            </>
          ) : <p className="text-sm text-gray-400">Sin cliente asignado</p>}
        </div>

        {/* Equipo */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Equipo</p>
          <p className="text-sm font-medium text-gray-900">{orden.tipoEquipo ?? '—'}{orden.marcaEquipo ? ` · ${orden.marcaEquipo}` : ''}</p>
          {orden.modeloEquipo?.modelo && <p className="text-xs text-gray-500">{orden.modeloEquipo.marca} {orden.modeloEquipo.modelo}</p>}
          {orden.numeroSerie && <p className="text-xs text-gray-500">S/N: {orden.numeroSerie}</p>}
          {orden.condicionEquipo && <p className="mt-1 text-[11px] text-gray-400">{orden.condicionEquipo}</p>}
        </div>
      </div>

      {/* Problema / notas */}
      {(orden.descripcionProblema || orden.notas) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {orden.descripcionProblema && <><p className="text-[10px] uppercase text-gray-400">Problema reportado</p><p className="text-sm text-gray-700">{orden.descripcionProblema}</p></>}
          {orden.notas && <p className="mt-1 text-xs text-gray-500">{orden.notas}</p>}
        </div>
      )}

      {/* Costos */}
      {(orden.costoTotal ?? 0) > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Costos</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Costo total</span><span>{fmt(orden.costoTotal)}</span></div>
            {(orden.descuento ?? 0) > 0 && <div className="flex justify-between text-amber-600"><span>Descuento</span><span>−{fmt(orden.descuento)}</span></div>}
            {(orden.adelanto ?? 0) > 0 && <div className="flex justify-between text-blue-600"><span>Adelanto{orden.metodoPagoAdelanto ? ` (${METODO_PAGO_LABEL[orden.metodoPagoAdelanto] ?? orden.metodoPagoAdelanto})` : ''}</span><span>−{fmt(orden.adelanto)}</span></div>}
            <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-bold"><span className="text-gray-700">Saldo</span><span className={saldo > 0.005 ? 'text-amber-600' : 'text-green-600'}>{fmt(saldo)}</span></div>
          </div>
        </div>
      )}

      {/* Componentes (display) */}
      {(orden.componentes ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Componentes ({orden.componentes!.length})</p>
          <div className="space-y-1.5">
            {orden.componentes!.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                <span className="text-gray-700">{c.componente?.tipoComponente?.nombre ?? c.componente?.marca ?? 'Componente'} · <span className="text-teal-600">{c.tipoAccion}</span></span>
                <span className="text-gray-500">{fmt((c.costoAccion ?? 0) + (c.costoRepuestos ?? 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Historial</p>
          <div className="space-y-2">
            {historial.map(h => (
              <div key={h.id} className="flex gap-2 text-xs">
                <span className="text-gray-300">•</span>
                <div>
                  <p className="text-gray-700">
                    {h.estadoAnterior ? `${ESTADO_OS_CONFIG[h.estadoAnterior]?.label ?? h.estadoAnterior} → ` : ''}
                    <span className="font-medium">{ESTADO_OS_CONFIG[h.estadoNuevo]?.label ?? h.estadoNuevo}</span>
                  </p>
                  {h.notas && <p className="text-gray-500">{h.notas}</p>}
                  <p className="text-[10px] text-gray-400">{fmtFecha(h.creadoEn)}{h.comunicarCliente ? ' · cliente notificado' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transicionOpen && (
        <TransicionEstadoDialog
          orden={orden}
          transiciones={transiciones}
          onClose={() => setTransicionOpen(false)}
          onSuccess={() => { setTransicionOpen(false); flash('Estado actualizado'); cargar(); }}
        />
      )}
    </div>
  );
}

/* --- Transición de estado --- */
function TransicionEstadoDialog({ orden, transiciones, onClose, onSuccess }: {
  orden: OrdenServicio; transiciones: EstadoOrdenServicio[]; onClose: () => void; onSuccess: () => void;
}) {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOrdenServicio>(transiciones[0]);
  const [notas, setNotas] = useState('');
  const [comunicarCliente, setComunicarCliente] = useState(false);
  const [motivoReingreso, setMotivoReingreso] = useState('');
  const [costoTotal, setCostoTotal] = useState(orden.costoTotal != null ? String(orden.costoTotal) : '');
  const [descuento, setDescuento] = useState(orden.descuento != null ? String(orden.descuento) : '');
  const [adelanto, setAdelanto] = useState('');
  const [metodoPagoAdelanto, setMetodoPagoAdelanto] = useState<MetodoPagoVenta>('EFECTIVO');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esReingreso = nuevoEstado === 'EN_DIAGNOSTICO' && (orden.estado === 'ENTREGADO' || orden.estado === 'FINALIZADO');
  const esCancelar = nuevoEstado === 'CANCELADO';

  const submit = async () => {
    setError('');
    if (esCancelar && !notas.trim()) { setError('El motivo de cancelación es obligatorio'); return; }
    if (esReingreso && !motivoReingreso.trim()) { setError('El motivo de reingreso es obligatorio'); return; }
    const costo = costoTotal ? parseFloat(costoTotal) : undefined;
    const desc = descuento ? parseFloat(descuento) : undefined;
    const adel = adelanto ? parseFloat(adelanto) : undefined;
    if (costo != null && (adel ?? 0) + (desc ?? 0) > costo + Number(orden.adelanto ?? 0)) {
      setError('Adelanto + descuento no puede superar el costo total');
      return;
    }
    setIsSubmitting(true);
    try {
      await osService.transicionarEstado(orden.id, {
        nuevoEstado,
        notas: notas.trim() || undefined,
        comunicarCliente,
        motivoReingreso: esReingreso ? motivoReingreso.trim() : undefined,
        costoTotal: costo,
        descuento: desc,
        adelanto: adel,
        ...(adel && adel > 0 ? { metodoPagoAdelanto } : {}),
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo cambiar el estado');
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Cambiar estado</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nuevo estado</label>
            <select className={`${inputClass} bg-white`} value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value as EstadoOrdenServicio)}>
              {transiciones.map(e => <option key={e} value={e}>{ESTADO_OS_CONFIG[e]?.label ?? e}</option>)}
            </select>
          </div>

          {esReingreso && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo de reingreso *</label>
              <input className={inputClass} value={motivoReingreso} onChange={e => setMotivoReingreso(e.target.value)} />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Notas {esCancelar ? '*' : ''}</label>
            <textarea className={`${inputClass} resize-none`} rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder={esCancelar ? 'Motivo de cancelación' : 'Observaciones (opcional)'} />
          </div>

          {/* Costos editables */}
          <div className="grid grid-cols-3 gap-2">
            <div><label className="mb-1 block text-[10px] text-gray-400">Costo total</label><input className={inputClass} type="number" step="0.01" min="0" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] text-gray-400">Descuento</label><input className={inputClass} type="number" step="0.01" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] text-gray-400">+ Adelanto</label><input className={inputClass} type="number" step="0.01" min="0" value={adelanto} onChange={e => setAdelanto(e.target.value)} placeholder="0" /></div>
          </div>
          {parseFloat(adelanto || '0') > 0 && (
            <select className={`${inputClass} bg-white`} value={metodoPagoAdelanto} onChange={e => setMetodoPagoAdelanto(e.target.value as MetodoPagoVenta)}>
              {METODOS.map(m => <option key={m} value={m}>Adelanto: {METODO_PAGO_LABEL[m]}</option>)}
            </select>
          )}

          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Comunicar al cliente</span>
            <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={comunicarCliente} onChange={e => setComunicarCliente(e.target.checked)} />
          </label>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
