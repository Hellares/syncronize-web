import { NextRequest } from 'next/server';
import { backendConSesion, responder } from '@/lib/tienda-sesion';

/**
 * Carrito, checkout, pedidos y servicios del comprador, reenviados al backend con su
 * sesión. Solo estas rutas: esto no es un proxy abierto al backend.
 */
const PERMITIDAS = [
  /^marketplace\/carrito$/,
  /^marketplace\/carrito\/contador$/,
  /^marketplace\/carrito\/opciones-envio\/[\w-]+$/,
  /^marketplace\/carrito\/[\w-]+$/,
  /^marketplace\/checkout$/,
  /^marketplace\/mis-pedidos$/,
  /^marketplace\/mis-pedidos\/[\w-]+$/,
  /^marketplace\/mis-pedidos\/[\w-]+\/(cobro-yape|comprobante-pago|cancelar|confirmar-recepcion)$/,
  // Mis compras (sus ventas en esa tienda: pagadas y a crédito)
  /^marketplace\/empresas\/[\w-]+\/mis-compras$/,
  /^marketplace\/empresas\/[\w-]+\/mis-compras\/[\w-]+$/,
  // Mis servicios (órdenes de servicio del comprador en esa tienda)
  /^marketplace\/empresas\/[\w-]+\/mis-servicios$/,
  /^marketplace\/empresas\/[\w-]+\/mis-servicios\/[\w-]+$/,
  /^marketplace\/empresas\/[\w-]+\/mis-servicios\/[\w-]+\/(mensajes|aprobar)$/,
];

type Params = { params: Promise<{ ruta: string[] }> };

async function reenviar(request: NextRequest, { params }: Params) {
  const { ruta } = await params;
  const camino = ruta.join('/');
  if (!PERMITIDAS.some((re) => re.test(camino))) {
    return new Response(JSON.stringify({ message: 'No encontrado' }), { status: 404 });
  }

  const metodo = request.method;
  let body: BodyInit | undefined;
  if (metodo !== 'GET' && metodo !== 'DELETE') {
    const tipo = request.headers.get('content-type') || '';
    // El comprobante de pago viaja como archivo.
    body = tipo.includes('multipart/form-data') ? await request.formData() : await request.text();
  }

  const qs = request.nextUrl.search;
  return responder(await backendConSesion(`/${camino}${qs}`, { method: metodo, body }));
}

export { reenviar as GET, reenviar as POST, reenviar as PUT, reenviar as DELETE };
