'use client';

/**
 * Un select que además se puede ESCRIBIR.
 *
 * Un `<select>` nativo con cien categorías obliga a scrollear hasta encontrar
 * la que uno ya sabe cómo se llama. Acá se abre, se escriben dos letras y la
 * lista se achica: para quien carga productos todo el día, esa es la diferencia
 * entre cargar uno en veinte segundos o en cinco.
 *
 * 🔑 Filtra con `coincideTodosLosTerminos`, el MISMO criterio que la búsqueda
 * de productos: sin tildes, sin distinguir mayúsculas y exigiendo todas las
 * palabras. Así "cam pol" encuentra "CAMISA POLO" y el usuario no tiene que
 * aprender dos formas distintas de buscar en la misma pantalla.
 *
 * Se ve igual que un input del formulario (`INPUT_STD`) porque **es** un campo
 * más: si pareciera un botón, no se entendería que se puede escribir.
 *
 * 🔴 El panel va en un **portal** con posición fija, no `absolute` dentro del
 * campo: las secciones del formulario llevan `overflow-hidden` para recortar
 * sus esquinas, y ahí adentro la lista aparecía cortada al ras de la sección
 * —parecía que el selector no abría—.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { coincideTodosLosTerminos, terminosBusqueda } from '@/core/utils/busqueda-texto';

export interface OpcionBuscable {
  id: string;
  nombre: string;
  /** A la derecha y en gris: el símbolo de la unidad, un código, lo que sea. */
  detalle?: string | null;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  opciones: OpcionBuscable[];
  /** Lo que se lee cuando no hay nada elegido. */
  placeholder?: string;
  /** El texto de la opción que limpia la selección. Sin esto, no se puede. */
  textoVacio?: string;
  disabled?: boolean;
  /** Para el `aria-label` del campo de búsqueda. */
  etiqueta?: string;
}

const CAMPO =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

export default function SelectBuscable({
  value,
  onChange,
  opciones,
  placeholder = 'Seleccionar',
  textoVacio,
  disabled = false,
  etiqueta,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const campoBusqueda = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });

  const elegida = opciones.find((o) => o.id === value);

  const filtradas = useMemo(() => {
    const terminos = terminosBusqueda(busqueda);
    if (!terminos.length) return opciones;
    return opciones.filter((o) =>
      coincideTodosLosTerminos(`${o.nombre} ${o.detalle ?? ''}`, terminos),
    );
  }, [opciones, busqueda]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setBusqueda('');
    setResaltado(0);
  }, []);

  /**
   * Dónde va el panel. Se recalcula al abrir y mientras se scrollea: con
   * posición fija, si la página se mueve el panel se queda flotando solo.
   *
   * Si abajo no entra, va ARRIBA del campo: en la última fila de un formulario
   * largo, un panel de 250 px hacia abajo queda fuera de la pantalla.
   */
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = caja.current?.getBoundingClientRect();
      if (!r) return;
      const alto = panel.current?.offsetHeight ?? 260;
      const abajo = window.innerHeight - r.bottom;
      setPosicion({
        top: abajo < alto + 8 && r.top > alto ? r.top - alto - 4 : r.bottom + 4,
        left: r.left,
        width: r.width,
      });
    };
    ubicar();
    // `true` para enterarse tambien del scroll de un contenedor interno.
    window.addEventListener('scroll', ubicar, true);
    window.addEventListener('resize', ubicar);
    return () => {
      window.removeEventListener('scroll', ubicar, true);
      window.removeEventListener('resize', ubicar);
    };
  }, [abierto, filtradas.length]);

  // Cerrar al tocar afuera. El panel vive en un portal, así que "afuera" son
  // los DOS: ni el campo ni la lista.
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (caja.current?.contains(t) || panel.current?.contains(t)) return;
      cerrar();
    };
    document.addEventListener('mousedown', alTocar);
    return () => document.removeEventListener('mousedown', alTocar);
  }, [abierto, cerrar]);

  // El foco va al buscador apenas abre: el que sabe qué busca escribe directo.
  useEffect(() => {
    if (abierto) campoBusqueda.current?.focus();
  }, [abierto]);

  /**
   * La opción resaltada, siempre visible cuando se llega con las flechas.
   *
   * El `+ hayVacio`: la opción que limpia la selección es un `<li>` más al
   * principio, y sin contarla el scroll seguía a la opción anterior.
   */
  const hayVacio = Boolean(textoVacio) && !busqueda.trim();
  useEffect(() => {
    lista.current?.children[resaltado + (hayVacio ? 1 : 0)]?.scrollIntoView({
      block: 'nearest',
    });
  }, [resaltado, hayVacio]);

  const elegir = (id: string) => {
    onChange(id);
    cerrar();
  };

  /** Con teclado no hace falta soltar el teclado para elegir. */
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!filtradas.length) return;
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setResaltado((i) => (i + paso + filtradas.length) % filtradas.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opcion = filtradas[resaltado];
      if (opcion) elegir(opcion.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
    }
  };

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className={`${CAMPO} flex items-center gap-2 text-left disabled:opacity-50`}
      >
        <span className={`flex-1 truncate ${elegida ? '' : 'text-zinc-500 opacity-60'}`}>
          {elegida ? elegida.nombre : placeholder}
        </span>
        {elegida?.detalle && (
          <span className="shrink-0 text-[10px] text-gray-400">{elegida.detalle}</span>
        )}
        <svg
          className={`h-3 w-3 shrink-0 text-[#004A94] transition-transform ${abierto ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div
            ref={panel}
            style={{ top: posicion.top, left: posicion.left, width: posicion.width }}
            className="fixed z-50 rounded-[6px] bg-white p-1.5 shadow-lg ring-1 ring-blue-400/60">
          <input
            ref={campoBusqueda}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setResaltado(0);
            }}
            onKeyDown={alTeclear}
            placeholder="Escribí para buscar…"
            aria-label={etiqueta ? `Buscar ${etiqueta}` : 'Buscar'}
            className={`${CAMPO} mb-1`}
          />

          <ul ref={lista} className="max-h-56 overflow-y-auto">
            {hayVacio && (
              <li>
                <button
                  type="button"
                  onClick={() => elegir('')}
                  className="w-full rounded px-2 py-1.5 text-left text-xs text-gray-400 hover:bg-blue-50"
                >
                  {textoVacio}
                </button>
              </li>
            )}
            {filtradas.map((o, i) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => elegir(o.id)}
                  onMouseEnter={() => setResaltado(i)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    i === resaltado ? 'bg-blue-50' : ''
                  } ${o.id === value ? 'font-medium text-[#004A94]' : 'text-gray-700'}`}
                >
                  <span className="flex-1 truncate">{o.nombre}</span>
                  {o.detalle && (
                    <span className="shrink-0 text-[10px] text-gray-400">{o.detalle}</span>
                  )}
                </button>
              </li>
            ))}
            {!filtradas.length && (
              <li className="px-2 py-3 text-center text-[11px] text-gray-400">
                Nada con ese nombre
              </li>
            )}
          </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
