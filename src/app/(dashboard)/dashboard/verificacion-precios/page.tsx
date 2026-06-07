'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  VerificacionPrecioItem,
  CampoPrecioVerificacion,
  ModoVerificacion,
  ComparacionPrecio,
} from '@/core/types/stock';
import * as stockService from '@/features/stock/services/stock-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const CAMPOS: { value: CampoPrecioVerificacion; label: string }[] = [
  { value: 'COSTO', label: 'Costo' },
  { value: 'PRECIO', label: 'Precio venta' },
  { value: 'OFERTA', label: 'Oferta' },
  { value: 'LIQUIDACION', label: 'Liquidación' },
];

const MODOS: { value: ModoVerificacion; label: string }[] = [
  { value: 'RANGO', label: 'Rango (min/max)' },
  { value: 'EXACTO', label: 'Valor exacto' },
  { value: 'SIN_VALOR', label: 'Sin valor (null)' },
];

const COMPARACIONES: { value: ComparacionPrecio | ''; label: string }[] = [
  { value: '', label: 'Sin comparación' },
  { value: 'PERDIDA', label: '🔴 Pérdida (costo > venta)' },
  { value: 'SIN_MARGEN', label: '🟠 Sin margen (costo = venta)' },
  { value: 'MARGEN_BAJO', label: '🟡 Margen bajo' },
  { value: 'SIN_COSTO', label: '⚪ Sin costo registrado' },
];

const selectClass = "rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF] bg-white";
const inputClass = "w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]";

function margen(item: VerificacionPrecioItem): number | null {
  if (item.precio == null || item.precioCosto == null || item.precioCosto === 0) return null;
  return ((item.precio - item.precioCosto) / item.precioCosto) * 100;
}

export default function VerificacionPreciosPage() {
  const { sedes } = useEmpresa();
  const [items, setItems] = useState<VerificacionPrecioItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limitAlcanzado, setLimitAlcanzado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);

  // Filtros
  const [sedeId, setSedeId] = useState('');
  const [campo, setCampo] = useState<CampoPrecioVerificacion>('COSTO');
  const [modo, setModo] = useState<ModoVerificacion>('RANGO');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [exacto, setExacto] = useState('');
  const [comparacion, setComparacion] = useState<ComparacionPrecio | ''>('');
  const [margenMinimo, setMargenMinimo] = useState('10');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [stockFiltro, setStockFiltro] = useState<'CON' | 'SIN' | 'AMBOS'>('AMBOS');
  const [soloActivos, setSoloActivos] = useState(true);

  useEffect(() => {
    catalogoService.getCategorias().then(setCategorias).catch(() => {});
    catalogoService.getMarcas().then(setMarcas).catch(() => {});
  }, []);

  const buildFiltros = useCallback(() => ({
    sedeId: sedeId || undefined,
    campo,
    modo,
    min: min ? parseFloat(min) : undefined,
    max: max ? parseFloat(max) : undefined,
    exacto: exacto ? parseFloat(exacto) : undefined,
    empresaCategoriaId: categoriaId || undefined,
    empresaMarcaId: marcaId || undefined,
    stock: stockFiltro,
    soloActivos,
    comparacion: comparacion || undefined,
    margenMinimo: comparacion === 'MARGEN_BAJO' && margenMinimo ? parseFloat(margenMinimo) : undefined,
  }), [sedeId, campo, modo, min, max, exacto, categoriaId, marcaId, stockFiltro, soloActivos, comparacion, margenMinimo]);

  const handleBuscar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockService.verificacionPrecios(buildFiltros());
      setItems(res.items);
      setTotal(res.total);
      setLimitAlcanzado(res.limitAlcanzado);
    } catch {
      setError('Error al verificar precios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await stockService.exportVerificacionPrecios(buildFiltros());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verificacion-precios.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verificación de Precios</h1>
          <p className="text-sm text-gray-500">Auditoría para localizar precios mal cargados o sin margen</p>
        </div>
        <button onClick={handleExport} disabled={isExporting || items.length === 0}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {isExporting ? 'Exportando...' : '⬇ Exportar Excel'}
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={comparacion} onChange={e => setComparacion(e.target.value as ComparacionPrecio | '')}>
            {COMPARACIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {comparacion === 'MARGEN_BAJO' && (
            <label className="flex items-center gap-1 text-xs text-gray-600">
              Margen mínimo % <input className={inputClass} type="number" min="0" value={margenMinimo} onChange={e => setMargenMinimo(e.target.value)} />
            </label>
          )}
          {!comparacion && (
            <>
              <select className={selectClass} value={campo} onChange={e => setCampo(e.target.value as CampoPrecioVerificacion)}>
                {CAMPOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select className={selectClass} value={modo} onChange={e => setModo(e.target.value as ModoVerificacion)}>
                {MODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {modo === 'RANGO' && (
                <>
                  <input className={inputClass} type="number" placeholder="Min" value={min} onChange={e => setMin(e.target.value)} />
                  <input className={inputClass} type="number" placeholder="Max" value={max} onChange={e => setMax(e.target.value)} />
                </>
              )}
              {modo === 'EXACTO' && (
                <input className={inputClass} type="number" placeholder="Valor" value={exacto} onChange={e => setExacto(e.target.value)} />
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select className={selectClass} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={selectClass} value={marcaId} onChange={e => setMarcaId(e.target.value)}>
            <option value="">Todas las marcas</option>
            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <select className={selectClass} value={stockFiltro} onChange={e => setStockFiltro(e.target.value as 'CON' | 'SIN' | 'AMBOS')}>
            <option value="AMBOS">Con y sin stock</option>
            <option value="CON">Con stock</option>
            <option value="SIN">Sin stock</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF]" />
            Solo activos
          </label>
          <button onClick={handleBuscar} disabled={isLoading}
            className="ml-auto rounded-lg bg-[#004A94] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {limitAlcanzado && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-700">⚠ Se alcanzó el límite de resultados — puede haber más filas. Afina los filtros o usa el export.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Sede</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Costo</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Oferta</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Liquidación</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const m = margen(item);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.nombre}</p>
                      <p className="font-mono text-[10px] text-gray-400">{item.codigoEmpresa ?? ''}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell"><span className="text-xs text-gray-500">{item.sedeNombre}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-xs text-gray-600">{item.stockActual}</span></td>
                    <td className="px-4 py-3 text-right">{item.precio != null ? `S/ ${item.precio.toFixed(2)}` : <span className="text-xs text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-right">{item.precioCosto != null ? `S/ ${item.precioCosto.toFixed(2)}` : <span className="text-xs text-red-400">sin costo</span>}</td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">{item.precioOferta != null ? `S/ ${item.precioOferta.toFixed(2)}` : '—'}</td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">{item.precioLiquidacion != null ? <span className="text-red-600">S/ {item.precioLiquidacion.toFixed(2)}</span> : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {m != null ? (
                        <span className={`font-medium ${m < 0 ? 'text-red-600' : m === 0 ? 'text-amber-600' : m < 10 ? 'text-amber-500' : 'text-green-600'}`}>
                          {m.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-500">{total} resultados</p>
          </div>
        </div>
      )}
    </div>
  );
}
