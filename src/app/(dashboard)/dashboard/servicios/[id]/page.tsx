'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { OrdenServicio, HistorialOS, EstadoOrdenServicio, TipoComponente, TipoAccionComponente, Tecnico } from '@/core/types/orden-servicio';
import {
  ESTADO_OS_CONFIG, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_CONFIG,
  TRANSICIONES_VALIDAS, ESTADOS_OS_COBRABLES, TIPOS_ACCION, TIPO_ACCION_LABEL, saldoOrden,
} from '@/core/types/orden-servicio';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { CampoServicio } from '@/core/types/servicio-catalogo';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';
import * as cajaService from '@/features/caja/services/caja-service';
import { DatosPersonalizadosView } from '@/features/ordenes-servicio/components/datos-personalizados-view';
import { MensajesOrden } from '@/features/ordenes-servicio/components/mensajes-orden';
import { OrdenServicioPrintMenu } from '@/features/ordenes-servicio/components/orden-servicio-print-menu';
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
  const [campos, setCampos] = useState<CampoServicio[]>([]);
  const [historial, setHistorial] = useState<HistorialOS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');
  const [transicionOpen, setTransicionOpen] = useState(false);
  const [tecnicoOpen, setTecnicoOpen] = useState(false);
  const [componenteOpen, setComponenteOpen] = useState(false);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [o, h] = await Promise.all([osService.getOrden(id), osService.getHistorial(id).catch(() => [])]);
      setOrden(o);
      setHistorial(h);
      const svId = o.servicioId ?? o.servicio?.id;
      if (svId && o.datosPersonalizados && Object.keys(o.datosPersonalizados).length > 0) {
        catalogoService.getCamposPorServicio(svId).then(setCampos).catch(() => setCampos([]));
      } else {
        setCampos([]);
      }
    } catch {
      setError('No se pudo cargar la orden');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const eliminarComponente = async (componenteId: string) => {
    if (!confirm('¿Quitar este componente de la orden?')) return;
    try { await osService.deleteComponente(id, componenteId); flash('Componente eliminado'); cargar(); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo eliminar el componente');
    }
  };

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
  const esCobrable = ESTADOS_OS_COBRABLES.includes(orden.estado) && Number(orden.costoTotal ?? 0) > 0;

  const cobrar = async () => {
    setError(null);
    try {
      const caja = await cajaService.getCajaActiva();
      if (!caja?.id) { setError('Necesitas una caja abierta para cobrar. Abre tu caja primero.'); return; }
      router.push(`/dashboard/venta-rapida?ordenServicioId=${orden.id}`);
    } catch {
      setError('Necesitas una caja abierta para cobrar.');
    }
  };
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <OrdenServicioPrintMenu orden={orden} />
          {permissions.canManageOrders && esCobrable && (
            <button onClick={cobrar}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
              Cobrar {saldo > 0.005 ? `S/ ${fmt(saldo)}` : '(pagado)'}
            </button>
          )}
          {permissions.canManageOrders && transiciones.length > 0 && (
            <button onClick={() => setTransicionOpen(true)}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">
              Cambiar estado
            </button>
          )}
        </div>
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <div><p className="text-[10px] uppercase text-gray-400">Servicio</p><p className="text-xs font-medium text-gray-700">{TIPO_SERVICIO_LABEL[orden.tipoServicio]}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Creada</p><p className="text-xs font-medium text-gray-700">{fmtFecha(orden.creadoEn)}</p></div>
        <div><p className="text-[10px] uppercase text-gray-400">Entrega</p><p className="text-xs font-medium text-gray-700">{fmtFecha(orden.fechaEntrega)}</p></div>
        <div>
          <p className="text-[10px] uppercase text-gray-400">Técnico</p>
          <p className="text-xs font-medium text-gray-700">{tecnicoNombre ?? 'Sin asignar'}</p>
          {permissions.canManageOrders && permissions.canViewUsers && (
            <button onClick={() => setTecnicoOpen(true)} className="text-[10px] font-semibold text-[#437EFF] hover:underline">
              {tecnicoNombre ? 'Cambiar' : 'Asignar'}
            </button>
          )}
        </div>
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

      {/* Datos personalizados (campos dinámicos del servicio) */}
      {orden.datosPersonalizados && Object.keys(orden.datosPersonalizados).length > 0 && (
        <DatosPersonalizadosView datos={orden.datosPersonalizados} campos={campos} />
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

      {/* Componentes */}
      {(permissions.canManageOrders || (orden.componentes ?? []).length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-400">Componentes ({(orden.componentes ?? []).length})</p>
            {permissions.canManageOrders && (
              <button onClick={() => setComponenteOpen(true)} className="text-[11px] font-semibold text-[#437EFF] hover:underline">+ Agregar</button>
            )}
          </div>
          {(orden.componentes ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">Sin componentes registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {orden.componentes!.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                  <div className="min-w-0">
                    <span className="text-gray-700">{c.componente?.tipoComponente?.nombre ?? c.componente?.marca ?? 'Componente'}{c.componente?.modelo ? ` ${c.componente.modelo}` : ''} · <span className="text-teal-600">{TIPO_ACCION_LABEL[c.tipoAccion as TipoAccionComponente] ?? c.tipoAccion}</span></span>
                    {c.descripcionAccion && <p className="text-[10px] text-gray-400">{c.descripcionAccion}</p>}
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-gray-500">{fmt((Number(c.costoAccion ?? 0)) + (Number(c.costoRepuestos ?? 0)))}</span>
                    {permissions.canManageOrders && (
                      <button onClick={() => eliminarComponente(c.id)} className="text-gray-300 hover:text-red-500">✕</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
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

      {/* Chat con el cliente */}
      {permissions.canManageOrders && <MensajesOrden ordenId={id} />}

      {transicionOpen && (
        <TransicionEstadoDialog
          orden={orden}
          transiciones={transiciones}
          onClose={() => setTransicionOpen(false)}
          onSuccess={() => { setTransicionOpen(false); flash('Estado actualizado'); cargar(); }}
        />
      )}
      {tecnicoOpen && (
        <TecnicoDialog ordenId={id} actualId={orden.tecnicoId ?? null}
          onClose={() => setTecnicoOpen(false)}
          onSuccess={() => { setTecnicoOpen(false); flash('Técnico asignado'); cargar(); }} />
      )}
      {componenteOpen && (
        <ComponenteDialog ordenId={id}
          onClose={() => setComponenteOpen(false)}
          onSuccess={() => { setComponenteOpen(false); flash('Componente agregado'); cargar(); }} />
      )}
    </div>
  );
}

/* --- Asignar técnico --- */
function TecnicoDialog({ ordenId, actualId, onClose, onSuccess }: { ordenId: string; actualId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    osService.getTecnicos()
      .then(setTecnicos)
      .catch(() => setError('No se pudieron cargar los usuarios (requiere permiso de ver usuarios)'))
      .finally(() => setLoading(false));
  }, []);

  const asignar = async (t: Tecnico) => {
    setBusyId(t.id);
    setError('');
    try { await osService.asignarTecnico(ordenId, t.id); onSuccess(); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo asignar el técnico');
      setBusyId(null);
    }
  };

  const filtrados = tecnicos.filter(t => t.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Asignar técnico</h3>
          <input className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
          ) : error ? (
            <p className="py-6 text-center text-xs text-red-500">{error}</p>
          ) : filtrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin usuarios</p>
          ) : (
            <div className="space-y-1">
              {filtrados.map(t => (
                <button key={t.id} onClick={() => asignar(t)} disabled={busyId !== null}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs hover:border-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50 ${t.id === actualId ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200'}`}>
                  <span className="text-gray-800">{t.nombre}{t.id === actualId ? ' (actual)' : ''}</span>
                  {t.rol && <span className="text-[10px] text-gray-400">{t.rol}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-3 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* --- Agregar componente (crear/elegir tipo + find-or-create + acción) --- */
const CATEGORIAS_COMP: { v: osService.CategoriaComponente; label: string }[] = [
  { v: 'HARDWARE', label: 'Hardware' },
  { v: 'SOFTWARE', label: 'Software' },
  { v: 'PERIFERICO', label: 'Periférico' },
  { v: 'ACCESORIOS', label: 'Accesorios' },
  { v: 'CONSUMIBLES', label: 'Consumibles' },
];

function ComponenteDialog({ ordenId, onClose, onSuccess }: { ordenId: string; onClose: () => void; onSuccess: () => void }) {
  const [tipos, setTipos] = useState<TipoComponente[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  // Tipo: elegir existente o crear nuevo escribiéndolo
  const [crearNuevoTipo, setCrearNuevoTipo] = useState(false);
  const [tipoComponenteId, setTipoComponenteId] = useState('');
  const [nombreTipo, setNombreTipo] = useState('');
  const [categoriaTipo, setCategoriaTipo] = useState<osService.CategoriaComponente>('HARDWARE');
  // Marca / modelo: texto llenable con sugerencias de los existentes
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [marcas, setMarcas] = useState<string[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [tipoAccion, setTipoAccion] = useState<TipoAccionComponente>('REPARAR');
  const [descripcionAccion, setDescripcionAccion] = useState('');
  const [costoAccion, setCostoAccion] = useState('');
  const [costoRepuestos, setCostoRepuestos] = useState('');
  const [garantiaMeses, setGarantiaMeses] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    osService.getTiposComponente()
      .then(t => { setTipos(t); if (t.length) setTipoComponenteId(t[0].id); else setCrearNuevoTipo(true); })
      .catch(() => setError('No se pudieron cargar los tipos de componente'))
      .finally(() => setLoadingTipos(false));
  }, []);

  // Sugerencias de marcas al elegir un tipo existente
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (crearNuevoTipo || !tipoComponenteId) { if (active) setMarcas([]); return; }
      try { const m = await osService.getMarcasComponente(tipoComponenteId); if (active) setMarcas(m); }
      catch { if (active) setMarcas([]); }
    };
    load();
    return () => { active = false; };
  }, [tipoComponenteId, crearNuevoTipo]);

  // Sugerencias de modelos al escribir la marca (debounced)
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (crearNuevoTipo || !tipoComponenteId || !marca.trim()) { if (active) setModelos([]); return; }
      try { const m = await osService.getModelosComponente(tipoComponenteId, marca.trim()); if (active) setModelos(m); }
      catch { if (active) setModelos([]); }
    }, 400);
    return () => { active = false; clearTimeout(t); };
  }, [marca, tipoComponenteId, crearNuevoTipo]);

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';
  const linkClass = 'mt-1 text-[11px] font-semibold text-[#437EFF] hover:underline';

  const submit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      // 1) Resolver el tipo (crear si es nuevo)
      let tipoId = tipoComponenteId;
      if (crearNuevoTipo) {
        if (!nombreTipo.trim()) { setError('Ingresa el nombre del tipo de componente'); setIsSubmitting(false); return; }
        const nuevo = await osService.crearTipoComponente({ nombre: nombreTipo.trim(), categoria: categoriaTipo });
        tipoId = nuevo.id;
      } else if (!tipoId) {
        setError('Selecciona el tipo de componente'); setIsSubmitting(false); return;
      }
      // 2) Buscar o crear el componente físico
      const comp = await osService.findOrCreateComponente({ tipoComponenteId: tipoId, marca: marca.trim() || undefined, modelo: modelo.trim() || undefined });
      // 3) Agregarlo a la orden
      await osService.addComponente(ordenId, {
        componenteId: comp.id,
        tipoAccion,
        descripcionAccion: descripcionAccion.trim() || undefined,
        costoAccion: costoAccion ? parseFloat(costoAccion) : undefined,
        costoRepuestos: costoRepuestos ? parseFloat(costoRepuestos) : undefined,
        garantiaMeses: garantiaMeses ? parseInt(garantiaMeses, 10) : undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo agregar el componente');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Agregar componente</h3>
        {loadingTipos ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Tipo de componente: elegir existente o crear nuevo */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de componente *</label>
              {!crearNuevoTipo && tipos.length > 0 ? (
                <>
                  <select className={`${inputClass} bg-white`} value={tipoComponenteId} onChange={e => setTipoComponenteId(e.target.value)}>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.categoria ? ` (${t.categoria})` : ''}</option>)}
                  </select>
                  <button type="button" className={linkClass} onClick={() => { setCrearNuevoTipo(true); setMarca(''); setModelo(''); }}>+ Crear nuevo tipo</button>
                </>
              ) : (
                <>
                  <input className={inputClass} value={nombreTipo} onChange={e => setNombreTipo(e.target.value)} placeholder="Ej: Pantalla, Disco duro, Teclado..." autoFocus />
                  <select className={`${inputClass} mt-2 bg-white`} value={categoriaTipo} onChange={e => setCategoriaTipo(e.target.value as osService.CategoriaComponente)}>
                    {CATEGORIAS_COMP.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                  {tipos.length > 0 && (
                    <button type="button" className={linkClass} onClick={() => setCrearNuevoTipo(false)}>Elegir tipo existente</button>
                  )}
                </>
              )}
            </div>
            {/* Marca / modelo: texto llenable con sugerencias */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
                <input className={inputClass} value={marca} onChange={e => setMarca(e.target.value)} list="marcas-comp" placeholder="Samsung, HP..." />
                <datalist id="marcas-comp">{marcas.map(m => <option key={m} value={m} />)}</datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Modelo</label>
                <input className={inputClass} value={modelo} onChange={e => setModelo(e.target.value)} list="modelos-comp" placeholder="Galaxy S24..." />
                <datalist id="modelos-comp">{modelos.map(m => <option key={m} value={m} />)}</datalist>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Acción *</label>
              <select className={`${inputClass} bg-white`} value={tipoAccion} onChange={e => setTipoAccion(e.target.value as TipoAccionComponente)}>
                {TIPOS_ACCION.map(a => <option key={a} value={a}>{TIPO_ACCION_LABEL[a]}</option>)}
              </select>
            </div>
            <input className={inputClass} value={descripcionAccion} onChange={e => setDescripcionAccion(e.target.value)} placeholder="Descripción de la acción (opcional)" />
            <div className="grid grid-cols-3 gap-2">
              <div><label className="mb-1 block text-[10px] text-gray-400">Costo M.O.</label><input className={inputClass} type="number" step="0.01" min="0" value={costoAccion} onChange={e => setCostoAccion(e.target.value)} /></div>
              <div><label className="mb-1 block text-[10px] text-gray-400">Repuestos</label><input className={inputClass} type="number" step="0.01" min="0" value={costoRepuestos} onChange={e => setCostoRepuestos(e.target.value)} /></div>
              <div><label className="mb-1 block text-[10px] text-gray-400">Garantía (m)</label><input className={inputClass} type="number" step="1" min="0" value={garantiaMeses} onChange={e => setGarantiaMeses(e.target.value)} /></div>
            </div>
            <p className="text-[10px] text-gray-400">Los costos de componentes no modifican el costo total de la orden (se ajusta en la transición de estado).</p>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting || loadingTipos}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
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
