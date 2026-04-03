'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProductoDetail } from '@/features/producto/hooks/use-producto-detail';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import StockBadge from '@/features/producto/components/StockBadge';
import VarianteList from '@/features/producto/components/variantes/VarianteList';
import ImageGallery from '@/features/producto/components/ImageGallery';
import OfertaCountdown from '@/features/producto/components/OfertaCountdown';
import PrecioNivelSection from '@/features/producto/components/precios/PrecioNivelSection';
import ComboComponentesList from '@/features/producto/components/combo/ComboComponentesList';

export default function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { producto, isLoading, error } = useProductoDetail(id);
  const { empresa } = useEmpresa();

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

  // Find active offer from any sede
  const ofertaActiva = producto.stocksPorSede?.find(s => s.enOferta && s.precioOferta != null);

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
          <Link href="/dashboard/stock" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Stock
          </Link>
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
          {/* Image Gallery */}
          <ImageGallery
            archivos={producto.archivos}
            imagenes={producto.imagenes}
            videoUrl={producto.videoUrl}
            alt={producto.nombre}
          />

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
              <div><span className="text-gray-500">IGV:</span> <span className="font-medium">{producto.impuestoPorcentaje != null ? `${producto.impuestoPorcentaje}% (personalizado)` : 'Usa IGV global de la empresa'}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={`font-medium ${producto.isActive ? 'text-green-600' : 'text-gray-400'}`}>{producto.isActive ? 'Activo' : 'Inactivo'}</span></div>
            </div>
            {producto.descripcion && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-600">{producto.descripcion}</p>
              </div>
            )}
          </div>

          {/* Dimensiones */}
          {producto.dimensiones && Object.keys(producto.dimensiones).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dimensiones</h3>
              <div className="flex gap-4">
                {Object.entries(producto.dimensiones).map(([key, val]) => (
                  <div key={key} className="rounded-lg bg-gray-50 px-4 py-2 text-center">
                    <p className="text-lg font-bold text-gray-900">{val}</p>
                    <p className="text-[10px] uppercase text-gray-500">{key} (cm)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precio Niveles */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <PrecioNivelSection productoId={producto.id} />
          </div>

          {/* Combo Info */}
          {producto.esCombo && (
            <>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-sm font-semibold text-purple-900">Producto Combo</h3>
                  <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                    {producto.tipoPrecioCombo === 'FIJO' ? 'Precio Fijo' : producto.tipoPrecioCombo === 'CALCULADO' ? 'Precio Calculado' : 'Calculado con Descuento'}
                  </span>
                </div>
                <p className="text-xs text-purple-700">
                  {producto.tipoPrecioCombo === 'FIJO'
                    ? 'El precio del combo es fijo, definido manualmente.'
                    : producto.tipoPrecioCombo === 'CALCULADO'
                    ? 'El precio se calcula como la suma de los componentes.'
                    : 'El precio se calcula con un descuento aplicado sobre la suma.'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <ComboComponentesList comboId={producto.id} />
              </div>
            </>
          )}

          {/* Variants */}
          {producto.tieneVariantes && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <VarianteList
                productoId={producto.id}
                productoNombre={producto.nombre}
                productoIsActive={producto.isActive}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Oferta Countdown */}
          {ofertaActiva && (
            <OfertaCountdown
              enOferta={ofertaActiva.enOferta}
              fechaInicio={ofertaActiva.fechaInicioOferta}
              fechaFin={ofertaActiva.fechaFinOferta}
            />
          )}

          {/* Stock por sede */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Stock por Sede</h3>
              <Link href="/dashboard/stock" className="text-[10px] font-medium text-[#437EFF] hover:underline">Ver todo</Link>
            </div>
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
