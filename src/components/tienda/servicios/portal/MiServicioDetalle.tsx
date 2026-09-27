'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TiendaColors, alpha } from '@/lib/colors';
import { soles } from '@/lib/tienda-compra';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { ETIQUETA, MensajeOrden, OrdenDetalle, PASOS, etiquetaOrden, fechaCorta, horaCorta, misServicios, pasoDe, mensajeError } from '@/lib/mis-servicios';
import { TIPO_ACCION_COLOR, TIPO_ACCION_LABEL, type TipoAccionComponente } from '@/core/types/orden-servicio';
import { useSesionTienda } from '../../compra/SesionTienda';
import { Cargando, PedirIngreso } from '../../compra/CarritoVista';
import { HeroPortal, Pastilla } from './HeroPortal';

const card = 'bg-white rounded-2xl p-4 md:px-6 md:py-5 flex flex-col gap-3.5';

/** Una orden del comprador: avance, presupuesto (aprobar), equipo, chat e historial. */
export function MiServicioDetalle({ id, colors, empresaNombre, telefono }: {
  id: string;
  colors: TiendaColors;
  empresaNombre: string;
  telefono?: string;
}) {
  const { subdominio, usuario } = useSesionTienda();
  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [mensajes, setMensajes] = useState<MensajeOrden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aprobando, setAprobando] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finChatRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([misServicios.detalle(subdominio, id), misServicios.mensajes(subdominio, id)]);
      setOrden(o);
      setMensajes(m);
      setError(null);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo cargar el servicio'));
    }
  }, [subdominio, id]);

  useEffect(() => { if (usuario) void cargar(); }, [usuario, cargar]);

  // El chat se refresca solo mientras la pestaña está a la vista.
  useEffect(() => {
    if (!usuario) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') {
        misServicios.mensajes(subdominio, id).then(setMensajes).catch(() => {});
      }
    }, 20000);
    return () => clearInterval(t);
  }, [usuario, subdominio, id]);

  useEffect(() => { finChatRef.current?.scrollIntoView({ block: 'nearest' }); }, [mensajes.length]);

  const aprobar = async () => {
    setAprobando(true);
    try {
      setOrden(await misServicios.aprobar(subdominio, id));
    } catch (e) {
      setError(mensajeError(e, 'No se pudo aprobar'));
    } finally {
      setAprobando(false);
    }
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      const m = await misServicios.enviar(subdominio, id, t);
      setMensajes((xs) => [...xs, m]);
      setTexto('');
    } catch (e) {
      setError(mensajeError(e, 'No se pudo enviar el mensaje'));
    } finally {
      setEnviando(false);
    }
  };

  const e = orden ? etiquetaOrden(orden) : null;
  const paso = orden ? pasoDe(orden.estado) : 0;
  const espera = orden?.estado === 'ESPERANDO_APROBACION';
  const listo = orden && ['REPARADO', 'LISTO_ENTREGA', 'FINALIZADO'].includes(orden.estado) && !orden.fechaEntrega;
  const whatsapp = orden
    ? enlaceChatWhatsapp(telefono, listo
      ? `Hola ${empresaNombre}, quisiera coordinar el retiro de mi equipo (${orden.codigo}).`
      : `Hola ${empresaNombre}, te escribo por mi servicio ${orden.codigo}.`)
    : null;
  // Fecha en que se llegó a cada paso (la primera vez que el historial entra en él).
  const fechaPaso = (i: number) => orden?.historial.find((h) => pasoDe(h.estado) === i)?.fecha
    ?? (i === 0 ? orden?.creadoEn : undefined);

  return (
    <>
      <HeroPortal colors={colors}>
        <div className="flex flex-col gap-4">
          <nav className="text-xs text-white/75" aria-label="Migas">
            <Link href={`/${subdominio}/mis-servicios`} className="hover:underline hover:text-white">Mis servicios</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white font-medium tabular-nums">{orden?.codigo ?? '...'}</span>
          </nav>
          {orden && e && (
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs md:text-[13px] text-white/85 tabular-nums">
                  {orden.codigo} · Ingresó el {fechaCorta(orden.creadoEn, true)}{orden.sede ? ` · ${orden.sede}` : ''}
                </span>
                <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{orden.equipo}</h1>
                {(orden.servicio || orden.tecnico) && (
                  <span className="text-sm md:text-[15px] text-white/90">
                    {[orden.servicio, orden.tecnico && `Técnico: ${orden.tecnico}`].filter(Boolean).join(' · ')}
                  </span>
                )}
                {orden.empresaCliente && (
                  <span className="self-start mt-1 text-xs md:text-[13px] font-medium bg-white/15 border border-white/25 rounded-lg px-2.5 py-1">
                    Para {orden.empresaCliente}{orden.contacto ? ` · Lo dejó ${orden.contacto}` : ''}
                  </span>
                )}
              </div>
              <Pastilla {...e} grande />
            </div>
          )}
        </div>
      </HeroPortal>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-12 md:-mt-14 pb-16 flex flex-col gap-4 md:gap-5">
        {usuario === undefined ? (
          <Cargando />
        ) : !usuario ? (
          <PedirIngreso texto="Ingresa con tu DNI para ver este servicio." colors={colors} />
        ) : error && !orden ? (
          <div className="bg-white rounded-xl p-6 text-sm text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <Link href={`/${subdominio}/mis-servicios`} className="font-medium" style={{ color: colors.primario }}>Volver a mis servicios</Link>
          </div>
        ) : !orden ? (
          <Cargando />
        ) : (
          <>
            {error && <p className="bg-white rounded-xl px-4 py-3 text-sm text-red-600">{error}</p>}

            {/* Avance */}
            {orden.estado === 'CANCELADO' ? (
              <p className="bg-white rounded-2xl px-6 py-4 text-sm text-gray-600 shadow-[0_8px_30px_rgba(15,26,46,0.08)]">Este servicio se canceló.</p>
            ) : (
              <section className="bg-white rounded-2xl px-4 py-4 md:px-6 md:py-5 shadow-[0_8px_30px_rgba(15,26,46,0.08)]">
                <ol className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-4">
                  {PASOS.map((nombre, i) => {
                    const hecho = i < paso || (i === paso && i === PASOS.length - 1);
                    const actual = i === paso && !hecho;
                    const f = fechaPaso(i);
                    return (
                      <li key={nombre} className="flex flex-col gap-2" aria-current={actual ? 'step' : undefined}>
                        <span className="h-1.5 rounded-full" style={{ backgroundColor: i <= paso ? colors.primario : '#dfe6f1' }} />
                        <span className="flex items-center gap-2">
                          <span
                            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                            style={hecho
                              ? { backgroundColor: colors.primario, color: '#fff' }
                              : actual
                                ? { backgroundColor: '#fff', color: colors.primario, boxShadow: `inset 0 0 0 2px ${colors.primario}` }
                                : { backgroundColor: '#eef2f8', color: '#9aa7ba' }}
                          >
                            {hecho ? '✓' : i + 1}
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="text-[13px] truncate" style={{ color: actual ? colors.primario : hecho ? '#0f1a2e' : '#8a97ab', fontWeight: actual ? 700 : 500 }}>{nombre}</span>
                            {f && i <= paso && <span className="text-[11px] text-gray-400">{fechaCorta(f)}</span>}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {orden.fechaPrometida && !orden.fechaEntrega && (
                  <p className="mt-4 text-[13px] text-gray-600">Fecha estimada: <b className="font-medium text-gray-900">{fechaCorta(orden.fechaPrometida, true)}</b></p>
                )}
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 md:gap-5 items-start">
              <div className="flex flex-col gap-4 md:gap-5">
                {/* Presupuesto */}
                <section className={card}>
                  <h2 className="text-[15px] md:text-[17px] font-bold" style={{ color: colors.primario }}>Diagnóstico y presupuesto</h2>
                  {orden.diagnostico ? (
                    <p className="text-sm leading-relaxed text-gray-700 bg-slate-50 rounded-xl px-3.5 py-3 whitespace-pre-line">{orden.diagnostico}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Todavía estamos revisando tu equipo. Te avisamos cuando tengamos el diagnóstico.</p>
                  )}
                  {(orden.items.length > 0 || (orden.costoServicio ?? 0) > 0) && (
                    <div className="flex flex-col text-sm">
                      {((orden.costoServicio ?? 0) > 0 || orden.items.length > 0) && (
                        <Linea
                          nombre={orden.servicio ?? 'Servicio'}
                          valor={(orden.costoServicio ?? 0) > 0 ? soles(orden.costoServicio) : ''}
                          sinBorde={orden.items.length > 0}
                        />
                      )}
                      {/* Los componentes cuelgan DEL servicio (flecha en codo): no
                          son servicios aparte, son las piezas de este trabajo. */}
                      {orden.items.length > 0 && (
                        <div className="border-b border-gray-100 pb-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke={colors.primario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 3v8a4 4 0 0 0 4 4h9" />
                              <path d="M15 11l4 4-4 4" />
                            </svg>
                            Componentes
                          </p>
                          <div className="ml-[7px] mt-1 border-l-2 pl-4" style={{ borderColor: alpha(colors.primario, 0.2) }}>
                            {orden.items.map((it, i) => (
                              <Linea
                                key={i}
                                nombre={it.nombre}
                                accion={it.accion ? (TIPO_ACCION_LABEL[it.accion as TipoAccionComponente] ?? it.accion) : null}
                                accionColor={it.accion ? (TIPO_ACCION_COLOR[it.accion as TipoAccionComponente] ?? 'text-teal-600') : undefined}
                                detalle={it.descripcion}
                                valor={soles(it.monto)}
                                sinBorde
                                compacto
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {orden.descuento > 0 && <Linea nombre="Descuento" valor={`− ${soles(orden.descuento)}`} tenue />}
                      {orden.adelanto > 0 && <Linea nombre="Adelanto pagado" valor={`− ${soles(orden.adelanto)}`} tenue sinBorde />}
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="font-medium text-gray-900">{orden.saldo > 0 ? 'Saldo a pagar' : 'Total'}</span>
                        <span className="text-xl md:text-2xl font-bold tabular-nums" style={{ color: colors.primario }}>
                          {soles(orden.saldo > 0 ? orden.saldo : orden.total)}
                        </span>
                      </div>
                    </div>
                  )}
                  {espera && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void aprobar()}
                        disabled={aprobando}
                        className="flex-1 h-11 rounded-xl text-white text-[15px] font-medium disabled:opacity-60"
                        style={{ backgroundColor: colors.primario }}
                      >
                        {aprobando ? 'Aprobando...' : 'Aprobar presupuesto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                        className="h-11 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        Tengo una consulta
                      </button>
                    </div>
                  )}
                  {orden.historial.some((h) => h.estado === 'ESPERANDO_APROBACION') && paso >= 3 && (
                    <p className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium" style={{ backgroundColor: ETIQUETA.REPARADO.fondo, color: ETIQUETA.REPARADO.color }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                      Presupuesto aprobado.
                    </p>
                  )}
                </section>

                {/* Equipo */}
                <section className={card}>
                  <h2 className="text-[15px] md:text-[17px] font-bold" style={{ color: colors.primario }}>Tu equipo</h2>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {orden.tipoEquipo && <Dato t="Tipo" v={orden.tipoEquipo} />}
                    {orden.marcaModelo && <Dato t="Marca y modelo" v={orden.marcaModelo} />}
                    {orden.numeroSerie && <Dato t="N.º de serie" v={orden.numeroSerie} />}
                  </dl>
                  {orden.descripcionProblema && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Lo que nos contaste</span>
                      <p className="text-sm text-gray-800">&ldquo;{orden.descripcionProblema}&rdquo;</p>
                    </div>
                  )}
                  {(orden.fotos?.length ?? 0) > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-gray-500">Fotos de tu equipo</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {orden.fotos!.map((f, i) => (
                          <button
                            key={f.url}
                            type="button"
                            onClick={() => setFotoAbierta(i)}
                            aria-label={`Ver foto ${i + 1}`}
                            className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
                          >
                            <img src={f.miniatura} alt="" loading="lazy" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {orden.accesorios.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">Dejaste:</span>
                      {orden.accesorios.map((a) => <span key={a} className="text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-full">{a}</span>)}
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-col gap-4 md:gap-5">
                {/* Chat */}
                <section className={card}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold" style={{ color: colors.primario }}>Chat con el técnico</span>
                      <span className="text-xs text-gray-500">Te responde en horario de atención</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {mensajes.length === 0 && <p className="text-sm text-gray-500">Escríbenos si tienes alguna duda sobre tu equipo.</p>}
                    {mensajes.map((m) => (
                      <div key={m.id} className={`flex flex-col gap-0.5 ${m.esCliente ? 'items-end' : 'items-start'}`}>
                        <span
                          className="max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-line break-words"
                          style={m.esCliente ? { backgroundColor: colors.primario, color: '#fff' } : { backgroundColor: '#f0f4fa', color: '#0f1a2e' }}
                        >
                          {m.contenido}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {!m.esCliente && m.usuario?.persona?.nombres ? `${m.usuario.persona.nombres} · ` : ''}{fechaCorta(m.creadoEn)} {horaCorta(m.creadoEn)}
                        </span>
                      </div>
                    ))}
                    <div ref={finChatRef} />
                  </div>
                  <form onSubmit={enviar} className="flex gap-2">
                    <label htmlFor="mensaje-tecnico" className="sr-only">Mensaje</label>
                    <input
                      id="mensaje-tecnico"
                      ref={inputRef}
                      value={texto}
                      onChange={(ev) => setTexto(ev.target.value)}
                      maxLength={1000}
                      placeholder="Escribe tu mensaje..."
                      className="flex-1 min-w-0 h-11 rounded-xl border border-gray-200 px-3.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={enviando || !texto.trim()}
                      aria-label="Enviar mensaje"
                      className="w-11 h-11 rounded-xl text-white flex items-center justify-center disabled:opacity-50"
                      style={{ backgroundColor: colors.primario }}
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                    </button>
                  </form>
                </section>

                {/* Historial */}
                {orden.historial.length > 0 && (
                  <section className={card}>
                    <h2 className="text-[15px] md:text-[17px] font-bold" style={{ color: colors.primario }}>Historial</h2>
                    <ol className="flex flex-col">
                      {[...orden.historial].reverse().map((h, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex flex-col items-center">
                            <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: i === 0 ? colors.primario : '#b7c3d6' }} />
                            {i < orden.historial.length - 1 && <span className="flex-1 w-0.5 bg-slate-200 min-h-[26px]" />}
                          </span>
                          <span className="flex flex-col pb-3">
                            <span className="text-sm font-medium text-gray-900">{ETIQUETA[h.estado]?.texto ?? h.estado}</span>
                            {h.nota && <span className="text-[13px] text-gray-600">{h.nota}</span>}
                            <span className="text-xs text-gray-400">{fechaCorta(h.fecha, true)} {horaCorta(h.fecha)}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 rounded-xl bg-[#1fa855] hover:bg-[#1a9249] text-white font-medium text-[15px] flex items-center justify-center transition-colors"
                  >
                    {listo ? 'Coordinar retiro por WhatsApp' : 'Escribir por WhatsApp'}
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {orden?.fotos && fotoAbierta !== null && (
        <VisorFotos fotos={orden.fotos.map((f) => f.url)} inicial={fotoAbierta} onCerrar={() => setFotoAbierta(null)} />
      )}
    </>
  );
}

/** Foto en grande sobre la página; flechas y teclado para pasar, Esc para cerrar. */
function VisorFotos({ fotos, inicial, onCerrar }: { fotos: string[]; inicial: number; onCerrar: () => void }) {
  const [i, setI] = useState(inicial);
  const ir = useCallback((d: number) => setI((x) => (x + d + fotos.length) % fotos.length), [fotos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [ir, onCerrar]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Fotos del equipo" onClick={onCerrar}>
      <img src={fotos[i]} alt={`Foto ${i + 1} de ${fotos.length}`} className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      {fotos.length > 1 && (
        <>
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={(e) => { e.stopPropagation(); ir(d); }}
              aria-label={d < 0 ? 'Foto anterior' : 'Foto siguiente'}
              className={`absolute top-1/2 -translate-y-1/2 ${d < 0 ? 'left-3 md:left-6' : 'right-3 md:right-6'} w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} /></svg>
            </button>
          ))}
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/80 tabular-nums">{i + 1} / {fotos.length}</span>
        </>
      )}
    </div>
  );
}

function Linea({ nombre, valor, tenue = false, sinBorde = false, compacto = false, accion, accionColor, detalle }: {
  nombre: string; valor: string; tenue?: boolean; sinBorde?: boolean; compacto?: boolean;
  /** Componente: acción ("Reparar") y su descripción, como en la orden del taller. */
  accion?: string | null; accionColor?: string; detalle?: string | null;
}) {
  return (
    <div className={`flex justify-between gap-3 ${compacto ? 'py-1.5' : 'py-2.5'} ${sinBorde ? '' : 'border-b border-gray-100'} ${tenue ? 'text-gray-500' : 'text-gray-900'}`}>
      <span className="min-w-0">
        {nombre}
        {accion && <> · <span className={accionColor}>{accion}</span></>}
        {detalle && <span className="block text-xs text-gray-500">{detalle}</span>}
      </span>
      <span className="tabular-nums font-medium">{valor}</span>
    </div>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-gray-500">{t}</dt>
      <dd className="font-medium text-gray-900">{v}</dd>
    </div>
  );
}
