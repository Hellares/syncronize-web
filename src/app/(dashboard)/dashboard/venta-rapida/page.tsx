'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';
import type { VentaItem, Venta } from '@/core/types/venta';
import { recalcularPorNiveles, calcularLinea } from '@/core/types/venta';
import * as productoService from '@/features/producto/services/producto-service';
import * as precioNivelService from '@/features/producto/services/precio-nivel-service';
import * as cajaService from '@/features/caja/services/caja-service';
import CobroPanel from '@/features/venta/components/CobroPanel';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function genKey() { return Math.random().toString(36).slice(2, 10); }

export default function VentaRapidaPage() {
  const { sedes } = useEmpresa();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const sedeId = defaultSede?.id ?? '';

  const [mode, setMode] = useState<'carrito' | 'cobro'>('carrito');
  const [items, setItems] = useState<VentaItem[]>([]);
  const [cajaOk, setCajaOk] = useState<boolean | null>(null);

  // Catálogo
  const [query, setQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [variantePicker, setVariantePicker] = useState<Producto | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialogs carrito
  const [descLineaTarget, setDescLineaTarget] = useState<VentaItem | null>(null);
  const [descGlobalOpen, setDescGlobalOpen] = useState(false);
  const [info, setInfo] = useState('');

  // --- Guard de caja (paridad caja_guard Flutter) ---
  useEffect(() => {
    cajaService.getCajaActiva()
      .then(c => setCajaOk(!!c?.id))
      .catch((err) => {
        if (err instanceof AxiosError && err.response?.status === 404) setCajaOk(false);
        else setCajaOk(false);
      });
  }, []);

  // --- Catálogo: búsqueda (vendibles: sin insumos, activos) ---
  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productoService.getProductos({
          page: 1, limit: 12, search: q || undefined,
          sedeId: sedeId || undefined, isActive: true, esInsumo: false,
        });
        setProductos(res.data);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
  }, [sedeId]);

  // Carga inicial del catálogo
  useEffect(() => { search(''); }, [search]);

  const stockDeSede = useCallback((stocks?: StockPorSedeInfo[]): StockPorSedeInfo | null => {
    if (!stocks?.length) return null;
    return stocks.find(s => s.sedeId === sedeId) ?? stocks[0];
  }, [sedeId]);

  // --- Agregar al carrito (con niveles async, paridad cubit.agregarProducto) ---
  const addItem = useCallback(async (p: Producto, varianteId?: string, varianteNombre?: string) => {
    const stocks = varianteId
      ? p.variantes?.find(v => v.id === varianteId)?.stocksPorSede
      : p.stocksPorSede;
    const stock = stockDeSede(stocks);
    const precioBase = stock ? Number(infoPrecioEfectivo(stock) ?? stock.precio ?? 0) : 0;
    if (precioBase <= 0) { setInfo(`"${p.nombre}" no tiene precio configurado en esta sede`); return; }

    // Gotcha del proyecto: buscar en carrito SIEMPRE incluyendo varianteId
    const idx = items.findIndex(it => it.productoId === p.id && (it.varianteId ?? null) === (varianteId ?? null));
    if (idx >= 0) {
      setItems(prev => prev.map((it, i) => i === idx ? recalcularPorNiveles(it, it.cantidad + 1) : it));
      return;
    }

    const key = genKey();
    const nuevo: VentaItem = {
      key,
      productoId: p.id,
      varianteId,
      descripcion: varianteNombre ? `${p.nombre} - ${varianteNombre}` : p.nombre,
      cantidad: 1,
      precioBase,
      precioUnitario: precioBase,
      descuento: 0,
      porcentajeIGV: p.impuestoPorcentaje ?? 18,
      precioIncluyeIgv: stock?.precioIncluyeIgv ?? true,
      tipoAfectacion: p.tipoAfectacionIgv === 'EXONERADO' ? '20' : p.tipoAfectacionIgv === 'INAFECTO' ? '30' : '10',
      icbper: p.aplicaIcbper ? 0.5 : 0,
      niveles: [],
      enLiquidacion: stock ? infoLiquidacionActiva(stock) : false,
      precioCosto: stock?.precioCosto != null ? Number(stock.precioCosto) : null,
      stockDisponible: stock?.cantidad ?? null,
    };
    setItems(prev => [...prev, nuevo]);

    // Niveles async (cache-less v1: fetch directo y recalcular)
    try {
      const niveles = varianteId
        ? await precioNivelService.getNivelesByVariante(varianteId)
        : await precioNivelService.getNivelesByProducto(p.id);
      if (niveles.length) {
        setItems(prev => prev.map(it => it.key === key
          ? recalcularPorNiveles({ ...it, niveles }, it.cantidad)
          : it));
      }
    } catch { /* sin niveles */ }
  }, [items, stockDeSede]);

  const handlePick = async (p: Producto) => {
    if (p.tieneVariantes) {
      if (!p.variantes?.length) {
        try { setVariantePicker(await productoService.getProducto(p.id)); } catch { /* ignore */ }
      } else {
        setVariantePicker(p);
      }
      return;
    }
    addItem(p);
  };

  const cambiarCantidad = (key: string, nueva: number) => {
    if (nueva < 1) return;
    setItems(prev => prev.map(it => it.key === key ? recalcularPorNiveles(it, nueva) : it));
  };

  const quitarItem = (key: string) => setItems(prev => prev.filter(it => it.key !== key));

  // Descuento global %: setea descuento manual por línea (paridad aplicarDescuentoGlobal)
  const aplicarDescuentoGlobal = (pct: number) => {
    setItems(prev => prev.map(it => {
      const bruto = it.cantidad * it.precioUnitario;
      return { ...it, descuento: Math.min(bruto, bruto * pct / 100) };
    }));
    setDescGlobalOpen(false);
  };

  const totales = useMemo(() => items.reduce((acc, it) => {
    const c = calcularLinea(it);
    acc.subtotal += c.subtotal;
    acc.igv += c.igv;
    acc.icbper += c.icbperTotal;
    acc.total += c.total;
    acc.descuento += it.descuento;
    return acc;
  }, { subtotal: 0, igv: 0, icbper: 0, total: 0, descuento: 0 }), [items]);

  const handleVentaOk = (venta: Venta) => {
    setItems([]);
    setMode('carrito');
    setInfo(`✓ Venta ${venta.codigo ?? ''} registrada — el movimiento ya está en tu caja`);
  };

  // --- Guard: sin caja ---
  if (cajaOk === false) {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl mb-3">💵</p>
        <h1 className="text-lg font-bold text-gray-900">Necesitas una caja abierta</h1>
        <p className="mt-1 text-sm text-gray-500">La Venta Rápida registra los cobros en tu caja.</p>
        <Link href="/dashboard/caja" className="mt-4 inline-block rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570]">
          Abrir Caja
        </Link>
      </div>
    );
  }

  if (cajaOk === null) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  // --- Modo cobro ---
  if (mode === 'cobro') {
    return (
      <CobroPanel
        items={items}
        setItems={setItems}
        sedeId={sedeId}
        total={totales.total}
        onBack={() => setMode('carrito')}
        onSuccess={handleVentaOk}
      />
    );
  }

  // --- Modo carrito ---
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🛒 Venta Rápida</h1>
          <p className="text-sm text-gray-500">{defaultSede?.nombre ?? ''}</p>
        </div>
        {info && <p className="text-xs text-green-600">{info}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* === Catálogo === */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <input className={inputClass} value={query} onChange={e => search(e.target.value)}
              placeholder="Buscar producto por nombre, código o SKU..." />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[34rem] overflow-y-auto pr-1">
            {productos.map(p => {
              const stock = stockDeSede(p.stocksPorSede);
              const precio = p.tieneVariantes ? null : stock ? infoPrecioEfectivo(stock) : null;
              const enLiq = stock ? infoLiquidacionActiva(stock) : false;
              return (
                <button key={p.id} onClick={() => handlePick(p)}
                  className="rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md hover:border-[#437EFF]/40">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 min-h-[2.5rem]">{p.nombre}</p>
                  <div className="mt-1.5 flex items-end justify-between">
                    {p.tieneVariantes ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Variantes →</span>
                    ) : (
                      <div>
                        <p className={`text-sm font-bold ${enLiq ? 'text-red-600' : 'text-gray-900'}`}>
                          {precio != null ? `S/ ${fmt(Number(precio))}` : 'Sin precio'}
                        </p>
                        {enLiq && <span className="text-[9px] font-bold text-red-500">LIQUIDACIÓN</span>}
                      </div>
                    )}
                    <span className={`text-[10px] ${(stock?.cantidad ?? 0) <= 0 && !p.tieneVariantes ? 'text-red-400' : 'text-gray-400'}`}>
                      {p.tieneVariantes ? '' : `Stock ${stock?.cantidad ?? 0}`}
                    </span>
                  </div>
                </button>
              );
            })}
            {!searching && productos.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-gray-400">Sin productos</p>
            )}
          </div>
        </div>

        {/* === Carrito === */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Carrito ({items.length})</p>
              {items.length > 0 && (
                <button onClick={() => setDescGlobalOpen(true)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50">
                  % Desc. global
                </button>
              )}
            </div>
            <div className="max-h-[24rem] divide-y divide-gray-50 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-400">Toca un producto para agregarlo</p>
              ) : items.map(it => {
                const c = calcularLinea(it);
                return (
                  <div key={it.key} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">{it.descripcion}</p>
                      <button onClick={() => quitarItem(it.key)} className="text-gray-300 hover:text-red-500">✕</button>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center rounded-lg border border-gray-200">
                          <button onClick={() => cambiarCantidad(it.key, it.cantidad - 1)} className="px-2 text-gray-400 hover:text-gray-700">−</button>
                          <span className="w-7 text-center text-xs font-medium">{it.cantidad}</span>
                          <button onClick={() => cambiarCantidad(it.key, it.cantidad + 1)} className="px-2 text-gray-400 hover:text-gray-700">+</button>
                        </div>
                        <button onClick={() => setDescLineaTarget(it)} title="Descuento de línea"
                          className={`rounded px-1.5 py-0.5 text-[10px] ${it.descuento > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'text-gray-400 hover:bg-gray-100'}`}>
                          {it.descuento > 0 ? `−S/ ${fmt(it.descuento)}` : '% desc'}
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">S/ {fmt(c.total)}</p>
                        <p className="text-[9px] text-gray-400">
                          S/ {fmt(it.precioUnitario)} c/u
                          {it.nivelAplicado && <span className="ml-1 rounded bg-blue-100 px-1 text-blue-700">{it.nivelAplicado}</span>}
                          {it.enLiquidacion && <span className="ml-1 rounded bg-red-100 px-1 font-bold text-red-600">LIQ</span>}
                        </p>
                      </div>
                    </div>
                    {(it.stockDisponible ?? 99999) < it.cantidad && (
                      <p className="text-[9px] text-red-500">⚠ Stock disponible: {it.stockDisponible}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Totales */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 text-xs space-y-0.5">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>S/ {fmt(totales.subtotal)}</span></div>
                {totales.descuento > 0 && <div className="flex justify-between text-amber-600"><span>Descuentos</span><span>−S/ {fmt(totales.descuento)}</span></div>}
                <div className="flex justify-between text-gray-500"><span>IGV</span><span>S/ {fmt(totales.igv)}</span></div>
                {totales.icbper > 0 && <div className="flex justify-between text-gray-500"><span>ICBPER</span><span>S/ {fmt(totales.icbper)}</span></div>}
                <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-bold text-gray-900">
                  <span>Total</span><span>S/ {fmt(totales.total)}</span>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setMode('cobro')} disabled={items.length === 0}
            className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50">
            COBRAR S/ {fmt(totales.total)}
          </button>
        </div>
      </div>

      {/* Picker de variantes */}
      {variantePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVariantePicker(null)}>
          <div className="w-full max-w-md max-h-[75vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900">{variantePicker.nombre}</h3>
            <div className="mt-3 space-y-2">
              {(variantePicker.variantes ?? []).filter(v => v.isActive !== false).map(v => {
                const st = stockDeSede(v.stocksPorSede);
                const precio = st ? infoPrecioEfectivo(st) : null;
                return (
                  <button key={v.id} onClick={() => { addItem(variantePicker, v.id, v.nombre); setVariantePicker(null); }}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-[#437EFF] hover:bg-[#437EFF]/5">
                    <span className="text-sm font-medium text-gray-900">{v.nombre}</span>
                    <span className="text-xs text-gray-500">
                      {precio != null ? `S/ ${fmt(Number(precio))}` : 'Sin precio'} · stock {st?.cantidad ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setVariantePicker(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Descuento de línea */}
      {descLineaTarget && (
        <DescuentoLineaDialog item={descLineaTarget}
          onApply={(monto) => {
            setItems(prev => prev.map(it => it.key === descLineaTarget.key
              ? { ...it, descuento: Math.min(monto, it.cantidad * it.precioUnitario) }
              : it));
            setDescLineaTarget(null);
          }}
          onClose={() => setDescLineaTarget(null)} />
      )}

      {/* Descuento global */}
      {descGlobalOpen && (
        <DescuentoGlobalDialog onApply={aplicarDescuentoGlobal} onClose={() => setDescGlobalOpen(false)} />
      )}
    </div>
  );
}

/* --- Dialogs de descuento --- */
function DescuentoLineaDialog({ item, onApply, onClose }: { item: VentaItem; onApply: (monto: number) => void; onClose: () => void }) {
  const [modo, setModo] = useState<'monto' | 'pct'>('monto');
  const [valor, setValor] = useState(item.descuento > 0 ? String(item.descuento) : '');
  const bruto = item.cantidad * item.precioUnitario;

  const aplicar = () => {
    const v = parseFloat(valor) || 0;
    onApply(modo === 'monto' ? v : bruto * v / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Descuento de línea</h3>
        <p className="mt-0.5 text-xs text-gray-500 truncate">{item.descripcion} · línea S/ {fmt(bruto)}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setModo('monto')} className={`flex-1 rounded-lg border p-1.5 text-xs ${modo === 'monto' ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-bold' : 'border-gray-200 text-gray-500'}`}>S/ Monto</button>
          <button onClick={() => setModo('pct')} className={`flex-1 rounded-lg border p-1.5 text-xs ${modo === 'pct' ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-bold' : 'border-gray-200 text-gray-500'}`}>% Porcentaje</button>
        </div>
        <input className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:border-[#437EFF]"
          type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} autoFocus
          placeholder={modo === 'monto' ? '0.00' : '0 %'} />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onApply(0)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">Quitar desc.</button>
          <button onClick={aplicar} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Aplicar</button>
        </div>
      </div>
    </div>
  );
}

function DescuentoGlobalDialog({ onApply, onClose }: { onApply: (pct: number) => void; onClose: () => void }) {
  const [pct, setPct] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Descuento global</h3>
        <p className="mt-0.5 text-xs text-gray-500">Se aplica como descuento por línea a todo el carrito.</p>
        <input className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:border-[#437EFF]"
          type="number" step="0.5" min="0" max="100" value={pct} onChange={e => setPct(e.target.value)} autoFocus placeholder="% descuento" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onApply(0)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">Quitar</button>
          <button onClick={() => onApply(parseFloat(pct) || 0)} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Aplicar</button>
        </div>
      </div>
    </div>
  );
}
