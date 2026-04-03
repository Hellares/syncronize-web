'use client';

import type { ProductoStock } from '@/core/types/stock';
import { stockDisponibleVenta, nombreProductoStock, skuProductoStock, precioEfectivo, esBajoMinimo, esCritico } from '@/core/types/stock';
import type { PaginationMeta } from '@/core/types/producto';

interface Props {
  stocks: ProductoStock[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  canManage: boolean;
  onAjustar: (stock: ProductoStock) => void;
  onKardex: (stock: ProductoStock) => void;
  onPrecios: (stock: ProductoStock) => void;
  onPageChange: (page: number) => void;
}

function StockBadge({ stock }: { stock: ProductoStock }) {
  const disponible = stockDisponibleVenta(stock);
  const critical = esCritico(stock);
  const low = esBajoMinimo(stock);
  const color = critical ? 'bg-red-100 text-red-700' : low ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{disponible}</span>;
}

export default function StockTable({ stocks, meta, isLoading, canManage, onAjustar, onKardex, onPrecios, onPageChange }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="py-16 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="mt-3 text-sm text-gray-500">No hay stock en esta sede</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3 text-center">Actual</th>
              <th className="px-4 py-3 text-center">Disponible</th>
              <th className="hidden px-4 py-3 text-center md:table-cell">Reservado</th>
              <th className="hidden px-4 py-3 text-center lg:table-cell">Dañado</th>
              <th className="hidden px-4 py-3 text-center md:table-cell">Min/Max</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(stock => {
              const nombre = nombreProductoStock(stock);
              const sku = skuProductoStock(stock);
              const precio = precioEfectivo(stock);
              const img = stock.producto?.archivos?.[0]?.urlThumbnail || stock.producto?.archivos?.[0]?.url || stock.producto?.imagenes?.[0];

              return (
                <tr key={stock.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {img ? (
                        <img src={img} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{nombre}</p>
                        <p className="truncate text-xs text-gray-500">{sku}</p>
                        {stock.variante && <span className="text-[10px] text-[#437EFF]">Variante</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{stock.stockActual}</td>
                  <td className="px-4 py-3 text-center"><StockBadge stock={stock} /></td>
                  <td className="hidden px-4 py-3 text-center text-gray-500 md:table-cell">
                    {stock.stockReservado + stock.stockReservadoVenta + stock.stockReservadoCombo || '-'}
                  </td>
                  <td className="hidden px-4 py-3 text-center lg:table-cell">
                    {stock.stockDanado > 0 ? <span className="text-red-500">{stock.stockDanado}</span> : '-'}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-xs text-gray-500 md:table-cell">
                    {stock.stockMinimo != null || stock.stockMaximo != null
                      ? `${stock.stockMinimo ?? '-'} / ${stock.stockMaximo ?? '-'}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {precio != null ? (
                      <span className={`font-medium ${stock.enOferta ? 'text-green-600' : 'text-gray-900'}`}>
                        S/ {Number(precio).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin precio</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (
                        <button onClick={() => onAjustar(stock)} title="Ajustar stock" className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      )}
                      <button onClick={() => onKardex(stock)} title="Ver kardex" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                      {canManage && (
                        <button onClick={() => onPrecios(stock)} title="Configurar precios" className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">{meta.total} registros</p>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(meta.page - 1)} disabled={!meta.hasPrevious}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Anterior
            </button>
            <span className="text-xs text-gray-500">{meta.page} / {meta.totalPages}</span>
            <button onClick={() => onPageChange(meta.page + 1)} disabled={!meta.hasNext}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
