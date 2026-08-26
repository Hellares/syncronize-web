'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { TipoServicio, PrioridadServicio, CreateOrdenServicioDto } from '@/core/types/orden-servicio';
import { TIPOS_SERVICIO, PRIORIDADES, TIPO_SERVICIO_LABEL, PRIORIDAD_LABEL } from '@/core/types/orden-servicio';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { Servicio, CampoServicio } from '@/core/types/servicio-catalogo';
import type { ClienteEmpresaContacto } from '@/core/types/cliente-empresa';
import { DynamicFieldsForm, seedDefaults, validarCamposRequeridos, limpiarDatos } from '@/features/ordenes-servicio/components/dynamic-fields-form';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';
import { buscarClientes } from '@/features/cotizacion/services/cliente-service';
import ClientePersonaFormDialog from '@/features/clientes/components/ClientePersonaFormDialog';
import ClienteEmpresaFormDialog from '@/features/clientes/components/ClienteEmpresaFormDialog';
import type { ClientePersona } from '@/core/types/cliente';
import type { ClienteEmpresa } from '@/core/types/cliente-empresa';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import { apiClient } from '@/core/api/client';

// Estilo estándar de la web (ver feedback_web_estilo_input_std): 30px, r6,
// fondo zinc, ring azul, texto #004A94; al focus SOLO cambia la sombra.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const INPUT_STD_TA =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200 resize-none';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';

const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

interface ClienteSel { id: string; tipo: 'empresa' | 'persona'; nombre: string; documento: string; email?: string; telefono?: string; direccion?: string }

/** Iniciales para el avatar del cliente elegido. */
function iniciales(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || '?';
}

/* Íconos: SVG en línea, trazo de 1.8 sobre grilla de 24, para que escalen y
   tomen el color del bloque. */
const IconUsuario = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#004A94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLlave = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#004A94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const IconTarjeta = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#004A94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" />
  </svg>
);
const IconNota = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z" /><path d="M15 3v6h6" />
  </svg>
);

/**
 * Bloque del formulario.
 *
 * Reemplaza a la tarjeta numerada: el número no aportaba orden (nadie llena
 * esto en secuencia) y encima se corría solo cuando aparecía la sección de
 * plantilla, que es opcional.
 */
function Bloque({ titulo, icon, children }: { titulo: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 pt-3">
        {icon}
        <h2 className="text-[11px] font-bold tracking-wide text-[#004A94]">{titulo}</h2>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

/** Fila del ticket: etiqueta angosta a la izquierda, valor que se recorta. */
function ResumenFila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[52px] shrink-0 text-[10px] text-gray-400">{etiqueta}</span>
      <span className="truncate text-[11px] font-medium text-gray-700">{valor}</span>
    </div>
  );
}

export default function NuevaOrdenPage() {
  const router = useRouter();
  const { empresa, sedes } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const permissions = usePermissions();

  const [cliente, setCliente] = useState<ClienteSel | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClienteSel[]>([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [personaDialog, setPersonaDialog] = useState(false);
  const [empresaDialog, setEmpresaDialog] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contacto de la empresa cliente: quién entrega/recibe el equipo. El
  // backend lo acepta (contactoClienteEmpresaId) y Flutter ya lo pedía.
  // Se guarda junto al id del cliente al que pertenecen: así los contactos
  // del cliente anterior se descartan al derivar, sin un setState de
  // limpieza en el efecto (que además mostraba los viejos por un frame).
  const [contactosDe, setContactosDe] = useState<{ clienteId: string; lista: ClienteEmpresaContacto[] } | null>(null);
  const [contactoId, setContactoId] = useState('');

  const [sedeId, setSedeId] = useState('');
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>('REPARACION');
  const [prioridad, setPrioridad] = useState<PrioridadServicio>('NORMAL');

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

  // Aviso de mantenimiento: Flutter lo ofrece al crear; la web lo ignoraba.
  const [incluirAviso, setIncluirAviso] = useState(true);
  const [fechaAviso, setFechaAviso] = useState('');

  /** Fecha PACTADA con el cliente (yyyy-MM-dd del input date). */
  const [fechaPrometida, setFechaPrometida] = useState('');

  // Notas arranca plegado: casi siempre queda vacio y ocupaba lo mismo
  // que los campos obligatorios.
  const [notasAbierto, setNotasAbierto] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sede por defecto: la primera del contexto (la orden se registra en una).
  // Derivada, no un setState en efecto: así el <select> ya nace elegido.
  const sedeIdEfectiva = sedeId || sedes[0]?.id || '';

  const onPersonaCreada = (_msg: string, c?: ClientePersona) => {
    setPersonaDialog(false);
    if (c) setCliente({ id: c.id, tipo: 'persona', nombre: c.nombreCompleto || [c.nombres, c.apellidos].filter(Boolean).join(' '), documento: c.dni ?? '', email: c.email ?? undefined, telefono: c.telefono ?? undefined, direccion: c.direccion ?? undefined });
  };
  const onEmpresaCreada = (_msg: string, c?: ClienteEmpresa) => {
    setEmpresaDialog(false);
    if (c) setCliente({ id: c.id, tipo: 'empresa', nombre: c.nombreComercial || c.razonSocial, documento: c.numeroDocumento ?? '', email: c.email ?? undefined, telefono: c.telefono ?? undefined, direccion: c.direccion ?? undefined });
  };
  const docBuscado = /^\d+$/.test(clienteSearch.trim()) ? clienteSearch.trim() : '';

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

  useEffect(() => { catalogoService.getServicios({ limit: 200 }).then(setServicios).catch(() => {}); }, []);

  // Contactos solo aplican a clientes EMPRESA. Best-effort: si falla, el
  // selector no aparece y la orden se crea igual.
  useEffect(() => {
    if (cliente?.tipo !== 'empresa' || !empresaId) return;
    const clienteId = cliente.id;
    let vigente = true;
    apiClient
      .get<{ contactos?: ClienteEmpresaContacto[] }>(
        `/empresas/${empresaId}/clientes-empresa/${clienteId}`,
      )
      .then((r) => {
        if (!vigente) return; // cambió de cliente mientras respondía
        const cs = r.data?.contactos ?? [];
        setContactosDe({ clienteId, lista: cs });
        // Se preselecciona el principal: es quien firma en la mayoría de casos.
        const principal = cs.find((c) => c.esPrincipal) ?? cs[0];
        setContactoId(principal?.id ?? '');
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [cliente, empresaId]);

  // Solo valen si son del cliente actualmente elegido.
  const contactos = contactosDe && cliente && contactosDe.clienteId === cliente.id ? contactosDe.lista : [];
  const contactoIdValido = contactos.some((c) => c.id === contactoId) ? contactoId : '';

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

  // Cálculo en vivo: el usuario ve el saldo antes de crear, no después.
  const totales = useMemo(() => {
    const costo = parseFloat(costoTotal || '0') || 0;
    const desc = parseFloat(descuento || '0') || 0;
    const adel = parseFloat(adelanto || '0') || 0;
    const neto = Math.max(0, costo - desc);
    return { costo, desc, adel, neto, saldo: Math.max(0, neto - adel) };
  }, [costoTotal, descuento, adelanto]);

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
        empresaId,
        tipoServicio,
        prioridad,
        ...(sedeIdEfectiva ? { sedeId: sedeIdEfectiva } : {}),
        ...(servicioId ? { servicioId } : {}),
        ...(Object.keys(datosLimpios).length > 0 ? { datosPersonalizados: datosLimpios } : {}),
        ...(cliente?.tipo === 'persona' ? { clienteId: cliente.id } : {}),
        ...(cliente?.tipo === 'empresa' ? { clienteEmpresaId: cliente.id } : {}),
        ...(cliente?.tipo === 'empresa' && contactoIdValido ? { contactoClienteEmpresaId: contactoIdValido } : {}),
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
        ...(incluirAviso ? {} : { incluirAvisoMantenimiento: false }),
        ...(incluirAviso && fechaAviso ? { fechaAvisoPersonalizado: fechaAviso } : {}),
        // Fin del día LOCAL → ISO con zona. Mandar "2026-08-05" pelado lo lee
        // el backend como medianoche UTC = 04/08 19:00 en Perú (un día menos),
        // y además vencería apenas empieza el día pactado.
        ...(fechaPrometida
          ? { fechaPrometida: new Date(`${fechaPrometida}T23:59:59`).toISOString() }
          : {}),
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

  const servicioSel = servicios.find(s => s.id === servicioId);

  return (
    <div className="mx-auto max-w-6xl pb-6">
      {/* Cabecera: el título y la acción viven juntos, no en extremos opuestos
          de la pantalla. Antes el botón vivía al fondo del resumen lateral. */}
      <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => router.back()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200">←</button>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight text-gray-900">Nueva orden de servicio</h1>
          <p className="text-[11px] text-gray-400">Recepción de equipo · los campos con <span className="text-red-500">*</span> son obligatorios</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={() => router.back()} disabled={isSubmitting}
            className="rounded-md border border-gray-200 px-3.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-md bg-[#004A94] px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Columna de trabajo ── */}
        <div className="space-y-3.5 lg:col-span-2">

          {/* RECEPCIÓN — cliente y equipo se llenan juntos, en la misma
              conversación con el cliente en el mostrador. */}
          <Bloque titulo="RECEPCIÓN" icon={<IconUsuario />}>
            {cliente ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#004A94] text-[13px] font-bold text-white">
                    {iniciales(cliente.nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-blue-900">{cliente.nombre}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                        {cliente.tipo === 'empresa' ? 'RUC' : 'DNI'} {cliente.documento || 's/doc'}
                      </span>
                      {cliente.telefono && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">{cliente.telefono}</span>}
                      {cliente.email && <span className="max-w-[180px] truncate rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">{cliente.email}</span>}
                      {cliente.direccion && <span className="max-w-[180px] truncate rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">{cliente.direccion}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setCliente(null); setClienteSearch(''); }}
                    className="shrink-0 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100">Cambiar</button>
                </div>
              </div>
            ) : (
              <div>
                <label className={LABEL}>
                  Cliente <span className="font-normal text-gray-400">— opcional, puede ser una orden sin cliente registrado</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input className={INPUT_STD} value={clienteSearch} onChange={e => buscarCliente(e.target.value)}
                      placeholder="Buscar por nombre, DNI o RUC..." />
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
                  <button type="button" onClick={() => setPersonaDialog(true)}
                    className="h-[30px] shrink-0 rounded-[6px] border border-blue-200 px-3 text-[11px] font-medium text-[#004A94] hover:bg-blue-50">+ Persona</button>
                  <button type="button" onClick={() => setEmpresaDialog(true)}
                    className="h-[30px] shrink-0 rounded-[6px] border border-blue-200 px-3 text-[11px] font-medium text-[#004A94] hover:bg-blue-50">+ Empresa</button>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Si no existe, se crea acá: busca en RENIEC/SUNAT por DNI o RUC.</p>
              </div>
            )}

            {/* Contacto: solo para clientes empresa */}
            {cliente?.tipo === 'empresa' && contactos.length > 0 && (
              <div className="mt-3">
                <label className={LABEL}>Contacto que entrega el equipo</label>
                <select className={INPUT_STD} value={contactoIdValido} onChange={e => setContactoId(e.target.value)}>
                  <option value="">Sin contacto específico</option>
                  {contactos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.cargo ? ` — ${c.cargo}` : ''}{c.esPrincipal ? ' (principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="my-3.5 h-px bg-gray-100" />

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className={LABEL}>Tipo de equipo</label><input className={INPUT_STD} value={tipoEquipo} onChange={e => setTipoEquipo(e.target.value)} placeholder="Laptop, impresora..." /></div>
              <div><label className={LABEL}>Marca</label><input className={INPUT_STD} value={marcaEquipo} onChange={e => setMarcaEquipo(e.target.value)} placeholder="Dell, HP..." /></div>
              <div><label className={LABEL}>N.° de serie</label><input className={INPUT_STD} value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} placeholder="Serie o IMEI" /></div>
              <div><label className={LABEL}>Condición al recibir</label><input className={INPUT_STD} value={condicionEquipo} onChange={e => setCondicionEquipo(e.target.value)} placeholder="Rayado, sin cargador..." /></div>
            </div>
          </Bloque>

          {/* EL TRABAJO */}
          <Bloque titulo="EL TRABAJO" icon={<IconLlave />}>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Servicio del catálogo</label>
                <select className={INPUT_STD} value={servicioId} onChange={e => elegirServicio(e.target.value)}>
                  <option value="">Sin servicio del catálogo</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.precio != null ? ` · S/ ${Number(s.precio).toFixed(2)}` : ''}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-gray-400">Elegirlo trae su precio y los campos de su plantilla.</p>
              </div>

              <div className={`grid gap-2.5 ${sedes.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <div>
                  <label className={LABEL}>Tipo de servicio <span className="text-red-500">*</span></label>
                  <select className={INPUT_STD} value={tipoServicio} onChange={e => setTipoServicio(e.target.value as TipoServicio)}>
                    {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Prioridad</label>
                  <select className={INPUT_STD} value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadServicio)}>
                    {PRIORIDADES.map(p => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
                  </select>
                </div>
                {sedes.length > 1 && (
                  <div>
                    <label className={LABEL}>Sede</label>
                    <select className={INPUT_STD} value={sedeIdEfectiva} onChange={e => setSedeId(e.target.value)}>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* El compromiso se pacta junto al problema, en el mostrador:
                  por eso van lado a lado y no en secciones distintas. */}
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Problema reportado</label>
                  <textarea className={INPUT_STD_TA} rows={3} value={descripcionProblema} onChange={e => setDescripcionProblema(e.target.value)}
                    placeholder="Qué dice el cliente que le pasa al equipo" />
                </div>
                <div>
                  <label className={LABEL}>F. Solución (opcional)</label>
                  <input className={INPUT_STD} type="date" value={fechaPrometida}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setFechaPrometida(e.target.value)} />
                  <p className="mt-1 text-[10px] leading-snug text-gray-400">
                    Para cuándo se le prometió. Si se pasa y no se entregó, la orden sale como atrasada.
                  </p>
                </div>
              </div>

              {/* Campos de la plantilla: bloque anidado, para que se lea como
                  "lo que pide este servicio" y no como más campos sueltos. */}
              {campos.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                  <div className="mb-2.5 flex items-baseline gap-2">
                    <span className="text-[10px] font-bold tracking-wide text-gray-500">DATOS DE LA PLANTILLA</span>
                    {servicioSel && <span className="truncate text-[10px] text-gray-400">{servicioSel.nombre}</span>}
                  </div>
                  <DynamicFieldsForm campos={campos} values={datos}
                    onChange={(nombre, v) => setDatos(d => ({ ...d, [nombre]: v }))} />
                </div>
              )}
            </div>
          </Bloque>

          {/* COSTOS Y ADELANTO */}
          <Bloque titulo="COSTOS Y ADELANTO" icon={<IconTarjeta />}>
            <div className={`grid gap-2.5 ${totales.adel > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div><label className={LABEL}>Costo total</label><input className={`${INPUT_STD} text-right`} type="number" step="0.01" min="0" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} placeholder="0.00" /></div>
              <div><label className={LABEL}>Descuento</label><input className={`${INPUT_STD} text-right`} type="number" step="0.01" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0.00" /></div>
              <div><label className={LABEL}>Adelanto</label><input className={`${INPUT_STD} text-right`} type="number" step="0.01" min="0" value={adelanto} onChange={e => setAdelanto(e.target.value)} placeholder="0.00" /></div>
              {totales.adel > 0 && (
                <div>
                  <label className={LABEL}>Método del adelanto <span className="text-red-500">*</span></label>
                  <select className={INPUT_STD} value={metodoPagoAdelanto} onChange={e => setMetodoPagoAdelanto(e.target.value as MetodoPagoVenta)}>
                    {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
                  </select>
                </div>
              )}
            </div>
            {totales.adel > 0 && (
              <p className="mt-2.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-700">
                El adelanto entra a la caja abierta del usuario.
              </p>
            )}
          </Bloque>

          {/* NOTAS — plegado: casi siempre queda vacío y ocupaba lo mismo que
              lo obligatorio. */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button type="button" onClick={() => setNotasAbierto(v => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left">
              <IconNota />
              <span className="text-[11px] font-bold tracking-wide text-gray-500">NOTAS Y SEGUIMIENTO</span>
              <span className="truncate text-[10px] text-gray-400">
                {incluirAviso ? 'notas internas · aviso de mantenimiento activo' : 'notas internas · sin aviso'}
              </span>
              <span className={`ml-auto text-gray-400 transition-transform ${notasAbierto ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {notasAbierto && (
              <div className="border-t border-gray-100 px-4 py-3.5">
                <div>
                  <label className={LABEL}>Notas internas</label>
                  <textarea className={INPUT_STD_TA} rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Visible para el equipo, no para el cliente" />
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 p-2.5">
                  <input type="checkbox" className="mt-0.5 accent-[#004A94]" checked={incluirAviso} onChange={e => setIncluirAviso(e.target.checked)} />
                  <span className="text-[11px] text-gray-600">
                    <span className="font-medium text-gray-800">Programar aviso de mantenimiento</span><br />
                    Al entregar el equipo se agenda un recordatorio para volver a contactar al cliente.
                  </span>
                </label>
                {incluirAviso && (
                  <div className="mt-2">
                    <label className={LABEL}>Fecha del aviso (opcional)</label>
                    <input className={INPUT_STD} type="date" value={fechaAviso} onChange={e => setFechaAviso(e.target.value)} />
                    <p className="mt-1 text-[10px] text-gray-400">Vacío = la calcula el sistema según el tipo de servicio.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Ticket: la plata primero, el detalle después ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold tracking-wide text-gray-400">
              {totales.adel > 0 ? 'SALDO AL ENTREGAR' : 'TOTAL'}
            </p>
            <p className="mt-0.5 text-[30px] font-bold leading-none tracking-tight text-[#004A94] tabular-nums">
              S/ {(totales.adel > 0 ? totales.saldo : totales.neto).toFixed(2)}
            </p>

            <div className="mt-3.5 space-y-1.5 border-t border-gray-100 pt-3 text-[11px]">
              <div className="flex justify-between"><span className="text-gray-400">Costo</span><span className="tabular-nums text-gray-700">S/ {totales.costo.toFixed(2)}</span></div>
              {totales.desc > 0 && <div className="flex justify-between"><span className="text-gray-400">Descuento</span><span className="tabular-nums text-red-500">− S/ {totales.desc.toFixed(2)}</span></div>}
              {totales.adel > 0 && <div className="flex justify-between"><span className="text-gray-400">Adelanto</span><span className="tabular-nums text-green-600">− S/ {totales.adel.toFixed(2)}</span></div>}
            </div>

            <div className="mt-3.5 space-y-1.5 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-bold tracking-wide text-gray-400">LO QUE SE REGISTRA</p>
              <ResumenFila etiqueta="Cliente" valor={cliente?.nombre ?? 'Sin cliente'} />
              <ResumenFila etiqueta="Equipo" valor={[tipoEquipo, marcaEquipo].filter(Boolean).join(' ') || '—'} />
              <ResumenFila etiqueta="Servicio" valor={servicioSel?.nombre ?? TIPO_SERVICIO_LABEL[tipoServicio]} />
              <ResumenFila etiqueta="Prioridad" valor={PRIORIDAD_LABEL[prioridad]} />
              {fechaPrometida && <ResumenFila etiqueta="Entrega" valor={fechaPrometida.split('-').reverse().join('/')} />}
            </div>
          </div>
        </div>
      </div>

      <ClientePersonaFormDialog isOpen={personaDialog} initialDni={docBuscado.length > 0 && docBuscado.length <= 8 ? docBuscado : undefined}
        onClose={() => setPersonaDialog(false)} onSuccess={onPersonaCreada} />
      <ClienteEmpresaFormDialog isOpen={empresaDialog} empresaId={empresaId} initialRuc={docBuscado.length > 0 && docBuscado.length <= 11 ? docBuscado : undefined}
        onClose={() => setEmpresaDialog(false)} onSuccess={onEmpresaCreada} />
    </div>
  );
}
