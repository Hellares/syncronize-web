'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import type { MonitorResponse, MonitorProductoAlerta } from '@/core/types/stock';
import * as stockService from '@/features/stock/services/stock-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const ALERTA_TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'sinPrecio', label: 'Sin precio', icon: '💰' },
  { key: 'sinPrecioCosto', label: 'Sin costo', icon: '🧾' },
  { key: 'stockCero', label: 'Stock 0', icon: '📦' },
  { key: 'bajoMinimo', label: 'Bajo mínimo', icon: '⚠️' },
  { key: 'sinUbicacion', label: 'Sin ubicación', icon: '📍' },
  { key: 'sinImagen', label: 'Sin imagen', icon: '🖼' },
  { key: 'marketplaceSinImagen', label: 'Marketplace sin imagen', icon: '🛒' },
  { key: 'precioSinIgv', label: 'Precio sin IGV', icon: '％' },
  { key: 'sinBarcode', label: 'Sin barcode', icon: '𝄃𝄃' },
];

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]";

export default function MonitorProductosPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [sedeId, setSedeId] = useState('');
  const [data, setData] = useState<MonitorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState('');
  const [tab, setTab] = useState('sinPrecio');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<'marketplace' | 'ubicacion' | 'igv' | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getMonitor(sedeId || undefined);
      setData(res);
      setSelected(new Set());
    } catch {
      setError('Error al cargar el monitor');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const alertasActuales: MonitorProductoAlerta[] = useMemo(() => data?.alertas?.[tab] ?? [], [data, tab]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === alertasActuales.length
      ? new Set()
      : new Set(alertasActuales.map(a => a.id)));
  };

  const seleccionados = alertasActuales.filter(a => selected.has(a.id));
  const e = data?.estadisticas;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monitor de Productos</h1>
          <p className="text-sm text-gray-500">Salud del catálogo y acciones masivas</p>
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={ev => setSedeId(ev.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {info && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{info}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : !data ? null : (
        <>
          {/* Estadísticas */}
          {e && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{e.totalProductos}</p>
                <p className="text-[10px] text-gray-400">Productos</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-green-600">{e.listosParaVenta}</p>
                <p className="text-[10px] text-gray-400">Listos para venta</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-red-500">{e.sinPrecio}</p>
                <p className="text-[10px] text-gray-400">Sin precio</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{e.sinStock}</p>
                <p className="text-[10px] text-gray-400">Sin stock</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-[#437EFF]">{e.visibleMarketplace}</p>
                <p className="text-[10px] text-gray-400">En marketplace</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{Math.round(e.porcentajeCatalogoCompleto)}%</p>
                <p className="text-[10px] text-gray-400">Catálogo completo</p>
              </div>
            </div>
          )}

          {/* Tabs de alertas */}
          <div className="flex flex-wrap gap-1.5">
            {ALERTA_TABS.map(t => {
              const count = data.alertas?.[t.key]?.length ?? 0;
              return (
                <button key={t.key} onClick={() => { setTab(t.key); setSelected(new Set()); }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${tab === t.key
                    ? 'bg-[#004A94] text-white'
                    : count > 0 ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-gray-50 text-gray-300'}`}>
                  {t.icon} {t.label} {count > 0 && <span className={tab === t.key ? 'text-white/80' : 'text-gray-400'}>({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Barra de acciones bulk */}
          {canManage && seleccionados.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#437EFF]/30 bg-[#437EFF]/5 p-3">
              <span className="text-xs font-bold text-[#004A94]">{seleccionados.length} seleccionados</span>
              <button onClick={() => setBulkDialog('marketplace')} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">🛒 Marketplace</button>
              <button onClick={() => setBulkDialog('ubicacion')} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">📍 Ubicación</button>
              <button onClick={() => setBulkDialog('igv')} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">％ Precio incluye IGV</button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
            </div>
          )}

          {/* Lista de alertas */}
          {alertasActuales.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-gray-400">Sin productos en esta alerta</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/50">
                  <tr>
                    {canManage && (
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox" checked={selected.size === alertasActuales.length && alertasActuales.length > 0}
                          onChange={toggleAll} className="rounded border-gray-300 text-[#437EFF]" />
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                    <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Sede</th>
                    <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Ubicación</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alertasActuales.map((a) => (
                    <tr key={a.id} className={`transition-colors hover:bg-gray-50/50 ${selected.has(a.id) ? 'bg-[#437EFF]/5' : ''}`}
                      onClick={() => canManage && toggleSelect(a.id)}>
                      {canManage && (
                        <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)}
                            className="rounded border-gray-300 text-[#437EFF]" />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.nombre}</p>
                        <p className="font-mono text-[10px] text-gray-400">{a.codigoEmpresa ?? ''}</p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell"><span className="text-xs text-gray-500">{a.sedeNombre ?? '—'}</span></td>
                      <td className="hidden px-4 py-3 md:table-cell"><span className="text-xs text-gray-500">{a.ubicacion ?? '—'}</span></td>
                      <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${a.stockActual <= 0 ? 'text-red-500' : 'text-gray-700'}`}>{a.stockActual}</span></td>
                      <td className="px-4 py-3 text-right"><span className="text-sm text-gray-700">{a.precio != null ? `S/ ${Number(a.precio).toFixed(2)}` : <span className="text-xs text-red-400">sin precio</span>}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Bulk dialogs */}
      {bulkDialog && (
        <BulkDialog
          tipo={bulkDialog}
          items={seleccionados}
          onDone={(msg) => { setBulkDialog(null); setInfo(msg); fetch(); }}
          onClose={() => setBulkDialog(null)}
        />
      )}
    </div>
  );
}

function BulkDialog({ tipo, items, onDone, onClose }: {
  tipo: 'marketplace' | 'ubicacion' | 'igv';
  items: MonitorProductoAlerta[];
  onDone: (msg: string) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [ubicacion, setUbicacion] = useState('');
  const [incluyeIgv, setIncluyeIgv] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (tipo === 'marketplace') {
        // marketplace opera por productoId; ubicación/IGV por productoStockId
        await stockService.bulkMarketplace(items.map(i => i.productoId), visible);
        onDone(`Marketplace ${visible ? 'activado' : 'desactivado'} en ${items.length} productos`);
      } else if (tipo === 'ubicacion') {
        if (!ubicacion.trim()) { setError('Ingresa la ubicación'); setIsSubmitting(false); return; }
        await stockService.bulkUbicacion(items.map(i => i.id), ubicacion.trim());
        onDone(`Ubicación asignada a ${items.length} productos`);
      } else {
        await stockService.bulkPrecioIgv(items.map(i => i.id), incluyeIgv);
        onDone(`Precio incluye IGV = ${incluyeIgv ? 'Sí' : 'No'} en ${items.length} productos`);
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error en la operación masiva');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">
          {tipo === 'marketplace' ? 'Marketplace masivo' : tipo === 'ubicacion' ? 'Asignar ubicación' : 'Precio incluye IGV'}
        </h3>
        <p className="mt-1 text-xs text-gray-500">{items.length} productos seleccionados</p>
        <div className="mt-3 space-y-3">
          {tipo === 'marketplace' && (
            <div className="flex gap-2">
              <button onClick={() => setVisible(true)} className={`flex-1 rounded-lg border p-2 text-xs font-medium ${visible ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>Mostrar</button>
              <button onClick={() => setVisible(false)} className={`flex-1 rounded-lg border p-2 text-xs font-medium ${!visible ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>Ocultar</button>
            </div>
          )}
          {tipo === 'ubicacion' && (
            <input className={inputClass} value={ubicacion} onChange={ev => setUbicacion(ev.target.value)} placeholder="Ej: ZONA-A Estante 3" autoFocus />
          )}
          {tipo === 'igv' && (
            <div className="flex gap-2">
              <button onClick={() => setIncluyeIgv(true)} className={`flex-1 rounded-lg border p-2 text-xs font-medium ${incluyeIgv ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>Incluye IGV</button>
              <button onClick={() => setIncluyeIgv(false)} className={`flex-1 rounded-lg border p-2 text-xs font-medium ${!incluyeIgv ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>No incluye</button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
