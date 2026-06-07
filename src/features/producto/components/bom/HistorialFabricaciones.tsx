'use client';

import { useState, useEffect } from 'react';
import type { LoteProduccion, DetalleFabricacion } from '@/core/types/bom';
import * as bomService from '../../services/bom-service';

interface Props {
  isOpen: boolean;
  productoId: string;
  sedeId?: string;
  varianteId?: string;
  onClose: () => void;
}

/** Historial de lotes fabricados del producto, con detalle de insumos consumidos por lote */
export default function HistorialFabricaciones({ isOpen, productoId, sedeId, varianteId, onClose }: Props) {
  const [items, setItems] = useState<LoteProduccion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<Record<string, DetalleFabricacion>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError('');
      setExpanded(null);
      bomService.getFabricaciones(productoId, { sedeId, varianteId })
        .then(setItems)
        .catch(() => setError('Error al cargar el historial'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, productoId, sedeId, varianteId]);

  const toggleDetalle = async (numeroDocumento: string) => {
    if (expanded === numeroDocumento) { setExpanded(null); return; }
    setExpanded(numeroDocumento);
    if (!detalles[numeroDocumento]) {
      try {
        const d = await bomService.getDetalleFabricacion(productoId, numeroDocumento);
        setDetalles(prev => ({ ...prev, [numeroDocumento]: d }));
      } catch { /* deja sin detalle */ }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">Historial de Fabricaciones</h3>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : items.length === 0 && !error ? (
          <p className="py-10 text-center text-sm text-gray-400">Sin lotes fabricados</p>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((l) => {
              const d = detalles[l.numeroDocumento];
              const isExp = expanded === l.numeroDocumento;
              return (
                <div key={l.numeroDocumento} className="rounded-lg border border-gray-200">
                  <button onClick={() => toggleDetalle(l.numeroDocumento)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-gray-400">{l.numeroDocumento}</p>
                      <p className="text-sm font-medium text-gray-900">
                        +{l.cantidadProducida} unid.
                        {l.varianteNombre && <span className="ml-1 text-xs text-[#437EFF]">({l.varianteNombre})</span>}
                        {l.stockNuevo != null && <span className="ml-2 text-xs text-gray-400">→ stock {l.stockNuevo}</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(l.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                        {new Date(l.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        {l.sede?.nombre && ` · ${l.sede.nombre}`}
                        {l.usuario?.nombre && ` · ${l.usuario.nombre}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {l.costoLote != null && (
                        <>
                          <p className="text-xs font-semibold text-gray-800">S/ {Number(l.costoLote).toFixed(2)}</p>
                          {l.costoUnitario != null && <p className="text-[10px] text-gray-400">S/ {Number(l.costoUnitario).toFixed(2)}/u</p>}
                        </>
                      )}
                      <svg className={`ml-auto mt-1 h-3.5 w-3.5 text-gray-400 transition-transform ${isExp ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExp && (
                    <div className="border-t border-gray-100 px-3 py-2.5">
                      {!d ? (
                        <div className="flex justify-center py-3"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>
                      ) : (
                        <>
                          <p className="text-[10px] font-medium uppercase text-gray-400 mb-1.5">Insumos consumidos</p>
                          <div className="space-y-1.5">
                            {d.insumosConsumidos.map((ins, i) => (
                              <div key={i} className="rounded-md bg-gray-50 px-2 py-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">{ins.nombre}</span>
                                  <span className="text-gray-500">
                                    {ins.cantidadConsumida} {ins.unidadMedida ?? ''}
                                    {ins.costoUnitarioMomento != null && <span className="ml-1 text-gray-400">@ S/ {Number(ins.costoUnitarioMomento).toFixed(4)}</span>}
                                  </span>
                                </div>
                                {ins.costoUnitarioActual != null && ins.costoUnitarioMomento != null
                                  && Number(ins.costoUnitarioActual) !== Number(ins.costoUnitarioMomento) && (
                                  <p className="text-[10px] text-amber-600">
                                    Costo actual: S/ {Number(ins.costoUnitarioActual).toFixed(4)} (cambió desde la fabricación)
                                  </p>
                                )}
                                {ins.ultimaCompra && (
                                  <p className="text-[10px] text-gray-400">
                                    🚚 Últ. compra: <span className="text-gray-500">{ins.ultimaCompra.proveedor}</span>
                                    {' · '}{ins.ultimaCompra.cantidad} unid. @ S/ {Number(ins.ultimaCompra.precioUnitario).toFixed(2)}
                                    {' = S/ '}{Number(ins.ultimaCompra.total).toFixed(2)}
                                    {' · '}{new Date(ins.ultimaCompra.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          {(d.costoInsumos != null || d.costoManoObra != null) && (
                            <div className="mt-2 border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
                              {d.costoInsumos != null && <span>Insumos: S/ {Number(d.costoInsumos).toFixed(2)}</span>}
                              {d.costoManoObra != null && <span className="ml-2">M.O.: S/ {Number(d.costoManoObra).toFixed(2)}</span>}
                              {d.costoLoteTotal != null && <span className="ml-2 font-semibold text-gray-700">Total: S/ {Number(d.costoLoteTotal).toFixed(2)}</span>}
                            </div>
                          )}
                          {l.observaciones && <p className="mt-1 text-[10px] italic text-gray-400">{l.observaciones}</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
