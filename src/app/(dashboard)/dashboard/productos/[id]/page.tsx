'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProductoDetail } from '@/features/producto/hooks/use-producto-detail';
import StockBadge from '@/features/producto/components/StockBadge';

export default function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { producto, isLoading, error } = useProductoDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || 'Producto no encontrado'}</p>
        <Link href="/dashboard/productos" className="mt-4 inline-block text-sm text-[#437EFF] hover:underline">
          Volver a productos
        </Link>
      </div>
    );
  }

  const mainImage = producto.archivos?.[0]?.url || producto.imagenes?.[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/productos" className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Productos</Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{producto.nombre}</h1>
          <p className="text-sm text-gray-500 font-mono">{producto.codigoEmpresa}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/productos/${producto.id}/editar`}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]"
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Image + Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image */}
          {mainImage && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <img src={mainImage} alt={producto.nombre} className="mx-auto max-h-80 rounded-lg object-contain" />
            </div>
          )}

          {/* Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Información</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {producto.sku && <div><span className="text-gray-500">SKU:</span> <span className="font-medium">{producto.sku}</span></div>}
              {producto.codigoBarras && <div><span className="text-gray-500">Código Barras:</span> <span className="font-medium">{producto.codigoBarras}</span></div>}
              {producto.categoria && <div><span className="text-gray-500">Categoría:</span> <span className="font-medium">{producto.categoria.nombre}</span></div>}
              {producto.marca && <div><span className="text-gray-500">Marca:</span> <span className="font-medium">{producto.marca.nombre}</span></div>}
              {producto.unidadMedida && <div><span className="text-gray-500">Unidad:</span> <span className="font-medium">{producto.unidadMedida.nombre}</span></div>}
              {producto.peso != null && <div><span className="text-gray-500">Peso:</span> <span className="font-medium">{producto.peso} kg</span></div>}
              <div><span className="text-gray-500">IGV:</span> <span className="font-medium">{producto.impuestoPorcentaje ?? 18}%</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={`font-medium ${producto.isActive ? 'text-green-600' : 'text-gray-400'}`}>{producto.isActive ? 'Activo' : 'Inactivo'}</span></div>
            </div>
            {producto.descripcion && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-600">{producto.descripcion}</p>
              </div>
            )}
          </div>

          {/* Variants */}
          {producto.tieneVariantes && producto.variantes && producto.variantes.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Variantes ({producto.variantes.length})</h3>
              <div className="space-y-2">
                {producto.variantes.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.nombre}</p>
                      <p className="text-xs text-gray-500 font-mono">{v.sku}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Stock por sede */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Stock por Sede</h3>
            {producto.stocksPorSede && producto.stocksPorSede.length > 0 ? (
              <div className="space-y-3">
                {producto.stocksPorSede.map((s) => (
                  <div key={s.sedeId} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{s.sedeNombre}</span>
                      <StockBadge cantidad={s.cantidad} stockMinimo={s.stockMinimo ?? undefined} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      {s.precio != null && <span>Precio: S/ {Number(s.precio).toFixed(2)}</span>}
                      {s.precioCosto != null && <span>Costo: S/ {Number(s.precioCosto).toFixed(2)}</span>}
                    </div>
                    {s.enOferta && s.precioOferta != null && (
                      <p className="text-xs text-green-600 mt-0.5">Oferta: S/ {Number(s.precioOferta).toFixed(2)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin stock registrado</p>
            )}
          </div>

          {/* Badges */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Configuración</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Marketplace</span>
                <span className={producto.visibleMarketplace ? 'text-green-600' : 'text-gray-400'}>{producto.visibleMarketplace ? 'Visible' : 'Oculto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destacado</span>
                <span className={producto.destacado ? 'text-amber-600' : 'text-gray-400'}>{producto.destacado ? 'Sí' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Variantes</span>
                <span>{producto.tieneVariantes ? `Sí (${producto.variantes?.length || 0})` : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Combo</span>
                <span>{producto.esCombo ? `Sí (${producto.tipoPrecioCombo})` : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
