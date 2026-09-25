import { NextRequest, NextResponse } from 'next/server';
import { backendConSesion, backendPublico, borrarSesion, guardarSesion } from '@/lib/tienda-sesion';

/**
 * Cuenta del comprador (ver `lib/tienda-sesion.ts`):
 * - estado / enviar-codigo: pasan tal cual a `/auth/comprador/*`.
 * - confirmar: además deja la sesión en cookies.
 * - ingresar: DNI + contraseña en modo marketplace.
 * - salir: cierra la sesión del backend y borra las cookies.
 */
type Params = { params: Promise<{ accion: string }> };

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

/** Solo lo que la página necesita del usuario: nunca los tokens. */
function usuarioPublico(u: Record<string, unknown> | undefined) {
  if (!u) return null;
  return { nombres: u.nombres, apellidos: u.apellidos, dni: u.dni, telefono: u.telefono, email: u.email };
}

export async function POST(request: NextRequest, { params }: Params) {
  const { accion } = await params;
  const body = await request.json().catch(() => ({}));

  switch (accion) {
    case 'estado':
    case 'enviar-codigo': {
      const res = await backendPublico(`/auth/comprador/${accion}`, { method: 'POST', body: JSON.stringify(body) });
      return NextResponse.json(await json(res), { status: res.status });
    }

    case 'confirmar': {
      const res = await backendPublico('/auth/comprador/confirmar', { method: 'POST', body: JSON.stringify(body) });
      const data = await json(res);
      if (!res.ok) return NextResponse.json(data, { status: res.status });
      const salida = NextResponse.json({ usuario: usuarioPublico(data.user) });
      guardarSesion(salida, data);
      return salida;
    }

    case 'ingresar': {
      const res = await backendPublico('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ credencial: String(body.dni ?? '').trim(), password: body.password, loginMode: 'marketplace' }),
      });
      const data = await json(res);
      if (!res.ok) return NextResponse.json(data, { status: res.status });
      // Cuenta con contraseña temporal (la cargó una tienda): los tokens que
      // devuelve el login solo sirven para cambiarla. En la tienda se activa
      // con el código por WhatsApp, así que no se guarda sesión.
      if (data.user?.requiereCambioPassword) {
        return NextResponse.json(
          { porActivar: true, message: 'Activa tu cuenta con el código que te enviamos por WhatsApp.' },
          { status: 409 },
        );
      }
      const salida = NextResponse.json({ usuario: usuarioPublico(data.user) });
      guardarSesion(salida, data);
      return salida;
    }

    case 'salir': {
      await backendConSesion('/auth/logout', { method: 'POST' }).catch(() => null);
      const salida = NextResponse.json({ ok: true });
      borrarSesion(salida);
      return salida;
    }

    default:
      return NextResponse.json({ message: 'No encontrado' }, { status: 404 });
  }
}
