import { NextResponse } from 'next/server';
import { backendConSesion, borrarSesion, guardarSesion } from '@/lib/tienda-sesion';

/**
 * ¿Hay comprador logueado? Siempre 200: `usuario: null` cuando no (la
 * página pregunta en cada carga y un 401 ensuciaría la consola).
 */
export async function GET() {
  const r = await backendConSesion('/auth/profile');
  if (r.sinSesion || !r.res.ok) {
    const salida = NextResponse.json({ usuario: null });
    if (r.sinSesion) borrarSesion(salida);
    return salida;
  }
  const u = await r.res.json().catch(() => null);
  const p = u?.persona ?? u;
  const salida = NextResponse.json({
    usuario: u
      ? {
          nombres: p?.nombres ?? u.nombres,
          apellidos: p?.apellidos ?? u.apellidos,
          dni: p?.dni ?? u.dni,
          telefono: p?.telefono ?? u.telefono,
          email: u.email,
        }
      : null,
  });
  if (r.renovados) guardarSesion(salida, r.renovados);
  return salida;
}
