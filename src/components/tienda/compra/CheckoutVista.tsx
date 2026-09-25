'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OpcionesEnvio, Pedido, mkt, soles } from '@/lib/tienda-compra';
import { TiendaColors } from '@/lib/colors';
import { useSesionTienda } from './SesionTienda';
import { Cargando, PedirIngreso } from './CarritoVista';

type Entrega = 'ENVIO_DOMICILIO' | 'RETIRO_TIENDA';
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
        setEntrega(o.envio.disponible ? 'ENVIO_DOMICILIO' : o.retiroTienda.disponible ? 'RETIRO_TIENDA' : null);
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
  const faltaDireccion = entrega === 'ENVIO_DOMICILIO' && (direccion.trim().length < 5 || !distrito.trim());
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
          entregaPorEmpresa: [{ empresaId, tipoEntrega: entrega, ...(entrega === 'RETIRO_TIENDA' && { sedeRetiroId: sedeId }) }],
          ...(entrega === 'ENVIO_DOMICILIO' && {
            direccionEnvio: direccion.trim(),
            referenciaEnvio: referencia.trim() || undefined,
            distritoEnvio: distrito.trim(),
            provinciaEnvio: provincia.trim() || undefined,
            departamentoEnvio: departamento.trim() || undefined,
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
          <div className="grid sm:grid-cols-2 gap-2">
            {opciones?.envio.disponible && (
              <Opcion activa={entrega === 'ENVIO_DOMICILIO'} onClick={() => setEntrega('ENVIO_DOMICILIO')}
                titulo="Envío a domicilio" detalle={opciones.envio.mensajeLocal} colors={colors} />
            )}
            {opciones?.retiroTienda.disponible && (
              <Opcion activa={entrega === 'RETIRO_TIENDA'} onClick={() => setEntrega('RETIRO_TIENDA')}
                titulo="Retiro en tienda" detalle="Sin costo de envío" colors={colors} />
            )}
          </div>

          {entrega === 'ENVIO_DOMICILIO' && (
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <input className={`${inputCls} sm:col-span-2`} placeholder="Dirección (calle, número, dpto.)" autoComplete="street-address"
                value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="Referencia (opcional)"
                value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              <input className={inputCls} placeholder="Distrito" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
              <input className={inputCls} placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
            </div>
          )}

          {entrega === 'RETIRO_TIENDA' && opciones && opciones.retiroTienda.sedes.length > 1 && (
            <div className="space-y-2 pt-1">
              {opciones.retiroTienda.sedes.map((s) => (
                <Opcion key={s.id} activa={sedeId === s.id} onClick={() => setSedeId(s.id)} titulo={s.nombre}
                  detalle={[s.direccion, s.distrito].filter(Boolean).join(', ')} colors={colors} />
              ))}
            </div>
          )}
          {entrega === 'RETIRO_TIENDA' && opciones?.retiroTienda.sedes.length === 1 && (
            <p className="text-xs text-gray-500">
              Retiras en {opciones.retiroTienda.sedes[0].nombre}
              {opciones.retiroTienda.sedes[0].direccion ? ` — ${opciones.retiroTienda.sedes[0].direccion}` : ''}
            </p>
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
        {entrega === 'ENVIO_DOMICILIO' && <p className="text-xs text-gray-400">{opciones?.envio.mensajeLocal}</p>}
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
