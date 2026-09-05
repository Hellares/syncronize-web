'use client';

/**
 * El menú "⋯" de una fila: las acciones que no entran como iconos sueltos.
 *
 * Nace en la lista de productos, donde cada fila llegó a tener SIETE botones de
 * icono: a ese ancho competían con el nombre del producto y en una pantalla
 * chica no entraban. Quedan afuera las dos o tres de todos los días y el resto
 * vive acá.
 *
 * 🔴 El panel va en un **portal** con posición fija, igual que `SelectBuscable`
 * y por el mismo motivo: la tabla tiene `rounded-xl` + `overflow-x-auto`, así
 * que un panel `absolute` se corta al ras del recuadro y parece que el menú no
 * abriera.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export interface AccionMenu {
  id: string;
  label: string;
  icono: ReactNode;
  /** Navega. Excluyente con `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Rojo y al final: eliminar y compañía. */
  peligro?: boolean;
}

interface Props {
  acciones: AccionMenu[];
  /** Encabezado del panel; sin esto no se sabe de qué fila es el menú abierto. */
  titulo?: string;
  /** Clases del botón de tres puntos. */
  className?: string;
}

const ANCHO = 208;

export default function MenuAcciones({ acciones, titulo, className = '' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const disparador = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);

  /**
   * El panel se cuelga del botón y se alinea a la DERECHA (es la última
   * columna). Si abajo no entra, sale para arriba: las últimas filas de una
   * tabla larga quedan pegadas al borde de la pantalla.
   */
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = disparador.current?.getBoundingClientRect();
      if (!r) return;
      const alto = panel.current?.offsetHeight ?? 240;
      const abajo = window.innerHeight - r.bottom;
      setPosicion({
        top: abajo < alto + 8 && r.top > alto ? r.top - alto - 4 : r.bottom + 4,
        left: Math.max(8, r.right - ANCHO),
      });
    };
    ubicar();
    // `true` para enterarse también del scroll de un contenedor interno.
    window.addEventListener('scroll', ubicar, true);
    window.addEventListener('resize', ubicar);
    return () => {
      window.removeEventListener('scroll', ubicar, true);
      window.removeEventListener('resize', ubicar);
    };
  }, [abierto, acciones.length]);

  // Cerrar al tocar afuera: el panel vive en un portal, así que "afuera" son
  // los DOS, ni el botón ni el panel.
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (disparador.current?.contains(t) || panel.current?.contains(t)) return;
      cerrar();
    };
    document.addEventListener('mousedown', alTocar);
    return () => document.removeEventListener('mousedown', alTocar);
  }, [abierto, cerrar]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, cerrar]);

  if (!acciones.length) return null;

  return (
    <>
      <button
        ref={disparador}
        type="button"
        aria-label="Más acciones"
        title="Más acciones"
        aria-expanded={abierto}
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-50 hover:text-[#437EFF] ${
          abierto ? 'bg-blue-50 text-[#437EFF]' : ''
        } ${className}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div
            ref={panel}
            style={{ top: posicion.top, left: posicion.left, width: ANCHO }}
            className="fixed z-50 rounded-[6px] bg-white p-1.5 shadow-lg ring-1 ring-blue-400/60"
            onClick={(e) => e.stopPropagation()}
          >
            {titulo && (
              <p className="truncate px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {titulo}
              </p>
            )}
            {acciones.map((a) => {
              const clases = `flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-[11px] transition-colors ${
                a.peligro
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#004A94]'
              }`;
              const icono = (
                <span className={a.peligro ? 'text-red-400' : 'text-gray-400'}>{a.icono}</span>
              );

              return a.href ? (
                <Link key={a.id} href={a.href} className={clases} onClick={cerrar}>
                  {icono}
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.id}
                  type="button"
                  className={clases}
                  onClick={() => {
                    cerrar();
                    a.onClick?.();
                  }}
                >
                  {icono}
                  {a.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
