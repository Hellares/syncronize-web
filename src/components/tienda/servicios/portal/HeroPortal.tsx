'use client';

import { TiendaColors, darken, lighten } from '@/lib/colors';
import { PuntosTitilantes } from '../PuntosTitilantes';

/**
 * La portada del portal: el mismo fondo que la de Servicios (azul de la
 * tienda con puntos que titilan, desvanecido abajo), a todo el ancho. Deja
 * `pb` para que el contenido de abajo se monte encima (`-mt-*`).
 */
export function HeroPortal({ colors, children }: { colors: TiendaColors; children: React.ReactNode }) {
  return (
    <section className="relative z-10 text-white">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(160deg, ${darken(colors.primario, 0.25)} 0%, ${colors.primario} 60%, ${lighten(colors.primario, 0.1)} 100%)`,
          maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
        }}
        aria-hidden="true"
      >
        <PuntosTitilantes />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-20 md:pb-24">{children}</div>
    </section>
  );
}

/** Una etiqueta de estado (pastilla) con los colores de `ETIQUETA`. */
export function Pastilla({ texto, fondo, color, grande = false }: { texto: string; fondo: string; color: string; grande?: boolean }) {
  return (
    <span
      className={`inline-block flex-shrink-0 rounded-full font-medium ${grande ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: fondo, color }}
    >
      {texto}
    </span>
  );
}
