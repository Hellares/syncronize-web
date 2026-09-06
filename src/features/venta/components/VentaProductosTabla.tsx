'use client';

/**
 * Qué se vendió, en tabla. Presentacional: quien la usa trae las líneas.
 *
 * La comparten el desplegable de cuentas por cobrar y el del estado de cuenta
 * del cliente. Es lo primero que se pregunta cuando el cliente discute la deuda
 * por teléfono, y tenía que verse igual en las dos.
 */

import type { VentaDetalle } from '@/core/types/venta';
import { esLineaGratuita } from '@/core/types/venta';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  /** `null` mientras se pide; `[]` cuando la venta no tiene líneas. */
  lineas: VentaDetalle[] | null;
  error?: boolean;
}

export default function VentaProductosTabla({ lineas, error = false }: Props) {
  if (error) {
    return <p className="text-[11px] text-gray-400">No se pudo cargar el detalle de la venta.</p>;
  }
  if (lineas == null) {
    return (
      <div className="flex items-center gap-2 py-1 text-[11px] text-gray-400">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-[#437EFF]" />
        Cargando…
      </div>
    );
  }
  if (lineas.length === 0) {
    return <p className="text-[11px] text-gray-400">La venta no tiene líneas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-gray-200 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
            <th className="py-1 pr-2 font-semibold">Producto</th>
            <th className="w-px whitespace-nowrap px-2 py-1 text-right font-semibold">Cant.</th>
            <th className="w-px whitespace-nowrap px-2 py-1 text-right font-semibold">P. unit.</th>
            <th className="w-px whitespace-nowrap py-1 pl-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map(d => (
            <tr key={d.id} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 pr-2 text-gray-700">
                {d.descripcion}
                {esLineaGratuita(d) && (
                  <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">REGALO</span>
                )}
                {/* Una línea que vino de un combo: sin esto no se entiende por
                    qué hay tres productos sueltos. */}
                {d.origenComboNombre && (
                  <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700">
                    {d.origenComboNombre}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-gray-700">{Number(d.cantidad)}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right text-gray-500">{fmt(d.precioUnitario)}</td>
              <td className="whitespace-nowrap py-1.5 pl-2 text-right font-semibold text-gray-800">
                {fmt(d.total ?? Number(d.cantidad) * Number(d.precioUnitario))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
