'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import MenuAcciones, { type AccionMenu } from '@/components/ui/MenuAcciones';
import { fmtFechaHora } from '@/core/utils/fecha';
import type { OrdenUsuario, PermisosPorRol, RolUsuario, Usuario, UsuariosPaginados } from '@/core/types/usuario';
import {
  desactivarUsuario,
  getPermisosPorRol,
  listarUsuarios,
  reactivarUsuario,
} from '@/features/usuarios/services/usuario-service';
import { ROLES, etiquetaRol } from '@/features/usuarios/catalogos';
import UsuarioFormDialog from '@/features/usuarios/components/UsuarioFormDialog';
import RolPermisosDialog from '@/features/usuarios/components/RolPermisosDialog';
import EditarDatosUsuarioDialog from '@/features/usuarios/components/EditarDatosUsuarioDialog';
import PermisosUsuarioDialog from '@/features/usuarios/components/PermisosUsuarioDialog';

const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const SELECT_FILTRO =
  'bg-zinc-100 text-[#004A94] font-sans text-[10px] ring-1 ring-blue-400 outline-none transition-all duration-300 rounded-[6px] h-[26px] px-2.5 shadow-md focus:shadow-lg focus:shadow-blue-200';

const POR_PAGINA = 20;

type Dialogo =
  | { tipo: 'nuevo' }
  | { tipo: 'rol'; usuario: Usuario }
  | { tipo: 'datos'; usuario: Usuario }
  | { tipo: 'permisos'; usuario: Usuario }
  | null;

const ICONO = {
  datos: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  rol: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  permisos: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  desactivar: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l5 5M22 8l-5 5',
  reactivar: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
};

function Icono({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/**
 * Usuarios de la empresa — réplica de `usuarios_page.dart` + la ficha del app
 * (`usuario_detail_sheet.dart`): alta por DNI, rol, sedes, permisos
 * especiales, qué se le oculta, ver sus permisos, desactivar y reactivar.
 */
export default function UsuariosPage() {
  const permissions = usePermissions();
  const { sedes: todasLasSedes } = useEmpresa();
  const sedes = useMemo(() => todasLasSedes.filter((s) => s.isActive), [todasLasSedes]);
  const puedeGestionar = permissions.canManageUsers;

  const [datos, setDatos] = useState<UsuariosPaginados | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<'true' | 'false'>('true');
  const [rol, setRol] = useState<RolUsuario | ''>('');
  const [sedeId, setSedeId] = useState('');
  const [orden, setOrden] = useState<OrdenUsuario>('nombre_asc');
  const [page, setPage] = useState(1);

  const [dialogo, setDialogo] = useState<Dialogo>(null);
  /** Qué da cada rol: con esto la ficha ofrece solo lo que ese rol llega a ver. */
  const [tabla, setTabla] = useState<PermisosPorRol | null>(null);

  // El buscador espera a que se deje de tipear.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(busqueda.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await listarUsuarios({
        page,
        limit: POR_PAGINA,
        search: search || undefined,
        isActive: estado,
        rol: rol || undefined,
        sedeId: sedeId || undefined,
        orden,
      }));
    } catch {
      setError('No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  }, [page, search, estado, rol, sedeId, orden]);

  useEffect(() => { if (permissions.canViewUsers) cargar(); }, [cargar, permissions.canViewUsers]);

  // `permisos-por-rol` pide gestionar usuarios; sin él no hay ficha que abrir.
  useEffect(() => {
    if (!puedeGestionar) return;
    getPermisosPorRol().then(setTabla).catch(() => setTabla(null));
  }, [puedeGestionar]);

  const avisar = (m: string) => {
    setAviso(m);
    setTimeout(() => setAviso(''), 4000);
  };

  const cambiarEstado = async (u: Usuario) => {
    const desactivar = u.isActive;
    const pregunta = desactivar
      ? `¿Desactivar a ${u.nombreCompleto}? No podrá entrar a la empresa y se le quitan sus sedes.`
      : `¿Reactivar a ${u.nombreCompleto}? Podrá volver a entrar a la empresa.`;
    if (!confirm(pregunta)) return;
    try {
      if (desactivar) await desactivarUsuario(u.id);
      else await reactivarUsuario(u.id);
      avisar(desactivar ? `${u.nombreCompleto} fue desactivado` : `${u.nombreCompleto} fue reactivado`);
      cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo cambiar el estado');
    }
  };

  if (!permissions.canViewUsers) {
    return <div className="py-20 text-center text-sm text-gray-500">No tienes permiso para ver los usuarios.</div>;
  }

  const usuarios = datos?.data ?? [];
  const totalPages = datos?.meta.totalPages ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${INPUT_STD} min-w-[200px] max-w-sm flex-1`}
          placeholder="Buscar por nombre, DNI, teléfono o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className={SELECT_FILTRO} value={estado} onChange={(e) => { setEstado(e.target.value as 'true' | 'false'); setPage(1); }}>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <select className={SELECT_FILTRO} value={rol} onChange={(e) => { setRol(e.target.value as RolUsuario | ''); setPage(1); }}>
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {sedes.length > 1 && (
          <select className={SELECT_FILTRO} value={sedeId} onChange={(e) => { setSedeId(e.target.value); setPage(1); }}>
            <option value="">Todas las sedes</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select className={SELECT_FILTRO} value={orden} onChange={(e) => { setOrden(e.target.value as OrdenUsuario); setPage(1); }}>
          <option value="nombre_asc">Nombre A-Z</option>
          <option value="nombre_desc">Nombre Z-A</option>
          <option value="recientes">Más recientes</option>
          <option value="antiguos">Más antiguos</option>
        </select>
        <span className="text-[11px] text-gray-400">{datos ? `${datos.meta.total} usuarios` : ''}</span>
        {puedeGestionar && (
          <button
            onClick={() => setDialogo({ tipo: 'nuevo' })}
            className="ml-auto h-[30px] rounded-[6px] bg-[#004A94] px-3 text-[10px] font-medium text-white hover:bg-[#003570]"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      {aviso && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 ring-1 ring-green-200">{aviso}</div>}
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">{error}</div>}

      {cargando && !datos ? (
        <div className="py-16 text-center text-sm text-gray-400">Cargando…</div>
      ) : usuarios.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {estado === 'false' ? 'No hay usuarios inactivos.' : 'Sin usuarios con esos filtros.'}
        </div>
      ) : (
        <div className={`max-h-[calc(100vh-14rem)] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40 ${cargando ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
              <tr>
                <th className="w-full px-4 py-3 font-medium text-[#004A94]">Usuario</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">DNI</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] md:table-cell">Contacto</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Rol</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] lg:table-cell">Sedes</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] lg:table-cell">Último acceso</th>
                <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium text-[#004A94]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((u) => {
                const especiales = new Set(u.sedes.flatMap((s) => s.permisos)).size;
                // Ver permisos lo tiene quien ve usuarios; el resto, quien los gestiona.
                const verPermisos: AccionMenu = { id: 'permisos', label: 'Ver permisos', icono: <Icono d={ICONO.permisos} />, onClick: () => setDialogo({ tipo: 'permisos', usuario: u }) };
                const acciones: AccionMenu[] = !puedeGestionar ? [verPermisos] : [
                  { id: 'rol', label: 'Rol y permisos', icono: <Icono d={ICONO.rol} />, onClick: () => setDialogo({ tipo: 'rol', usuario: u }) },
                  verPermisos,
                  { id: 'datos', label: 'Editar datos', icono: <Icono d={ICONO.datos} />, onClick: () => setDialogo({ tipo: 'datos', usuario: u }) },
                  u.isActive
                    ? { id: 'estado', label: 'Desactivar', icono: <Icono d={ICONO.desactivar} />, onClick: () => cambiarEstado(u), peligro: true }
                    : { id: 'estado', label: 'Reactivar', icono: <Icono d={ICONO.reactivar} />, onClick: () => cambiarEstado(u) },
                ];
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{u.nombreCompleto}</p>
                      {u.aliasTicket && <p className="text-[10px] text-gray-400">Ticket: {u.aliasTicket}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-gray-600">{u.dni}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-[11px] text-gray-600 md:table-cell">
                      {u.telefono ?? '—'}
                      {u.email && <span className="block text-[10px] text-gray-400">{u.email}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="text-gray-700">{etiquetaRol(u.rolEnEmpresa)}</span>
                      {especiales > 0 && (
                        <span className="ml-1 rounded-full bg-[#eaf2fd] px-1.5 py-0.5 text-[10px] text-[#004A94]" title="Permisos especiales asignados a mano">
                          +{especiales}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-[11px] text-gray-600 lg:table-cell">
                      {u.sedes.length === 0 ? <span className="text-gray-300">—</span> : u.sedes.map((s) => s.sedeNombre).join(', ')}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-[11px] text-gray-500 lg:table-cell">
                      {u.lastLoginAt ? fmtFechaHora(u.lastLoginAt) : <span className="text-gray-300">Nunca</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <MenuAcciones acciones={acciones} titulo={u.nombreCompleto} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="h-[26px] rounded-[6px] border border-gray-200 bg-white px-3 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
          <span className="text-[11px] text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="h-[26px] rounded-[6px] border border-gray-200 bg-white px-3 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      <UsuarioFormDialog
        isOpen={dialogo?.tipo === 'nuevo'}
        sedes={sedes}
        tabla={tabla}
        onClose={() => setDialogo(null)}
        onSuccess={(r) => {
          setDialogo(null);
          // Cuenta creada por un admin y sin estrenar: entra con el DNI de contraseña.
          avisar(r.usuario.requiereCambioPassword
            ? `${r.mensaje}. Su contraseña temporal es su DNI (${r.usuario.dni}).`
            : r.mensaje);
          cargar();
        }}
      />
      {dialogo?.tipo === 'rol' && (
        <RolPermisosDialog
          usuario={dialogo.usuario}
          sedes={sedes}
          tabla={tabla}
          onClose={() => setDialogo(null)}
          onSuccess={(m) => { setDialogo(null); avisar(m); cargar(); }}
        />
      )}
      {dialogo?.tipo === 'datos' && (
        <EditarDatosUsuarioDialog
          usuario={dialogo.usuario}
          onClose={() => setDialogo(null)}
          onSuccess={(m) => { setDialogo(null); avisar(m); cargar(); }}
        />
      )}
      {dialogo?.tipo === 'permisos' && (
        <PermisosUsuarioDialog usuario={dialogo.usuario} onClose={() => setDialogo(null)} />
      )}
    </div>
  );
}
