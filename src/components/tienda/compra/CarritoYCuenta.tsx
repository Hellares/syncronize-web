'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSesionTienda } from './SesionTienda';

export function BotonCarrito() {
  const { subdominio, cantidad } = useSesionTienda();
  return (
    <Link
      href={`/${subdominio}/carrito`}
      aria-label={`Carrito${cantidad ? `, ${cantidad} productos` : ''}`}
      className="relative flex items-center p-1 text-gray-900 hover:opacity-70 transition-opacity"
    >
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
      <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
        {cantidad > 99 ? '99+' : cantidad}
      </span>
    </Link>
  );
}

/** "Mi cuenta": ingresar, o el menú con Mis pedidos y Salir. */
export function BotonCuenta({ conTexto = false }: { conTexto?: boolean }) {
  const { subdominio, usuario, pedirIngreso, salir } = useSesionTienda();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const nombre = usuario?.nombres?.split(' ')[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (usuario ? setAbierto(!abierto) : pedirIngreso())}
        className="flex items-center gap-2 p-1 text-sm text-gray-900 hover:opacity-70 transition-opacity whitespace-nowrap"
        aria-label={usuario ? `Mi cuenta (${nombre})` : 'Ingresar'}
        aria-expanded={usuario ? abierto : undefined}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.68 0-5.22-.58-7.5-1.65z" />
        </svg>
        {conTexto && <span className="hidden lg:inline">{usuario ? `Hola, ${nombre}` : 'Mi cuenta'}</span>}
      </button>

      {abierto && usuario && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-lg bg-white shadow-2xl border border-gray-100 py-1 z-50">
          <p className="px-4 py-2 text-xs text-gray-400 truncate">{usuario.nombres} {usuario.apellidos}</p>
          <Link
            href={`/${subdominio}/mis-pedidos`}
            onClick={() => setAbierto(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Mis pedidos
          </Link>
          <button
            type="button"
            onClick={() => { setAbierto(false); void salir(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
