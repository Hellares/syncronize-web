'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import { ACCESOS_RAPIDOS, ICONOS, buscarPorRuta, tienePermiso } from './sidebar-config';

interface Props {
  onMenuToggle: () => void;
}

/**
 * De donde sale el titulo de la pagina.
 *
 * Antes decia "Dashboard / Panel de gestion" FIJO en todas las pantallas, asi
 * que la cabecera no aportaba nada. Se deriva de la ruta contra el mismo
 * catalogo que dibuja el menu, para que las dos digan lo mismo.
 */
function useRuta(pathname: string) {
  return useMemo(() => {
    const hallado = buscarPorRuta(pathname);
    if (!hallado) return { seccion: null, titulo: 'Panel', exacta: true };
    const { seccion, item, exacta } = hallado;
    return {
      // Un item de primer nivel (Dashboard, Mi Perfil) no tiene seccion, y
      // repetir el nombre cuando seccion e item coinciden solo hace ruido.
      seccion: seccion && seccion.label !== item.label ? seccion.label : null,
      titulo: item.label,
      // Una subruta sin entrada propia (el detalle de una compra) no es la
      // pagina del menu: se marca para no afirmar de mas en el titulo.
      exacta,
    };
  }, [pathname]);
}

export default function DashboardHeader({ onMenuToggle }: Props) {
  const { state: authState, logout } = useAuth();
  const { userRoles, empresa } = useEmpresa();
  const permissions = usePermissions();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ruta = useRuta(pathname);
  // Mismos permisos que el menú: un vendedor sin cotizaciones no ve el acceso.
  const accesos = useMemo(
    () => {
      const ocultos = new Set(permissions.accesosRapidosOcultos ?? []);
      return ACCESOS_RAPIDOS.filter(
        (a) => tienePermiso(permissions, a.permission) && !(a.ocultableId && ocultos.has(a.ocultableId)),
      );
    },
    [permissions],
  );

  const user = authState.status === 'authenticated' ? authState.user : null;
  const primaryRole = userRoles.length > 0 ? userRoles[0].rol : '';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-[58px] items-center gap-3 border-b border-[#e8ecf1] bg-white px-4 md:px-5">
      <button
        onClick={onMenuToggle}
        className="-ml-1 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Dónde estás */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
          {empresa?.nombre && <span className="hidden truncate sm:inline">{empresa.nombre}</span>}
          {empresa?.nombre && ruta.seccion && (
            <svg className="hidden h-2.5 w-2.5 shrink-0 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          )}
          {ruta.seccion && <span className="truncate text-gray-500">{ruta.seccion}</span>}
        </div>
        <p className="truncate text-[15px] font-bold leading-tight tracking-[-.2px] text-[#004A94]">
          {ruta.titulo}
        </p>
      </div>

      {/* Accesos rápidos: lo del mostrador, sin pasar por el menú */}
      <nav className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {accesos.map((a) => {
          const activo = pathname === a.href || pathname.startsWith(a.href + '/');
          return (
            <Link key={a.href} href={a.href} title={a.label}
              className={`flex h-[34px] items-center gap-2 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors ${activo
                ? 'border-[#cfe0f5] bg-[#eaf2fd] text-[#004A94]'
                : 'border-transparent text-gray-500 hover:border-[#e8ecf1] hover:bg-gray-50 hover:text-[#004A94]'}`}>
              <svg className="h-[17px] w-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d={ICONOS[a.icon]} />
              </svg>
              <span className="hidden xl:inline">{a.labelCorto ?? a.label}</span>
            </Link>
          );
        })}
      </nav>

      {accesos.length > 0 && <div className="hidden h-6 w-px shrink-0 bg-[#e8ecf1] sm:block" />}

      {/* Notificaciones */}
      <button className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100" aria-label="Notificaciones">
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
      </button>

      <div className="hidden h-6 w-px shrink-0 bg-[#e8ecf1] sm:block" />

      {user && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-gray-100"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004A94] text-[11px] font-bold text-white">
                {user.nombres?.charAt(0)}{user.apellidos?.charAt(0)}
              </div>
            )}

            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-gray-700">{user.nombres} {user.apellidos}</p>
              <p className="text-[10px] leading-tight text-gray-400">{primaryRole}</p>
            </div>

            <svg className={`hidden h-3.5 w-3.5 text-gray-400 transition-transform sm:block ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-[10px] border border-gray-100 bg-white py-2 shadow-lg">
              <div className="border-b border-gray-100 px-4 pb-2 pt-1">
                <p className="truncate text-sm font-semibold text-gray-900">{user.nombres} {user.apellidos}</p>
                <p className="truncate text-xs text-gray-400">{user.email}</p>
              </div>

              <button
                onClick={() => { setUserMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Mi Perfil
              </button>

              <button
                onClick={() => { setUserMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9 2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.9-1.2 2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9 2 2 0 010 4 1.7 1.7 0 00-1.5 1z" />
                </svg>
                Configuración
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
