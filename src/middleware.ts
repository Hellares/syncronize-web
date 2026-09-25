import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DOMINIOS_PROPIOS, HOSTS_SYNCRONIZE_PROD, dominioQueRedirige } from '@/lib/dominios-propios';

const COOKIE_NAME = 'sync_logged_in';

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_PATHS = ['/login', '/register'];

/** Lo que el sistema (no la tienda) sirve en la raíz: en un dominio propio va a syncronize. */
const RUTAS_DEL_SISTEMA = ['/dashboard', '/login', '/register'];

function hostDe(request: NextRequest): string {
  // Detrás de Nginx Proxy Manager el Host llega tal cual; `x-forwarded-host`
  // por si algún día hay otro proxy delante.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  return host.split(':')[0].toLowerCase();
}

/**
 * Tienda en dominio propio (ver `lib/dominios-propios.ts`). Devuelve la
 * respuesta a usar, o null si el pedido no es para un dominio propio.
 */
function dominioPropio(request: NextRequest, host: string): NextResponse | null {
  const sinWww = host.replace(/^www\./, '');
  const config = DOMINIOS_PROPIOS[sinWww];
  if (!config) return null;

  const { pathname, search } = request.nextUrl;
  const sub = `/${config.subdominio}`;

  // www → dominio pelado: una sola URL por página (buscadores, links compartidos).
  if (host !== sinWww) {
    return NextResponse.redirect(`https://${sinWww}${pathname}${search}`, 308);
  }

  // Las rutas de la API de la tienda (`/api/<sub>/productos`) se sirven tal cual.
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Panel, login y registro no existen en el dominio de la empresa.
  if (RUTAS_DEL_SISTEMA.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.redirect(`https://syncronize.net.pe${pathname}${search}`, 308);
  }

  // Los links de la tienda se arman como `/<sub>/producto/x`: en el dominio
  // propio se limpian a `/producto/x`.
  if (pathname === sub || pathname.startsWith(`${sub}/`)) {
    const limpio = pathname.slice(sub.length) || '/';
    // Absoluta a propósito: detrás del proxy `request.url` es la dirección
    // interna del contenedor.
    return NextResponse.redirect(`https://${sinWww}${limpio}${search}`, 308);
  }

  // `/` → `/<sub>`, `/producto/x` → `/<sub>/producto/x`, sin cambiar la URL visible.
  const destino = request.nextUrl.clone();
  destino.pathname = pathname === '/' ? sub : `${sub}${pathname}`;
  return NextResponse.rewrite(destino);
}

export function middleware(request: NextRequest) {
  const host = hostDe(request);

  const propio = dominioPropio(request, host);
  if (propio) return propio;

  const { pathname, search } = request.nextUrl;

  // En syncronize.net.pe, la tienda de una empresa con dominio propio (ya
  // activo) manda a ese dominio.
  if (HOSTS_SYNCRONIZE_PROD.includes(host)) {
    const [, primero, ...resto] = pathname.split('/');
    const dominio = primero ? dominioQueRedirige(primero) : null;
    if (dominio) {
      const rutaResto = resto.length ? `/${resto.join('/')}` : '/';
      return NextResponse.redirect(`https://${dominio}${rutaResto}${search}`, 308);
    }
  }

  const isLoggedIn = request.cookies.get(COOKIE_NAME)?.value === '1';

  // Protected routes: redirect to login if not authenticated
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect to dashboard if already authenticated
  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos los estáticos (`/_next/...` y archivos con extensión: imágenes,
  // fuentes, favicon): el dominio propio tiene que ver cada página, no solo
  // login/registro/panel como antes.
  matcher: ['/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)'],
};
