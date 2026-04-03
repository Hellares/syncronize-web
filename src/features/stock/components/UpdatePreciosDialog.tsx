'use client';

import { useState, useEffect } from 'react';
import type { ProductoStock, UpdatePreciosStockDto } from '@/core/types/stock';
import { nombreProductoStock } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

interface Props {
  isOpen: boolean;
  stock: ProductoStock | null;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function UpdatePreciosDialog({ isOpen, stock, onSuccess, onClose }: Props) {
  const [precio, setPrecio] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioOferta, setPrecioOferta] = useState('');
  const [enOferta, setEnOferta] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(true);
  const [ubicacion, setUbicacion] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [stockMaximo, setStockMaximo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && stock) {
      setPrecio(stock.precio != null ? String(stock.precio) : '');
      setPrecioCosto(stock.precioCosto != null ? String(stock.precioCosto) : '');
      setPrecioOferta(stock.precioOferta != null ? String(stock.precioOferta) : '');
      setEnOferta(stock.enOferta);
      setFechaInicio(stock.fechaInicioOferta?.split('T')[0] ?? '');
      setFechaFin(stock.fechaFinOferta?.split('T')[0] ?? '');
      setPrecioIncluyeIgv(stock.precioIncluyeIgv);
      setUbicacion(stock.ubicacion ?? '');
      setStockMinimo(stock.stockMinimo != null ? String(stock.stockMinimo) : '');
      setStockMaximo(stock.stockMaximo != null ? String(stock.stockMaximo) : '');
      setError('');
    }
  }, [isOpen, stock]);

  const handleSubmit = async () => {
    if (!stock) return;
    setIsSubmitting(true);
    setError('');
    try {
      const data: UpdatePreciosStockDto = {
        ...(precio && { precio: parseFloat(precio) }),
        ...(precioCosto && { precioCosto: parseFloat(precioCosto) }),
        ...(precioOferta && { precioOferta: parseFloat(precioOferta) }),
        enOferta,
        ...(fechaInicio && { fechaInicioOferta: fechaInicio }),
        ...(fechaFin && { fechaFinOferta: fechaFin }),
        precioIncluyeIgv,
        ...(ubicacion && { ubicacion }),
        ...(stockMinimo && { stockMinimo: parseInt(stockMinimo) }),
        ...(stockMaximo && { stockMaximo: parseInt(stockMaximo) }),
      };
      await stockService.updatePrecios(stock.id, data);
      onClose();
      onSuccess();
    } catch {
      setError('Error al actualizar precios');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Configurar Precios y Stock</h3>
        <p className="mt-1 text-xs text-gray-500">{nombreProductoStock(stock)}</p>

        <div className="mt-4 space-y-4">
          {/* Precios */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio Venta</label>
              <input className={inputClass} type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio Costo</label>
              <input className={inputClass} type="number" step="0.01" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio Oferta</label>
              <input className={inputClass} type="number" step="0.01" value={precioOferta} onChange={e => setPrecioOferta(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Oferta */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">En oferta</label>
            <button type="button" onClick={() => setEnOferta(!enOferta)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enOferta ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enOferta ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {enOferta && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Inicio Oferta</label>
                <input className={inputClass} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Fin Oferta</label>
                <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
            </div>
          )}

          {/* IGV */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={precioIncluyeIgv} onChange={e => setPrecioIncluyeIgv(e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Precio incluye IGV
          </label>

          {/* Ubicación */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ubicación</label>
            <input className={inputClass} value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Pasillo A, Estante 3" />
          </div>

          {/* Min/Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Stock Mínimo</label>
              <input className={inputClass} type="number" min="0" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Stock Máximo</label>
              <input className={inputClass} type="number" min="0" value={stockMaximo} onChange={e => setStockMaximo(e.target.value)} placeholder="0" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
