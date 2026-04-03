'use client';

import { useState, useMemo } from 'react';
import type { ProductoAtributo, GenerarCombinacionesDto } from '@/core/types/producto';

interface Props {
  isOpen: boolean;
  productoNombre: string;
  atributosDisponibles: ProductoAtributo[];
  isSubmitting: boolean;
  onGenerar: (data: GenerarCombinacionesDto) => void;
  onClose: () => void;
}

const MAX_COMBINACIONES = 50;

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(v => [...a, v])),
    [[]]
  );
}

export default function GenerarCombinacionesDialog({
  isOpen, productoNombre, atributosDisponibles, isSubmitting, onGenerar, onClose,
}: Props) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});
  const [precioBase, setPrecioBase] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [stockDistribucion, setStockDistribucion] = useState<'SIN_STOCK' | 'EQUITATIVO'>('SIN_STOCK');
  const [stockTotal, setStockTotal] = useState('');
  const [error, setError] = useState('');

  const atributosConValores = atributosDisponibles.filter(a => a.valores.length > 0);

  const toggleValue = (atributoId: string, valor: string) => {
    setSelectedValues(prev => {
      const current = prev[atributoId] || [];
      const next = current.includes(valor)
        ? current.filter(v => v !== valor)
        : [...current, valor];
      if (next.length === 0) {
        const { [atributoId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [atributoId]: next };
    });
  };

  const combinaciones = useMemo(() => {
    const entries = Object.entries(selectedValues).filter(([, vals]) => vals.length > 0);
    if (entries.length === 0) return [];

    const attrNames = entries.map(([id]) => {
      const attr = atributosConValores.find(a => a.id === id);
      return attr?.nombre || id;
    });
    const valArrays = entries.map(([, vals]) => vals);
    const combos = cartesianProduct(valArrays);

    return combos.map(combo =>
      combo.map((val, i) => `${attrNames[i]} ${val}`).join(' / ')
    );
  }, [selectedValues, atributosConValores]);

  const exceedsLimit = combinaciones.length > MAX_COMBINACIONES;

  const handleGenerar = () => {
    const precio = parseFloat(precioBase);
    if (!precio || precio <= 0) {
      setError('El precio base es requerido y debe ser mayor a 0');
      return;
    }
    if (combinaciones.length === 0) {
      setError('Selecciona al menos un atributo con valores');
      return;
    }
    if (exceedsLimit) return;

    setError('');
    const atributos = Object.entries(selectedValues)
      .filter(([, vals]) => vals.length > 0)
      .map(([atributoId, valores]) => ({ atributoId, valores }));

    const data: GenerarCombinacionesDto = {
      atributos,
      precioBase: precio,
      ...(precioCosto && { precioCosto: parseFloat(precioCosto) }),
      ...(stockDistribucion === 'EQUITATIVO' && stockTotal && parseInt(stockTotal) > 0 && {
        stockDistribucion: 'EQUITATIVO' as const,
        stockTotal: parseInt(stockTotal),
      }),
    };
    onGenerar(data);
  };

  const handleClose = () => {
    setSelectedValues({});
    setPrecioBase('');
    setPrecioCosto('');
    setStockDistribucion('SIN_STOCK');
    setStockTotal('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Generar Variantes por Combinación</h3>
          <p className="mt-1 text-xs text-gray-500">Producto: {productoNombre}</p>
        </div>

        <div className="mt-5 space-y-5">
          {/* Atributos */}
          {atributosConValores.length === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-700">No hay atributos con valores predefinidos disponibles. Crea atributos primero.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {atributosConValores.map(attr => (
                <div key={attr.id}>
                  <p className="mb-2 text-sm font-medium text-gray-700">{attr.nombre}</p>
                  <div className="flex flex-wrap gap-2">
                    {attr.valores.map(valor => {
                      const isSelected = selectedValues[attr.id]?.includes(valor);
                      return (
                        <button
                          key={valor}
                          onClick={() => toggleValue(attr.id, valor)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            isSelected
                              ? 'border-[#437EFF] bg-[#437EFF] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[#437EFF]/40 hover:bg-[#437EFF]/5'
                          }`}
                        >
                          {isSelected && (
                            <svg className="mr-1 inline h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {valor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio Base *</label>
              <input className={inputClass} type="number" step="0.01" min="0" value={precioBase} onChange={e => setPrecioBase(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio Costo</label>
              <input className={inputClass} type="number" step="0.01" min="0" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Stock Distribution */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Stock Inicial</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStockDistribucion('SIN_STOCK')}
                className={`rounded-lg border p-3 text-center transition-colors ${stockDistribucion === 'SIN_STOCK' ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <svg className={`mx-auto h-5 w-5 ${stockDistribucion === 'SIN_STOCK' ? 'text-[#437EFF]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className={`mt-1 text-xs font-medium ${stockDistribucion === 'SIN_STOCK' ? 'text-[#437EFF]' : 'text-gray-600'}`}>Sin stock</p>
                <p className="text-[10px] text-gray-400">Agregar después</p>
              </button>
              <button type="button" onClick={() => setStockDistribucion('EQUITATIVO')}
                className={`rounded-lg border p-3 text-center transition-colors ${stockDistribucion === 'EQUITATIVO' ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <svg className={`mx-auto h-5 w-5 ${stockDistribucion === 'EQUITATIVO' ? 'text-[#437EFF]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <p className={`mt-1 text-xs font-medium ${stockDistribucion === 'EQUITATIVO' ? 'text-[#437EFF]' : 'text-gray-600'}`}>Repartir</p>
                <p className="text-[10px] text-gray-400">Equitativamente</p>
              </button>
            </div>
            {stockDistribucion === 'EQUITATIVO' && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">Stock total a repartir</label>
                <input className={inputClass} type="number" min="1" value={stockTotal} onChange={e => setStockTotal(e.target.value)} placeholder="Ej: 50" />
                {stockTotal && parseInt(stockTotal) > 0 && combinaciones.length > 0 && (() => {
                  const total = parseInt(stockTotal);
                  const cant = combinaciones.length;
                  const porVariante = Math.floor(total / cant);
                  const resto = total % cant;
                  return (
                    <p className="mt-1.5 rounded-md bg-green-50 border border-green-200 px-2.5 py-1.5 text-[11px] text-green-700">
                      {cant} variantes x {porVariante} c/u = {porVariante * cant}{resto > 0 ? ` (+${resto} para las primeras ${resto})` : ''}
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Preview */}
          {combinaciones.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Vista previa</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${exceedsLimit ? 'bg-red-100 text-red-700' : 'bg-[#437EFF]/10 text-[#437EFF]'}`}>
                  {combinaciones.length} variantes
                </span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {combinaciones.slice(0, 20).map((combo, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      <span className="text-gray-400 mr-1">{i + 1}.</span> {combo}
                    </li>
                  ))}
                  {combinaciones.length > 20 && (
                    <li className="text-xs text-gray-400 font-medium">+{combinaciones.length - 20} más...</li>
                  )}
                </ul>
              </div>
              {exceedsLimit && (
                <p className="mt-1 text-xs text-red-500">Máximo {MAX_COMBINACIONES} combinaciones permitidas. Reduce la selección.</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={handleClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={isSubmitting || combinaciones.length === 0 || exceedsLimit}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
          >
            {isSubmitting ? 'Generando...' : `Generar ${combinaciones.length} Variantes`}
          </button>
        </div>
      </div>
    </div>
  );
}
