'use client';

import type { ProductoVariante } from '@/core/types/producto';
import { infoLiquidacionActiva, infoOfertaActiva, infoPrecioEfectivo } from '@/core/types/producto';
import type { PresentacionPlana } from '@/core/utils/unidad-presentacion';
import { presentacionDeVariante } from './filtro-variantes';

interface Props {
  variantes: ProductoVariante[];
  /**
   * Presentación del PRODUCTO: la variante que no tiene una propia la hereda.
   * Sin esto el stock de un granel se imprime en gramos ("28000") en vez de
   * en la unidad en la que se habla ("28 kg").
   */
  presentacionProducto?: PresentacionPlana | null;
  /** Ejes del producto, en orden. Cada uno es una COLUMNA. */
  ejes: string[];
  canManage: boolean;
  /** Variante elegida: la galeria y el bloque de precios de la pagina la siguen. */
  seleccionadaId?: string | null;
  onView: (v: ProductoVariante) => void;
  onEdit: (v: ProductoVariante) => void;
  onDelete: (v: ProductoVariante) => void;
  /** Abre el diálogo de imágenes de la variante. */
  onImagenes?: (v: ProductoVariante) => void;
}

/**
 * Miniatura de la variante: la primera de sus imágenes.
 *
 * Se prefiere el thumbnail cuando existe: en una lista de 91 variantes,
 * bajar la imagen a tamaño completo de cada una son varios MB por pantalla.
 */
function miniaturaDe(v: ProductoVariante): string | null {
  const a = v.archivos?.[0];
  return a ? (a.urlThumbnail ?? a.url) : null;
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

/**
 * Precio de la variante, en la unidad en la que se habla ("S/ 8.00/kg").
 *
 * `sinPrecio` alimenta además el punto ámbar del estado: es lo único que avisa
 * que una variante existe, tiene stock y aun así NO SE PUEDE VENDER.
 */
function precioDe(
  v: ProductoVariante,
  presentacionProducto?: PresentacionPlana | null,
): { texto: string; sinPrecio: boolean; rebajado: boolean } {
  const fila = v.stocksPorSede?.find((s) => s.precioConfigurado);
  if (!fila) return { texto: '—', sinPrecio: true, rebajado: false };
  const efectivo = infoPrecioEfectivo(fila);
  if (efectivo == null) return { texto: '—', sinPrecio: true, rebajado: false };
  const rebajado = infoLiquidacionActiva(fila) || infoOfertaActiva(fila);
  const u = presentacionDeVariante(v, presentacionProducto);
  return { texto: u.precioTexto(Number(efectivo)), sinPrecio: false, rebajado };
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
  if (precioDe(v, null).sinPrecio) return { color: 'bg-amber-500', titulo: 'Sin precio', alerta: true };
  return { color: 'bg-green-500', titulo: 'Activa', alerta: false };
}

export default function VarianteTable({ variantes, presentacionProducto, ejes, canManage, seleccionadaId, onView, onEdit, onDelete, onImagenes }: Props) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-gray-100">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-gray-100 bg-gray-50/70">
          <tr>
            <th className="w-7 px-2.5 py-2" />
            <th className="w-10 px-2.5 py-2" />
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
            const precio = precioDe(v, presentacionProducto);
            const stock = stockTotal(v);
            const stockTexto = presentacionDeVariante(v, presentacionProducto).cantidadTexto(stock);
            return (
              <tr
                key={v.id}
                onClick={() => onView(v)}
                className={`cursor-pointer border-b border-gray-50 transition-colors ${
                  seleccionadaId === v.id
                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                    : est.alerta ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-2.5 py-1.5">
                  <span className={`inline-block h-[7px] w-[7px] rounded-full ${est.color}`} title={est.titulo} />
                </td>

                {/* Miniatura. El hueco se dibuja igual cuando NO hay imagen:
                    la pregunta que se responde de un vistazo es justamente
                    cuáles todavía no tienen. */}
                <td className="px-2.5 py-1.5">
                  {miniaturaDe(v) ? (
                    <img
                      src={miniaturaDe(v)!}
                      alt=""
                      className="h-7 w-7 rounded object-cover ring-1 ring-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded bg-gray-50 ring-1 ring-dashed ring-gray-200"
                      title="Sin imagen"
                    >
                      <svg className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
                      </svg>
                    </div>
                  )}
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
                    {stockTexto}
                  </span>
                </td>

                <td className="px-2.5 py-1.5 text-right">
                  {canManage && (
                    <div className="inline-flex gap-1.5 text-gray-300">
                      {onImagenes && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onImagenes(v); }}
                          title="Imágenes"
                          className="rounded p-0.5 transition-colors hover:bg-violet-50 hover:text-violet-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                          </svg>
                        </button>
                      )}
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
