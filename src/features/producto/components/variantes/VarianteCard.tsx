'use client';

import type { ProductoVariante } from '@/core/types/producto';
import { infoPrecioEfectivo, infoOfertaActiva, infoLiquidacionActiva } from '@/core/types/producto';
import type { PresentacionPlana } from '@/core/utils/unidad-presentacion';
import { presentacionDeVariante } from './filtro-variantes';

interface Props {
  variante: ProductoVariante;
  /** Presentación del PRODUCTO; la variante sin una propia la hereda. */
  presentacionProducto?: PresentacionPlana | null;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Abre el diálogo de imágenes de la variante. */
  onImagenes?: () => void;
}

export default function VarianteCard({ variante, presentacionProducto, canManage, onView, onEdit, onDelete, onImagenes }: Props) {
  const stockTotal = variante.stocksPorSede?.reduce((sum, s) => sum + s.cantidad, 0) ?? 0;
  // El stock se guarda en unidad de venta y se lee en la de presentación:
  // "28 kg", no "28000".
  const stockTexto = presentacionDeVariante(variante, presentacionProducto).cantidadTexto(stockTotal);
  const stockConPrecio = variante.stocksPorSede?.find(s => s.precioConfigurado);
  // Precio efectivo con la misma prioridad que Flutter/backend: liquidación > oferta vigente > base
  const precio = stockConPrecio ? infoPrecioEfectivo(stockConPrecio) : undefined;
  const liqActiva = stockConPrecio ? infoLiquidacionActiva(stockConPrecio) : false;
  const ofertaActiva = !liqActiva && stockConPrecio ? infoOfertaActiva(stockConPrecio) : false;
  const precioBase = stockConPrecio?.precio;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-900">{variante.nombre}</h4>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${variante.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {variante.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">SKU: {variante.sku}</p>
          {variante.codigoBarras && (
            <p className="text-xs text-gray-400">Cod. Barras: {variante.codigoBarras}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={onView} title="Ver detalle" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {canManage && (
            <>
              {onImagenes && (
                <button onClick={onImagenes} title="Imágenes" className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                </button>
              )}
              <button onClick={onEdit} title="Editar" className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={onDelete} title="Eliminar" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Atributos */}
      {variante.atributosValores.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {variante.atributosValores.map((av) => (
            <span key={av.id} className="rounded-full border border-[#437EFF]/20 bg-[#437EFF]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#437EFF]">
              {av.atributo.nombre}: {av.valor}
            </span>
          ))}
        </div>
      )}

      {/* Precio y Stock, los dos en la unidad en la que se habla: un granel
          mostraba "S/ 0.01" y "28000" en vez de "S/ 8.00/kg" y "28 kg". */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-medium uppercase text-gray-400">Precio</p>
            {liqActiva && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">LIQ</span>
            )}
            {ofertaActiva && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">OFERTA</span>
            )}
          </div>
          {precio != null ? (
            <p className={`text-sm font-bold ${liqActiva ? 'text-red-600' : ofertaActiva ? 'text-green-600' : 'text-gray-900'}`}>
              {presentacionDeVariante(variante, presentacionProducto).precioTexto(Number(precio))}
              {(liqActiva || ofertaActiva) && precioBase != null && precioBase !== precio && (
                <span className="ml-1.5 text-xs font-normal text-gray-400 line-through">
                  {presentacionDeVariante(variante, presentacionProducto).precioTexto(Number(precioBase))}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-amber-600">Sin precio</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase text-gray-400">Stock</p>
          <span className={`inline-flex items-center gap-1 text-sm font-bold ${stockTotal > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {stockTotal > 0 ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            {stockTexto}
          </span>
        </div>
      </div>
    </div>
  );
}
