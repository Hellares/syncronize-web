'use client';

import type { Sede } from '@/core/types/empresa';
import {
  CAMPOS_PRECIO, OPS_PRECIO, conOperador, pideDos, pideValor,
  type CampoPrecio, type FiltroVariantes, type OpPrecio,
} from './filtro-variantes';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-[11px] ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[27px] px-2 shadow-md focus:shadow-lg focus:shadow-blue-200';

interface Props {
  filtro: FiltroVariantes;
  onCambio: (f: FiltroVariantes) => void;
  sedes: Sede[];
  sedeId: string;
  onSede: (id: string) => void;
}

/**
 * UNA sola fila: campo, comparador y valor(es).
 *
 * El caso que más se usa no es buscar un monto sino el operador `vacío`:
 * "mostrame las que TODAVÍA no tienen precio por mayor", que es lo que se
 * revisa al terminar de cargar una lista.
 */
export default function FiltroPrecioVariantes({ filtro, onCambio, sedes, sedeId, onSede }: Props) {
  const soloValor = pideValor(filtro.op);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={filtro.campo}
        onChange={(e) => onCambio({ ...filtro, campo: e.target.value as CampoPrecio })}
        className={`${INPUT_STD} w-[95px] bg-white`}
      >
        {Object.entries(CAMPOS_PRECIO).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>

      <select
        value={filtro.op}
        onChange={(e) => onCambio(conOperador(filtro, e.target.value as OpPrecio))}
        className={`${INPUT_STD} w-[75px] bg-white`}
      >
        {Object.entries(OPS_PRECIO).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>

      {soloValor ? (
        <>
          <input
            value={filtro.desde}
            onChange={(e) => onCambio({ ...filtro, desde: e.target.value })}
            inputMode="decimal"
            placeholder={pideDos(filtro.op) ? 'Desde' : 'Valor S/'}
            className={`${INPUT_STD} w-[90px]`}
          />
          {pideDos(filtro.op) && (
            <input
              value={filtro.hasta}
              onChange={(e) => onCambio({ ...filtro, hasta: e.target.value })}
              inputMode="decimal"
              placeholder="Hasta"
              className={`${INPUT_STD} w-[90px]`}
            />
          )}
        </>
      ) : (
        // Sin campo de valor la fila quedaría con dos selectores sueltos a la
        // izquierda; el texto ocupa el hueco y explica qué filtra.
        <span className="text-[11px] text-gray-500">
          Sin {CAMPOS_PRECIO[filtro.campo].toLowerCase()} cargado
        </span>
      )}

      {/* 🔴 El precio por mayor NO depende de la sede (PrecioNivel no tiene
          sedeId); precio y costo sí, y sin decir de qué sede se habla el filtro
          compararía contra un número que no es el que está viendo. */}
      {filtro.campo === 'mayor' ? (
        <span className="ml-auto text-[10px] text-gray-400">El precio por mayor no depende de la sede</span>
      ) : sedes.length > 1 ? (
        <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
          Precio en
          <select
            value={sedeId}
            onChange={(e) => onSede(e.target.value)}
            className={`${INPUT_STD} bg-white`}
          >
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Caja chica con cuántas variantes se están viendo y cuánto stock suman.
 *
 * `stock` en null se muestra como "mixto": sumar 5000 g de un granel con 2
 * sacos da un número que no significa nada.
 */
export function ResumenVariantes({ cantidad, total, stock, filtrando }: {
  cantidad: number;
  total: number;
  stock: string | null;
  filtrando: boolean;
}) {
  const vacio = cantidad === 0;
  return (
    <div
      className={`min-w-[54px] rounded-[8px] px-2 py-1 text-center ${
        vacio ? 'bg-red-50' : 'bg-blue-50'
      } ${filtrando && !vacio ? 'ring-1 ring-blue-200' : ''}`}
    >
      <p className={`text-[12px] font-extrabold leading-none ${vacio ? 'text-red-700' : 'text-[#004A94]'}`}>
        {/* Con filtro se ve "23/91": el denominador es lo que evita creer que se
            perdieron variantes. */}
        {filtrando ? `${cantidad}/${total}` : cantidad}
      </p>
      {/* Sin nada visible no hay stock que resumir: "mixto" ahi haria pensar
          que se sumaron unidades distintas cuando no se sumo ninguna. */}
      <p className="mt-0.5 text-[9px] leading-none text-gray-600">{vacio ? '—' : stock ?? 'mixto'}</p>
    </div>
  );
}
