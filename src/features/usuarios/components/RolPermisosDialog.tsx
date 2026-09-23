'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { DIALOG_BODY, DIALOG_FOOT, DIALOG_HEAD, DIALOG_PANEL_RELIEVE_MD } from '@/components/ui/dialogo';
import type { Sede } from '@/core/types/empresa';
import type { PermisosPorRol, Usuario } from '@/core/types/usuario';
import { actualizarUsuario } from '../services/usuario-service';
import { PERMISO_CAJA_ABRIR, PERMISO_CAJA_CERRAR } from '../catalogos';
import AccesoUsuarioCampos, { payloadAcceso, type ConfigAcceso } from './AccesoUsuarioCampos';

interface Props {
  usuario: Usuario;
  sedes: Sede[];
  tabla: PermisosPorRol | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

/**
 * Lo que el usuario tiene hoy, consolidado entre sedes como lo hace el backend
 * al autorizar: si lo tiene en una, lo tiene.
 */
function configActual(u: Usuario, sedes: Sede[]): ConfigAcceso {
  const permisos = new Set(u.sedes.flatMap((s) => s.permisos));
  // Los flags viejos de caja se muestran como su permiso especial: la ficha
  // tiene una sola sección de caja.
  if (u.sedes.some((s) => s.puedeAbrirCaja)) permisos.add(PERMISO_CAJA_ABRIR);
  if (u.sedes.some((s) => s.puedeCerrarCaja)) permisos.add(PERMISO_CAJA_CERRAR);
  const limite = u.sedes.find((s) => s.limiteCreditoVenta != null)?.limiteCreditoVenta;
  const sedeIds = u.sedes.map((s) => s.sedeId);
  return {
    rol: u.rolEnEmpresa,
    sedeIds: sedeIds.length === 0 && sedes.length === 1 ? [sedes[0].id] : sedeIds,
    permisos: [...permisos],
    ocultos: [...new Set(u.sedes.flatMap((s) => s.accesosRapidosOcultos))],
    limiteCreditoVenta: limite != null ? String(limite) : '',
  };
}

/** Réplica de `asignar_rol_dialog.dart`. */
export default function RolPermisosDialog({ usuario, sedes, tabla, onClose, onSuccess }: Props) {
  const [acceso, setAcceso] = useState<ConfigAcceso>(() => configActual(usuario, sedes));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError('');
    if (!acceso.rol) return setError('Elige un rol');
    if (sedes.length > 0 && acceso.sedeIds.length === 0) return setError('Debe tener al menos una sede');
    setGuardando(true);
    try {
      await actualizarUsuario(usuario.id, payloadAcceso(acceso));
      onSuccess(`${usuario.nombreCompleto}: rol y permisos actualizados`);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={DIALOG_PANEL_RELIEVE_MD} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">Rol y permisos</h3>
          <p className="text-[11px] text-gray-400">{usuario.nombreCompleto} · DNI {usuario.dni}</p>
        </div>
        <div className={DIALOG_BODY}>
          <div className="pb-3">
            <AccesoUsuarioCampos
              value={acceso}
              onChange={setAcceso}
              sedes={sedes}
              tabla={tabla}
              presetAlElegirRol={false}
              mostrarLimiteCredito
            />
            <p className="mt-3 text-[10px] text-gray-400">Al guardar se cierran sus sesiones abiertas para que tome los permisos nuevos.</p>
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
