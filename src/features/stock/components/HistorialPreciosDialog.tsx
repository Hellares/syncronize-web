'use client';

import { useState, useEffect } from 'react';
import type { ProductoStock, HistorialPrecioSede } from '@/core/types/stock';
import { nombreProductoStock } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

interface Props {
  isOpen: boolean;
  stock: ProductoStock | null;
  onClose: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  MANUAL: 'Manual', OFERTA: 'Oferta', OFERTA_ACTIVADA: 'Oferta activada', OFERTA_DESACTIVADA: 'Oferta desactivada',
  COSTO: 'Costo', COSTO_ACTUALIZADO: 'Costo actualizado', MASIVO: 'Masivo', AJUSTE_MASIVO: 'Ajuste masivo',
  AJUSTE_MERCADO: 'Ajuste mercado', COMPETENCIA: 'Competencia', CORRECCION: 'Corrección', LIQUIDACION: 'Liquidación',
};

function Cambio({ label, anterior, nuevo }: { label: string; anterior?: number | null; nuevo?: number | null }) {
  if (nuevo == null && anterior == null) return null;
  if (anterior != null && nuevo != null && Number(anterior) === Number(nuevo)) return null;
  return (
    <p className="text-xs">
      <span className="text-gray-400">{label}:</span>{' '}
      {anterior != null && <span className="text-gray-400 line-through">S/ {Number(anterior).toFixed(2)}</span>}
      {anterior != null && ' → '}
      <span className="font-medium text-gray-800">{nuevo != null ? `S/ ${Number(nuevo).toFixed(2)}` : '—'}</span>
    </p>
  );
}

/** Historial de cambios de precio de un ProductoStock (timeline, paridad HistorialPreciosProductoPage Flutter) */
export default function HistorialPreciosDialog({ isOpen, stock, onClose }: Props) {
  const [items, setItems] = useState<HistorialPrecioSede[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && stock) {
      setIsLoading(true);
      setError('');
      stockService.getHistorialPreciosStock(stock.id)
        .then(setItems)
        .catch(() => setError('Error al cargar el historial'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, stock]);

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">Historial de Precios</h3>
        <p className="mt-1 text-xs text-gray-500">{nombreProductoStock(stock)}</p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
          </div>
        ) : items.length === 0 && !error ? (
          <p className="py-10 text-center text-sm text-gray-400">Sin cambios registrados</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((h) => (
              <div key={h.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {TIPO_LABEL[h.tipoCambio] ?? h.tipoCambio}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(h.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                    {new Date(h.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <Cambio label="Precio" anterior={h.precioAnterior} nuevo={h.precioNuevo} />
                  <Cambio label="Costo" anterior={h.precioCostoAnterior} nuevo={h.precioCostoNuevo} />
                  <Cambio label="Oferta" anterior={h.precioOfertaAnterior} nuevo={h.precioOfertaNuevo} />
                </div>
                {h.razon && <p className="mt-1 text-[11px] italic text-gray-400">{h.razon}</p>}
                {h.usuario?.persona && (
                  <p className="mt-1 text-[10px] text-gray-400">
                    {`${h.usuario.persona.nombres ?? ''} ${h.usuario.persona.apellidos ?? ''}`.trim()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
