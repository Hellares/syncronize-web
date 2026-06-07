'use client';

import { useState, useCallback, useEffect } from 'react';
import * as stockService from '@/features/stock/services/stock-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

/* Los shapes del backend tienen claves con fallback (valorGlobal|valorTotal, etc.) — render defensivo */
/* eslint-disable @typescript-eslint/no-explicit-any */

const TABS = [
  { key: 'valorizacion', label: '💰 Valorización' },
  { key: 'rotacion', label: '🔄 Rotación' },
  { key: 'reorden', label: '📥 Sugerencias de Reorden' },
] as const;

const num = (v: unknown): number => (v == null ? 0 : Number(v));

export default function ReportesInventarioPage() {
  const { sedes } = useEmpresa();
  const [tab, setTab] = useState<typeof TABS[number]['key']>('valorizacion');
  const [sedeId, setSedeId] = useState('');
  const [dias, setDias] = useState(90);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const filtros = { sedeId: sedeId || undefined, dias: tab === 'rotacion' ? dias : undefined };
      const res = tab === 'valorizacion'
        ? await stockService.getReporteValorizacion(filtros)
        : tab === 'rotacion'
          ? await stockService.getReporteRotacion(filtros)
          : await stockService.getReporteSugerencias(filtros);
      setData(res);
    } catch {
      setError('Error al cargar el reporte');
    } finally {
      setIsLoading(false);
    }
  }, [tab, sedeId, dias]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes de Inventario</h1>
          <p className="text-sm text-gray-500">Valorización, rotación y reposición</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'rotacion' && (
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
              {[30, 60, 90].map(d => (
                <button key={d} onClick={() => setDias(d)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${dias === d ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500'}`}>
                  {d}d
                </button>
              ))}
            </div>
          )}
          {sedes.filter(s => s.isActive).length > 1 && (
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
              <option value="">Todas las sedes</option>
              {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${tab === t.key ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : !data ? null : tab === 'valorizacion' ? (
        <Valorizacion data={data} />
      ) : tab === 'rotacion' ? (
        <Rotacion data={data} />
      ) : (
        <Reorden data={data} />
      )}
    </div>
  );
}

function Valorizacion({ data }: { data: any }) {
  const valorTotal = num(data.valorGlobal ?? data.valorTotal);
  const stockTotal = num(data.stockGlobal ?? data.stockTotal);
  const porSede: any[] = data.porSede ?? [];
  const top: any[] = data.topProductos ?? [];
  // Conteo real de productos: suma de porSede (el totalSedes raíz es nº de sedes)
  const totalProductos = porSede.reduce((acc, s) => acc + num(s.totalProductos), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">S/ {valorTotal.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400">Valor total (al costo)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalProductos.toLocaleString('es-PE')}</p>
          <p className="text-[10px] text-gray-400">Registros de stock</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center" title="Suma de unidades base: los insumos cuentan en su unidad mínima (gramos, centímetros, etc.), no en presentaciones">
          <p className="text-2xl font-bold text-gray-900">{stockTotal.toLocaleString('es-PE')}</p>
          <p className="text-[10px] text-gray-400">Unidades base en stock ⓘ</p>
          <p className="text-[9px] text-gray-300">mezcla g / cm / und</p>
        </div>
      </div>

      {porSede.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">Por sede</p>
          <div className="space-y-1">
            {porSede.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                <span className="text-gray-600">{s.sedeNombre ?? s.nombre ?? s.sedeId}</span>
                <span className="font-medium text-gray-800">
                  S/ {num(s.valorTotal ?? s.valor).toFixed(2)}
                  <span className="text-gray-400"> · {num(s.stockTotal ?? s.stock).toLocaleString('es-PE')} unid. base · {num(s.totalProductos)} prod.</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Top productos por valor</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Costo/u</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {top.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.productoNombre ?? p.nombre ?? '—'}</p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {p.codigoProducto ?? p.codigo ?? ''}{p.sedeNombre ? ` · ${p.sedeNombre}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{num(p.stock ?? p.stockActual)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">S/ {num(p.costo ?? p.precioCosto).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">S/ {num(p.valorTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const CLASIF_COLOR: Record<string, string> = {
  ALTA: 'bg-green-100 text-green-700',
  MEDIA: 'bg-blue-100 text-blue-700',
  BAJA: 'bg-amber-100 text-amber-700',
  SIN_MOVIMIENTO: 'bg-red-100 text-red-700',
};

function Rotacion({ data }: { data: any }) {
  const [filtro, setFiltro] = useState('');
  const resumen = data.resumen ?? {};
  const productos: any[] = (data.productos ?? []).filter((p: any) => !filtro || p.clasificacion === filtro);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['ALTA', 'Alta rotación', resumen.altaRotacion], ['MEDIA', 'Media', resumen.mediaRotacion], ['BAJA', 'Baja', resumen.bajaRotacion], ['SIN_MOVIMIENTO', 'Sin movimiento', resumen.sinMovimiento]].map(([key, label, val]) => (
          <button key={key as string} onClick={() => setFiltro(filtro === key ? '' : key as string)}
            className={`rounded-xl border p-3 text-center transition-colors ${filtro === key ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            <p className="text-xl font-bold text-gray-900">{num(val)}</p>
            <p className="text-[10px] text-gray-400">{label as string}</p>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Clasificación</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Vendidas (período)</th>
              <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Rotación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {productos.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.productoNombre ?? p.nombre ?? '—'}</p>
                  <p className="font-mono text-[10px] text-gray-400">
                    {p.codigoProducto ?? p.codigo ?? ''}{p.sedeNombre ? ` · ${p.sedeNombre}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CLASIF_COLOR[p.clasificacion] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.clasificacion === 'SIN_MOVIMIENTO' ? 'Sin movimiento' : p.clasificacion}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{num(p.ventasUltimoPeriodo ?? p.unidadesVendidas)}</td>
                <td className="hidden px-4 py-3 text-right text-xs text-gray-500 md:table-cell">
                  {p.rotacionPorcentaje != null ? `${num(p.rotacionPorcentaje).toFixed(1)}%` : p.rotacionIndex != null ? num(p.rotacionIndex).toFixed(2) : '—'}
                  {p.diasSinMovimiento != null && num(p.diasSinMovimiento) > 0 && <span className="ml-1 text-red-400">({p.diasSinMovimiento}d sin mov.)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reorden({ data }: { data: any }) {
  const items: any[] = Array.isArray(data) ? data : data.items ?? [];
  const valorTotal = items.reduce((acc, s) => acc + num(s.valorEstimado), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{items.length}</p>
          <p className="text-[10px] text-gray-400">Productos bajo mínimo</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">S/ {valorTotal.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400">Inversión estimada</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center"><p className="text-3xl mb-2">✅</p><p className="text-gray-400">Nada por reponer</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Sede</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Stock / Mín</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Sugerido</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Valor est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((s, i) => {
                const urgencia = num(s.stockActual) <= 0 ? 'text-red-600' : num(s.stockActual) < num(s.stockMinimo) / 2 ? 'text-orange-600' : 'text-amber-600';
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.productoNombre ?? s.nombre ?? '—'}</p>
                      <p className="font-mono text-[10px] text-gray-400">{s.codigoProducto ?? s.codigo ?? ''}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell"><span className="text-xs text-gray-500">{s.sedeNombre ?? '—'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${urgencia}`}>{num(s.stockActual)}</span>
                      <span className="text-xs text-gray-400"> / {num(s.stockMinimo)}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="font-medium text-[#437EFF]">+{num(s.cantidadSugerida)}</span></td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">S/ {num(s.valorEstimado).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
