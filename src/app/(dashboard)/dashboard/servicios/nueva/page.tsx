'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { TipoServicio, PrioridadServicio, CreateOrdenServicioDto } from '@/core/types/orden-servicio';
import { TIPOS_SERVICIO, PRIORIDADES, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL } from '@/core/types/orden-servicio';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { Servicio, CampoServicio } from '@/core/types/servicio-catalogo';
import { DynamicFieldsForm, seedDefaults, validarCamposRequeridos, limpiarDatos } from '@/features/ordenes-servicio/components/dynamic-fields-form';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';
import { buscarClientes } from '@/features/cotizacion/services/cliente-service';
import ClientePersonaFormDialog from '@/features/clientes/components/ClientePersonaFormDialog';
import ClienteEmpresaFormDialog from '@/features/clientes/components/ClienteEmpresaFormDialog';
import type { ClientePersona } from '@/core/types/cliente';
import type { ClienteEmpresa } from '@/core/types/cliente-empresa';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

interface ClienteSel { id: string; tipo: 'empresa' | 'persona'; nombre: string; documento: string }

export default function NuevaOrdenPage() {
  const router = useRouter();
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const permissions = usePermissions();

  const [cliente, setCliente] = useState<ClienteSel | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClienteSel[]>([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [personaDialog, setPersonaDialog] = useState(false);
  const [empresaDialog, setEmpresaDialog] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPersonaCreada = (_msg: string, c?: ClientePersona) => {
    setPersonaDialog(false);
    if (c) setCliente({ id: c.id, tipo: 'persona', nombre: c.nombreCompleto || [c.nombres, c.apellidos].filter(Boolean).join(' '), documento: c.dni ?? '' });
  };
  const onEmpresaCreada = (_msg: string, c?: ClienteEmpresa) => {
    setEmpresaDialog(false);
    if (c) setCliente({ id: c.id, tipo: 'empresa', nombre: c.nombreComercial || c.razonSocial, documento: c.numeroDocumento ?? '' });
  };

  const [tipoServicio, setTipoServicio] = useState<TipoServicio>('REPARACION');
  const [prioridad, setPrioridad] = useState<PrioridadServicio>('NORMAL');

  // Servicio del catálogo + campos dinámicos
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState('');
  const [campos, setCampos] = useState<CampoServicio[]>([]);
  const [datos, setDatos] = useState<Record<string, unknown>>({});
  const [tipoEquipo, setTipoEquipo] = useState('');
  const [marcaEquipo, setMarcaEquipo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [condicionEquipo, setCondicionEquipo] = useState('');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [notas, setNotas] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [descuento, setDescuento] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [metodoPagoAdelanto, setMetodoPagoAdelanto] = useState<MetodoPagoVenta>('EFECTIVO');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buscarCliente = (q: string) => {
    setClienteSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setClienteResultados([]); setClienteOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await buscarClientes(empresaId, q.trim());
        setClienteResultados(res as ClienteSel[]);
        setClienteOpen(true);
      } catch { setClienteResultados([]); }
    }, 350);
  };

  // Catálogo de servicios para el selector
  useEffect(() => { catalogoService.getServicios({ limit: 200 }).then(setServicios).catch(() => {}); }, []);

  const elegirServicio = async (id: string) => {
    setServicioId(id);
    setDatos({});
    setCampos([]);
    const sv = servicios.find(s => s.id === id);
    if (sv?.tipoServicio) setTipoServicio(sv.tipoServicio);
    if (sv?.precio != null && !costoTotal) setCostoTotal(String(sv.precio));
    if (id) {
      try {
        const cs = await catalogoService.getCamposPorServicio(id);
        setCampos(cs);
        setDatos(seedDefaults(cs));
      } catch { /* sin plantilla */ }
    }
  };

  const handleSubmit = async () => {
    setError('');
    const costo = costoTotal ? parseFloat(costoTotal) : undefined;
    const desc = descuento ? parseFloat(descuento) : undefined;
    const adel = adelanto ? parseFloat(adelanto) : undefined;
    if (costo != null && (adel ?? 0) + (desc ?? 0) > costo) {
      setError('Adelanto + descuento no puede superar el costo total');
      return;
    }
    const reqErr = validarCamposRequeridos(campos, datos);
    if (reqErr) { setError(reqErr); return; }
    setIsSubmitting(true);
    try {
      const datosLimpios = limpiarDatos(datos);
      const dto: CreateOrdenServicioDto = {
        tipoServicio,
        prioridad,
        ...(servicioId ? { servicioId } : {}),
        ...(Object.keys(datosLimpios).length > 0 ? { datosPersonalizados: datosLimpios } : {}),
        ...(cliente?.tipo === 'persona' ? { clienteId: cliente.id } : {}),
        ...(cliente?.tipo === 'empresa' ? { clienteEmpresaId: cliente.id } : {}),
        tipoEquipo: tipoEquipo.trim() || undefined,
        marcaEquipo: marcaEquipo.trim() || undefined,
        numeroSerie: numeroSerie.trim() || undefined,
        condicionEquipo: condicionEquipo.trim() || undefined,
        descripcionProblema: descripcionProblema.trim() || undefined,
        notas: notas.trim() || undefined,
        costoTotal: costo,
        descuento: desc,
        adelanto: adel,
        ...(adel && adel > 0 ? { metodoPagoAdelanto } : {}),
      };
      const orden = await osService.crearOrden(dto);
      router.push(`/dashboard/servicios/${orden.id}`);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo crear la orden');
      setIsSubmitting(false);
    }
  };

  if (!permissions.canManageOrders) {
    return <div className="py-20 text-center text-gray-400">No tienes permiso para crear órdenes de servicio.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-900">Nueva orden de servicio</h1>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Cliente */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Cliente</h2>
        {cliente ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-green-800">{cliente.nombre}</p>
              <p className="text-[11px] text-green-700">{cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'} · {cliente.documento || 's/doc'}</p>
            </div>
            <button onClick={() => { setCliente(null); setClienteSearch(''); }} className="text-xs text-green-600 hover:text-green-800">Cambiar</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <input className={inputClass} value={clienteSearch} onChange={e => buscarCliente(e.target.value)}
                placeholder="Buscar cliente por nombre o documento (opcional)..." />
              {clienteOpen && clienteResultados.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {clienteResultados.map(c => (
                    <button key={`${c.tipo}-${c.id}`} type="button" onClick={() => { setCliente(c); setClienteOpen(false); }}
                      className="block w-full border-b border-gray-50 px-3 py-2 text-left text-xs hover:bg-[#437EFF]/5 last:border-0">
                      <span className={`mr-1 rounded px-1 text-[9px] font-bold ${c.tipo === 'empresa' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{c.tipo === 'empresa' ? 'E' : 'P'}</span>
                      {c.nombre} <span className="text-gray-400">{c.documento}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setPersonaDialog(true)}
                className="flex-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#437EFF] hover:text-[#437EFF]">+ Nueva persona</button>
              <button type="button" onClick={() => setEmpresaDialog(true)}
                className="flex-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#437EFF] hover:text-[#437EFF]">+ Nueva empresa</button>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">Si el cliente no existe, créalo aquí (con búsqueda RENIEC/SUNAT por DNI/RUC).</p>
          </>
        )}
      </section>

      {/* Equipo */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Equipo</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Tipo de equipo</label><input className={inputClass} value={tipoEquipo} onChange={e => setTipoEquipo(e.target.value)} placeholder="Laptop, impresora..." /></div>
          <div><label className={labelClass}>Marca</label><input className={inputClass} value={marcaEquipo} onChange={e => setMarcaEquipo(e.target.value)} placeholder="Dell, HP..." /></div>
          <div><label className={labelClass}>N° de serie</label><input className={inputClass} value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} /></div>
          <div><label className={labelClass}>Condición al recibir</label><input className={inputClass} value={condicionEquipo} onChange={e => setCondicionEquipo(e.target.value)} /></div>
        </div>
      </section>

      {/* Servicio */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Servicio</h2>
        {servicios.length > 0 && (
          <div className="mb-3">
            <label className={labelClass}>Servicio del catálogo (opcional)</label>
            <select className={selectClass} value={servicioId} onChange={e => elegirServicio(e.target.value)}>
              <option value="">Sin servicio del catálogo</option>
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.precio != null ? ` · S/ ${Number(s.precio).toFixed(2)}` : ''}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo de servicio *</label>
            <select className={selectClass} value={tipoServicio} onChange={e => setTipoServicio(e.target.value as TipoServicio)}>
              {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prioridad</label>
            <select className={selectClass} value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadServicio)}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className={labelClass}>Problema reportado</label>
          <textarea className={`${inputClass} resize-none`} rows={2} value={descripcionProblema} onChange={e => setDescripcionProblema(e.target.value)} />
        </div>
        <div className="mt-3">
          <label className={labelClass}>Notas</label>
          <input className={inputClass} value={notas} onChange={e => setNotas(e.target.value)} />
        </div>

        {/* Campos dinámicos de la plantilla del servicio */}
        {campos.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <DynamicFieldsForm campos={campos} values={datos}
              onChange={(nombre, v) => setDatos(d => ({ ...d, [nombre]: v }))} />
          </div>
        )}
      </section>

      {/* Costos */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Costos (opcional)</h2>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelClass}>Costo total</label><input className={inputClass} type="number" step="0.01" min="0" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} placeholder="0.00" /></div>
          <div><label className={labelClass}>Descuento</label><input className={inputClass} type="number" step="0.01" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0.00" /></div>
          <div><label className={labelClass}>Adelanto</label><input className={inputClass} type="number" step="0.01" min="0" value={adelanto} onChange={e => setAdelanto(e.target.value)} placeholder="0.00" /></div>
        </div>
        {parseFloat(adelanto || '0') > 0 && (
          <div className="mt-3">
            <label className={labelClass}>Método de pago del adelanto</label>
            <select className={selectClass} value={metodoPagoAdelanto} onChange={e => setMetodoPagoAdelanto(e.target.value as MetodoPagoVenta)}>
              {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-amber-600">El adelanto se registra en la caja abierta del usuario.</p>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2 pb-4">
        <button onClick={() => router.back()} disabled={isSubmitting}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={isSubmitting}
          className="rounded-lg bg-[#004A94] px-5 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          {isSubmitting ? 'Creando...' : 'Crear orden'}
        </button>
      </div>

      <ClientePersonaFormDialog isOpen={personaDialog} onClose={() => setPersonaDialog(false)} onSuccess={onPersonaCreada} />
      <ClienteEmpresaFormDialog isOpen={empresaDialog} empresaId={empresaId} onClose={() => setEmpresaDialog(false)} onSuccess={onEmpresaCreada} />
    </div>
  );
}
