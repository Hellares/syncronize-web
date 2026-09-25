import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Sesión del COMPRADOR de la tienda pública (no la del panel). Vive en cookies
 * httpOnly del dominio de la tienda — `syncronize.net.pe` o el dominio propio
 * de la empresa — y el navegador nunca habla con el backend: lo hacen las
 * rutas `/api/tienda/*`. Así el JS de la página no puede leer los tokens y no
 * hace falta abrir CORS del backend a cada dominio propio.
 */

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const COOKIE_ACCESO = 'tienda_at';
const COOKIE_REFRESCO = 'tienda_rt';
/** Lo que dura el refresh token del backend (7 días). */
const VIDA_SEG = 7 * 24 * 60 * 60;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: VIDA_SEG,
  };
}

export function guardarSesion(res: NextResponse, tokens: Tokens) {
  res.cookies.set(COOKIE_ACCESO, tokens.accessToken, opcionesCookie());
  res.cookies.set(COOKIE_REFRESCO, tokens.refreshToken, opcionesCookie());
}

export function borrarSesion(res: NextResponse) {
  res.cookies.set(COOKIE_ACCESO, '', { ...opcionesCookie(), maxAge: 0 });
  res.cookies.set(COOKIE_REFRESCO, '', { ...opcionesCookie(), maxAge: 0 });
}

export async function tokensActuales(): Promise<Partial<Tokens>> {
  const jar = await cookies();
  return {
    accessToken: jar.get(COOKIE_ACCESO)?.value || undefined,
    refreshToken: jar.get(COOKIE_REFRESCO)?.value || undefined,
  };
}

/** Llamada al backend sin sesión (registro, estado del DNI…). */
export async function backendPublico(ruta: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
}

/**
 * Llamada al backend CON la sesión del comprador. Si el access token venció,
 * lo renueva una vez con el refresh y reintenta. Devuelve los tokens nuevos
 * (si hubo renovación) para que la ruta los guarde en la respuesta.
 */
export async function backendConSesion(
  ruta: string,
  init: RequestInit = {},
): Promise<{ res: Response; renovados?: Tokens; sinSesion?: boolean }> {
  const { accessToken, refreshToken } = await tokensActuales();
  if (!accessToken && !refreshToken) {
    return { res: new Response(JSON.stringify({ message: 'Inicia sesión para continuar' }), { status: 401 }), sinSesion: true };
  }

  const llamar = (token?: string) =>
    fetch(`${API_URL}${ruta}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

  let res = accessToken ? await llamar(accessToken) : null;
  if (res && res.status !== 401) return { res };

  if (!refreshToken) return { res: res!, sinSesion: true };
  const r = await backendPublico('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  if (!r.ok) {
    return {
      res: new Response(JSON.stringify({ message: 'Tu sesión venció. Vuelve a ingresar.' }), { status: 401 }),
      sinSesion: true,
    };
  }
  const nuevos = (await r.json()) as Tokens;
  res = await llamar(nuevos.accessToken);
  return { res, renovados: { accessToken: nuevos.accessToken, refreshToken: nuevos.refreshToken || refreshToken } };
}

/** Pasa la respuesta del backend al navegador, con los tokens renovados si los hubo. */
export async function responder(
  { res, renovados, sinSesion }: { res: Response; renovados?: Tokens; sinSesion?: boolean },
) {
  const texto = await res.text();
  const salida = new NextResponse(texto || null, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  });
  if (renovados) guardarSesion(salida, renovados);
  if (sinSesion) borrarSesion(salida);
  return salida;
}
