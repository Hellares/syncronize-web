'use client';

import { use, useCallback, useState } from 'react';
import Link from 'next/link';
import { useProductoDetail } from '@/features/producto/hooks/use-producto-detail';
import VarianteList from '@/features/producto/components/variantes/VarianteList';
import type { ProductoVariante } from '@/core/types/producto';

/**
 * Gestión de variantes, en su propia página (paridad `producto_variantes_page`).
 *
 * Vive aparte del detalle porque es el punto de partida de lo que se hace CON
 * las variantes —grupos de mayoreo, análisis, edición masiva— y porque la tabla
 * tiene una columna por eje: dentro del detalle competía con la ficha.
 */
export default function ProductoVariantesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { producto, isLoading, error } = useProductoDetail(id);
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const recibirVariantes = useCallback((vs: ProductoVariante[]) => setVariantes(vs), []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm text-red-600">{error ?? 'Producto no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/dashboard/productos/${producto.id}`}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            title="Volver al producto"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">Gestión de Variantes</h1>
            <p className="truncate text-sm text-gray-500">
              {producto.nombre}
              {variantes.length > 0 && ` · ${variantes.length} variantes`}
            </p>
          </div>
        </div>

        {/* Falta portar el ANALISIS de variantes del app; se agrega acá
            cuando exista, en vez de dejar un boton que no lleva a nada. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/productos/${producto.id}/mayoreo`}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-gray-200 px-3 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Grupos de mayoreo
          </Link>
          {producto.tieneVariantes && (
            <Link
              href={`/dashboard/productos/${producto.id}/variantes/edicion-masiva`}
              title="Cargar stock, precios y mayoreo de todas las variantes de una vez"
              className="inline-flex h-[30px] items-center gap-1.5 rounded-md bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18M9 4v16" />
              </svg>
              Edición masiva
            </Link>
          )}
        </div>
      </div>

      {!producto.tieneVariantes ? (
        <div className="rounded-xl bg-white p-8 text-center ring-1 ring-blue-400/40">
          <p className="text-sm text-gray-500">Este producto no maneja variantes.</p>
          <Link
            href={`/dashboard/productos/${producto.id}`}
            className="mt-3 inline-block text-xs font-semibold text-[#437EFF] hover:underline"
          >
            Volver al producto
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-5 ring-1 ring-blue-400/40 shadow-sm">
          <VarianteList
            productoId={producto.id}
            productoNombre={producto.nombre}
            productoIsActive={producto.isActive}
            onVariantesCargadas={recibirVariantes}
            presentacionProducto={producto}
            descripcionProducto={producto.descripcion}
          />
        </div>
      )}
    </div>
  );
}
