'use client';

import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type { Producto } from '@/core/types/producto';
import type { ComponenteBOM } from '@/core/types/bom';
import * as productoService from '../../services/producto-service';
import * as bomService from '../../services/bom-service';

interface Props {
  isOpen: boolean;
  /** Producto FINAL al que se agrega el componente */
  productoId: string;
  /** Variante del producto final (null = receta base) */
  varianteId?: string | null;
  sedeId?: string | null;
  componentesActuales: ComponenteBOM[];
  onAdded: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

/** Agregar insumo a la receta — paridad selector Flutter (search>=2, limit 12, isActive=true, excluye self/duplicados) */
export default function AgregarComponenteBOMDialog({ isOpen, productoId, varianteId, sedeId, componentesActuales, onAdded, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [insumoVarianteId, setInsumoVarianteId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idsEnReceta = new Set(componentesActuales.map(c => c.componenteVarianteId ?? c.componenteId));

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 12, search: value, isActive: true, sedeId: sedeId || undefined });
        // Excluye el producto final y duplicados sin variantes (igual que Flutter)
        setSearchResults(res.data.filter(p =>
          p.id !== productoId && (p.tieneVariantes || !idsEnReceta.has(p.id))
        ));
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, sedeId, componentesActuales]);

  const handleSelect = async (p: Producto) => {
    setSearchQuery(p.nombre);
    setSearchResults([]);
    setInsumoVarianteId('');
    // Si el insumo tiene variantes pero la búsqueda no las trajo, carga el detalle
    if (p.tieneVariantes && !p.variantes?.length) {
      try {
        const full = await productoService.getProducto(p.id);
        setSelected(full);
        return;
      } catch { /* fallback */ }
    }
    setSelected(p);
  };

  const handleSubmit = async () => {
    setError('');
    if (!selected) { setError('Selecciona un insumo'); return; }
    if (selected.tieneVariantes && !insumoVarianteId) { setError('Selecciona la variante del insumo'); return; }
    const c = parseFloat(cantidad);
    if (!cantidad || isNaN(c) || c <= 0) { setError('Cantidad inválida (por unidad fabricada)'); return; }
    setIsSubmitting(true);
    try {
      await bomService.crearComponente(productoId, {
        componenteId: selected.id,
        varianteId: varianteId || undefined,
        componenteVarianteId: insumoVarianteId || undefined,
        cantidad: c,
        notas: notas.trim() || undefined,
      });
      // Reset
      setSelected(null); setSearchQuery(''); setCantidad(''); setNotas(''); setInsumoVarianteId('');
      onAdded();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al agregar el componente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelected(null); setSearchQuery(''); setSearchResults([]); setCantidad(''); setNotas(''); setInsumoVarianteId(''); setError('');
    onClose();
  };

  if (!isOpen) return null;

  const unidad = selected?.unidadMedida?.abreviatura ?? selected?.unidadMedida?.nombre ?? 'unid.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Agregar Componente a la Receta</h3>
        <div className="mt-4 space-y-4">
          {/* Búsqueda de insumo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Insumo / producto componente *</label>
            <div className="relative">
              <input className={inputClass} value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Buscar (mín. 2 letras)..." />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => handleSelect(p)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                        <p className="text-[10px] text-gray-400">
                          {p.codigoEmpresa}{p.esInsumo ? ' · Insumo' : ''}{p.tieneVariantes ? ' · Con variantes' : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && <p className="mt-1 text-xs text-green-600">✓ {selected.nombre}</p>}
          </div>

          {/* Variante del insumo (si aplica) */}
          {selected?.tieneVariantes && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Variante del insumo *</label>
              <select className={selectClass} value={insumoVarianteId} onChange={e => setInsumoVarianteId(e.target.value)}>
                <option value="">Seleccionar variante...</option>
                {(selected.variantes ?? []).map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad por unidad * <span className="text-gray-400">({unidad})</span></label>
              <input className={inputClass} type="number" step="0.0001" min="0.0001" value={cantidad}
                onChange={e => setCantidad(e.target.value)} placeholder="Ej: 0.05" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
              <input className={inputClass} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            La cantidad es lo que consume <strong>1 unidad fabricada</strong>, en la unidad nativa del insumo (ej: 50 si usa 50 g y el insumo se maneja en gramos).
          </p>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={handleClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !selected} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
