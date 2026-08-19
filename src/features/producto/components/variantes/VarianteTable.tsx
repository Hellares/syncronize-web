'use client';

import type { ProductoVariante } from '@/core/types/producto';
import { infoLiquidacionActiva, infoOfertaActiva, infoPrecioEfectivo } from '@/core/types/producto';

interface Props {
  variantes: ProductoVariante[];
  /** Ejes del producto, en orden. Cada uno es una COLUMNA. */
  ejes: string[];
  canManage: boolean;
  onView: (v: ProductoVariante) => void;
  onEdit: (v: ProductoVariante) => void;
  onDelete: (v: ProductoVariante) => void;
}

/** Valor de un eje en una variante, o null si esa variante no lo declara. */
function valorDe(v: ProductoVariante, eje: string): string | null {
  const av = v.atributosValores.find((a) => a.atributo.nombre === eje);
  const valor = av?.valor?.trim();
  return valor ? valor : null;
}

function stockTotal(v: ProductoVariante): number {
  return v.stocksPorSede?.reduce((s, x) => s + x.cantidad, 0) ?? 0;
}

function precioDe(v: ProductoVariante): { texto: string; sinPrecio: boolean; rebajado: boolean } {
  const fila = v.stocksPorSede?.find((s) => s.precioConfigurado);
  if (!fila) return { texto: '—', sinPrecio: true, rebajado: false };
  const efectivo = infoPrecioEfectivo(fila);
  if (efectivo == null) return { texto: '—', sinPrecio: true, rebajado: false };
  const rebajado = infoLiquidacionActiva(fila) || infoOfertaActiva(fila);
  return { texto: `S/ ${Number(efectivo).toFixed(2)}`, sinPrecio: false, rebajado };
}

/**
 * Estado de una variante, resumido en un punto de color.
 *
 * 🔴 "Le falta un atributo" es un estado propio y no un detalle cosmetico: una
 * variante sin todos los ejes queda INALCANZABLE en el selector de venta —
 * existe, tiene stock y precio, y no se puede vender. Hasta ahora no se veia
 * por ningun lado de la web.
 */
function estadoDe(v: ProductoVariante, ejes: string[]): { color: string; titulo: string; alerta: boolean } {
  if (!v.isActive) return { color: 'bg-gray-300', titulo: 'Inactiva', alerta: false };
  const faltan = ejes.filter((e) => valorDe(v, e) == null);
  if (faltan.length > 0) {
    return {
      color: 'bg-amber-500',
      titulo: `Sin ${faltan.join(', ')} — no se puede elegir al vender`,
      alerta: true,
    };
  }
  if (precioDe(v).sinPrecio) return { color: 'bg-amber-500', titulo: 'Sin precio', alerta: true };
  return { color: 'bg-green-500', titulo: 'Activa', alerta: false };
}

export default function VarianteTable({ variantes, ejes, canManage, onView, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-gray-100">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-gray-100 bg-gray-50/70">
          <tr>
            <th className="w-7 px-2.5 py-2" />
            {ejes.map((e) => (
              <th key={e} className="whitespace-nowrap px-2.5 py-2 text-[9.5px] font-bold uppercase tracking-wide text-gray-500">
                {e}
              </th>
            ))}
            <th className="whitespace-nowrap px-2.5 py-2 text-[9.5px] font-bold uppercase tracking-wide text-gray-500">SKU</th>
            <th className="whitespace-nowrap px-2.5 py-2 text-right text-[9.5px] font-bold uppercase tracking-wide text-gray-500">Precio</th>
            <th className="whitespace-nowrap px-2.5 py-2 text-center text-[9.5px] font-bold uppercase tracking-wide text-gray-500">Stock</th>
            <th className="w-16 px-2.5 py-2" />
          </tr>
        </thead>
        <tbody>
          {variantes.map((v) => {
            const est = estadoDe(v, ejes);
            const precio = precioDe(v);
            const stock = stockTotal(v);
            return (
              <tr
                key={v.id}
                onClick={() => onView(v)}
                className={`cursor-pointer border-b border-gray-50 transition-colors ${est.alerta ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-2.5 py-1.5">
                  <span className={`inline-block h-[7px] w-[7px] rounded-full ${est.color}`} title={est.titulo} />
                </td>

                {ejes.map((e) => {
                  const valor = valorDe(v, e);
                  return (
                    <td key={e} className={`whitespace-nowrap px-2.5 py-1.5 text-[11.5px] ${valor ? 'font-semibold text-gray-700' : 'text-amber-600'}`}>
                      {/* Sin valor NO se pone un guion neutro: es lo que hace
                          inalcanzable a la variante y tiene que saltar. */}
                      {valor ?? 'sin asignar'}
                    </td>
                  );
                })}

                <td className="whitespace-nowrap px-2.5 py-1.5">
                  <span className="font-mono text-[10px] text-gray-400">{v.sku}</span>
                </td>

                <td className={`whitespace-nowrap px-2.5 py-1.5 text-right text-[11.5px] font-bold ${
                  precio.sinPrecio ? 'text-amber-600' : precio.rebajado ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {precio.texto}
                </td>

                <td className="whitespace-nowrap px-2.5 py-1.5 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    stock <= 0 ? 'bg-red-100 text-red-700' : stock < 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {stock}
                  </span>
                </td>

                <td className="px-2.5 py-1.5 text-right">
                  {canManage && (
                    <div className="inline-flex gap-1.5 text-gray-300">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(v); }}
                        title="Editar"
                        className="rounded p-0.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(v); }}
                        title="Eliminar"
                        className="rounded p-0.5 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
