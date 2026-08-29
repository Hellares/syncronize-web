'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * La superficie de card de la web.
 *
 * En reposo: blanca, ring azul tenue y sombra corta. El borde va con ring y no
 * con `border border-gray-200` porque ese gris sobre el fondo `#f5f7fa` del
 * dashboard tiene contraste casi nulo y en una pantalla densa el pixel se
 * pierde.
 *
 * Al hover: el ring se apaga y el contorno pasa a ser una banda de 2px en
 * degradado verde→azul, con el resplandor verde por fuera. La card NO se tiñe:
 * cualquier oscurecimiento le come protagonismo justo al efecto que hay que
 * mirar.
 *
 * El borde en degradado vive en `.borde-degradado` (globals.css) porque
 * necesita un ::before enmascarado — un `background-image` no se puede
 * interpolar y el borde no podría aparecer con transición.
 */
export const CARD_BASE =
  'relative rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm transition-all duration-300';

/** Lo que se suma cuando la card responde al click. */
export const CARD_HOVER =
  'borde-degradado hover:ring-transparent hover:shadow-[0_0_30px_1px_rgba(0,255,117,0.30)]';

interface Props {
  children: ReactNode;
  /** Navega. Renderiza un `<Link>` y gana sobre `onClick`. */
  href?: string;
  /** Acciona. Renderiza un `<button>`. */
  onClick?: () => void;
  /**
   * Padding interno.
   *
   * Va como PROP y no por `className` porque Tailwind resuelve `p-3 p-4` por el
   * orden en el CSS, no por el orden en el atributo: un override desde afuera
   * se perdería en silencio la mitad de las veces.
   */
  padding?: string;
  /** Clases extra: ancho, layout interno, lo que sea que no pise las de arriba. */
  className?: string;
  title?: string;
}

export default function Card({
  children,
  href,
  onClick,
  padding = 'p-3',
  className = '',
  title,
}: Props) {
  // Sin acción no hay hover: pintarle el borde a algo que no responde al click
  // promete una interacción que no existe.
  const interactiva = Boolean(href || onClick);
  const cls = [CARD_BASE, interactiva ? CARD_HOVER : '', padding, className]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} title={title} className={`block ${cls}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    // `text-left`: un <button> centra su contenido, y una card se lee alineada.
    return (
      <button type="button" onClick={onClick} title={title} className={`text-left ${cls}`}>
        {children}
      </button>
    );
  }

  return (
    <div title={title} className={cls}>
      {children}
    </div>
  );
}
