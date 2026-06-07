'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { HistorialPrecioSede, TipoCambioPrecio } from '@/core/types/stock';
import * as stockService from '@/features/stock/services/stock-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const TIPO_CAMBIO_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  OFERTA: 'Oferta',
  OFERTA_ACTIVADA: 'Oferta activada',
  OFERTA_DESACTIVADA: 'Oferta desactivada',
  COSTO: 'Costo',
  COSTO_ACTUALIZADO: 'Costo actualizado',
  MASIVO: 'Masivo',
  AJUSTE_MASIVO: 'Ajuste masivo',
  AJUSTE_MERCADO: 'Ajuste mercado',
  COMPETENCIA: 'Competencia',
  CORRECCION: 'Corrección',
  LIQUIDACION: 'Liquidación',
};

const TIPO_CAMBIO_COLOR: Record<string, string> = {
  LIQUIDACION: 'bg-red-100 text-red-700',
  OFERTA: 'bg-green-100 text-green-700',
  OFERTA_ACTIVADA: 'bg-green-100 text-green-700',
  OFERTA_DESACTIVADA: 'bg-gray-100 text-gray-600',
  MASIVO: 'bg-purple-100 text-purple-700',
  AJUSTE_MASIVO: 'bg-purple-100 text-purple-700',
  COSTO: 'bg-amber-100 text-amber-700',
  COSTO_ACTUALIZADO: 'bg-amber-100 text-amber-700',
};

function Cambio({ label, anterior, nuevo }: { label: string; anterior?: number | null; nuevo?: number | null }) {
  if (nuevo == null && anterior == null) return null;
  if (anterior != null && nuevo != null && Number(anterior) === Number(nuevo)) return null;
  return (
    <span className="mr-3 whitespace-nowrap text-xs">
      <span className="text-gray-400">{label}:</span>{' '}
      {anterior != null && <span className="text-gray-400 line-through">S/ {Number(anterior).toFixed(2)}</span>}
      {anterior != null && ' → '}
      <span className="font-medium text-gray-800">{nuevo != null ? `S/ ${Number(nuevo).toFixed(2)}` : '—'}</span>
    </span>
  );
}

const selectClass = "rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF] bg-white";
const inputClass = "rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]";

export default function HistorialPreciosPage() {
  const { sedes } = useEmpresa();
  const [items, setItems] = useState<HistorialPrecioSede[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [sedeId, setSedeId] = useState('');
  const [tipoCambio, setTipoCambio] = useState('');
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (cursor?: string, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.getHistorialPreciosGlobal({
        limit: 50,
        cursor,
        sedeId: sedeId || undefined,
        tipoCambio: (tipoCambio || undefined) as TipoCambioPrecio | undefined,
        search: search || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setNextCursor(res.meta.nextCursor);
      setHasNext(res.meta.hasNext);
    } catch {
      setError('Error al cargar el historial de precios');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, tipoCambio, search, fechaInicio, fechaFin]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 400);
  };

  const handleExport = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Para exportar selecciona fecha inicio y fin (rango máximo: 3 meses)');
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const blob = await stockService.exportHistorialPrecios(fechaInicio, fechaFin, sedeId || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial-precios_${fechaInicio}_${fechaFin}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Error al exportar (verifica que el rango no supere 3 meses)');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial de Precios</h1>
          <p className="text-sm text-gray-500">Auditoría de cambios de precios por sede</p>
        </div>
        <button onClick={handleExport} disabled={isExporting}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {isExporting ? 'Exportando...' : '⬇ Exportar Excel'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputClass} w-56`} placeholder="Buscar producto..." onChange={e => handleSearch(e.target.value)} />
        <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
          <option value="">Todas las sedes</option>
          {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className={selectClass} value={tipoCambio} onChange={e => setTipoCambio(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_CAMBIO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className={inputClass} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} title="Desde" />
        <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} title="Hasta" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-400">Sin cambios de precio registrados</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Sede</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Cambios</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((h) => (
                  <tr key={h.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {new Date(h.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}{' '}
                        {new Date(h.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {h.productoStock?.variante?.nombre ?? h.productoStock?.producto?.nombre ?? '—'}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {h.productoStock?.variante?.sku ?? h.productoStock?.producto?.codigoEmpresa ?? ''}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-gray-500">{h.sede?.nombre ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TIPO_CAMBIO_COLOR[h.tipoCambio] ?? 'bg-blue-100 text-blue-700'}`}>
                        {TIPO_CAMBIO_LABEL[h.tipoCambio] ?? h.tipoCambio}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap">
                        <Cambio label="Precio" anterior={h.precioAnterior} nuevo={h.precioNuevo} />
                        <Cambio label="Costo" anterior={h.precioCostoAnterior} nuevo={h.precioCostoNuevo} />
                        <Cambio label="Oferta" anterior={h.precioOfertaAnterior} nuevo={h.precioOfertaNuevo} />
                      </div>
                      {h.razon && <p className="mt-0.5 text-[11px] italic text-gray-400">{h.razon}</p>}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-gray-500">
                        {h.usuario?.persona ? `${h.usuario.persona.nombres ?? ''} ${h.usuario.persona.apellidos ?? ''}`.trim() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasNext && nextCursor && (
            <div className="flex justify-center">
              <button onClick={() => fetch(nextCursor, true)} disabled={isLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {isLoading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
