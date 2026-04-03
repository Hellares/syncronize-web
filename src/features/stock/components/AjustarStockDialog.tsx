'use client';

import { useState } from 'react';
import type { ProductoStock, AjustarStockDto, TipoMovimientoStock } from '@/core/types/stock';
import { nombreProductoStock, stockDisponibleVenta } from '@/core/types/stock';
import { getGroupedAdjustmentTypes } from './movement-types';
import * as stockService from '../services/stock-service';

interface Props {
  isOpen: boolean;
  stock: ProductoStock | null;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function AjustarStockDialog({ isOpen, stock, onSuccess, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoMovimientoStock | ''>('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const grouped = getGroupedAdjustmentTypes();
  const selectedInfo = tipo ? Object.values(grouped).flat().find(t => t.value === tipo) : null;
  const cantidadNum = parseInt(cantidad) || 0;
  const preview = stock ? stock.stockActual + (selectedInfo?.isEntry ? cantidadNum : -cantidadNum) : 0;

  const handleSubmit = async () => {
    if (!stock || !tipo) { setError('Selecciona un tipo de movimiento'); return; }
    if (cantidadNum <= 0) { setError('La cantidad debe ser mayor a 0'); return; }

    setError('');
    setIsSubmitting(true);
    try {
      const data: AjustarStockDto = {
        tipo: tipo as TipoMovimientoStock,
        cantidad: selectedInfo?.isEntry ? cantidadNum : -cantidadNum,
        ...(motivo && { motivo }),
        ...(observaciones && { observaciones }),
        ...(tipoDocumento && { tipoDocumento }),
        ...(numeroDocumento && { numeroDocumento }),
      };
      await stockService.ajustarStock(stock.id, data);
      handleClose();
      onSuccess();
    } catch {
      setError('Error al ajustar el stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTipo('');
    setCantidad('');
    setMotivo('');
    setTipoDocumento('');
    setNumeroDocumento('');
    setObservaciones('');
    setError('');
    onClose();
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Ajustar Stock</h3>
        <p className="mt-1 text-xs text-gray-500">{nombreProductoStock(stock)} — Actual: {stock.stockActual} | Disponible: {stockDisponibleVenta(stock)}</p>

        <div className="mt-4 space-y-4">
          {/* Tipo de Movimiento */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de Movimiento *</label>
            <select className={`${inputClass} bg-white`} value={tipo} onChange={e => setTipo(e.target.value as TipoMovimientoStock)}>
              <option value="">Seleccionar tipo</option>
              {Object.entries(grouped).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map(t => (
                    <option key={t.value} value={t.value}>{t.isEntry ? '+ ' : '- '}{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Cantidad */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad *</label>
            <input className={inputClass} type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
          </div>

          {/* Preview */}
          {cantidadNum > 0 && selectedInfo && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Stock anterior:</span>
                <span className="font-medium">{stock.stockActual}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{selectedInfo.isEntry ? 'Entrada:' : 'Salida:'}</span>
                <span className={`font-medium ${selectedInfo.isEntry ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedInfo.isEntry ? '+' : '-'}{cantidadNum}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-700 font-medium">Stock resultante:</span>
                <span className={`font-bold ${preview < 0 ? 'text-red-600' : 'text-gray-900'}`}>{preview}</span>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Motivo</label>
            <input className={inputClass} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Razón del ajuste" />
          </div>

          {/* Documento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo Documento</label>
              <select className={`${inputClass} bg-white`} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}>
                <option value="">Ninguno</option>
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="GUIA">Guía de Remisión</option>
                <option value="NOTA_CREDITO">Nota de Crédito</option>
                <option value="NOTA_DEBITO">Nota de Débito</option>
                <option value="RECIBO">Recibo</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">N° Documento</label>
              <input className={inputClass} value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} placeholder="Ej: F001-0001" />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones</label>
            <textarea className={`${inputClass} min-h-[60px]`} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones adicionales" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={handleClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}
