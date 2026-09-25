'use client';

import { useEffect, useState } from 'react';
import { ErrorApi, RespuestaEstadoDni, UsuarioComprador, api } from '@/lib/tienda-compra';

/**
 * Ingreso del comprador. Todo arranca por el DNI y sigue según lo que haya:
 * - NUEVO: registro (nombre de RENIEC) + celular → código por WhatsApp.
 * - ACTIVA: contraseña (u "olvidé mi contraseña" → código).
 * - POR_ACTIVAR: lo cargó una tienda → código al celular que YA tiene registrado.
 * - SIN_CONTACTO: no hay cómo verificarlo → que la tienda le actualice el celular.
 * 🔴 Nunca se usa la contraseña temporal (= DNI) de las cuentas creadas por
 * una tienda: el backend la rechaza acá y se activa con el código.
 */
type Paso = 'dni' | 'ingresar' | 'registro' | 'activar' | 'sin-contacto' | 'codigo';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900';
const botonCls =
  'w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors disabled:opacity-50';
const enlaceCls = 'text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900';

export function IngresoModal({
  onCerrar,
  onIngreso,
}: {
  onCerrar: () => void;
  onIngreso: (u: UsuarioComprador) => void;
}) {
  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [info, setInfo] = useState<RespuestaEstadoDni | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [celularCodigo, setCelularCodigo] = useState('');
  const [esRegistro, setEsRegistro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Esc cierra; el scroll de la página queda quieto detrás.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [onCerrar]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const correr = async (fn: () => Promise<void>) => {
    setError(null);
    setCargando(true);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Algo salió mal'); } finally { setCargando(false); }
  };

  const consultarDni = () => correr(async () => {
    const r = await api<RespuestaEstadoDni>('/auth/estado', { method: 'POST', body: JSON.stringify({ dni }) });
    setInfo(r);
    if (r.estado === 'NUEVO') {
      setNombres(r.nombres ?? '');
      setApellidos(r.apellidos ?? '');
      setEsRegistro(true);
      setPaso('registro');
    } else {
      setEsRegistro(false);
      setPaso(r.estado === 'ACTIVA' ? 'ingresar' : r.estado === 'POR_ACTIVAR' ? 'activar' : 'sin-contacto');
    }
  });

  const enviarCodigo = (celularNuevo?: string) => correr(async () => {
    const r = await api<{ celularEnmascarado: string }>('/auth/enviar-codigo', {
      method: 'POST',
      body: JSON.stringify({ dni, ...(celularNuevo && { celular: celularNuevo }) }),
    });
    setCelularCodigo(r.celularEnmascarado);
    setCodigo('');
    setPassword('');
    setPassword2('');
    setEspera(60);
    setPaso('codigo');
  });

  const ingresar = () => correr(async () => {
    try {
      const r = await api<{ usuario: UsuarioComprador }>('/auth/ingresar', {
        method: 'POST',
        body: JSON.stringify({ dni, password }),
      });
      onIngreso(r.usuario);
    } catch (e) {
      // Contraseña temporal de una tienda: se activa con el código.
      if (e instanceof ErrorApi && e.data?.porActivar) { setPaso('activar'); return; }
      throw e;
    }
  });

  const confirmar = () => correr(async () => {
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    if (password !== password2) throw new Error('Las contraseñas no coinciden');
    const r = await api<{ usuario: UsuarioComprador }>('/auth/confirmar', {
      method: 'POST',
      body: JSON.stringify({
        dni, codigo, password,
        ...(esRegistro && { nombres, apellidos, email: email.trim() || undefined }),
      }),
    });
    onIngreso(r.usuario);
  });

  const titulo: Record<Paso, string> = {
    dni: 'Ingresa para comprar',
    ingresar: `Hola${info?.nombres ? `, ${info.nombres.split(' ')[0]}` : ''}`,
    registro: 'Crea tu cuenta',
    activar: '¡Ya eres cliente!',
    'sin-contacto': 'Necesitamos verificarte',
    codigo: 'Revisa tu WhatsApp',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onCerrar}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingreso-titulo"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            {paso !== 'dni' && (
              <button onClick={() => { setError(null); setPaso('dni'); }} aria-label="Volver" className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <h2 id="ingreso-titulo" className="text-lg font-medium text-gray-900">{titulo[paso]}</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form
          className="px-5 pt-3 pb-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (cargando) return;
            if (paso === 'dni') void consultarDni();
            else if (paso === 'ingresar') void ingresar();
            else if (paso === 'registro') void enviarCodigo(celular);
            else if (paso === 'activar') void enviarCodigo();
            else if (paso === 'codigo') void confirmar();
          }}
        >
          {paso === 'dni' && (
            <>
              <p className="text-sm text-gray-500">Con tu DNI vemos si ya tienes cuenta en alguna tienda.</p>
              <input
                className={inputCls} inputMode="numeric" autoComplete="username" autoFocus maxLength={8}
                placeholder="DNI (8 dígitos)" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              />
              <button className={botonCls} disabled={cargando || dni.length !== 8}>{cargando ? 'Consultando…' : 'Continuar'}</button>
            </>
          )}

          {paso === 'ingresar' && (
            <>
              <p className="text-sm text-gray-500">DNI {dni}. Ingresa tu contraseña.</p>
              <input
                className={inputCls} type="password" autoComplete="current-password" autoFocus
                placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button className={botonCls} disabled={cargando || !password}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
              <button type="button" className={enlaceCls} disabled={cargando} onClick={() => void enviarCodigo()}>
                Olvidé mi contraseña
              </button>
            </>
          )}

          {paso === 'registro' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Nombres" value={nombres} readOnly={!!info?.nombres}
                  onChange={(e) => setNombres(e.target.value)} />
                <input className={inputCls} placeholder="Apellidos" value={apellidos} readOnly={!!info?.apellidos}
                  onChange={(e) => setApellidos(e.target.value)} />
              </div>
              {info?.nombres && <p className="text-xs text-gray-400 -mt-1">Nombre según RENIEC.</p>}
              <input
                className={inputCls} inputMode="numeric" autoComplete="tel" autoFocus maxLength={9}
                placeholder="Celular (te enviaremos un código por WhatsApp)" value={celular}
                onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
              />
              <input
                className={inputCls} type="email" autoComplete="email"
                placeholder="Correo (opcional)" value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <button className={botonCls} disabled={cargando || !/^9\d{8}$/.test(celular) || nombres.trim().length < 2 || apellidos.trim().length < 2}>
                {cargando ? 'Enviando…' : 'Enviar código por WhatsApp'}
              </button>
            </>
          )}

          {paso === 'activar' && (
            <>
              <p className="text-sm text-gray-600">
                {info?.nombres ? `${info.nombres.split(' ')[0]}, ya` : 'Ya'} compraste en alguna de nuestras tiendas, así que tienes una cuenta.
                Para activarla te enviaremos un código por WhatsApp al <span className="font-medium text-gray-900">{info?.celularEnmascarado ?? 'celular registrado'}</span>.
              </p>
              <button className={botonCls} disabled={cargando}>{cargando ? 'Enviando…' : 'Enviarme el código'}</button>
              <p className="text-xs text-gray-400">¿Ese ya no es tu número? Pide a la tienda que lo actualice.</p>
            </>
          )}

          {paso === 'sin-contacto' && (
            <p className="text-sm text-gray-600">
              Ya eres cliente de una de nuestras tiendas, pero no tenemos un celular tuyo para verificar que eres tú.
              Pide a la tienda que registre tu celular y vuelve a intentarlo.
            </p>
          )}

          {paso === 'codigo' && (
            <>
              <p className="text-sm text-gray-500">Te enviamos un código de 6 dígitos al <span className="font-medium text-gray-900">{celularCodigo}</span>.</p>
              <input
                className={`${inputCls} tracking-[0.4em] text-center text-lg`} inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                placeholder="••••••" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
              <input
                className={inputCls} type="password" autoComplete="new-password"
                placeholder={esRegistro ? 'Crea tu contraseña (mínimo 8)' : 'Nueva contraseña (mínimo 8)'}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <input
                className={inputCls} type="password" autoComplete="new-password"
                placeholder="Repite la contraseña" value={password2} onChange={(e) => setPassword2(e.target.value)}
              />
              <button className={botonCls} disabled={cargando || codigo.length !== 6 || !password || !password2}>
                {cargando ? 'Verificando…' : esRegistro ? 'Crear mi cuenta' : 'Activar y entrar'}
              </button>
              <button
                type="button" className={enlaceCls} disabled={cargando || espera > 0}
                onClick={() => void enviarCodigo(esRegistro ? celular : undefined)}
              >
                {espera > 0 ? `Reenviar código en ${espera}s` : 'Reenviar código'}
              </button>
            </>
          )}

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </form>
      </div>
    </div>
  );
}
