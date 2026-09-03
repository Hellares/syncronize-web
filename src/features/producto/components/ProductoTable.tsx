'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Producto, PaginationMeta, StockPorSedeInfo } from '@/core/types/producto';
import { infoLiquidacionActiva, infoOfertaActiva } from '@/core/types/producto';
import { presentacionPlana } from '@/core/utils/unidad-presentacion';
import { stockPorVarianteTexto } from './variantes/filtro-variantes';
import StockBadge from './StockBadge';

interface Props {
  productos: Producto[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  sedeId?: string;
  canManage?: boolean;
  onPageChange: (page: number) => void;
  onDelete: (producto: Producto) => void;
  onToggleActive?: (producto: Producto) => void;
  /** Abre el diálogo de precios de la sede activa. */
  onConfigurarPrecios?: (producto: Producto) => void;
  /** Abre el diálogo de imágenes del producto. */
  onGestionarImagenes?: (producto: Producto) => void;
  /** Abre el diálogo de ajuste de stock de la sede activa. */
  onAjustarStock?: (producto: Producto) => void;
  /** Hay algo filtrado: cambia QUE dice el vacio. */
  hayFiltros?: boolean;
  onLimpiarFiltros?: () => void;
  puedeCrear?: boolean;
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

export default function ProductoTable({ productos, meta, isLoading, sedeId, canManage = false, onPageChange, onDelete, onToggleActive, onConfigurarPrecios, onGestionarImagenes, onAjustarStock, hayFiltros = false, onLimpiarFiltros, puedeCrear = false }: Props) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (productos.length === 0) {
    // Dos situaciones distintas: sin filtros el catalogo esta vacio y hay que
    // crear; con filtros hay productos pero ninguno coincide, y lo que hace
    // falta es SACAR el filtro. Un solo mensaje dejaba al usuario mirando una
    // lista vacia sin enterarse de que seguia filtrando.
    return (
      <div className="rounded-xl bg-white py-16 text-center ring-1 ring-blue-400/40 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            {hayFiltros
              ? <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>
              : <path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8" />}
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-700">
          {hayFiltros ? 'Ningun producto coincide con el filtro' : 'Todavia no hay productos'}
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
          {hayFiltros
            ? 'Proba con otro termino o saca algun filtro para ver mas.'
            : 'Cuando cargues el primero va a aparecer aca.'}
        </p>
        <div className="mt-4">
          {hayFiltros
            ? onLimpiarFiltros && (
                <button
                  onClick={onLimpiarFiltros}
                  className="inline-flex h-[34px] items-center rounded-lg bg-[#004A94] px-4 text-xs font-bold text-white transition-colors hover:bg-[#003570]"
                >
                  Limpiar filtros
                </button>
              )
            : puedeCrear && (
                <Link
                  href="/dashboard/productos/nuevo"
                  className="inline-flex h-[34px] items-center rounded-lg bg-[#004A94] px-4 text-xs font-bold text-white transition-colors hover:bg-[#003570]"
                >
                  Crear el primero
                </Link>
              )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      {/* 🔴 Ring azul, no `border border-gray-200`: ese gris sobre el fondo
          #f5f7fa del dashboard tiene contraste casi nulo y el borde de la
          tabla se pierde. Es el mismo motivo por el que `ui/Card.tsx` usa
          ring. */}
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[#cfe0f5] bg-[#eaf2fd]">
            <tr>
              <th className="px-4 py-3 font-medium text-[#004A94]">Producto</th>
              <th className="hidden px-4 py-3 font-medium text-[#004A94] md:table-cell">Código</th>
              <th className="hidden px-4 py-3 font-medium text-[#004A94] lg:table-cell">Categoría</th>
              <th className="hidden px-4 py-3 font-medium text-[#004A94] lg:table-cell">Marca</th>
              <th className="px-4 py-3 font-medium text-[#004A94] text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-[#004A94] text-center">Stock</th>
              <th className="px-4 py-3 font-medium text-[#004A94] text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-[#004A94] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productos.map((p) => {
              const stock = getStockForSede(p, sedeId);
              const img = getImageUrl(p);
              // Un granel se GUARDA en gramos y se LEE en kilos: sin esto la
              // lista muestra "0.01" y "28000" donde el app dice "S/ 8.00/kg"
              // y "28 kg". Sin presentación el factor es 1 y no cambia nada.
              const pres = presentacionPlana(p);

              return (
                // La fila entera lleva al detalle. El nombre sigue siendo un
                // <Link> de verdad: sin eso no hay teclado, ni "abrir en pestaña
                // nueva", ni ver la URL al pasar por encima.
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/productos/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50/50"
                >
                  {/* Producto (imagen + nombre + badges) */}
                  <td className="px-4 py-2">
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
                          {p.esInsumo && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Insumo</span>
                          )}
                          {infoLiquidacionActiva(stock) && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">Liquidación</span>
                          )}
                          {p.destacado && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Destacado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Código */}
                  <td className="hidden px-4 py-2 md:table-cell">
                    <span className="font-mono text-xs text-gray-500">{p.codigoEmpresa}</span>
                  </td>

                  {/* Categoría */}
                  <td className="hidden px-4 py-2 lg:table-cell">
                    <span className="text-xs text-gray-500">{p.categoria?.nombre || '—'}</span>
                  </td>

                  {/* Marca */}
                  <td className="hidden px-4 py-2 lg:table-cell">
                    <span className="text-xs text-gray-500">{p.marca?.nombre || '—'}</span>
                  </td>

                  {/* Precio (prioridad: liquidación > oferta > base, igual que Flutter) */}
                  <td className="px-4 py-2 text-right">
                    {/* 🔴 Un producto CON variantes no tiene precio propio: el
                        precio vive en cada variante y el de la fila padre salia
                        de la primera que tuviera uno, o sea un numero que no
                        representa a nada. El app hace lo mismo --todo su bloque
                        de precio esta detras de `if (!tieneVariantes)`-- y en su
                        lugar ofrece entrar a las variantes, que aca es el boton
                        Gestionar. */}
                    {p.tieneVariantes ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : infoLiquidacionActiva(stock) ? (
                      <>
                        <span className="text-xs text-gray-400 line-through block">{pres.precioTexto(Number(stock.precio))}</span>
                        <span className="font-bold text-red-600">{pres.precioTexto(Number(stock.precioLiquidacion))}</span>
                      </>
                    ) : infoOfertaActiva(stock) ? (
                      <>
                        <span className="text-xs text-gray-400 line-through block">{pres.precioTexto(Number(stock.precio))}</span>
                        <span className="font-bold text-green-600">{pres.precioTexto(Number(stock.precioOferta))}</span>
                      </>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {stock.precio != null ? pres.precioTexto(Number(stock.precio)) : '—'}
                      </span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-2 text-center">
                    {/* 🔴 Un par SACO→GRANEL tiene variantes en unidades
                        DISTINTAS: sumarlas da "31290 g", que no son ni gramos
                        ni sacos. Se muestran por separado, como el app. */}
                    <StockBadge
                      cantidad={stock.cantidad ?? 0}
                      texto={stockPorVarianteTexto(p) ?? pres.cantidadTexto(stock.cantidad ?? 0)}
                      stockMinimo={stock.stockMinimo ?? undefined}
                    />
                  </td>

                  {/* Estado (clickeable si puede gestionar) */}
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); if (canManage) onToggleActive?.(p); }}
                      disabled={!canManage || !onToggleActive}
                      title={canManage ? (p.isActive ? 'Click para desactivar' : 'Click para activar') : undefined}
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      } ${canManage && onToggleActive ? 'cursor-pointer hover:ring-1 hover:ring-gray-300' : 'cursor-default'}`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>

                  {/* Acciones. `stopPropagation` en toda la celda: sin eso,
                      cada boton navegaria al detalle ademas de lo suyo. */}
                  <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* El ojo se fue: para ver el detalle se hace click en la
                          fila. Su lugar lo ocupa lo que antes solo estaba en
                          Stock por Sede. */}
                      {/* 🔴 Solo en productos SIN variantes: `ProductoStock` es
                          XOR, asi que un producto con variantes tiene sus filas
                          de stock POR VARIANTE y no propias. La moneda no
                          tendria nada que abrir; los precios de esos se tocan
                          desde Gestionar. */}
                      {/* "+" de stock: el mismo boton que la card del app.
                          Oculto en productos con VARIANTES --`ProductoStock` es
                          XOR: sus filas de stock son por variante-- y en COMBOS,
                          cuyo stock es el de sus componentes. Igual que el app. */}
                      {onAjustarStock && !p.tieneVariantes && !p.esCombo && (
                        <button
                          onClick={() => onAjustarStock(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]"
                          title="Agregar o ajustar stock en esta sede"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      )}
                      {onConfigurarPrecios && !p.tieneVariantes && (
                        <button
                          onClick={() => onConfigurarPrecios(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                          title="Configurar precios"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <circle cx="12" cy="12" r="8.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5a2.6 2.6 0 00-2.5-1.5c-1.4 0-2.3.8-2.3 1.8 0 2.4 5 1.2 5 3.7 0 1.1-1 1.9-2.5 1.9a2.7 2.7 0 01-2.6-1.6M12 6.5v11" />
                          </svg>
                        </button>
                      )}
                      {/* Clip = imágenes. Solo en productos SIN variantes,
                          igual que el app: las de un producto con variantes
                          son de cada variante. */}
                      {onGestionarImagenes && !p.tieneVariantes && (
                        <button
                          onClick={() => onGestionarImagenes(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600"
                          title="Imágenes"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                          </svg>
                        </button>
                      )}
                      {p.tieneVariantes && (
                        <Link
                          href={`/dashboard/productos/${p.id}/variantes`}
                          className="rounded-lg border border-[#437EFF] px-2 py-1 text-[11px] font-bold text-[#437EFF] hover:bg-[#437EFF]/5"
                          title="Gestionar variantes"
                        >
                          Gestionar
                        </Link>
                      )}
                      {!p.esCombo && (
                        <Link
                          href={`/dashboard/productos/${p.id}/componentes`}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                          title="Receta / Componentes (BOM)"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                          </svg>
                        </Link>
                      )}
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
