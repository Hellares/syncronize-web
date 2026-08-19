'use client';

import { useEffect, useState } from 'react';
import type { PrecioNivel } from '@/core/types/precio';
import { getNivelesByVariante } from '../../services/precio-nivel-service';

interface Props {
  varianteId: string;
  /** Precio base de la variante, para mostrar cuanto ahorra cada nivel. */
  precioBase?: number | null;
}

/**
 * Los niveles de precio de la variante elegida, en modo LECTURA.
 *
 * Se editan desde el dialogo de precios (el mismo de Stock por sede); aca solo
 * se muestran, porque hasta ahora no se veian por ningun lado: en un producto
 * con variantes la seccion editable del padre esta oculta —el nivel del padre
 * no aplica— y los de cada variante quedaban invisibles salvo abriendo el
 * dialogo una por una.
 */
export default function NivelesVarianteInline({ varianteId, precioBase }: Props) {
  const [resultado, setResultado] = useState<{ niveles: PrecioNivel[] } | null>(null);

  useEffect(() => {
    let vivo = true;
    getNivelesByVariante(varianteId)
      .then((n) => { if (vivo) setResultado({ niveles: n.filter((x) => x.isActive) }); })
      .catch(() => { if (vivo) setResultado({ niveles: [] }); });
    return () => { vivo = false; };
  }, [varianteId]);

  if (resultado === null) {
    return <div className="mt-3 h-3 w-32 animate-pulse rounded bg-white/70" />;
  }

  const niveles = resultado.niveles;

  return (
    <div className="mt-3 border-t border-blue-200/60 pt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#004A94]">Precios por nivel</p>

      {niveles.length === 0 ? (
        <p className="mt-1 text-[11px] text-gray-400">Sin niveles configurados para esta variante.</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1">
          {niveles.map((n) => {
            const esFijo = n.tipoPrecio === 'PRECIO_FIJO';
            const valor = esFijo
              ? (n.precio != null ? `S/ ${Number(n.precio).toFixed(2)}` : '—')
              : (n.porcentajeDesc != null ? `-${Number(n.porcentajeDesc)}%` : '—');
            // Con precio base a la vista se puede juzgar el nivel; sin el, un
            // "S/ 72" no dice si es un buen descuento o una perdida.
            const resultante = esFijo
              ? (n.precio != null ? Number(n.precio) : null)
              : (precioBase != null && n.porcentajeDesc != null
                  ? precioBase * (1 - Number(n.porcentajeDesc) / 100)
                  : null);
            const bajoBase = precioBase != null && resultante != null && resultante < precioBase;

            return (
              <div key={n.id} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-[11px] ring-1 ring-blue-100">
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">{n.nombre}</span>
                <span className="shrink-0 text-gray-500">
                  {n.cantidadMinima}
                  {n.cantidadMaxima != null ? `–${n.cantidadMaxima}` : '+'}
                </span>
                <span className={`shrink-0 font-bold ${esFijo ? 'text-[#004A94]' : 'text-green-700'}`}>{valor}</span>
                {!esFijo && resultante != null && (
                  <span className="shrink-0 text-[10px] text-gray-400">= S/ {resultante.toFixed(2)}</span>
                )}
                {esFijo && precioBase != null && !bajoBase && (
                  // Un nivel que no baja el precio NO se aplica al vender: es
                  // el sintoma de un nivel heredado del producto padre sobre
                  // una variante mas barata.
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="No baja el precio base, así que nunca se aplica">
                    NO APLICA
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
