'use client';

/**
 * Los ítems de una cotización, al desplegar su fila.
 *
 * El listado no los trae --solo `_count.detalles`-- así que se piden acá, una
 * vez por cotización abierta. Por eso el componente se monta recién al
 * desplegar: montarlo escondido dispararía un GET por cada fila de la lista.
 */

import { useEffect, useState } from 'react';
import type { CotizacionDetalle } from '@/core/types/cotizacion';
import { getCotizacion } from '@/features/cotizacion/services/cotizacion-service';

const fmt = (n: number | undefined | null, moneda = 'PEN') =>
  `${moneda === 'USD' ? '$' : 'S/'} ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  cotizacionId: string;
  moneda?: string;
  /** Cuántas líneas esperar, para no dibujar un vacío mientras carga. */
  cantidadItems?: number;
}

export default function CotizacionFilaDetalle({ cotizacionId, moneda = 'PEN', cantidadItems }: Props) {
  const [lineas, setLineas] = useState<CotizacionDetalle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getCotizacion(cotizacionId)
      .then(c => { if (!cancelado) setLineas([...(c.detalles ?? [])].sort((a, b) => a.orden - b.orden)); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, [cotizacionId]);

  return (
    <div className="bg-[#f9fbff] px-4 pb-4 pt-3 sm:pl-12">
      <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-[#e6edf7]">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.06em] text-gray-400">
          Ítems de la cotización{cantidadItems ? ` (${cantidadItems})` : ''}
        </p>

        {error ? (
          <p className="text-[11px] text-gray-400">No se pudieron cargar los ítems.</p>
        ) : lineas == null ? (
          <div className="flex items-center gap-2 py-1 text-[11px] text-gray-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-[#437EFF]" />
            Cargando…
          </div>
        ) : lineas.length === 0 ? (
          <p className="text-[11px] text-gray-400">La cotización no tiene ítems.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                  <th className="py-1 pr-2 font-semibold">Descripción</th>
                  <th className="w-px whitespace-nowrap px-2 py-1 text-right font-semibold">Cant.</th>
                  <th className="w-px whitespace-nowrap px-2 py-1 text-right font-semibold">P. unit.</th>
                  <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-semibold sm:table-cell">Dscto.</th>
                  <th className="w-px whitespace-nowrap py-1 pl-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map(d => {
                  // Reserva ACTIVA = stock apartado para este cliente; en una
                  // cotización CONVERTIDA, LIBERADA dice que esa línea quedó
                  // fuera de la venta. Las dos explican el stock.
                  const reserva = d.reservaEstado;
                  return (
                    <tr key={d.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-2 text-gray-700">
                        {d.descripcion}
                        {reserva === 'ACTIVA' && (
                          <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">reservado</span>
                        )}
                        {reserva === 'LIBERADA' && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">liberada</span>
                        )}
                        {d.precioAntesOferta != null && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">en oferta</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-gray-700">{Number(d.cantidad)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-gray-500">{fmt(d.precioUnitario, moneda)}</td>
                      <td className="hidden whitespace-nowrap px-2 py-1.5 text-right text-gray-500 sm:table-cell">
                        {Number(d.descuento) > 0 ? fmt(d.descuento, moneda) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pl-2 text-right font-semibold text-gray-800">{fmt(d.total, moneda)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
