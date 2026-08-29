'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buscarPorRuta, ICONOS } from '@/components/layout/sidebar-config';

/**
 * Lo que atiende a los módulos del menú que todavía no existen en la web.
 *
 * El menú es una réplica del drawer del app, así que muestra el sistema
 * COMPLETO: quien lo conoce del celular encuentra cada cosa en el mismo lugar.
 * Los módulos que aún no se construyeron caen acá, con su nombre y su sección,
 * en vez de en un 404 que no explica nada.
 *
 * 🔴 Es un catch-all: Next prefiere siempre la ruta específica, así que el día
 * que se cree `dashboard/libro-contable/page.tsx` esta pantalla deja de verse
 * sola. Lo único que queda por hacer es borrar el `enConstruccion` del ítem en
 * `sidebar-config.ts`.
 */
export default function EnConstruccionPage() {
  const pathname = usePathname();
  const hallado = buscarPorRuta(pathname);
  // Solo cuenta si la ruta ES el ítem: una subruta inventada de un módulo que
  // sí existe (`/dashboard/productos/loquesea`) no es un módulo por venir.
  const item = hallado?.exacta ? hallado.item : null;
  const seccion = hallado?.exacta ? hallado.seccion : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-[#e8ecf1] bg-white p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B2E52]/[.06] text-[#0B2E52]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d={item ? ICONOS[item.icon] : ICONOS.alerta} />
          </svg>
        </div>

        {item ? (
          <>
            {seccion && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {seccion.label}
              </p>
            )}
            <h1 className="text-xl font-bold text-gray-900">{item.label}</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Este módulo todavía no está en la web. Por ahora se maneja desde la
              aplicación móvil, donde ya está completo.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Página no encontrada</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              No hay nada en <span className="font-mono text-xs text-gray-600">{pathname}</span>.
              Puede que el enlace esté mal escrito o que la pantalla haya cambiado de lugar.
            </p>
          </>
        )}

        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-[#0B2E52] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0B2E52]/90"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
