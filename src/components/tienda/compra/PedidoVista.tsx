'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CobroYape, ETIQUETA_ESTADO, EstadoPedido, Pedido, mkt, num, soles } from '@/lib/tienda-compra';
import { TiendaColors } from '@/lib/colors';
import { useSesionTienda } from './SesionTienda';
import { Cargando, PedirIngreso } from './CarritoVista';

/** Mientras el pago puede cambiar solo (webhook de Yape, la tienda validando), se consulta seguido. */
const ESTADOS_VIVOS: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGO_ENVIADO'];
const PAGABLE: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGO_RECHAZADO'];
/** Lo que dura un cobro de api-yape antes de liberar el monto único. */
const VIDA_COBRO_SEG = 15 * 60;

const PASOS: { estado: EstadoPedido; texto: string }[] = [
  { estado: 'PAGO_VALIDADO', texto: 'Pago confirmado' },
  { estado: 'EN_PREPARACION', texto: 'En preparación' },
  { estado: 'ENVIADO', texto: 'En camino / listo para recoger' },
  { estado: 'ENTREGADO', texto: 'Entregado' },
];

function Seguimiento({ estado, colors }: { estado: EstadoPedido; colors: TiendaColors }) {
  const i = PASOS.findIndex((p) => p.estado === estado);
  return (
    <ol className="space-y-3">
      {PASOS.map((p, idx) => {
        const hecho = i >= idx;
        return (
          <li key={p.estado} className="flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium"
              style={hecho ? { backgroundColor: colors.primario, color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}
            >
              {hecho ? '✓' : idx + 1}
            </span>
            <span className={`text-sm ${hecho ? 'text-gray-900' : 'text-gray-400'}`}>{p.texto}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PedidoVista({ pedidoId, colors }: { pedidoId: string; colors: TiendaColors }) {
  const { subdominio, usuario } = useSesionTienda();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cobro, setCobro] = useState<CobroYape | null>(null);
  const [cobroDesde, setCobroDesde] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [pidiendoCobro, setPidiendoCobro] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [metodoFoto, setMetodoFoto] = useState<'YAPE' | 'PLIN'>('YAPE');
  const [subiendo, setSubiendo] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setPedido(await mkt<Pedido>(`/mis-pedidos/${pedidoId}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el pedido');
    }
  }, [pedidoId]);

  useEffect(() => {
    if (!usuario) return;
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [usuario, cargar]);

  // El webhook de Yape valida el pago solo: se consulta cada 5 s mientras puede cambiar.
  const vivo = !!pedido && ESTADOS_VIVOS.includes(pedido.estado);
  useEffect(() => {
    if (!vivo) return;
    const id = setInterval(() => void cargar(), 5000);
    return () => clearInterval(id);
  }, [vivo, cargar]);

  useEffect(() => {
    if (!cobroDesde) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cobroDesde]);

  if (usuario === undefined) return <Cargando />;
  if (!usuario) return <PedirIngreso texto="Ingresa para ver tu pedido." colors={colors} />;
  if (error && !pedido) return <p className="text-sm text-red-600">{error}</p>;
  if (!pedido) return <Cargando />;

  const etiqueta = ETIQUETA_ESTADO[pedido.estado];
  const pagable = PAGABLE.includes(pedido.estado) && pedido.metodoPago !== 'CONTRAENTREGA';
  const restante = cobroDesde ? Math.max(0, VIDA_COBRO_SEG - Math.floor((ahora - cobroDesde) / 1000)) : 0;

  const pedirCobro = async () => {
    setPidiendoCobro(true);
    setError(null);
    try {
      const c = await mkt<CobroYape>(`/mis-pedidos/${pedidoId}/cobro-yape`, { method: 'POST' });
      setCobro(c);
      if (c.habilitado) { setCobroDesde(Date.now()); setAhora(Date.now()); }
      else setModoManual(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el cobro');
    } finally {
      setPidiendoCobro(false);
    }
  };

  const subirFoto = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', archivo);
      fd.append('metodoPago', metodoFoto);
      await mkt(`/mis-pedidos/${pedidoId}/comprobante-pago`, { method: 'POST', body: fd });
      setArchivo(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el comprobante');
    } finally {
      setSubiendo(false);
    }
  };

  const accion = async (ruta: 'cancelar' | 'confirmar-recepcion') => {
    setError(null);
    try {
      await mkt(`/mis-pedidos/${pedidoId}/${ruta}`, { method: 'POST' });
      setConfirmarCancelar(false);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    }
  };

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin permiso */ }
  };

  const cobroActivo = cobro?.habilitado ? cobro : null;
  const qr = cobro?.qrYapeUrl;

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-5">
        {/* Estado */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">Pedido</p>
              <p className="text-base font-medium text-gray-900">{pedido.codigo}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${etiqueta.clase}`}>{etiqueta.texto}</span>
          </div>
          {pedido.estado === 'PAGO_RECHAZADO' && pedido.motivoRechazo && (
            <p className="mt-3 text-sm text-red-600">La tienda no pudo validar tu pago: {pedido.motivoRechazo}</p>
          )}
          {pedido.estado === 'PAGO_ENVIADO' && (
            <p className="mt-3 text-sm text-gray-600">Recibimos tu comprobante. La tienda lo está revisando; esta página se actualiza sola.</p>
          )}
          {pedido.metodoPago === 'CONTRAENTREGA' && pedido.estado === 'PAGO_VALIDADO' && (
            <p className="mt-3 text-sm text-gray-600">Pagarás al recibir tu pedido. La tienda ya lo está preparando.</p>
          )}
        </section>

        {/* Pago */}
        {pagable && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-900">Paga tu pedido</h2>

            {!cobro && !modoManual && (
              <>
                <p className="text-sm text-gray-600">
                  Total a pagar: <span className="font-medium text-gray-900">{soles(pedido.total)}</span>
                </p>
                {pedido.yapeAutomaticoDisponible ? (
                  <button type="button" onClick={() => void pedirCobro()} disabled={pidiendoCobro}
                    className="w-full py-3 rounded-lg bg-[#742284] hover:bg-[#5f1b6c] text-white text-sm font-medium disabled:opacity-50">
                    {pidiendoCobro ? 'Preparando tu pago…' : 'Pagar con Yape'}
                  </button>
                ) : (
                  <button type="button" onClick={() => void pedirCobro()} disabled={pidiendoCobro}
                    className="w-full py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: colors.primario }}>
                    {pidiendoCobro ? 'Un momento…' : 'Ver cómo pagar'}
                  </button>
                )}
              </>
            )}

            {cobroActivo && !modoManual && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#742284]/5 border border-[#742284]/20 p-4 text-center">
                  <p className="text-xs text-gray-500">Yapea exactamente</p>
                  <p className="text-3xl font-medium text-[#742284] mt-1">{soles(cobroActivo.payAmount)}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Los céntimos identifican tu pago: <span className="font-medium text-gray-700">no redondees el monto</span>.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 items-center">
                  {qr && <img src={qr} alt="QR de Yape de la tienda" className="w-44 h-44 mx-auto object-contain rounded-lg border border-gray-100" />}
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>1. Abre Yape y escanea el QR{cobroActivo.celular ? ' o yapea al número' : ''}.</p>
                    {cobroActivo.celular && (
                      <button type="button" onClick={() => void copiar(cobroActivo.celular!)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                        <span className="font-medium text-gray-900 tracking-wide">{cobroActivo.celular}</span>
                        <span className="text-xs" style={{ color: colors.primario }}>{copiado ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    )}
                    <p>2. Paga <span className="font-medium text-gray-900">{soles(cobroActivo.payAmount)}</span>.</p>
                    <p>3. Listo: esta página confirma tu pago sola.</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-[#742284] rounded-full animate-spin" />
                  {restante > 0
                    ? `Esperando tu pago… (${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')})`
                    : 'El tiempo para este monto terminó.'}
                </div>
                {restante === 0 && (
                  <button type="button" onClick={() => void pedirCobro()} className="w-full py-2.5 rounded-lg border text-sm" style={{ borderColor: colors.primario, color: colors.primario }}>
                    Generar un monto nuevo
                  </button>
                )}
                <button type="button" onClick={() => setModoManual(true)} className="block mx-auto text-xs text-gray-500 underline underline-offset-2">
                  ¿Ya pagaste y no se confirma? Sube tu comprobante
                </button>
              </div>
            )}

            {modoManual && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Paga <span className="font-medium text-gray-900">{soles(cobroActivo?.payAmount ?? pedido.total)}</span> con Yape o Plin
                  {qr ? ' escaneando el QR' : ''} y sube la captura del pago. La tienda la revisará.
                </p>
                {qr && <img src={qr} alt="QR de pago de la tienda" className="w-44 h-44 object-contain rounded-lg border border-gray-100" />}
                <div className="flex gap-2">
                  {(['YAPE', 'PLIN'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMetodoFoto(m)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                      style={metodoFoto === m ? { backgroundColor: colors.primario, borderColor: colors.primario, color: '#fff' } : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                      {m === 'YAPE' ? 'Yape' : 'Plin'}
                    </button>
                  ))}
                </div>
                <input ref={inputFoto} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => inputFoto.current?.click()}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-600 hover:border-gray-300">
                  {archivo ? `📎 ${archivo.name}` : 'Elegir la captura del pago'}
                </button>
                <button type="button" onClick={() => void subirFoto()} disabled={!archivo || subiendo}
                  className="w-full py-3 rounded-lg text-white text-sm font-medium disabled:opacity-40" style={{ backgroundColor: colors.primario }}>
                  {subiendo ? 'Subiendo…' : 'Enviar comprobante'}
                </button>
                {cobroActivo && (
                  <button type="button" onClick={() => setModoManual(false)} className="block mx-auto text-xs text-gray-500 underline underline-offset-2">
                    Volver al pago automático
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Seguimiento */}
        {!['PENDIENTE_PAGO', 'PAGO_ENVIADO', 'PAGO_RECHAZADO', 'CANCELADO'].includes(pedido.estado) && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            {pedido.estado === 'PAGO_VALIDADO' && pedido.metodoPago !== 'CONTRAENTREGA' && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">¡Pago recibido! Gracias por tu compra.</p>
            )}
            <Seguimiento estado={pedido.estado} colors={colors} />
            {pedido.estado === 'ENVIADO' && (
              <button type="button" onClick={() => void accion('confirmar-recepcion')}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: colors.primario }}>
                Ya recibí mi pedido
              </button>
            )}
          </section>
        )}

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        {PAGABLE.includes(pedido.estado) && (
          <div className="text-center">
            {confirmarCancelar ? (
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-gray-600">¿Cancelar el pedido?</span>
                <button type="button" onClick={() => void accion('cancelar')} className="text-red-600 font-medium">Sí, cancelar</button>
                <button type="button" onClick={() => setConfirmarCancelar(false)} className="text-gray-500">No</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmarCancelar(true)} className="text-xs text-gray-400 hover:text-red-600">
                Cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resumen */}
      <aside className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 md:sticky md:top-24">
        <ul className="space-y-2">
          {pedido.detalles.map((d) => (
            <li key={d.id} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-600 line-clamp-2">{d.cantidad} × {d.descripcion}</span>
              <span className="text-gray-900 flex-shrink-0">{soles(d.subtotal)}</span>
            </li>
          ))}
        </ul>
        {num(pedido.costoEnvio) > 0 && (
          <div className="flex justify-between text-sm text-gray-600"><span>Envío</span><span>{soles(pedido.costoEnvio)}</span></div>
        )}
        <div className="flex justify-between text-base font-medium text-gray-900 pt-3 border-t border-gray-100">
          <span>Total</span><span>{soles(pedido.total)}</span>
        </div>
        <p className="text-xs text-gray-500">
          {pedido.tipoEntrega === 'RETIRO_TIENDA'
            ? 'Retiro en tienda'
            : pedido.modalidadEnvio === 'AGENCIA'
              ? `Envío por ${pedido.agenciaEnvio} a ${pedido.provinciaEnvio} — recoges en ${pedido.agenciaDireccionEnvio}`
              : `Delivery a ${[pedido.direccionEnvio, pedido.distritoEnvio].filter(Boolean).join(', ')}`}
        </p>
        <Link href={`/${subdominio}/mis-pedidos`} className="block text-center text-xs underline underline-offset-2 text-gray-500">
          Ver todos mis pedidos
        </Link>
      </aside>
    </div>
  );
}
