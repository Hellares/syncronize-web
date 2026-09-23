'use client';

import { useEffect, useState } from 'react';
import { DIALOG_BODY, DIALOG_FOOT, DIALOG_HEAD, DIALOG_PANEL_RELIEVE_MD } from '@/components/ui/dialogo';
import type { PermisoExplicado, PermisosDeUsuario, Usuario } from '@/core/types/usuario';
import { getPermisosDeUsuario } from '../services/usuario-service';
import { ETIQUETAS_PERMISO, etiquetaOculto, etiquetaPermisoEspecial, etiquetaRol, etiquetaRolSede } from '../catalogos';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

/**
 * "Qué puede hacer este usuario, y por qué" — réplica de
 * `permisos_usuario_sheet.dart`.
 *
 * Tres bloques porque responden preguntas distintas: qué PUEDE (con el origen
 * de cada permiso), qué se le asignó a mano y qué NO VE aunque pueda. "No le
 * aparece" puede ser falta de permiso o que se lo ocultaron, y se arreglan en
 * lugares opuestos.
 */
export default function PermisosUsuarioDialog({ usuario, onClose }: Props) {
  const [datos, setDatos] = useState<PermisosDeUsuario | null>(null);
  const [error, setError] = useState('');
  const [verNegados, setVerNegados] = useState(false);

  useEffect(() => {
    let vivo = true;
    getPermisosDeUsuario(usuario.id)
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setError('No se pudieron cargar los permisos'); });
    return () => { vivo = false; };
  }, [usuario.id]);

  const concedidos = datos?.permisos.filter((p) => p.valor) ?? [];
  const negados = datos?.permisos.filter((p) => !p.valor) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={DIALOG_PANEL_RELIEVE_MD} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">Permisos de {usuario.nombreCompleto}</h3>
          {datos && (
            <p className="text-[11px] text-gray-400">
              {datos.roles.map(etiquetaRol).join(', ')} · {datos.resumen.concedidos} de {datos.resumen.total} permisos
            </p>
          )}
        </div>

        <div className={DIALOG_BODY}>
          {error ? (
            <p className="py-8 text-center text-xs text-red-600">{error}</p>
          ) : !datos ? (
            <p className="py-8 text-center text-xs text-gray-400">Cargando…</p>
          ) : (
            <div className="space-y-4 pb-3">
              {datos.sedes.length > 0 && (
                <Bloque titulo="Sedes">
                  <div className="flex flex-wrap gap-1.5">
                    {datos.sedes.map((s) => (
                      <span key={s.sedeId} className="rounded-full bg-[#eaf2fd] px-2 py-0.5 text-[11px] text-[#004A94]">
                        {s.sedeNombre} · {etiquetaRolSede(s.rol)}
                      </span>
                    ))}
                  </div>
                </Bloque>
              )}

              <Bloque titulo="Qué puede hacer">
                {concedidos.length === 0
                  ? <Vacio texto="Ningún permiso" />
                  : concedidos.map((p) => <FilaPermiso key={p.clave} p={p} />)}
              </Bloque>

              <Bloque titulo="Asignado a mano">
                {datos.asignado.permisosEspeciales.length === 0 ? (
                  <Vacio texto="Nada: todo le viene de su rol" />
                ) : (
                  <ul className="space-y-0.5">
                    {datos.asignado.permisosEspeciales.map((id) => (
                      <li key={id} className="text-[12px] text-gray-700">🔑 {etiquetaPermisoEspecial(id)}</li>
                    ))}
                  </ul>
                )}
              </Bloque>

              <Bloque titulo="Qué NO ve (aunque pueda)">
                {datos.ocultos.dashboard.length === 0 && datos.ocultos.menu.length === 0 ? (
                  <Vacio texto="Nada oculto: ve todo lo que su rol permite" />
                ) : (
                  <div className="space-y-1 text-[12px] text-gray-700">
                    {datos.ocultos.dashboard.length > 0 && (
                      <p><span className="text-gray-400">Dashboard:</span> {datos.ocultos.dashboard.map(etiquetaOculto).join(', ')}</p>
                    )}
                    {datos.ocultos.menu.length > 0 && (
                      <p><span className="text-gray-400">Menú:</span> {datos.ocultos.menu.map(etiquetaOculto).join(', ')}</p>
                    )}
                  </div>
                )}
              </Bloque>

              <div>
                <button type="button" onClick={() => setVerNegados(!verNegados)} className="text-[11px] font-medium text-gray-500 hover:text-[#004A94]">
                  {verNegados ? '▾' : '▸'} Lo que NO puede hacer ({negados.length})
                </button>
                {verNegados && <div className="mt-1">{negados.map((p) => <FilaPermiso key={p.clave} p={p} />)}</div>}
              </div>
            </div>
          )}
        </div>

        <div className={DIALOG_FOOT}>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{titulo}</p>
      {children}
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-[11px] italic text-gray-400">{texto}</p>;
}

/**
 * El "por qué" es la mitad del valor: sin él no se sabe si el permiso se quita
 * cambiando el rol o destildando un permiso especial.
 */
function FilaPermiso({ p }: { p: PermisoExplicado }) {
  const origen =
    p.origen === 'rol' ? `por su rol ${p.detalle ? etiquetaRol(p.detalle) : ''}`.trim()
    : p.origen === 'especial' ? `por el permiso especial "${p.detalle ? etiquetaPermisoEspecial(p.detalle) : ''}"`
    : 'ningún rol suyo lo otorga';
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className={`mt-0.5 text-[11px] ${p.valor ? 'text-green-600' : 'text-gray-300'}`}>{p.valor ? '✓' : '—'}</span>
      <div className="min-w-0">
        {/* Clave sin etiqueta = permiso nuevo que falta nombrar: se muestra cruda. */}
        <p className={`text-[12px] ${p.valor ? 'text-gray-800' : 'text-gray-400'}`}>{ETIQUETAS_PERMISO[p.clave] ?? p.clave}</p>
        <p className="text-[10px] text-gray-400">{origen}</p>
      </div>
    </div>
  );
}
