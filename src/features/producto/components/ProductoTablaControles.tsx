'use client';

/**
 * La barrita de arriba de la lista de productos: cómo se ve y qué se ve.
 *
 * Los tres controles hablan el mismo idioma que los filtros (zinc-100, ring
 * azul, 30 px de alto, radio 6): son del mismo tipo de cosa --preferencias de
 * la pantalla-- y si cada uno tuviera su estilo la barra se leería como tres
 * herramientas sueltas.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Columnas, Densidad, Vista } from './preferencias-tabla';

interface Props {
  vista: Vista;
  onVista: (v: Vista) => void;
  densidad: Densidad;
  onDensidad: (d: Densidad) => void;
  columnas: Columnas;
  onColumnas: (c: Columnas) => void;
}

const GRUPO =
  'flex items-center gap-0.5 h-[30px] p-[2px] rounded-[6px] bg-zinc-100 shadow-md ring-1 ring-blue-400';
const OPCION =
  'inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-[4px] text-[10px] font-medium transition-colors';
const ACTIVA = 'bg-[#004A94] text-white hover:bg-[#003570]';
const INACTIVA = 'text-[#004A94] hover:bg-[#437EFF]/10';

const ANCHO_PANEL = 196;

export default function ProductoTablaControles({
  vista,
  onVista,
  densidad,
  onDensidad,
  columnas,
  onColumnas,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const disparador = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);

  // Portal y no `absolute`, por lo mismo que `SelectBuscable`: acá arriba hay
  // secciones con `overflow-hidden` que recortarían el panel.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = disparador.current?.getBoundingClientRect();
      if (!r) return;
      setPosicion({ top: r.bottom + 4, left: Math.max(8, r.right - ANCHO_PANEL) });
    };
    ubicar();
    window.addEventListener('scroll', ubicar, true);
    window.addEventListener('resize', ubicar);
    return () => {
      window.removeEventListener('scroll', ubicar, true);
      window.removeEventListener('resize', ubicar);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (disparador.current?.contains(t) || panel.current?.contains(t)) return;
      cerrar();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('mousedown', alTocar);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alTocar);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto, cerrar]);

  const casilla = (clave: keyof Columnas, etiqueta: string) => {
    const marcada = columnas[clave];
    return (
      <button
        type="button"
        onClick={() => onColumnas({ ...columnas, [clave]: !marcada })}
        className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[11px] text-gray-600 transition-colors hover:bg-gray-50"
      >
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] ${
            marcada ? 'bg-[#004A94] text-white' : 'text-transparent ring-1 ring-gray-300'
          }`}
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
        {etiqueta}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className={GRUPO}>
        <button type="button" onClick={() => onVista('tabla')} className={`${OPCION} ${vista === 'tabla' ? ACTIVA : INACTIVA}`}>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          Tabla
        </button>
        <button type="button" onClick={() => onVista('tarjetas')} className={`${OPCION} ${vista === 'tarjetas' ? ACTIVA : INACTIVA}`}>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          Tarjetas
        </button>
      </div>

      {/* Densidad y columnas son de la TABLA: en tarjetas no tienen qué tocar. */}
      {vista === 'tabla' && (
        <>
          <div className={`${GRUPO} hidden sm:flex`}>
            <button type="button" onClick={() => onDensidad('compacta')} className={`${OPCION} ${densidad === 'compacta' ? ACTIVA : INACTIVA}`} title="Más filas por pantalla">
              Compacta
            </button>
            <button type="button" onClick={() => onDensidad('media')} className={`${OPCION} ${densidad === 'media' ? ACTIVA : INACTIVA}`}>
              Media
            </button>
            <button type="button" onClick={() => onDensidad('comoda')} className={`${OPCION} ${densidad === 'comoda' ? ACTIVA : INACTIVA}`} title="Miniaturas más grandes">
              Cómoda
            </button>
          </div>

          <div>
            <button
              ref={disparador}
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="hidden h-[30px] items-center gap-1.5 rounded-[6px] bg-zinc-100 px-3 text-[10px] font-medium text-[#004A94] shadow-md ring-1 ring-blue-400 transition-shadow hover:shadow-lg hover:shadow-blue-200 md:inline-flex"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M10 4v16M16 4v16" />
              </svg>
              Columnas
              <svg className={`h-3 w-3 transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {abierto &&
              createPortal(
                <div
                  ref={panel}
                  style={{ top: posicion.top, left: posicion.left, width: ANCHO_PANEL }}
                  className="fixed z-50 rounded-[6px] bg-white p-1.5 shadow-lg ring-1 ring-blue-400/60"
                >
                  <p className="px-2 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    Columnas visibles
                  </p>
                  {casilla('codigo', 'Código')}
                  {casilla('categoria', 'Categoría')}
                  {casilla('marca', 'Marca')}
                  <div className="my-1 h-px bg-gray-100" />
                  {/* Precio, Stock y Estado no se apagan: son la razón por la
                      que alguien abre esta pantalla. */}
                  <p className="px-2 pb-1 text-[10px] leading-relaxed text-gray-400">
                    Precio, Stock y Estado van siempre.
                  </p>
                  <p className="px-2 pb-1 text-[10px] leading-relaxed text-gray-400">
                    Lo que apagues sigue estando en el desplegable de cada fila.
                  </p>
                </div>,
                document.body,
              )}
          </div>
        </>
      )}
    </div>
  );
}
