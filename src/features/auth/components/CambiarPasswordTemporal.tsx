'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '@/core/auth/auth-context';

interface Props {
  /** Con lo que entró: email o DNI. Sirve para volver a entrar con la nueva. */
  credencial: string;
  /** La contraseña temporal que acaba de tipear. */
  passwordActual: string;
  nombre: string;
  /**
   * Avisa la nueva ANTES de volver a entrar: si después toca elegir modo, ese
   * paso reenvía la contraseña del formulario y tiene que ser la nueva.
   */
  onCambiada: (nueva: string) => void;
  onCancelar: () => void;
}

/** Las mismas reglas que `ChangePasswordDto` del backend. */
const REGLAS: { texto: string; ok: (p: string) => boolean }[] = [
  { texto: 'Al menos 8 caracteres', ok: (p) => p.length >= 8 },
  { texto: 'Una mayúscula', ok: (p) => /[A-Z]/.test(p) },
  { texto: 'Una minúscula', ok: (p) => /[a-z]/.test(p) },
  { texto: 'Un número', ok: (p) => /\d/.test(p) },
  { texto: 'Un símbolo: @ $ ! % * ? &', ok: (p) => /[@$!%*?&]/.test(p) },
];

const INPUT =
  'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#437EFF] focus:ring-2 focus:ring-[#437EFF]/20';

/**
 * Primer ingreso de una cuenta creada por un admin: hay que cambiar la
 * contraseña temporal antes de entrar, como en el app (`/change-password`).
 */
export default function CambiarPasswordTemporal({ credencial, passwordActual, nombre, onCambiada, onCancelar }: Props) {
  const { cambiarPasswordTemporal } = useAuth();
  // Se congela al montar: `passwordActual` sale del campo del login, que
  // `onCambiada` pisa con la nueva.
  const [temporal] = useState(passwordActual);
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cumple = REGLAS.every((r) => r.ok(nueva));

  const guardar = async () => {
    setError('');
    if (!cumple) return setError('La contraseña no cumple los requisitos');
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden');
    if (nueva === temporal) return setError('La nueva contraseña debe ser distinta de la temporal');
    setGuardando(true);
    try {
      onCambiada(nueva);
      await cambiarPasswordTemporal(credencial, temporal, nueva);
    } catch (err) {
      // Si falló el cambio, la vigente sigue siendo la temporal. Si falló
      // volver a entrar, la nueva ya quedó: el formulario se queda con ella.
      if (err instanceof AxiosError && err.config?.url?.includes('change-password')) onCambiada(temporal);
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo cambiar la contraseña');
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Crea tu contraseña</h2>
        <p className="mt-1 text-sm text-gray-500">
          Hola{nombre ? ` ${nombre}` : ''}, tu cuenta tiene una contraseña temporal. Cámbiala para continuar.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); guardar(); }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="nueva" className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
          <input id="nueva" type="password" autoComplete="new-password" autoFocus className={INPUT} value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {REGLAS.map((r) => (
              <li key={r.texto} className={`text-xs ${r.ok(nueva) ? 'text-green-600' : 'text-gray-400'}`}>
                {r.ok(nueva) ? '✓' : '·'} {r.texto}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label htmlFor="confirmar" className="mb-1 block text-sm font-medium text-gray-700">Repite la contraseña</label>
          <input id="confirmar" type="password" autoComplete="new-password" className={INPUT} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-[#004A94] py-3 text-sm font-bold text-white transition-all hover:bg-[#003570] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
        <button type="button" onClick={onCancelar} disabled={guardando} className="w-full text-xs text-gray-500 hover:underline">
          Volver al inicio de sesión
        </button>
      </form>
    </div>
  );
}
