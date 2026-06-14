'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Tercerizacion, TercerizacionNota, TercerizacionComponente, DatoAdicional, OrdenResumen } from '@/core/types/tercerizacion';
import { ESTADO_TERCERIZACION_CONFIG, NOTA_TIPO_CONFIG, METODOS_PAGO_B2B, totalOrdenResumen } from '@/core/types/tercerizacion';
import * as service from '@/features/tercerizacion/services/tercerizacion-service';
import { descargarHojaDerivacion } from '@/features/tercerizacion/components/tercerizacion-pdf';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function valorAdicional(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(valorAdicional).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${val}`).join(' · ');
  return String(v);
}

export default function TercerizacionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { empresa } = useEmpresa();
  const permissions = usePermissions();
  const empresaId = empresa?.id;

  const [item, setItem] = useState<Tercerizacion | null>(null);
  const [notas, setNotas] = useState<TercerizacionNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const cargarNotas = useCallback(async () => {
    try { setNotas(await service.getNotas(id)); } catch { /* noop */ }
  }, [id]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const t = await service.getById(id);
      setItem(t);
      cargarNotas();
    } catch {
      setError('No se pudo cargar la tercerización');
    } finally {
      setLoading(false);
    }
  }, [id, cargarNotas]);

  useEffect(() => { cargar(); }, [cargar]);

  // Esperar también a que cargue la empresa: sin empresaId no se puede saber si
  // es enviada/recibida → badge y barra de acciones saldrían mal.
  if (loading || !empresaId) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  if (!item) {
    return (
      <div className="space-y-3">
        <button onClick={() => router.push('/dashboard/tercerizacion')} className="text-sm text-[#437EFF]">← Tercerización</button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error || 'No encontrada'}</p></div>
      </div>
    );
  }

  const cfg = ESTADO_TERCERIZACION_CONFIG[item.estado];
  const enviada = !!empresaId && item.empresaOrigenId === empresaId;
  const recibida = !!empresaId && item.empresaDestinoId === empresaId;
  const canManage = permissions.canManageOrders;
  const eq = (item.datosEquipo ?? {}) as Record<string, unknown>;
  const comps: TercerizacionComponente[] = Array.isArray(item.componentesData) ? (item.componentesData as TercerizacionComponente[]) : [];
  const adicionales: DatoAdicional[] = Array.isArray(item.datosAdicionales) ? item.datosAdicionales : [];
  const sintomas: string[] = Array.isArray(item.sintomas) ? (item.sintomas as unknown[]).map(String) : [];

  const generarPdf = async () => {
    try { await descargarHojaDerivacion(item, notas); }
    catch { setError('No se pudo generar la hoja de derivación'); }
  };

  const ejecutar = async (fn: () => Promise<unknown>, ok: string) => {
    setActing(true); setError('');
    try { await fn(); flash(ok); await cargar(); }
    catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo completar la acción');
    } finally { setActing(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.push('/dashboard/tercerizacion')} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="font-mono text-lg font-bold text-gray-900">{item.ordenOrigen?.codigo ?? 'Tercerización'}</h1>
        {cfg && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>}
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${enviada ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
          {enviada ? '↗ Enviada por ti' : '↘ Recibida'}
        </span>
        <button onClick={generarPdf} className="ml-auto rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">📄 Hoja de derivación</button>
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{msg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Empresas */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <EmpresaRow label="Origen" empresa={item.empresaOrigen} color="text-orange-600" />
        <div className="my-1 pl-3 text-green-500">↓</div>
        <EmpresaRow label="Destino" empresa={item.empresaDestino} color="text-[#004A94]" />
      </div>

      {/* Equipo / problema */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Equipo</p>
        <div className="flex flex-wrap gap-1.5">
          {['tipoEquipo', 'marcaEquipo', 'modeloEquipo', 'serieEquipo', 'condicionEquipo'].map(k => {
            const v = eq[k]; if (!v) return null;
            return <span key={k} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{String(v)}</span>;
          })}
        </div>
        {item.descripcionProblema && (
          <>
            <p className="pt-1 text-[10px] font-semibold uppercase text-gray-400">Problema</p>
            <p className="text-xs text-gray-700">{item.descripcionProblema}</p>
          </>
        )}
        {sintomas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sintomas.map((s, i) => <span key={i} className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">{s}</span>)}
          </div>
        )}
        {item.precioB2B != null && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-xs font-semibold text-gray-600">Precio B2B{item.metodoPagoB2B ? ` · ${item.metodoPagoB2B}` : ''}</span>
            <span className="text-base font-bold text-green-700">{fmt(item.precioB2B)}</span>
          </div>
        )}
      </div>

      {/* Datos adicionales */}
      {adicionales.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Datos adicionales</p>
          <div className="space-y-1">
            {adicionales.map((d, i) => {
              const val = valorAdicional(d.valor);
              if (!val) return null;
              return <div key={i} className="flex justify-between gap-3 text-xs"><span className="font-medium text-[#004A94]">{d.etiqueta}</span><span className="text-right text-gray-600">{val}</span></div>;
            })}
          </div>
        </div>
      )}

      {/* Notas origen/destino */}
      {(item.notasOrigen || item.notasDestino) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Notas</p>
          {item.notasOrigen && <p className="text-xs text-gray-600"><span className="font-semibold text-[#004A94]">Origen:</span> {item.notasOrigen}</p>}
          {item.notasDestino && <p className="text-xs text-gray-600"><span className="font-semibold text-[#004A94]">Destino:</span> {item.notasDestino}</p>}
        </div>
      )}

      {/* Componentes */}
      {comps.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Componentes ({comps.length})</p>
          <div className="space-y-1.5">
            {comps.map((c, i) => (
              <div key={i} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-700">{c.componente?.nombre || c.componente?.codigo || 'Componente'}</span>
                  {c.tipoAccion && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#004A94]">{c.tipoAccion.replace(/_/g, ' ')}</span>}
                </div>
                {c.descripcionAccion && <p className="text-[10px] text-gray-400">{c.descripcionAccion}</p>}
                {c.observaciones && <p className="text-[10px] italic text-gray-400">Obs: {c.observaciones}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Órdenes vinculadas */}
      {(item.ordenOrigen || item.ordenDestino) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Órdenes vinculadas</p>
          {item.ordenOrigen && <OrdenRow label="Orden origen" orden={item.ordenOrigen} accesible={enviada} onOpen={() => router.push(`/dashboard/servicios/${item.ordenOrigen!.id}`)} />}
          {item.ordenDestino && <OrdenRow label="Orden destino" orden={item.ordenDestino} accesible={recibida} onOpen={() => router.push(`/dashboard/servicios/${item.ordenDestino!.id}`)} />}
        </div>
      )}

      {/* Rechazo */}
      {item.motivoRechazo && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-[10px] font-semibold uppercase text-red-600">Motivo de rechazo</p>
          <p className="mt-1 text-xs text-red-700">{item.motivoRechazo}</p>
        </div>
      )}

      {/* Pago al tercero y margen (solo origen) */}
      {enviada && (item.precioB2B ?? 0) > 0 && (
        <PagoTerceroCard item={item} canManage={canManage} acting={acting}
          onPagar={(metodo) => ejecutar(() => service.pagarTercero(id, metodo), 'Pago al tercero registrado en caja')} />
      )}

      {/* Timeline */}
      <TimelineCard item={item} />

      {/* Bitácora */}
      <BitacoraCard item={item} notas={notas} canManage={canManage} onSent={cargarNotas} terId={id} />

      {/* Acciones (barra fija) */}
      {canManage && (
        <AccionesBar
          item={item} enviada={enviada} recibida={recibida} acting={acting}
          onAceptar={(notasDestino) => ejecutar(() => service.responder(id, { aceptar: true, notasDestino: notasDestino || undefined }), 'Tercerización aceptada')}
          onRechazar={(motivo) => ejecutar(() => service.responder(id, { aceptar: false, motivoRechazo: motivo || undefined }), 'Tercerización rechazada')}
          onCompletar={(precio, notasDestino) => ejecutar(() => service.completar(id, { precioB2B: precio, notasDestino: notasDestino || undefined }), 'Costo del servicio registrado')}
          onCancelar={() => ejecutar(() => service.cancelar(id), 'Solicitud cancelada')}
          onGestionar={(ordenId) => router.push(`/dashboard/servicios/${ordenId}`)}
        />
      )}
    </div>
  );
}

/* ── Empresa row ── */
function EmpresaRow({ label, empresa, color }: { label: string; empresa?: { nombre: string; logo?: string | null; rubro?: string | null; telefono?: string | null } | null; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 ${color}`}>
        {empresa?.logo ? <img src={empresa.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold">{(empresa?.nombre ?? '?')[0]}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-gray-400">{label}</p>
        <p className="truncate text-sm font-medium text-gray-900">{empresa?.nombre ?? `Empresa ${label}`}</p>
        {empresa?.rubro && <p className="text-[10px] text-gray-400">{empresa.rubro}</p>}
      </div>
      {empresa?.telefono && <span className="shrink-0 text-[11px] text-gray-400">{empresa.telefono}</span>}
    </div>
  );
}

/* ── Orden vinculada row ── */
function OrdenRow({ label, orden, accesible, onOpen }: { label: string; orden: OrdenResumen; accesible: boolean; onOpen: () => void }) {
  const content = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-mono text-xs font-bold text-gray-800">{orden.codigo}</p>
        <p className="text-[10px] text-gray-400">{label}{accesible ? ' · abrir' : ''}</p>
      </div>
      {orden.estado && <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{orden.estado}</span>}
    </div>
  );
  return accesible
    ? <button onClick={onOpen} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-[#437EFF]">{content}</button>
    : <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">{content}</div>;
}

/* ── Pago al tercero ── */
function PagoTerceroCard({ item, canManage, acting, onPagar }: { item: Tercerizacion; canManage: boolean; acting: boolean; onPagar: (metodo: string) => void }) {
  const [pickMetodo, setPickMetodo] = useState(false);
  const precio = item.precioB2B ?? 0;
  // Total REAL que cobró la empresa origen al cliente (servicio + repuestos − descuento).
  const cobrado = totalOrdenResumen(item.ordenOrigen);
  const ganancia = cobrado != null ? cobrado - precio : null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Pago al tercero y margen</p>
      <div className="space-y-1 text-xs">
        {cobrado != null && <div className="flex justify-between"><span className="text-gray-500">Cobrado al cliente</span><span className="font-medium text-green-700">{fmt(cobrado)}</span></div>}
        <div className="flex justify-between"><span className="text-gray-500">Costo tercero (B2B)</span><span className="font-medium text-orange-700">{fmt(precio)}</span></div>
        {ganancia != null && <div className="flex justify-between border-t border-gray-100 pt-1"><span className="font-semibold text-gray-700">Ganancia</span><span className="font-bold text-[#004A94]">{fmt(ganancia)}</span></div>}
      </div>
      <div className="mt-3">
        {item.pagadoB2B ? (
          <p className="text-xs font-semibold text-green-700">✓ Pagado al tercero{item.fechaPagoB2B ? ` · ${fmtFecha(item.fechaPagoB2B)}` : ''}</p>
        ) : item.estado === 'COMPLETADO' ? (
          canManage && (pickMetodo ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-gray-600">Método de pago al tercero:</p>
              <div className="flex flex-wrap gap-1.5">
                {METODOS_PAGO_B2B.map(m => (
                  <button key={m} disabled={acting} onClick={() => onPagar(m)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:border-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">{m}</button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setPickMetodo(true)} className="w-full rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">
              Registrar pago al tercero {fmt(precio)}
            </button>
          ))
        ) : (
          <p className="text-[11px] text-gray-400">El pago se podrá registrar cuando el tercero complete el servicio.</p>
        )}
      </div>
    </div>
  );
}

/* ── Timeline ── */
function TimelineCard({ item }: { item: Tercerizacion }) {
  const events: { title: string; subtitle: string; date?: string | null; done: boolean; color: string }[] = [];
  events.push({ title: 'Solicitud enviada', subtitle: item.empresaOrigen?.nombre ?? 'Empresa origen', date: item.fechaSolicitud, done: true, color: 'bg-blue-500' });
  if (item.fechaRespuesta) {
    const aceptado = item.estado === 'ACEPTADO' || item.estado === 'EN_PROCESO' || item.estado === 'COMPLETADO';
    events.push({ title: aceptado ? 'Solicitud aceptada' : 'Solicitud rechazada', subtitle: item.empresaDestino?.nombre ?? 'Empresa destino', date: item.fechaRespuesta, done: true, color: aceptado ? 'bg-green-500' : 'bg-red-500' });
  } else if (item.estado !== 'CANCELADO') {
    events.push({ title: 'Esperando respuesta', subtitle: item.empresaDestino?.nombre ?? 'Empresa destino', done: false, color: 'bg-gray-300' });
  }
  if (item.estado === 'EN_PROCESO' || item.estado === 'COMPLETADO') {
    events.push({ title: 'En proceso de reparación', subtitle: 'Equipo en taller destino', date: item.fechaRespuesta, done: true, color: 'bg-indigo-500' });
  }
  if (item.estado === 'COMPLETADO') {
    events.push({ title: 'Servicio completado', subtitle: item.precioB2B != null ? fmt(item.precioB2B) : 'Trabajo finalizado', date: item.fechaCompletado, done: true, color: 'bg-green-500' });
  }
  if (item.estado === 'CANCELADO') {
    events.push({ title: 'Solicitud cancelada', subtitle: 'Cancelada por empresa origen', date: item.fechaRespuesta, done: true, color: 'bg-gray-400' });
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase text-gray-400">Historial</p>
      <div className="space-y-0">
        {events.map((e, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`h-3 w-3 rounded-full ${e.done ? e.color : 'border-2 border-gray-300 bg-white'}`} />
              {i < events.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
            </div>
            <div className={`pb-4 ${e.done ? '' : 'opacity-50'}`}>
              <p className="text-xs font-medium text-gray-800">{e.title}</p>
              <p className="text-[11px] text-gray-500">{e.subtitle}</p>
              {e.date && <p className="text-[10px] text-gray-400">{fmtFecha(e.date)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bitácora ── */
function BitacoraCard({ item, notas, canManage, onSent, terId }: { item: Tercerizacion; notas: TercerizacionNota[]; canManage: boolean; onSent: () => void; terId: string }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'NOTA' | 'REQUERIMIENTO'>('NOTA');
  const [enviando, setEnviando] = useState(false);

  const autorLabel = (empresaAutorId: string) => {
    if (empresaAutorId === item.empresaOrigenId) return item.empresaOrigen?.nombre ?? 'Origen';
    if (empresaAutorId === item.empresaDestinoId) return item.empresaDestino?.nombre ?? 'Destino';
    return 'Empresa';
  };

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    try { await service.agregarNota(terId, { contenido, tipo }); setTexto(''); onSent(); }
    catch { /* noop */ }
    finally { setEnviando(false); }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Bitácora</p>
      {notas.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-400">Sin entradas aún. Agrega una nota o requerimiento.</p>
      ) : (
        <div className="space-y-2.5">
          {notas.map(n => {
            const c = NOTA_TIPO_CONFIG[n.tipo] ?? NOTA_TIPO_CONFIG.NOTA;
            return (
              <div key={n.id}>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${c.text} ${c.bg}`}>{c.label}</span>
                  <span className="flex-1 truncate text-[10px] text-gray-400">{autorLabel(n.empresaAutorId)}</span>
                  <span className="text-[9px] text-gray-300">{fmtFecha(n.creadoEn)}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-700">{n.contenido}</p>
              </div>
            );
          })}
        </div>
      )}
      {canManage && (
        <div className="mt-3 flex items-end gap-1.5">
          <button onClick={() => setTipo(tipo === 'REQUERIMIENTO' ? 'NOTA' : 'REQUERIMIENTO')}
            className={`shrink-0 rounded-lg px-2.5 py-2 text-[10px] font-bold ${tipo === 'REQUERIMIENTO' ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700'}`}>
            {tipo === 'REQUERIMIENTO' ? 'Req.' : 'Nota'}
          </button>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#437EFF]"
            placeholder="Escribe una nota o requerimiento..." />
          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="shrink-0 rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {enviando ? '...' : '➤'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Barra de acciones ── */
function AccionesBar({ item, enviada, recibida, acting, onAceptar, onRechazar, onCompletar, onCancelar, onGestionar }: {
  item: Tercerizacion;
  enviada: boolean;
  recibida: boolean;
  acting: boolean;
  onAceptar: (notasDestino: string) => void;
  onRechazar: (motivo: string) => void;
  onCompletar: (precio: number, notasDestino: string) => void;
  onCancelar: () => void;
  onGestionar: (ordenId: string) => void;
}) {
  const [dialog, setDialog] = useState<'aceptar' | 'rechazar' | 'completar' | null>(null);

  const pendiente = item.estado === 'PENDIENTE';
  const puedeCompletar = item.estado === 'ACEPTADO' || item.estado === 'EN_PROCESO';

  const buttons: React.ReactNode[] = [];
  if (recibida && pendiente) {
    buttons.push(
      <button key="rech" disabled={acting} onClick={() => setDialog('rechazar')} className="flex-1 rounded-lg border border-red-300 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Rechazar</button>,
      <button key="acep" disabled={acting} onClick={() => setDialog('aceptar')} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">Aceptar</button>,
    );
  }
  if (recibida && item.ordenDestino) {
    buttons.push(
      <button key="gest" disabled={acting} onClick={() => onGestionar(item.ordenDestino!.id)} className="flex-1 rounded-lg border border-[#004A94] px-4 py-2.5 text-xs font-bold text-[#004A94] hover:bg-[#004A94]/5 disabled:opacity-50">Gestionar servicio</button>,
    );
  }
  if (recibida && puedeCompletar) {
    buttons.push(
      <button key="cost" disabled={acting} onClick={() => setDialog('completar')} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">Costo del servicio</button>,
    );
  }
  if (enviada && pendiente) {
    buttons.push(
      <button key="canc" disabled={acting} onClick={() => { if (confirm('¿Cancelar esta solicitud de tercerización?')) onCancelar(); }} className="flex-1 rounded-lg border border-red-300 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Cancelar solicitud</button>,
    );
  }

  if (buttons.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-2xl gap-2">{buttons}</div>
      </div>
      {dialog === 'aceptar' && <AceptarDialog onClose={() => setDialog(null)} onConfirm={(n) => { setDialog(null); onAceptar(n); }} />}
      {dialog === 'rechazar' && <RechazarDialog onClose={() => setDialog(null)} onConfirm={(m) => { setDialog(null); onRechazar(m); }} />}
      {dialog === 'completar' && <CompletarDialog onClose={() => setDialog(null)} onConfirm={(p, n) => { setDialog(null); onCompletar(p, n); }} />}
    </>
  );
}

function ModalShell({ title, accent, children, onClose }: { title: string; accent: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function AceptarDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (notas: string) => void }) {
  const [notas, setNotas] = useState('');
  return (
    <ModalShell title="Aceptar tercerización" accent="text-green-700" onClose={onClose}>
      <p className="mt-2 text-[11px] text-gray-500">Se creará la orden de servicio en tu empresa para gestionarla.</p>
      <textarea className="mt-3 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" rows={3}
        value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas para la empresa origen (opcional): tiempo estimado, condiciones..." />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onConfirm(notas.trim())} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">Aceptar</button>
      </div>
    </ModalShell>
  );
}

function RechazarDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('');
  return (
    <ModalShell title="Rechazar tercerización" accent="text-red-700" onClose={onClose}>
      <textarea className="mt-3 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" rows={3}
        value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo del rechazo (opcional)" autoFocus />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onConfirm(motivo.trim())} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">Rechazar</button>
      </div>
    </ModalShell>
  );
}

function CompletarDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (precio: number, notas: string) => void }) {
  const [precio, setPrecio] = useState('');
  const [notas, setNotas] = useState('');
  const [err, setErr] = useState('');
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';
  return (
    <ModalShell title="Costo del servicio" accent="text-green-700" onClose={onClose}>
      <p className="mt-2 text-[11px] text-gray-500">Indica cuánto cobras por el servicio. Se le notificará a la empresa que tercerizó. Los estados del servicio se gestionan desde la orden.</p>
      <div className="mt-3 space-y-2">
        <div><label className="mb-1 block text-[10px] text-gray-400">Costo del servicio (S/)</label><input className={inputClass} type="number" step="0.01" min="0" value={precio} onChange={e => setPrecio(e.target.value)} autoFocus /></div>
        <textarea className={`${inputClass} resize-none`} rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas (opcional)" />
      </div>
      {err && <p className="mt-2 text-[11px] text-red-500">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => { const p = parseFloat(precio); if (!p || p <= 0) { setErr('Ingrese un costo válido'); return; } onConfirm(p, notas.trim()); }}
          className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">Guardar costo</button>
      </div>
    </ModalShell>
  );
}
