'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { DIALOG_BODY, DIALOG_FOOT, DIALOG_HEAD, DIALOG_PANEL_RELIEVE, INPUT_STD, LABEL } from '@/components/ui/dialogo';
import type { Usuario } from '@/core/types/usuario';
import { actualizarUsuario } from '../services/usuario-service';

interface Props {
  usuario: Usuario;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

/**
 * Contacto y alias del ticket. Nombres y DNI no se editan acá (vienen de
 * RENIEC), igual que en el app.
 */
export default function EditarDatosUsuarioDialog({ usuario, onClose, onSuccess }: Props) {
  const [telefono, setTelefono] = useState(usuario.telefono ?? '');
  const [email, setEmail] = useState(usuario.email ?? '');
  const [direccion, setDireccion] = useState(usuario.direccion ?? '');
  const [alias, setAlias] = useState(usuario.aliasTicket ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError('');
    if (telefono && !/^9\d{8}$/.test(telefono)) return setError('El teléfono debe tener 9 dígitos y empezar con 9');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('El email no es válido');
    if (alias.trim().length > 30) return setError('El alias no puede superar 30 caracteres');
    setGuardando(true);
    try {
      await actualizarUsuario(usuario.id, {
        // Vacío no viaja: el backend lo validaría como teléfono/email inválido.
        telefono: telefono || undefined,
        email: email.trim() || undefined,
        direccion: direccion.trim(),
        // '' SÍ viaja: borra el alias y el ticket vuelve al nombre completo.
        aliasTicket: alias.trim(),
      });
      onSuccess('Datos actualizados');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={DIALOG_PANEL_RELIEVE} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">Editar datos</h3>
          <p className="text-[11px] text-gray-400">{usuario.nombreCompleto} · DNI {usuario.dni}</p>
        </div>
        <div className={DIALOG_BODY}>
          <div className="space-y-3 pb-3">
            <div>
              <label className={LABEL}>Teléfono</label>
              <input className={INPUT_STD} value={telefono} maxLength={9} inputMode="numeric" onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div><label className={LABEL}>Email</label><input className={INPUT_STD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className={LABEL}>Dirección</label><input className={INPUT_STD} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></div>
            <div>
              <label className={LABEL}>Alias en el ticket</label>
              <input className={INPUT_STD} value={alias} maxLength={30} placeholder="JP, Caja 1, Juana…" onChange={(e) => setAlias(e.target.value)} />
              <p className="mt-1 text-[10px] text-gray-400">Lo ve el cliente en el ticket en lugar del nombre completo. Vacío = nombre completo.</p>
            </div>
          </div>
        </div>
        <div className={DIALOG_FOOT}>
          {error && <p className="mr-auto self-center text-[11px] text-red-600">{error}</p>}
          <button onClick={onClose} disabled={guardando} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
