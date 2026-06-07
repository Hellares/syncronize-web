'use client';

import { useState, useCallback } from 'react';
import type { CreateComponenteComboDto } from '@/core/types/combo';
import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo } from '@/core/types/producto';
import * as productoService from '../../services/producto-service';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  /** Sede para mostrar precio/stock correctos del componente */
  sedeId?: string | null;
  onAdd: (data: CreateComponenteComboDto) => void;
  onClose: () => void;
}

function stockDeSede(p: Producto, sedeId?: string | null): StockPorSedeInfo | undefined {
  if (!p.stocksPorSede?.length) return undefined;
  return (sedeId && p.stocksPorSede.find(s => s.sedeId === sedeId)) || p.stocksPorSede[0];
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function AgregarComponenteDialog({ isOpen, isSubmitting, sedeId, onAdd, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [precioEnCombo, setPrecioEnCombo] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!value.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 10, search: value, soloProductos: true, sedeId: sedeId || undefined });
        setSearchResults(res.data);
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
    setSearchTimeout(t);
  }, [searchTimeout, sedeId]);

  const handleSelect = (p: Producto) => {
    setSelected(p);
    setSearchQuery(p.nombre);
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!selected) return;
    onAdd({
      componenteProductoId: selected.id,
      cantidad: parseInt(cantidad) || 1,
      ...(precioEnCombo && { precioEnCombo: parseFloat(precioEnCombo) }),
    });
    // Reset
    setSelected(null); setSearchQuery(''); setCantidad('1'); setPrecioEnCombo('');
  };

  const handleClose = () => {
    setSelected(null); setSearchQuery(''); setSearchResults([]); setCantidad('1'); setPrecioEnCombo('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Agregar Componente</h3>
        <div className="mt-4 space-y-4">
          {/* Product Search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Producto *</label>
            <div className="relative">
              <input className={inputClass} value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Buscar producto..." />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                  {searchResults.map(p => {
                    const stock = stockDeSede(p, sedeId);
                    const precio = stock ? infoPrecioEfectivo(stock) : undefined;
                    return (
                      <button key={p.id} onClick={() => handleSelect(p)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                          <p className="text-[10px] text-gray-400">{p.sku || p.codigoEmpresa}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-gray-800">
                            {precio != null ? `S/ ${Number(precio).toFixed(2)}` : 'Sin precio'}
                          </p>
                          <p className={`text-[10px] ${(stock?.cantidad ?? 0) <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            Stock: {stock?.cantidad ?? 0}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selected && (() => {
              const stock = stockDeSede(selected, sedeId);
              const precio = stock ? infoPrecioEfectivo(stock) : undefined;
              return (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <p className="text-xs font-medium text-green-700 truncate">{selected.nombre}</p>
                  <p className="shrink-0 text-xs text-green-700">
                    {precio != null ? `S/ ${Number(precio).toFixed(2)}` : 'Sin precio'} · Stock {stock?.cantidad ?? 0}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad *</label>
              <input className={inputClass} type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio en Combo</label>
              <input className={inputClass} type="number" step="0.01" value={precioEnCombo} onChange={e => setPrecioEnCombo(e.target.value)}
                placeholder={(() => {
                  const stock = selected ? stockDeSede(selected, sedeId) : undefined;
                  const precio = stock ? infoPrecioEfectivo(stock) : undefined;
                  return precio != null ? `Normal: S/ ${Number(precio).toFixed(2)}` : 'Usar precio normal';
                })()} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={handleClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !selected} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
