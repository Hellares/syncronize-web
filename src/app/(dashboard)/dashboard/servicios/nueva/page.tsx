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

/** Tarjeta de sección con título e índice, para que el formulario se lea. */
function Seccion({ n, titulo, hint, children }: { n: number; titulo: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004A94] text-[10px] font-bold text-white">{n}</span>
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </section>
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
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg border border-gray-200 px-2 py-1 text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva orden de servicio</h1>
          <p className="text-[11px] text-gray-400">Registra el equipo, el servicio y el adelanto. Los campos con * son obligatorios.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Columna del formulario ── */}
        <div className="space-y-4 lg:col-span-2">
          <Seccion n={1} titulo="Cliente" hint="opcional — puede ser una orden sin cliente registrado">
            {cliente ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-green-800">{cliente.nombre}</p>
                    <p className="text-[11px] text-green-700">{cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'} · {cliente.documento || 's/doc'}</p>
                  </div>
                  <button onClick={() => { setCliente(null); setClienteSearch(''); }} className="shrink-0 text-xs text-green-600 hover:text-green-800">Cambiar</button>
                </div>
                {(cliente.telefono || cliente.email || cliente.direccion) && (
                  <div className="mt-1.5 space-y-0.5 border-t border-green-200/60 pt-1.5 text-[11px] text-green-700">
                    {cliente.telefono && <p><span className="text-green-600/70">Teléfono:</span> {cliente.telefono}</p>}
                    {cliente.email && <p className="truncate"><span className="text-green-600/70">Email:</span> {cliente.email}</p>}
                    {cliente.direccion && <p><span className="text-green-600/70">Dirección:</span> {cliente.direccion}</p>}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <input className={INPUT_STD} value={clienteSearch} onChange={e => buscarCliente(e.target.value)}
                    placeholder="Buscar por nombre o documento..." />
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
                <p className="mt-1 text-[10px] text-gray-400">Si no existe, créalo aquí (busca en RENIEC/SUNAT por DNI/RUC).</p>
              </>
            )}

            {/* Contacto: solo para clientes empresa */}
            {cliente?.tipo === 'empresa' && contactos.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
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
          </Seccion>

          <Seccion n={2} titulo="Equipo">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={LABEL}>Tipo de equipo</label><input className={INPUT_STD} value={tipoEquipo} onChange={e => setTipoEquipo(e.target.value)} placeholder="Laptop, impresora..." /></div>
              <div><label className={LABEL}>Marca</label><input className={INPUT_STD} value={marcaEquipo} onChange={e => setMarcaEquipo(e.target.value)} placeholder="Dell, HP..." /></div>
              <div><label className={LABEL}>N° de serie</label><input className={INPUT_STD} value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} placeholder="Serie o IMEI" /></div>
              <div><label className={LABEL}>Condición al recibir</label><input className={INPUT_STD} value={condicionEquipo} onChange={e => setCondicionEquipo(e.target.value)} placeholder="Rayado, sin cargador..." /></div>
            </div>
          </Seccion>

          <Seccion n={3} titulo="Servicio">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL}>Servicio del catálogo</label>
                <select className={INPUT_STD} value={servicioId} onChange={e => elegirServicio(e.target.value)}>
                  <option value="">Sin servicio del catálogo</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.precio != null ? ` · S/ ${Number(s.precio).toFixed(2)}` : ''}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-gray-400">Elegirlo trae su precio y los campos de su plantilla.</p>
              </div>
              <div>
                <label className={LABEL}>Tipo de servicio *</label>
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
                <div className="sm:col-span-2">
                  <label className={LABEL}>Sede</label>
                  <select className={INPUT_STD} value={sedeIdEfectiva} onChange={e => setSedeId(e.target.value)}>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={LABEL}>Problema reportado</label>
                <textarea className={INPUT_STD_TA} rows={3} value={descripcionProblema} onChange={e => setDescripcionProblema(e.target.value)}
                  placeholder="Qué dice el cliente que le pasa al equipo" />
              </div>
            </div>
          </Seccion>

          {campos.length > 0 && (
            <Seccion n={4} titulo="Datos del servicio" hint={servicioSel?.nombre}>
              <DynamicFieldsForm campos={campos} values={datos}
                onChange={(nombre, v) => setDatos(d => ({ ...d, [nombre]: v }))} />
            </Seccion>
          )}

          <Seccion n={campos.length > 0 ? 5 : 4} titulo="Costos y adelanto" hint="opcional">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={LABEL}>Costo total</label><input className={INPUT_STD} type="number" step="0.01" min="0" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} placeholder="0.00" /></div>
              <div><label className={LABEL}>Descuento</label><input className={INPUT_STD} type="number" step="0.01" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0.00" /></div>
              <div><label className={LABEL}>Adelanto</label><input className={INPUT_STD} type="number" step="0.01" min="0" value={adelanto} onChange={e => setAdelanto(e.target.value)} placeholder="0.00" /></div>
            </div>
            {totales.adel > 0 && (
              <div className="mt-3">
                <label className={LABEL}>Método de pago del adelanto *</label>
                <select className={INPUT_STD} value={metodoPagoAdelanto} onChange={e => setMetodoPagoAdelanto(e.target.value as MetodoPagoVenta)}>
                  {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-amber-600">El adelanto entra a la caja abierta del usuario.</p>
              </div>
            )}
          </Seccion>

          <Seccion n={campos.length > 0 ? 6 : 5} titulo="Notas y seguimiento">
            <div>
              <label className={LABEL}>Notas internas</label>
              <textarea className={INPUT_STD_TA} rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Visible para el equipo, no para el cliente" />
            </div>
            <div className="mt-3">
              <label className={LABEL}>Fecha pactada de entrega (opcional)</label>
              <input className={INPUT_STD} type="date" value={fechaPrometida}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setFechaPrometida(e.target.value)} />
              <p className="mt-1 text-[10px] text-gray-400">
                Para cuándo se le prometió el equipo al cliente. Si se pasa y todavía no se entregó, la orden aparece como atrasada.
              </p>
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
          </Seccion>
        </div>

        {/* ── Resumen fijo ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Resumen</h2>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Cliente</span>
                <span className="truncate text-right font-medium text-gray-700">{cliente?.nombre ?? 'Sin cliente'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Servicio</span>
                <span className="truncate text-right font-medium text-gray-700">{servicioSel?.nombre ?? TIPO_SERVICIO_LABEL[tipoServicio]}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Equipo</span>
                <span className="truncate text-right font-medium text-gray-700">{[tipoEquipo, marcaEquipo].filter(Boolean).join(' ') || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Prioridad</span>
                <span className="text-right font-medium text-gray-700">{PRIORIDAD_LABEL[prioridad]}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-gray-100 pt-2.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Costo</span><span className="tabular-nums text-gray-700">S/ {totales.costo.toFixed(2)}</span></div>
              {totales.desc > 0 && <div className="flex justify-between"><span className="text-gray-400">Descuento</span><span className="tabular-nums text-red-500">− S/ {totales.desc.toFixed(2)}</span></div>}
              <div className="flex justify-between font-semibold text-[#004A94]"><span>Total</span><span className="tabular-nums">S/ {totales.neto.toFixed(2)}</span></div>
              {totales.adel > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-gray-400">Adelanto</span><span className="tabular-nums text-green-600">− S/ {totales.adel.toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-gray-900"><span>Saldo</span><span className="tabular-nums">S/ {totales.saldo.toFixed(2)}</span></div>
                </>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="w-full rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#003570] disabled:opacity-50">
                {isSubmitting ? 'Creando...' : 'Crear orden'}
              </button>
              <button onClick={() => router.back()} disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
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
