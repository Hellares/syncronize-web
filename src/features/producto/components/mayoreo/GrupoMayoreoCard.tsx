'use client';

import type { GrupoMayoreo, VarianteMayoreo } from '@/core/types/mayoreo';
import { combinaConAlguien, esPorcentaje, stockDelGrupo } from '@/core/types/mayoreo';

interface Props {
  grupo: GrupoMayoreo;
  /** Variantes que pasan el buscador. Puede ser menos que `grupo.variantes`. */
  visibles: VarianteMayoreo[];
  abierto: boolean;
  onAlternar: () => void;
  onEditarVariante: (v: VarianteMayoreo) => void;
}

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/**
 * Un grupo de mayoreo: el precio, el rango, cuántas variantes combinan y —al
 * desplegarlo— el detalle variante por variante con el precio de lista tachado
 * contra el de mayoreo.
 *
 * Lo que se busca destacar es lo que está MAL: el borde naranja de "sola en su
 * grupo" y las franjas rojas de los avisos.
 */
export default function GrupoMayoreoCard({ grupo, visibles, abierto, onAlternar, onEditarVariante }: Props) {
  const precioTexto = esPorcentaje(grupo)
    ? `−${(grupo.porcentajeDesc ?? 0).toFixed(0)}%`
    : soles(grupo.precio ?? 0);
  const rango = grupo.cantidadMaxima != null
    ? `${grupo.cantidadMinima} a ${grupo.cantidadMaxima} u`
    : `desde ${grupo.cantidadMinima} u`;
  const solitario = !combinaConAlguien(grupo);

  return (
    <div className={`overflow-hidden rounded-[10px] border bg-white ${solitario ? 'border-orange-300' : 'border-gray-200'}`}>
      <button
        onClick={onAlternar}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="shrink-0 rounded-[6px] border border-green-300 bg-green-50 px-2 py-1 text-xs font-bold text-green-800">
          {precioTexto}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-gray-900">
            {grupo.nombreNivel} · {rango}
          </span>
          <span className={`block text-[10.5px] ${solitario ? 'font-semibold text-orange-700' : 'text-gray-500'}`}>
            {solitario
              ? 'Sola en su grupo: no combina con ninguna otra'
              : `${grupo.variantes.length} variantes combinan · ${stockDelGrupo(grupo)} u en stock`}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {grupo.preciosVentaDispares && (
        <Aviso texto="Las variantes de este grupo NO tienen el mismo precio de lista, así que la misma rebaja les deja descuentos distintos." />
      )}
      {grupo.nivelSinEfecto && (
        <Aviso texto="En al menos una variante el precio por mayor no baja del precio de lista: ahí el nivel nunca se va a aplicar." />
      )}

      {abierto && (
        <div className="border-t border-gray-100">
          {visibles.map((v) => (
            <FilaVariante key={v.varianteId} variante={v} onEditar={() => onEditarVariante(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-1.5 bg-red-50 px-3 py-1.5">
      <svg className="mt-px h-3 w-3 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
      <p className="text-[10px] leading-snug text-red-900">{texto}</p>
    </div>
  );
}

/**
 * Tocar la fila abre los precios de esa variante. Es lo que convierte al
 * monitor en algo accionable: acá se ve el problema y acá se arregla.
 */
function FilaVariante({ variante: v, onEditar }: { variante: VarianteMayoreo; onEditar: () => void }) {
  return (
    <button
      onClick={onEditar}
      className="flex w-full items-center gap-2 border-b border-gray-50 px-3 py-1.5 text-left transition-colors last:border-0 hover:bg-blue-50/60"
    >
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[11px] ${v.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
          {v.nombre}
        </span>
        <span className="block truncate font-mono text-[9.5px] text-gray-500">
          {v.sku}
          {v.stockActual != null && ` · ${v.stockActual} u`}
          {!v.isActive && ' · desactivada'}
        </span>
      </span>
      {v.precioVenta != null && (
        <span className="shrink-0 text-[10px] text-gray-400 line-through">{soles(v.precioVenta)}</span>
      )}
      <span className="shrink-0 text-[11.5px] font-bold text-green-700">
        {v.precioConNivel != null ? soles(v.precioConNivel) : '—'}
      </span>
      <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
      </svg>
    </button>
  );
}
