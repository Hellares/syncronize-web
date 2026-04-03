'use client';

import type { ProductoVariante } from '@/core/types/producto';

interface Props {
  variante: ProductoVariante;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function VarianteCard({ variante, canManage, onView, onEdit, onDelete }: Props) {
  const stockTotal = variante.stocksPorSede?.reduce((sum, s) => sum + s.cantidad, 0) ?? 0;
  const stockConPrecio = variante.stocksPorSede?.find(s => s.precioConfigurado);
  const precio = stockConPrecio?.enOferta ? stockConPrecio.precioOferta : stockConPrecio?.precio;

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

      {/* Precio y Stock */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-gray-400">Precio</p>
          {precio != null ? (
            <p className={`text-sm font-bold ${stockConPrecio?.enOferta ? 'text-green-600' : 'text-gray-900'}`}>
              S/ {Number(precio).toFixed(2)}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Sin precio</p>
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
            {stockTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
