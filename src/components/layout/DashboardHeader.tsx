'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

interface Props {
  onMenuToggle: () => void;
}

export default function DashboardHeader({ onMenuToggle }: Props) {
  const { state: authState, logout } = useAuth();
  const { userRoles } = useEmpresa();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = authState.status === 'authenticated' ? authState.user : null;
  const primaryRole = userRoles.length > 0 ? userRoles[0].rol : '';

  // Close menu on click outside
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
    <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-r from-[#437EFF]/80 to-[#5b8fd4]/70 px-4 py-4 shadow-sm md:px-5 2xl:px-8">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-lg border border-white/20 p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div className="hidden xl:block">
          <h1 className="text-lg font-bold text-white">Dashboard</h1>
          <p className="text-xs text-white/60">Panel de gestión</p>
        </div>
      </div>

      {/* Right: Search + User */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <input
            type="search"
            placeholder="Buscar..."
            className="w-[200px] rounded-full border border-white/20 bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:w-[260px] focus:bg-white/20"
          />
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-white/20 sm:block" />

        {/* User menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-white/10"
            >
              {/* Avatar */}
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#004A94] to-[#437EFF] text-xs font-bold text-white ring-2 ring-gray-100">
                  {user.nombres?.charAt(0)}{user.apellidos?.charAt(0)}
                </div>
              )}

              {/* Name */}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-white">{user.nombres} {user.apellidos}</p>
                <p className="text-[11px] text-white/60">{primaryRole}</p>
              </div>

              {/* Chevron */}
              <svg className={`hidden h-4 w-4 text-white/60 transition-transform sm:block ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-[10px] border border-gray-100 bg-white py-2 shadow-lg">
                <div className="border-b border-gray-100 px-4 pb-2 pt-1 sm:hidden">
                  <p className="text-sm font-semibold text-gray-900">{user.nombres} {user.apellidos}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
      </div>
    </header>
  );
}
