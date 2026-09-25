'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OpcionesEnvio, Pedido, mkt, soles } from '@/lib/tienda-compra';
import { TiendaColors } from '@/lib/colors';
import { useSesionTienda } from './SesionTienda';
import { Cargando, PedirIngreso } from './CarritoVista';
import { resumenHorario } from '../UbicacionCard';

/**
 * Como en la venta: delivery (reparto en la ciudad) o envío a provincia por
 * agencia — los dos son "envío a domicilio" para el backend, con su
 * `modalidadEnvio` — o retiro en tienda.
 */
type Entrega = 'DELIVERY' | 'AGENCIA' | 'RETIRO_TIENDA';

const AGENCIAS = ['SHALOM', 'OLVA', 'MARVISUR'];
type Pago = 'YAPE' | 'CONTRAENTREGA';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400';

function Opcion({
  activa, onClick, titulo, detalle, colors,
}: { activa: boolean; onClick: () => void; titulo: string; detalle?: string; colors: TiendaColors }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-xl border-2 transition-colors"
      style={{ borderColor: activa ? colors.primario : '#f3f4f6', backgroundColor: activa ? `${colors.primario}0d` : '#fff' }}
    >
      <p className="text-sm font-medium text-gray-900">{titulo}</p>
      {detalle && <p className="text-xs text-gray-500 mt-0.5">{detalle}</p>}
    </button>
  );
}

/**
 * Checkout de UNA tienda: manda `empresaId`, así lo de otras tiendas que el
 * comprador tenga en el carrito (desde el app) no se compra acá. Los precios
 * los recalcula el backend: acá no viaja ninguno.
 */
export function CheckoutVista({ empresaId, colors }: { empresaId: string; colors: TiendaColors }) {
  const { subdominio, usuario, grupo, carritoCargado, recargarCarrito } = useSesionTienda();
  const router = useRouter();
  const [opciones, setOpciones] = useState<OpcionesEnvio | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [sedeId, setSedeId] = useState('');
  const [pago, setPago] = useState<Pago>('YAPE');
  const [direccion, setDireccion] = useState('');
  const [agencia, setAgencia] = useState('');
  const [agenciaDireccion, setAgenciaDireccion] = useState('');
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [referencia, setReferencia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    mkt<OpcionesEnvio>(`/carrito/opciones-envio/${empresaId}`)
      .then((o) => {
        if (!vivo) return;
        setOpciones(o);
        setEntrega(o.envio.disponible ? 'DELIVERY' : o.retiroTienda.disponible ? 'RETIRO_TIENDA' : null);
        if (o.retiroTienda.sedes.length === 1) setSedeId(o.retiroTienda.sedes[0].id);
      })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las opciones de entrega'); });
    return () => { vivo = false; };
  }, [usuario, empresaId]);

  if (usuario === undefined) return <Cargando />;
  if (!usuario) return <PedirIngreso texto="Ingresa para terminar tu compra." colors={colors} />;
  if (!carritoCargado || (!opciones && !error)) return <Cargando />;

  const items = grupo?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-gray-600 mb-4">No tienes productos de esta tienda en el carrito.</p>
        <Link href={`/${subdominio}`} className="text-sm font-medium underline" style={{ color: colors.primario }}>Ver productos</Link>
      </div>
    );
  }

  const total = grupo?.subtotal ?? 0;
  const faltaDireccion =
    (entrega === 'DELIVERY' && (direccion.trim().length < 5 || !distrito.trim())) ||
    (entrega === 'AGENCIA' && (!agencia.trim() || !departamento.trim() || !provincia.trim() || agenciaDireccion.trim().length < 5));

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) { setError('Tu navegador no permite compartir la ubicación'); return; }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setBuscandoUbicacion(false); },
      () => { setError('No pudimos obtener tu ubicación. Revisa el permiso del navegador.'); setBuscandoUbicacion(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const faltaSede = entrega === 'RETIRO_TIENDA' && !sedeId;

  const confirmar = async () => {
    if (!entrega || faltaDireccion || faltaSede || enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const r = await mkt<{ pedidos: Pedido[] }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          empresaId,
          metodoPago: pago,
          entregaPorEmpresa: [{
            empresaId,
            tipoEntrega: entrega === 'RETIRO_TIENDA' ? 'RETIRO_TIENDA' : 'ENVIO_DOMICILIO',
            ...(entrega === 'RETIRO_TIENDA' && { sedeRetiroId: sedeId }),
          }],
          ...(entrega === 'DELIVERY' && {
            modalidadEnvio: 'DELIVERY_LOCAL',
            direccionEnvio: direccion.trim(),
            referenciaEnvio: referencia.trim() || undefined,
            distritoEnvio: distrito.trim(),
            ...(ubicacion && { latitudEnvio: ubicacion.lat, longitudEnvio: ubicacion.lng }),
          }),
          ...(entrega === 'AGENCIA' && {
            modalidadEnvio: 'AGENCIA',
            agenciaEnvio: agencia.trim().toUpperCase(),
            agenciaDireccionEnvio: agenciaDireccion.trim(),
            departamentoEnvio: departamento.trim(),
            provinciaEnvio: provincia.trim(),
          }),
          notasComprador: notas.trim() || undefined,
        }),
      });
      await recargarCarrito();
      const pedido = r.pedidos?.[0];
      router.push(pedido ? `/${subdominio}/pedido/${pedido.id}` : `/${subdominio}/mis-pedidos`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el pedido');
      setEnviando(false);
    }
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-5">
        {/* Entrega */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-900">¿Cómo recibes tu pedido?</h2>
          {!opciones?.envio.disponible && !opciones?.retiroTienda.disponible && (
            <p className="text-sm text-red-600">Esta tienda no tiene configurada ninguna forma de entrega.</p>
          )}
          <div className="grid sm:grid-cols-3 gap-2">
            {opciones?.envio.disponible && (
              <>
                <Opcion activa={entrega === 'DELIVERY'} onClick={() => setEntrega('DELIVERY')}
                  titulo="Delivery en la ciudad" detalle="Te lo llevamos a tu dirección" colors={colors} />
                <Opcion activa={entrega === 'AGENCIA'} onClick={() => setEntrega('AGENCIA')}
                  titulo="Envío a provincia" detalle="Por agencia (Shalom, Olva…)" colors={colors} />
              </>
            )}
            {opciones?.retiroTienda.disponible && (
              <Opcion activa={entrega === 'RETIRO_TIENDA'} onClick={() => setEntrega('RETIRO_TIENDA')}
                titulo="Retiro en tienda" detalle="Sin costo de envío" colors={colors} />
            )}
          </div>

          {entrega === 'DELIVERY' && (
            <div className="space-y-2 pt-1">
              <input className={inputCls} placeholder="Dirección de entrega (calle, número, dpto.)" autoComplete="street-address"
                value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              <input className={inputCls} placeholder="Referencia (ej. frente al parque, puerta verde)"
                value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              <input className={inputCls} placeholder="Distrito / zona" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
              <button
                type="button"
                onClick={usarMiUbicacion}
                disabled={buscandoUbicacion}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {buscandoUbicacion ? 'Buscando tu ubicación…' : ubicacion ? '✓ Ubicación agregada (toca para actualizar)' : 'Compartir mi ubicación (opcional, ayuda al repartidor)'}
              </button>
              <p className="text-xs text-gray-400">{opciones?.envio.mensajeLocal}</p>
            </div>
          )}

          {entrega === 'AGENCIA' && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-500">Agencia</p>
              <div className="flex flex-wrap gap-1.5">
                {AGENCIAS.map((a) => (
                  <button key={a} type="button" onClick={() => setAgencia(a)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                    style={agencia === a ? { backgroundColor: colors.primario, borderColor: colors.primario, color: '#fff' } : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                    {a}
                  </button>
                ))}
              </div>
              <input className={inputCls} placeholder="Otra agencia (escríbela)" value={AGENCIAS.includes(agencia) ? '' : agencia}
                onChange={(e) => setAgencia(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
                <input className={inputCls} placeholder="Provincia / ciudad" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
              </div>
              <input className={inputCls} placeholder="Dirección de la agencia donde recogerás" value={agenciaDireccion}
                onChange={(e) => setAgenciaDireccion(e.target.value)} />
              <p className="text-xs text-gray-400">
                Recogerás tu pedido en la agencia con tu DNI. {opciones?.envio.mensajeNacional}
              </p>
            </div>
          )}

          {entrega === 'RETIRO_TIENDA' && opciones && opciones.retiroTienda.sedes.length > 1 && (
            <div className="space-y-2 pt-1">
              {opciones.retiroTienda.sedes.map((s) => (
                <Opcion key={s.id} activa={sedeId === s.id} onClick={() => setSedeId(s.id)} titulo={s.nombre}
                  detalle={[[s.direccion, s.distrito].filter(Boolean).join(', '), resumenHorario(s.horarioAtencion ?? undefined)].filter(Boolean).join(' · ')}
                  colors={colors} />
              ))}
            </div>
          )}
          {entrega === 'RETIRO_TIENDA' && opciones?.retiroTienda.sedes.length === 1 && (
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>
                Recoges en <span className="font-medium text-gray-700">{opciones.retiroTienda.sedes[0].nombre}</span>
                {opciones.retiroTienda.sedes[0].direccion ? ` — ${opciones.retiroTienda.sedes[0].direccion}` : ''}
              </p>
              {resumenHorario(opciones.retiroTienda.sedes[0].horarioAtencion ?? undefined) && (
                <p>Horario: {resumenHorario(opciones.retiroTienda.sedes[0].horarioAtencion ?? undefined)}</p>
              )}
            </div>
          )}
          {entrega === 'RETIRO_TIENDA' && (
            <p className="text-xs text-gray-400">Te avisaremos cuando esté listo. Al recoger, lleva tu DNI y el código del pedido.</p>
          )}
        </section>

        {/* Pago */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-900">¿Cómo pagas?</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <Opcion activa={pago === 'YAPE'} onClick={() => setPago('YAPE')} titulo="Yape / Plin"
              detalle="Pagas ahora; te mostramos el monto y el QR" colors={colors} />
            {opciones?.contraentrega.disponible && (
              <Opcion activa={pago === 'CONTRAENTREGA'} onClick={() => setPago('CONTRAENTREGA')} titulo="Contraentrega"
                detalle={opciones.contraentrega.mensaje} colors={colors} />
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas para la tienda (opcional)"
            value={notas} onChange={(e) => setNotas(e.target.value)} />
        </section>
      </div>

      {/* Resumen */}
      <aside className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 md:sticky md:top-24">
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-600 min-w-0">
                <span className="line-clamp-1">{i.cantidad} × {i.productoNombre}</span>
                {i.varianteNombre && <span className="block text-xs text-gray-400 line-clamp-1">{i.varianteNombre}</span>}
              </span>
              <span className="text-gray-900 flex-shrink-0">{soles(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        {entrega === 'DELIVERY' && <p className="text-xs text-gray-400">{opciones?.envio.mensajeLocal}</p>}
        {entrega === 'AGENCIA' && <p className="text-xs text-gray-400">{opciones?.envio.mensajeNacional}</p>}
        <div className="flex justify-between text-base font-medium text-gray-900 pt-3 border-t border-gray-100">
          <span>Total</span>
          <span>{soles(total)}</span>
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={!entrega || faltaDireccion || faltaSede || enviando}
          className="w-full py-3 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: colors.primario }}
        >
          {enviando ? 'Creando tu pedido…' : pago === 'CONTRAENTREGA' ? 'Confirmar pedido' : 'Confirmar e ir a pagar'}
        </button>
        <p className="text-[11px] text-gray-400 text-center">Los productos quedan separados para ti mientras pagas.</p>
      </aside>
    </div>
  );
}
