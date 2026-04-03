'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useCrearTransferencia } from '@/features/stock/hooks/use-crear-transferencia';
import * as productoService from '@/features/producto/services/producto-service';
import type { Producto } from '@/core/types/producto';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

export default function NuevaTransferenciaPage() {
  const { sedes } = useEmpresa();
  const activeSedes = sedes.filter(s => s.isActive);
  const {
    sedeOrigenId, setSedeOrigenId, sedeDestinoId, setSedeDestinoId,
    motivo, setMotivo, observaciones, setObservaciones,
    items, addItem, removeItem, updateItemCantidad,
    isSubmitting, error, handleSubmit,
  } = useCrearTransferencia();

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!value.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 10, search: value });
        setSearchResults(res.data);
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
    setSearchTimeout(t);
  }, [searchTimeout]);

  const handleSelectProduct = (p: Producto) => {
    addItem(p.id, p.nombre, 1);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/dashboard/transferencias" className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Transferencias</Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Nueva Transferencia</h1>
      </div>

      <div className="space-y-4">
        {/* Sedes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sede Origen *</label>
            <select className={selectClass} value={sedeOrigenId} onChange={e => setSedeOrigenId(e.target.value)}>
              <option value="">Seleccionar</option>
              {activeSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sede Destino *</label>
            <select className={selectClass} value={sedeDestinoId} onChange={e => setSedeDestinoId(e.target.value)}>
              <option value="">Seleccionar</option>
              {activeSedes.filter(s => s.id !== sedeOrigenId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Motivo</label>
          <input className={inputClass} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Razón de la transferencia" />
        </div>

        {/* Product Search */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Agregar Productos</label>
          <div className="relative">
            <input className={inputClass} value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Buscar por nombre o SKU..." />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => handleSelectProduct(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                    <span className="font-medium text-gray-900">{p.nombre}</span>
                    <span className="text-xs text-gray-500">{p.sku || p.codigoEmpresa}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-center w-32">Cantidad</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.productoId} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.productoNombre}</td>
                    <td className="px-4 py-2 text-center">
                      <input type="number" min="1" value={item.cantidad}
                        onChange={e => updateItemCantidad(item.productoId, parseInt(e.target.value) || 1)}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center outline-none focus:border-[#437EFF]" />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(item.productoId)} className="text-red-400 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

        <div className="flex gap-3 justify-end pt-2">
          <Link href="/dashboard/transferencias" className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Creando...' : 'Crear Transferencia'}
          </button>
        </div>
      </div>
    </div>
  );
}
