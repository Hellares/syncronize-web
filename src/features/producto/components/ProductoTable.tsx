'use client';

import Link from 'next/link';
import type { Producto, PaginationMeta, StockPorSedeInfo } from '@/core/types/producto';
import StockBadge from './StockBadge';

interface Props {
  productos: Producto[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  sedeId?: string;
  canManage?: boolean;
  onPageChange: (page: number) => void;
  onDelete: (producto: Producto) => void;
}

function getStockForSede(producto: Producto, sedeId?: string): StockPorSedeInfo {
  const fallback: StockPorSedeInfo = { sedeId: '', sedeNombre: '', sedeCodigo: '', cantidad: 0, enOferta: false, precioConfigurado: false };
  if (!producto.stocksPorSede?.length) return fallback;
  const sede = sedeId
    ? producto.stocksPorSede.find((s) => s.sedeId === sedeId)
    : producto.stocksPorSede[0];
  return sede || fallback;
}

function getImageUrl(producto: Producto): string | null {
  if (producto.archivos?.length) return producto.archivos[0].urlThumbnail || producto.archivos[0].url;
  if (producto.imagenes?.length) return producto.imagenes[0];
  return null;
}

export default function ProductoTable({ productos, meta, isLoading, sedeId, canManage = false, onPageChange, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Código</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Categoría</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Marca</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {productos.map((p) => {
              const stock = getStockForSede(p, sedeId);
              const img = getImageUrl(p);

              return (
                <tr key={p.id} className="transition-colors hover:bg-gray-50/50">
                  {/* Producto (imagen + nombre + badges) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {img ? (
                        <img src={img} alt={p.nombre} className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/dashboard/productos/${p.id}`} className="font-medium text-gray-900 hover:text-[#437EFF] truncate block">
                          {p.nombre}
                        </Link>
                        <div className="flex gap-1 mt-0.5">
                          {p.tieneVariantes && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Variantes</span>
                          )}
                          {p.esCombo && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Combo</span>
                          )}
                          {p.destacado && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Destacado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Código */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="font-mono text-xs text-gray-500">{p.codigoEmpresa}</span>
                  </td>

                  {/* Categoría */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-gray-500">{p.categoria?.nombre || '—'}</span>
                  </td>

                  {/* Marca */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-gray-500">{p.marca?.nombre || '—'}</span>
                  </td>

                  {/* Precio */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-gray-900">
                      {stock.precio != null ? `S/ ${Number(stock.precio).toFixed(2)}` : '—'}
                    </span>
                    {stock.enOferta && stock.precioOferta != null && (
                      <div className="text-xs text-green-600">Oferta: S/ {Number(stock.precioOferta).toFixed(2)}</div>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-center">
                    <StockBadge cantidad={stock.cantidad ?? 0} stockMinimo={stock.stockMinimo ?? undefined} />
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/productos/${p.id}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Ver"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                      {canManage && (
                        <Link
                          href={`/dashboard/productos/${p.id}/editar`}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </Link>
                      )}
                      {canManage && (
                        <button
                          onClick={() => onDelete(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {meta.offset + 1}-{Math.min(meta.offset + meta.pageSize, meta.total)} de {meta.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={!meta.hasPrevious}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="flex items-center px-3 text-xs text-gray-500">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={!meta.hasNext}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
