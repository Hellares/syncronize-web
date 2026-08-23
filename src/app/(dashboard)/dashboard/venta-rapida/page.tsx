'use client';

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';
import type { VentaItem, Venta } from '@/core/types/venta';
import { recalcularPorNiveles, calcularLinea } from '@/core/types/venta';
import type { OrdenCobrable } from '@/core/types/orden-servicio';
import { costoNetoOrden, ESTADOS_OS_COBRABLES, nombreClienteOrden, TIPO_SERVICIO_LABEL } from '@/core/types/orden-servicio';
import * as productoService from '@/features/producto/services/producto-service';
import * as precioNivelService from '@/features/producto/services/precio-nivel-service';
import * as cajaService from '@/features/caja/services/caja-service';
import * as comboService from '@/features/producto/services/combo-service';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';
import CobroPanel from '@/features/venta/components/CobroPanel';
import VarianteSelector from '@/features/producto/components/VarianteSelector';
import ProductCard, { PRODUCT_CARD_SHELL } from '@/features/producto/components/ProductCard';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';

interface OrdenClienteCtx { clienteId?: string; clienteEmpresaId?: string; nombre: string; documento: string }

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function genKey() { return Math.random().toString(36).slice(2, 10); }

function VentaRapidaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenServicioParam = searchParams.get('ordenServicioId');
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const sedeId = defaultSede?.id ?? '';

  const [mode, setMode] = useState<'carrito' | 'cobro'>('carrito');
  const [items, setItems] = useState<VentaItem[]>([]);
  const [cajaOk, setCajaOk] = useState<boolean | null>(null);

  // Cobro de órdenes de servicio
  const [ordenCliente, setOrdenCliente] = useState<OrdenClienteCtx | null>(null);
  const [cobrablesOpen, setCobrablesOpen] = useState(false);

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

  // Autorización de descuentos (paridad Flutter: sin canManageDiscounts un admin debe autorizar)
  const [authDescuento, setAuthDescuento] = useState<null | (() => void)>(null);
  const conAutorizacionDescuento = useCallback((aplicar: () => void) => {
    if (permissions.canManageDiscounts) { aplicar(); return; }
    setAuthDescuento(() => aplicar);
  }, [permissions.canManageDiscounts]);

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
          page: 1, limit: 30, search: q || undefined,
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
  const addItem = useCallback(async (p: Producto, varianteId?: string, varianteNombre?: string, cantidad: number = 1) => {
    const stocks = varianteId
      ? p.variantes?.find(v => v.id === varianteId)?.stocksPorSede
      : p.stocksPorSede;
    const stock = stockDeSede(stocks);
    const precioBase = stock ? Number(infoPrecioEfectivo(stock) ?? stock.precio ?? 0) : 0;
    if (precioBase <= 0) { setInfo(`"${p.nombre}" no tiene precio configurado en esta sede`); return; }

    // Gotcha del proyecto: buscar en carrito SIEMPRE incluyendo varianteId
    const idx = items.findIndex(it => it.productoId === p.id && (it.varianteId ?? null) === (varianteId ?? null));
    if (idx >= 0) {
      setItems(prev => prev.map((it, i) => i === idx ? recalcularPorNiveles(it, it.cantidad + cantidad) : it));
      return;
    }

    const key = genKey();
    const nuevo: VentaItem = {
      key,
      productoId: p.id,
      varianteId,
      descripcion: varianteNombre ? `${p.nombre} - ${varianteNombre}` : p.nombre,
      cantidad,
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

  // --- Combos: se EXPANDEN en componentes con prorrateo del descuento (paridad _expandirYAgregarCombo) ---
  const expandirCombo = useCallback(async (p: Producto) => {
    try {
      const combo = await comboService.getComboCompleto(p.id, sedeId);
      if (combo.stockDisponible <= 0) {
        setInfo(`"${p.nombre}" sin stock para armar (componentes insuficientes)`);
        return;
      }
      // Líneas a precio del componente (override precioEnCombo > precio regular)
      const lineas = combo.componentes.map(c => ({
        productoId: c.componenteProductoId ?? undefined,
        varianteId: c.componenteVarianteId ?? undefined,
        descripcion: c.componenteInfo?.nombre ?? 'Componente',
        cantidad: Number(c.cantidad),
        precioUnit: Number(c.precioEnCombo ?? c.componenteInfo?.precio ?? 0),
      }));
      const sumaLineas = lineas.reduce((a, l) => a + l.precioUnit * l.cantidad, 0);
      // Precio objetivo del combo: oferta activa > FIJO/C_DESC (precio) > CALCULADO (suma)
      const objetivo = combo.ofertaActiva && combo.precioOferta != null
        ? Number(combo.precioOferta)
        : combo.tipoPrecioCombo === 'CALCULADO'
          ? Number(combo.precioCalculado ?? sumaLineas)
          : Number(combo.precio ?? sumaLineas);
      const descTotal = Math.max(0, sumaLineas - objetivo);

      // Prorrateo proporcional; el último compensa centavos (paridad combo_prorrateo)
      let acumulado = 0;
      const nuevos: VentaItem[] = lineas.map((l, i) => {
        const bruto = l.precioUnit * l.cantidad;
        let descLinea = sumaLineas > 0 ? Math.round((descTotal * bruto / sumaLineas) * 100) / 100 : 0;
        if (i === lineas.length - 1) descLinea = Math.round((descTotal - acumulado) * 100) / 100;
        acumulado += descLinea;
        return {
          key: genKey(),
          productoId: l.productoId,
          varianteId: l.varianteId,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precioBase: l.precioUnit,
          precioUnitario: l.precioUnit,
          descuento: Math.min(descLinea, bruto),
          porcentajeIGV: p.impuestoPorcentaje ?? 18,
          precioIncluyeIgv: true,
          tipoAfectacion: '10',
          icbper: 0,
          origenComboId: p.id,
          origenComboNombre: p.nombre,
          niveles: [], // los combos no aplican niveles por mayor (paridad Flutter)
          enLiquidacion: false,
          precioCosto: null,
          stockDisponible: null,
        };
      });
      setItems(prev => [...prev, ...nuevos]);
      setInfo(`Combo "${p.nombre}" agregado (${nuevos.length} componentes, total S/ ${fmt(objetivo)})`);
    } catch {
      setInfo(`No se pudo cargar el combo "${p.nombre}"`);
    }
  }, [sedeId]);

  const handlePick = async (p: Producto) => {
    if (p.esCombo) {
      expandirCombo(p);
      return;
    }
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

  const quitarItem = (key: string) => setItems(prev => {
    const next = prev.filter(it => it.key !== key);
    if (!next.some(it => it.esOrdenServicio)) setOrdenCliente(null);
    return next;
  });

  // --- Agregar orden de servicio al carrito (paridad agregarOrdenServicio) ---
  const agregarOrden = useCallback((o: OrdenCobrable) => {
    if (items.some(it => it.ordenServicioId === o.id)) { setInfo(`La orden ${o.codigo} ya está en el carrito`); return; }
    // Cliente de la orden (la orden manda; persona o empresa)
    const ctx: OrdenClienteCtx = o.clienteEmpresa
      ? { clienteEmpresaId: o.clienteEmpresa.clienteEmpresaId, nombre: o.clienteEmpresa.razonSocial, documento: o.clienteEmpresa.ruc ?? '' }
      : o.cliente
        ? { clienteId: o.cliente.clienteId, nombre: o.cliente.nombre, documento: o.cliente.numeroDocumento ?? '' }
        : { nombre: 'CLIENTES VARIOS', documento: '' };
    // Guard: todas las órdenes del carrito deben ser del mismo cliente
    const hayOtraOrden = items.some(it => it.esOrdenServicio);
    if (hayOtraOrden && ordenCliente &&
        (ordenCliente.clienteId !== ctx.clienteId || ordenCliente.clienteEmpresaId !== ctx.clienteEmpresaId)) {
      setInfo('Todas las órdenes de un mismo cobro deben ser del mismo cliente');
      return;
    }
    const costoNeto = costoNetoOrden(o); // costoTotal − descuento
    const nuevo: VentaItem = {
      key: genKey(),
      descripcion: `Servicio ${o.codigo}${o.tipoEquipo ? ` · ${o.tipoEquipo}` : ''}`,
      cantidad: 1,
      precioBase: costoNeto,
      precioUnitario: costoNeto,
      descuento: 0,
      porcentajeIGV: 18,
      precioIncluyeIgv: true,
      tipoAfectacion: '10',
      icbper: 0,
      ordenServicioId: o.id,
      esOrdenServicio: true,
      adelantoOrden: Number(o.adelanto ?? 0),
      niveles: [],
      enLiquidacion: false,
      precioCosto: null,
      stockDisponible: null,
    };
    setItems(prev => [...prev, nuevo]);
    setOrdenCliente(ctx);
    setCobrablesOpen(false);
    setInfo(`Orden ${o.codigo} agregada (saldo hoy S/ ${fmt(o.saldoPendiente)})`);
  }, [items, ordenCliente]);

  // Precarga desde ?ordenServicioId (botón Cobrar del detalle de OS)
  useEffect(() => {
    if (!ordenServicioParam) return;
    let cancel = false;
    osService.getOrden(ordenServicioParam).then(orden => {
      if (cancel) return;
      if (!ESTADOS_OS_COBRABLES.includes(orden.estado)) { setInfo(`La orden ${orden.codigo} no está en estado cobrable`); return; }
      const costoTotal = Number(orden.costoTotal ?? 0);
      if (costoTotal <= 0) { setInfo(`La orden ${orden.codigo} no tiene costo definido`); return; }
      const adelanto = Number(orden.adelanto ?? 0);
      const descuento = Number(orden.descuento ?? 0);
      agregarOrden({
        id: orden.id, codigo: orden.codigo, estado: orden.estado, tipoServicio: orden.tipoServicio,
        servicioNombre: orden.servicio?.nombre ?? null, tipoEquipo: orden.tipoEquipo ?? null,
        marcaEquipo: orden.marcaEquipo ?? null, numeroSerie: orden.numeroSerie ?? null,
        costoTotal, adelanto, descuento, saldoPendiente: Math.max(0, costoTotal - adelanto - descuento),
        cliente: orden.cliente?.persona ? { clienteId: orden.clienteId ?? '', nombre: nombreClienteOrden(orden), numeroDocumento: orden.cliente.persona.dni ?? null, telefono: orden.cliente.persona.telefono ?? null, email: orden.cliente.persona.email ?? null } : null,
        clienteEmpresa: orden.clienteEmpresa ? { clienteEmpresaId: orden.clienteEmpresaId ?? '', razonSocial: orden.clienteEmpresa.razonSocial ?? '', ruc: orden.clienteEmpresa.ruc ?? orden.clienteEmpresa.numeroDocumento ?? null, email: orden.clienteEmpresa.email ?? null, direccion: orden.clienteEmpresa.direccion ?? null } : null,
      });
    }).catch(() => setInfo('No se pudo cargar la orden a cobrar'));
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenServicioParam]);

  const adelantoAplicado = useMemo(
    () => Math.round(items.filter(it => it.esOrdenServicio).reduce((s, it) => s + Number(it.adelantoOrden ?? 0), 0) * 100) / 100,
    [items],
  );

  // Descuento global %: setea descuento manual por línea (paridad aplicarDescuentoGlobal)
  const aplicarDescuentoGlobal = (pct: number) => {
    setDescGlobalOpen(false);
    const aplicar = () => setItems(prev => prev.map(it => {
      const bruto = it.cantidad * it.precioUnitario;
      return { ...it, descuento: Math.min(bruto, bruto * pct / 100) };
    }));
    if (pct > 0) conAutorizacionDescuento(aplicar); else aplicar();
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

  /** Lo que ya está en el carrito por variante: el selector lo descuenta del
   *  stock que muestra, porque ya no se cierra al agregar. */
  const cantidadesPorVariante = useMemo(() => {
    const out: Record<string, number> = {};
    for (const it of items) {
      if (!it.varianteId) continue;
      out[it.varianteId] = (out[it.varianteId] ?? 0) + it.cantidad;
    }
    return out;
  }, [items]);

  const handleVentaOk = (venta: Venta) => {
    setItems([]);
    setOrdenCliente(null);
    setMode('carrito');
    setInfo(`✓ Venta ${venta.codigo ?? ''} registrada`);
    // Paridad Flutter: abrir el ticket de la venta (imprimible)
    if (venta.id) router.push(`/dashboard/ventas/${venta.id}/ticket`);
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
        adelantoAplicado={adelantoAplicado}
        initialCliente={ordenCliente ?? undefined}
        onBack={() => setMode('carrito')}
        onSuccess={handleVentaOk}
      />
    );
  }

  // --- Modo carrito ---
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🛒 Venta Rápida</h1>
          <p className="text-sm text-gray-500">{defaultSede?.nombre ?? ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {info && <p className="text-xs text-green-600">{info}</p>}
          <button onClick={() => setCobrablesOpen(true)}
            className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">
            🛠 Cobrar orden
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* === Catálogo === */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <input className={inputClass} value={query} onChange={e => search(e.target.value)}
              placeholder="Buscar producto por nombre, código o SKU..." />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#437EFF]" /></div>}
          </div>
          {/* Máximo 6 columnas con respiro entre cards */}
          <div className="grid gap-y-2.5 gap-x-[15px] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[calc(100vh-15rem)] overflow-y-auto rounded-xl bg-[#f5f5f5] p-3 content-start">
            {productos.map(p => (
              <button key={p.id} onClick={() => handlePick(p)} className={PRODUCT_CARD_SHELL}>
                <ProductCard producto={p} sedeId={sedeId} accent="#437EFF" />
              </button>
            ))}
            {!searching && productos.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-gray-400">Sin productos</p>
            )}
          </div>
        </div>

        {/* === Carrito === */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-800">Carrito ({items.length})</p>
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
                  <div key={it.key} className={`px-3 py-2 ${it.esOrdenServicio ? 'bg-blue-50/40' : it.origenComboId ? 'bg-purple-50/40' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-[#004A94]">
                        {it.esOrdenServicio && <span className="mr-1 rounded bg-blue-100 px-1 text-[8px] font-bold text-blue-700">OS</span>}
                        {it.origenComboId && <span className="mr-1 rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">COMBO</span>}
                        {it.descripcion}
                      </p>
                      <button onClick={() => quitarItem(it.key)} className="text-gray-300 hover:text-red-500">✕</button>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {it.esOrdenServicio ? (
                        <span className="text-[10px] text-blue-600">
                          Servicio · comprobante por el total
                          {(it.adelantoOrden ?? 0) > 0 && <span className="text-gray-400"> · adelanto S/ {fmt(it.adelantoOrden ?? 0)}</span>}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center rounded-lg border border-gray-200">
                            <button onClick={() => cambiarCantidad(it.key, it.cantidad - 1)} className="px-2 text-gray-400 hover:text-gray-700">−</button>
                            <span className="w-7 text-center text-xs font-medium text-[#004A94]">{it.cantidad}</span>
                            <button onClick={() => cambiarCantidad(it.key, it.cantidad + 1)} className="px-2 text-gray-400 hover:text-gray-700">+</button>
                          </div>
                          <button onClick={() => setDescLineaTarget(it)} title="Descuento de línea"
                            className={`rounded px-1.5 py-0.5 text-[10px] ${it.descuento > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'text-gray-400 hover:bg-gray-100'}`}>
                            {it.descuento > 0 ? `−S/ ${fmt(it.descuento)}` : '% desc'}
                          </button>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#004A94]">S/ {fmt(c.total)}</p>
                        <p className="text-[9px] text-gray-400">
                          S/ {fmt(it.precioUnitario)} c/u
                          {it.nivelAplicado && <span className="ml-1 rounded bg-blue-100 px-1 text-blue-700">{it.nivelAplicado}</span>}
                          {it.enLiquidacion && <span className="ml-1 rounded bg-red-100 px-1 font-bold text-red-600">LIQ</span>}
                        </p>
                      </div>
                    </div>
                    {!it.esOrdenServicio && (it.stockDisponible ?? 99999) < it.cantidad && (
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
                <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-medium text-gray-900">
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

      {/* Selector dinámico de variantes (paridad Flutter).
          🔑 Agregar NO cierra: con 91 combinaciones el caso normal es llevarse
          varias, y cerrar obligaba a reabrir y volver a buscar desde cero. */}
      {variantePicker && (
        <VarianteSelector producto={variantePicker} sedeId={sedeId} accent="#437EFF"
          cantidadesEnCarrito={cantidadesPorVariante}
          onClose={() => setVariantePicker(null)}
          onConfirm={(v, c) => { addItem(variantePicker, v.id, v.nombre, c); }} />
      )}

      {/* Descuento de línea */}
      {descLineaTarget && (
        <DescuentoLineaDialog item={descLineaTarget}
          onApply={(monto) => {
            const target = descLineaTarget;
            setDescLineaTarget(null);
            const aplicar = () => setItems(prev => prev.map(it => it.key === target.key
              ? { ...it, descuento: Math.min(monto, it.cantidad * it.precioUnitario) }
              : it));
            if (monto > 0) conAutorizacionDescuento(aplicar); else aplicar();
          }}
          onClose={() => setDescLineaTarget(null)} />
      )}

      {/* Descuento global */}
      {descGlobalOpen && (
        <DescuentoGlobalDialog onApply={aplicarDescuentoGlobal} onClose={() => setDescGlobalOpen(false)} />
      )}

      {/* Órdenes de servicio cobrables */}
      {cobrablesOpen && (
        <CobrablesSheet sedeId={sedeId} onPick={agregarOrden} onClose={() => setCobrablesOpen(false)} />
      )}

      {/* Autorización de descuento (paridad Flutter: operacion APLICAR_DESCUENTO) */}
      <AutorizacionDialog
        isOpen={authDescuento !== null}
        operacion="APLICAR_DESCUENTO"
        titulo="Autorizar descuento"
        descripcion="Un administrador debe autorizar la aplicación de descuentos."
        onAuthorized={() => { authDescuento?.(); setAuthDescuento(null); }}
        onClose={() => setAuthDescuento(null)}
      />
    </div>
  );
}

export default function VentaRapidaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>}>
      <VentaRapidaInner />
    </Suspense>
  );
}

/* --- Selector de órdenes de servicio cobrables --- */
function CobrablesSheet({ sedeId, onPick, onClose }: { sedeId?: string; onPick: (o: OrdenCobrable) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<OrdenCobrable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback((q: string) => {
    setLoading(true);
    osService.getOrdenesCobrables(q || undefined, sedeId || undefined)
      .then(setItems)
      .catch(() => setError('No se pudieron cargar las órdenes cobrables'))
      .finally(() => setLoading(false));
  }, [sedeId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(''); }, [cargar]);

  const onSearch = (q: string) => {
    setSearch(q);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => cargar(q), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 p-4">
          <h3 className="text-sm font-medium text-[#004A94]">Cobrar orden de servicio</h3>
          <input className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            value={search} onChange={e => onSearch(e.target.value)} placeholder="Buscar por código, equipo o cliente..." autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-500">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin órdenes cobrables (REPARADO o LISTO_ENTREGA con saldo)</p>
          ) : (
            <div className="space-y-1.5">
              {items.map(o => {
                const cli = o.clienteEmpresa?.razonSocial ?? o.cliente?.nombre ?? '—';
                return (
                  <button key={o.id} onClick={() => onPick(o)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-[#437EFF] hover:bg-[#437EFF]/5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-gray-900">{o.codigo}</p>
                      <p className="truncate text-[11px] text-gray-500">{cli} · {TIPO_SERVICIO_LABEL[o.tipoServicio] ?? o.tipoServicio}{o.tipoEquipo ? ` · ${o.tipoEquipo}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-amber-600">S/ {fmt(Number(o.saldoPendiente))}</p>
                      {Number(o.adelanto) > 0 && <p className="text-[9px] text-gray-400">adel. {fmt(Number(o.adelanto))}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-3 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
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
        <h3 className="text-sm font-medium text-[#004A94]">Descuento de línea</h3>
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
        <h3 className="text-sm font-medium text-[#004A94]">Descuento global</h3>
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
