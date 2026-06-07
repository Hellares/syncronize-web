'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Producto } from '@/core/types/producto';
import type { TrazabilidadProducto } from '@/core/types/bom';
import * as bomService from '@/features/producto/services/bom-service';
import * as productoService from '@/features/producto/services/producto-service';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

function fechaCorta(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Section({ title, count, children, defaultOpen = false }: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50">
        <span className="text-sm font-semibold text-gray-900">
          {title}{count != null && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{count}</span>}
        </span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </div>
  );
}

function TrazabilidadContent() {
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [productoId, setProductoId] = useState(searchParams.get('productoId') || '');
  const [varianteId, setVarianteId] = useState(searchParams.get('varianteId') || '');
  const [variantes, setVariantes] = useState<Array<{ id: string; nombre: string }>>([]);
  const [data, setData] = useState<TrazabilidadProducto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 12, search: value, isActive: true });
        setSearchResults(res.data);
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
  };

  const load = useCallback(async (pid: string, vid?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await bomService.getTrazabilidad(pid, vid || null);
      setData(res);
    } catch {
      setError('Error al cargar la trazabilidad del producto');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productoId) {
      load(productoId, varianteId || undefined);
      // Cargar variantes para el selector
      productoService.getProducto(productoId)
        .then(p => setVariantes((p.variantes ?? []).map(v => ({ id: v.id, nombre: v.nombre }))))
        .catch(() => setVariantes([]));
    }
  }, [productoId, varianteId, load]);

  const handleSelect = (p: Producto) => {
    setSearchQuery('');
    setSearchResults([]);
    setVarianteId('');
    setProductoId(p.id);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Trazabilidad / Ficha 360</h1>
        <p className="text-sm text-gray-500">Historia completa del producto: origen, consumo, costos y movimientos</p>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <input className={inputClass} value={searchQuery} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar producto (mín. 2 letras)..." />
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
            {searchResults.map(p => (
              <button key={p.id} onClick={() => handleSelect(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span className="font-medium text-gray-900">{p.nombre}</span>
                <span className="text-[10px] text-gray-400">{p.codigoEmpresa}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : !data ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">🔎</p>
          <p className="text-gray-400">Busca un producto para ver su trazabilidad completa</p>
        </div>
      ) : (
        <>
          {/* Cabecera del producto */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-gray-900">{data.producto.nombre}</p>
                <p className="font-mono text-xs text-gray-400">{data.producto.codigoEmpresa}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.producto.esInsumo && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Insumo</span>}
                  {data.producto.esFabricado && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Fabricado</span>}
                  {data.producto.tieneVariantes && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Con variantes</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {data.producto.tieneVariantes && variantes.length > 0 && (
                  <select value={varianteId} onChange={e => setVarianteId(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#437EFF]">
                    <option value="">Todas las variantes</option>
                    {variantes.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                  </select>
                )}
                <div className="text-right">
                  <p className="text-[10px] uppercase text-gray-400">Stock total</p>
                  <p className="text-xl font-bold text-gray-900">{data.stock.stockTotal} {data.producto.unidadMedidaSimbolo ?? ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-gray-400">Valorizado</p>
                  <p className="text-xl font-bold text-gray-900">S/ {Number(data.stock.valorizado).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock por sede */}
          <Section title="Stock por sede" count={data.stock.porSede.length} defaultOpen>
            <div className="space-y-1">
              {data.stock.porSede.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                  <span className="text-gray-600">{s.sedeNombre}{s.varianteNombre ? ` · ${s.varianteNombre}` : ''}</span>
                  <span className="font-medium text-gray-800">
                    {s.stockActual} unid.
                    {s.precioCosto != null && <span className="ml-2 text-gray-400">costo S/ {Number(s.precioCosto).toFixed(2)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Entradas: compras */}
          <Section title="📥 Entradas — Compras" count={data.compras.length}>
            <div className="space-y-1">
              {data.compras.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-mono text-[10px] text-gray-400">{c.compraCodigo}</span>
                    <span className="ml-2 text-gray-700">{c.proveedor}</span>
                    {c.varianteNombre && <span className="ml-1 text-[#437EFF]">({c.varianteNombre})</span>}
                  </div>
                  <span className="text-gray-500">+{c.cantidad} · {c.moneda === 'USD' ? '$' : 'S/'} {Number(c.total).toFixed(2)} · {fechaCorta(c.fecha)}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Fabricación: lotes producidos */}
          <Section title="🏭 Fabricación — Lotes producidos" count={data.fabricacion.lotesFabricados.length}>
            <div className="space-y-1">
              {data.fabricacion.lotesFabricados.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-[10px] text-gray-400">{l.numeroDocumento}</span>
                  <span className="text-gray-500">
                    +{l.cantidad}
                    {l.precioCostoUnitario != null && ` · S/ ${Number(l.precioCostoUnitario).toFixed(2)}/u`}
                    {' · '}{fechaCorta(l.fecha)}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Consumo como insumo */}
          <Section title="🧩 Consumido como insumo" count={data.fabricacion.insumosConsumidos.length}>
            <div className="space-y-1">
              {data.fabricacion.insumosConsumidos.map((x, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{x.insumo}</span>
                  <span className="text-gray-500">−{x.cantidad}{x.costo != null ? ` · S/ ${Number(x.costo).toFixed(2)}` : ''}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Usado en recetas */}
          <Section title="📐 Se usa como insumo en" count={data.fabricacion.usadoEnRecetas.length}>
            <div className="space-y-1">
              {data.fabricacion.usadoEnRecetas.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">
                    {r.productoFinalNombre}{r.varianteFinalNombre ? ` (${r.varianteFinalNombre})` : ''}
                    {r.componenteVarianteNombre && <span className="text-[#437EFF]"> · usa {r.componenteVarianteNombre}</span>}
                  </span>
                  <span className="text-gray-500">{r.cantidadPorUnidad}/unidad</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Salidas: ventas */}
          <Section title="📤 Salidas — Ventas" count={data.ventas.length}>
            <div className="space-y-1">
              {data.ventas.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-mono text-[10px] text-gray-400">{v.ventaCodigo}</span>
                    <span className="ml-2 text-gray-700">{v.cliente ?? '—'}</span>
                    {v.varianteNombre && <span className="ml-1 text-[#437EFF]">({v.varianteNombre})</span>}
                  </div>
                  <span className="text-gray-500">−{v.cantidad} · {v.moneda === 'USD' ? '$' : 'S/'} {Number(v.total).toFixed(2)} · {fechaCorta(v.fecha)}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Proveedores */}
          <Section title="🚚 Proveedores (histórico)" count={data.proveedores.length}>
            <div className="space-y-1">
              {data.proveedores.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{p.proveedor}</span>
                  <span className="text-gray-500">
                    {p.veces} compra{p.veces !== 1 ? 's' : ''} · {p.cantidadAcum} unid. · prom. S/ {Number(p.precioPromedio).toFixed(2)}
                    {p.ultimaCompra && ` · últ. ${fechaCorta(p.ultimaCompra)}`}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Lotes (insumos con vencimiento) */}
          <Section title="📦 Lotes de compra" count={data.lotes.length}>
            <div className="space-y-1">
              {data.lotes.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-[10px] text-gray-400">{l.codigo}</span>
                  <span className="text-gray-500">
                    {l.cantidadActual}/{l.cantidadInicial}
                    {l.fechaVencimiento && ` · vence ${fechaCorta(l.fechaVencimiento)}`}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Devoluciones */}
          <Section title="↩ Devoluciones" count={data.devoluciones.length}>
            <div className="space-y-1">
              {data.devoluciones.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{d.codigo}{d.motivo ? ` · ${d.motivo}` : ''}</span>
                  <span className="text-gray-500">+{d.cantidad} · {fechaCorta(d.fecha)}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Transferencias */}
          <Section title="🔄 Transferencias entre sedes" count={data.transferencias.length}>
            <div className="space-y-1">
              {data.transferencias.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{t.origen} → {t.destino} <span className="font-mono text-[10px] text-gray-400">{t.codigo}</span></span>
                  <span className="text-gray-500">{t.cantidadEnviada ?? t.cantidadSolicitada ?? '—'} unid. · {t.estado} · {fechaCorta(t.fecha)}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Kardex consolidado */}
          <Section title="📒 Kardex consolidado (todas las sedes)" count={data.kardex.length}>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {data.kardex.map((k, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">
                    {k.tipo}{k.numeroDocumento ? <span className="ml-1 font-mono text-[10px] text-gray-400">{k.numeroDocumento}</span> : ''}
                    <span className="ml-1 text-gray-400">· {k.sedeNombre}</span>
                  </span>
                  <span className={`font-medium ${k.cantidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {k.cantidad >= 0 ? '+' : ''}{k.cantidad} · {fechaCorta(k.fecha)}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <div className="pb-2 text-center">
            <Link href={`/dashboard/productos/${data.producto.id}`} className="text-xs text-[#437EFF] hover:underline">
              Ver detalle del producto →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function TrazabilidadPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>}>
      <TrazabilidadContent />
    </Suspense>
  );
}
