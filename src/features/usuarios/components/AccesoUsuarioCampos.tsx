'use client';

import { useState } from 'react';
import Plegable from '@/components/ui/Plegable';
import { INPUT_STD, LABEL } from '@/components/ui/dialogo';
import type { Sede } from '@/core/types/empresa';
import type { PermisosPorRol, RolUsuario } from '@/core/types/usuario';
import {
  ACCESOS_RAPIDOS,
  IDS_ACCESOS_RAPIDOS,
  MENU_OCULTABLE,
  PERMISO_CAJA_ABRIR,
  PERMISO_CAJA_CERRAR,
  ROLES,
  etiquetaRol,
  permisosDelUsuario,
  permisosEspecialesPorCategoria,
  presetParaRol,
} from '../catalogos';

/**
 * Rol, sedes, permisos especiales y lo que se le oculta: la mitad "laboral" de
 * la ficha de usuario. La comparten el alta y la edición de rol, como en el app
 * (`usuario_form_page.dart` y `asignar_rol_dialog.dart`).
 */
export interface ConfigAcceso {
  rol: RolUsuario | null;
  sedeIds: string[];
  /** Permisos especiales (granulares). */
  permisos: string[];
  /** Dashboard + menú juntos, como los guarda el backend. */
  ocultos: string[];
  /** Solo en la edición, igual que el app. Texto para poder borrarlo. */
  limiteCreditoVenta: string;
}

/**
 * Lo que viaja al backend. Los flags `puedeAbrirCaja`/`puedeCerrarCaja` ya no
 * conceden nada (manda el granular), pero se siguen escribiendo derivados del
 * checkbox para que una imagen vieja del backend los encuentre — como el app.
 */
export function payloadAcceso(c: ConfigAcceso) {
  const limite = c.limiteCreditoVenta.trim() === '' ? undefined : Number(c.limiteCreditoVenta);
  return {
    rol: c.rol!,
    sedeIds: c.sedeIds.length > 0 ? c.sedeIds : undefined,
    permisos: c.permisos,
    accesosRapidosOcultos: c.ocultos,
    puedeAbrirCaja: c.permisos.includes(PERMISO_CAJA_ABRIR),
    puedeCerrarCaja: c.permisos.includes(PERMISO_CAJA_CERRAR),
    ...(limite !== undefined && Number.isFinite(limite) && limite >= 0 ? { limiteCreditoVenta: limite } : {}),
  };
}

interface Props {
  value: ConfigAcceso;
  onChange: (c: ConfigAcceso) => void;
  sedes: Sede[];
  tabla: PermisosPorRol | null;
  /**
   * En el alta, elegir el rol aplica su configuración estándar (si no, el
   * técnico que no tocaba el botón quedaba sin "Órdenes de Servicio"). En la
   * edición NO: pisaría lo que ya tiene configurado; ahí va con el botón.
   */
  presetAlElegirRol: boolean;
  mostrarLimiteCredito: boolean;
}

const CHECK = 'h-3.5 w-3.5 shrink-0 accent-[#437EFF]';

function Casilla({ label, checked, onChange, title }: { label: string; checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <label title={title} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-[12px] text-gray-700 hover:bg-gray-50">
      <input type="checkbox" className={`${CHECK} mt-0.5`} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Atajo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[10px] font-medium text-[#437EFF] hover:underline">
      {texto}
    </button>
  );
}

export default function AccesoUsuarioCampos({ value, onChange, sedes, tabla, presetAlElegirRol, mostrarLimiteCredito }: Props) {
  const [abierto, setAbierto] = useState<'permisos' | 'accesos' | 'menu' | null>(null);
  const [confirmarPreset, setConfirmarPreset] = useState(false);

  const set = (parcial: Partial<ConfigAcceso>) => onChange({ ...value, ...parcial });
  const alternar = (lista: string[], id: string, on: boolean) =>
    on ? [...new Set([...lista, id])] : lista.filter((x) => x !== id);

  const aplicarPreset = (rol: RolUsuario) => {
    const preset = presetParaRol(rol);
    // Reemplaza TODO (dashboard y menú): aplicar el estándar es volver al punto de partida.
    onChange({ ...value, rol, ocultos: [...preset.ocultos], permisos: [...preset.permisosEspeciales] });
  };

  // Solo se ofrece lo que ese rol llega a ver: ocultarle algo que su permiso
  // ya le niega no hace nada y confunde. Sin la tabla, se ofrece todo.
  const permisos = permisosDelUsuario(tabla, value.rol, value.permisos);
  const accesos = ACCESOS_RAPIDOS.filter((a) => !permisos || a.regla(permisos));
  const menu = MENU_OCULTABLE
    .map((s) => ({ ...s, items: s.items.filter((i) => !permisos || i.regla(permisos)) }))
    .filter((s) => s.items.length > 0);

  const accesosVisibles = accesos.filter((a) => !value.ocultos.includes(a.id)).length;
  const menuVisibles = menu.flatMap((s) => s.items).filter((i) => !value.ocultos.includes(i.id)).length;

  return (
    <div className="space-y-3">
      <div>
        <label className={LABEL}>Rol *</label>
        <select
          className={INPUT_STD}
          value={value.rol ?? ''}
          onChange={(e) => {
            const rol = e.target.value as RolUsuario;
            if (!rol) return;
            if (presetAlElegirRol) aplicarPreset(rol);
            else set({ rol });
          }}
        >
          <option value="" disabled>Selecciona un rol</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {value.rol && (
          confirmarPreset ? (
            <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
              Se reemplazan los permisos especiales y lo oculto por la configuración estándar de {etiquetaRol(value.rol)}.
              <div className="mt-1 flex gap-3">
                <button type="button" className="font-medium text-[#004A94] hover:underline" onClick={() => { aplicarPreset(value.rol!); setConfirmarPreset(false); }}>Aplicar</button>
                <button type="button" className="text-gray-500 hover:underline" onClick={() => setConfirmarPreset(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (presetAlElegirRol ? aplicarPreset(value.rol!) : setConfirmarPreset(true))}
              className="mt-1 text-[11px] text-[#437EFF] hover:underline"
            >
              ✨ Aplicar configuración estándar de {etiquetaRol(value.rol)}
            </button>
          )
        )}
      </div>

      {/* Con una sola sede no hay nada que elegir: va sola. */}
      {sedes.length > 1 && (
        <div>
          <label className={LABEL}>Sedes donde trabaja *</label>
          <div className="grid grid-cols-1 gap-x-3 rounded-[6px] bg-zinc-50 px-2 py-1 ring-1 ring-blue-400/40 sm:grid-cols-2">
            {sedes.map((s) => (
              <Casilla
                key={s.id}
                label={s.nombre}
                title={s.direccion}
                checked={value.sedeIds.includes(s.id)}
                onChange={(on) => set({ sedeIds: alternar(value.sedeIds, s.id, on) })}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">Los permisos y lo oculto se aplican en cada sede asignada.</p>
        </div>
      )}

      {mostrarLimiteCredito && (
        <div>
          <label className={LABEL}>Límite de crédito en ventas (S/)</label>
          <input
            className={INPUT_STD}
            inputMode="decimal"
            placeholder="Sin límite"
            value={value.limiteCreditoVenta}
            onChange={(e) => set({ limiteCreditoVenta: e.target.value.replace(/[^\d.]/g, '') })}
          />
        </div>
      )}

      <Plegable
        titulo="Permisos especiales"
        resumen={value.permisos.length > 0 ? `${value.permisos.length} activos` : 'ninguno'}
        abierto={abierto === 'permisos'}
        onToggle={() => setAbierto(abierto === 'permisos' ? null : 'permisos')}
      >
        <p className="mb-1 text-[10px] text-gray-400">Capacidades que no dependen del rol. Solo SUMAN: no le quitan nada de lo que el rol ya le da.</p>
        {permisosEspecialesPorCategoria().map(([categoria, items]) => (
          <div key={categoria} className="mt-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#437EFF]/70">{categoria}</p>
            {items.map((p) => (
              <Casilla
                key={p.id}
                label={p.label}
                title={p.description}
                checked={value.permisos.includes(p.id)}
                onChange={(on) => set({ permisos: alternar(value.permisos, p.id, on) })}
              />
            ))}
          </div>
        ))}
        <div className="mt-1 text-right"><Atajo texto="Quitar todos" onClick={() => set({ permisos: [] })} /></div>
      </Plegable>

      <Plegable
        titulo="Accesos del dashboard"
        resumen={`${accesosVisibles} de ${accesos.length} visibles`}
        abierto={abierto === 'accesos'}
        onToggle={() => setAbierto(abierto === 'accesos' ? null : 'accesos')}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <p className="text-[10px] text-gray-400">Marca los que verá. Oculta, no bloquea: lo que impide entrar son los permisos.</p>
          <div className="flex shrink-0 gap-2">
            {/* 🔴 Solo los ids del DASHBOARD: la misma lista guarda los del menú. */}
            <Atajo texto="todos" onClick={() => set({ ocultos: value.ocultos.filter((id) => !IDS_ACCESOS_RAPIDOS.includes(id)) })} />
            <Atajo texto="ninguno" onClick={() => set({ ocultos: [...new Set([...value.ocultos, ...IDS_ACCESOS_RAPIDOS])] })} />
          </div>
        </div>
        {accesos.length === 0 ? (
          <p className="text-[11px] text-gray-400">Con este rol no tiene accesos en el dashboard.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            {accesos.map((a) => (
              <Casilla
                key={a.id}
                label={a.label}
                checked={!value.ocultos.includes(a.id)}
                onChange={(on) => set({ ocultos: alternar(value.ocultos, a.id, !on) })}
              />
            ))}
          </div>
        )}
      </Plegable>

      <Plegable
        titulo="Opciones del menú lateral"
        resumen={`${menuVisibles} visibles`}
        abierto={abierto === 'menu'}
        onToggle={() => setAbierto(abierto === 'menu' ? null : 'menu')}
      >
        <p className="mb-1 text-[10px] text-gray-400">
          Si desmarcas todas las de una sección, la sección desaparece. Algunas casillas se mueven solas con las del dashboard: son el mismo elemento.
        </p>
        {menu.map((s) => (
          <div key={s.seccion} className="mt-1.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[10px] font-bold uppercase tracking-wide text-[#437EFF]/70">{s.seccion}</p>
              <Atajo texto="todas" onClick={() => set({ ocultos: value.ocultos.filter((id) => !s.items.some((i) => i.id === id)) })} />
              <Atajo texto="ninguna" onClick={() => set({ ocultos: [...new Set([...value.ocultos, ...s.items.map((i) => i.id)])] })} />
            </div>
            <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
              {s.items.map((i) => (
                <Casilla
                  key={i.id}
                  label={i.label}
                  checked={!value.ocultos.includes(i.id)}
                  onChange={(on) => set({ ocultos: alternar(value.ocultos, i.id, !on) })}
                />
              ))}
            </div>
          </div>
        ))}
      </Plegable>
    </div>
  );
}
