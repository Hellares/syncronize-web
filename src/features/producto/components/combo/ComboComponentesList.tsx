'use client';

import { useState, useEffect } from 'react';
import { useCombo } from '../../hooks/use-combo';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import AgregarComponenteDialog from './AgregarComponenteDialog';

interface Props {
  comboId: string;
}

export default function ComboComponentesList({ comboId }: Props) {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const sedeId = defaultSede?.id ?? null;

  const { combo, isLoading, isSubmitting, error, success, addComponente, removeComponente } = useCombo(comboId, sedeId);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (success && !isSubmitting) setAddOpen(false);
  }, [success, isSubmitting]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Componentes del Combo</h3>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#003570]">
            + Agregar
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}

      {combo && (
        <div className="space-y-3">
          {/* Precio de Venta */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-700">Precio de Venta</span>
              <span className="text-lg font-bold text-green-700">S/ {Number(combo.precio).toFixed(2)}</span>
            </div>
          </div>

          {/* Desglose de Precios */}
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Tipo de Precio:</span>
              <span className="font-medium text-gray-700">
                {combo.tipoPrecioCombo === 'FIJO' ? 'Precio Fijo' : combo.tipoPrecioCombo === 'CALCULADO' ? 'Calculado' : 'Calculado con Descuento'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Sin combo (individual):</span>
              <span className="text-gray-700">S/ {Number(combo.precioRegularTotal).toFixed(2)}</span>
            </div>
            {combo.precioCalculado !== combo.precioRegularTotal && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Con precios combo:</span>
                <span className="text-gray-700">S/ {Number(combo.precioCalculado).toFixed(2)}</span>
              </div>
            )}
            {combo.descuentoPorcentaje != null && combo.descuentoPorcentaje > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Descuento global:</span>
                <span className="text-[#437EFF] font-medium">{combo.descuentoPorcentaje}%</span>
              </div>
            )}
            {combo.descuentoAplicado != null && combo.descuentoAplicado > 0 && (
              <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-2.5 py-1.5 text-xs mt-1">
                <span className="text-green-700 font-medium flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ahorro
                </span>
                <span className="text-green-700 font-bold">S/ {Number(combo.descuentoAplicado).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Oferta */}
          {combo.ofertaActiva && combo.precioOferta != null && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-orange-700 flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  Oferta Activa
                </span>
                <span className="text-sm font-bold text-orange-700">S/ {Number(combo.precioOferta).toFixed(2)}</span>
              </div>
              {combo.precioSinOferta != null && (
                <p className="text-[10px] text-orange-500 mt-0.5">Precio regular: S/ {Number(combo.precioSinOferta).toFixed(2)}</p>
              )}
            </div>
          )}

          {/* Stock */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg border p-3 text-center ${combo.stockReservado > 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-lg font-bold ${combo.stockReservado > 0 ? 'text-green-700' : 'text-amber-700'}`}>{combo.stockReservado}</p>
              <p className="text-[10px] text-gray-500">Reservados (vendibles)</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-lg font-bold text-gray-700">{combo.stockDisponible}</p>
              <p className="text-[10px] text-gray-500">Disponible para reservar</p>
            </div>
          </div>

          {combo.stockReservado === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-[10px] text-amber-700">Reserve combos para poder venderlos en el POS.</p>
            </div>
          )}

          {combo.componentesSinStock && combo.componentesSinStock.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-600">Componentes sin stock: {combo.componentesSinStock.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : !combo || combo.componentes.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No hay componentes. Agrega productos para armar el combo.</p>
      ) : (
        <div className="space-y-2">
          {combo.componentes.map(comp => (
            <div key={comp.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                {comp.componenteInfo?.imagen && (
                  <img src={comp.componenteInfo.imagen} alt="" className="h-8 w-8 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{comp.componenteInfo?.nombre || 'Producto'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>x{comp.cantidad}</span>
                    {comp.precioEnCombo != null && <span className="text-green-600">S/ {Number(comp.precioEnCombo).toFixed(2)}</span>}
                    {comp.componenteInfo?.stock != null && <span>Stock: {comp.componenteInfo.stock}</span>}
                  </div>
                </div>
              </div>
              {canManage && (
                <button onClick={() => removeComponente(comp.id)} disabled={isSubmitting}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AgregarComponenteDialog
        isOpen={addOpen}
        isSubmitting={isSubmitting}
        onAdd={addComponente}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
