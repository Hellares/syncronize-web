'use client';

import { useState, useCallback, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Cotizacion, StockValidationResult } from '@/core/types/cotizacion';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import CobrarItemSelector, { calcularItem, type ItemAdicional } from '@/features/cotizacion/components/CobrarItemSelector';

const METODOS = [
  { value: 'EFECTIVO', label: '💵 Efectivo' },
  { value: 'YAPE', label: '📱 Yape' },
  { value: 'TARJETA', label: '💳 Tarjeta' },
  { value: 'PLIN', label: '📲 Plin' },
  { value: 'TRANSFERENCIA', label: '🏦 Transf.' },
] as const;

const METODOS_DIGITALES = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];
const TOLERANCIA = 0.005;

interface ItemLocal {
  /** detalleId original o 'nuevo_*' */
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
  esNuevo: boolean;
  /** Solo items nuevos: datos completos para el payload */
  input?: ItemAdicional;
  /** Solo originales con cantidad ajustada */
  cantidadOriginal?: number;
}

interface Pago { metodoPago: string; monto: number; referencia?: string }

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CobrarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [items, setItems] = useState<ItemLocal[]>([]);
  const [excluirIds, setExcluirIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stock dialog
  const [stockResult, setStockResult] = useState<StockValidationResult | null>(null);
  const [showStockDialog, setShowStockDialog] = useState(false);

  // Pagos
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metodoActual, setMetodoActual] = useState<string>('EFECTIVO');
  const [montoInput, setMontoInput] = useState('');
  const [refInput, setRefInput] = useState('');

  // Comprobante
  const [tipoComprobante, setTipoComprobante] = useState<'TICKET' | 'BOLETA' | 'FACTURA'>('BOLETA');
  const [observaciones, setObservaciones] = useState('');

  const [agregarOpen, setAgregarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ventaOk, setVentaOk] = useState<{ id?: string; codigo?: string } | null>(null);

  // --- Carga: cotización + validación de stock (paridad _loadCotizacion Flutter) ---
  useEffect(() => {
    (async () => {
      try {
        const [c, stock] = await Promise.all([
          cotizacionService.getCotizacion(id),
          cotizacionService.validarStock(id).catch(() => null),
        ]);
        if (c.estado !== 'PENDIENTE' && c.estado !== 'APROBADA') {
          setError(`Esta cotización está en estado ${c.estado} — solo PENDIENTE o APROBADA se pueden cobrar`);
          setIsLoading(false);
          return;
        }
        setCotizacion(c);
        setItems((c.detalles ?? []).map(d => ({
          id: d.id,
          descripcion: d.descripcion,
          cantidad: Number(d.cantidad),
          precioUnitario: Number(d.precioUnitario),
          subtotal: Number(d.subtotal),
          igv: Number(d.igv),
          total: Number(d.total),
          esNuevo: false,
        })));
        if (stock && !stock.todosConStock) {
          setStockResult(stock);
          setShowStockDialog(true);
        }
      } catch {
        setError('Error al cargar la cotización');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // --- Totales (suma de items visibles) ---
  const total = useMemo(() => items.reduce((acc, it) => acc + it.total, 0), [items]);
  const adelanto = Number(cotizacion?.adelantoMonto ?? 0);
  const totalACobrar = Math.max(0, total - adelanto);
  const totalPagado = useMemo(() => pagos.reduce((acc, p) => acc + p.monto, 0), [pagos]);
  const faltante = totalACobrar - totalPagado;
  const vuelto = totalPagado - totalACobrar;
  const cubierto = faltante <= TOLERANCIA;
  const cubiertoPorAdelanto = totalACobrar <= TOLERANCIA;

  // --- Edición de items ---
  const quitarItem = (item: ItemLocal) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    if (!item.esNuevo) setExcluirIds(prev => [...prev, item.id]);
  };

  const cambiarCantidad = (item: ItemLocal, nueva: number) => {
    if (nueva < 1) return;
    setItems(prev => prev.map(i => {
      if (i.id !== item.id) return i;
      if (i.esNuevo && i.input) {
        const input = { ...i.input, cantidad: nueva };
        const c = calcularItem(input);
        return { ...i, cantidad: nueva, input, subtotal: c.subtotal, igv: c.igv, total: c.total };
      }
      // Original: escala proporcional (display; el backend recalcula con ajustarCantidades)
      const factor = nueva / i.cantidad;
      return {
        ...i,
        cantidad: nueva,
        cantidadOriginal: i.cantidadOriginal ?? i.cantidad,
        subtotal: i.subtotal * factor,
        igv: i.igv * factor,
        total: i.total * factor,
      };
    }));
  };

  const agregarItem = (input: ItemAdicional) => {
    const c = calcularItem(input);
    setItems(prev => [...prev, {
      id: `nuevo_${Date.now()}_${prev.length}`,
      descripcion: input.descripcion,
      cantidad: input.cantidad,
      precioUnitario: input.precioUnitario,
      subtotal: c.subtotal,
      igv: c.igv,
      total: c.total,
      esNuevo: true,
      input,
    }]);
    setAgregarOpen(false);
  };

  // --- Stock dialog: acciones (paridad Flutter) ---
  const ajustarAStockDisponible = () => {
    if (!stockResult) return;
    const sinStock = stockResult.items.filter(i => i.sinStock && !i.esServicio);
    setItems(prev => {
      let next = [...prev];
      for (const s of sinStock) {
        const idx = next.findIndex(i => i.id === s.detalleId);
        if (idx < 0) continue;
        if (s.stockDisponible <= 0) {
          setExcluirIds(e => [...e, s.detalleId]);
          next = next.filter(i => i.id !== s.detalleId);
        } else {
          const it = next[idx];
          const factor = s.stockDisponible / it.cantidad;
          next[idx] = {
            ...it,
            cantidad: s.stockDisponible,
            cantidadOriginal: it.cantidadOriginal ?? it.cantidad,
            subtotal: it.subtotal * factor,
            igv: it.igv * factor,
            total: it.total * factor,
          };
        }
      }
      return next;
    });
    setShowStockDialog(false);
  };

  const quitarSinStock = () => {
    if (!stockResult) return;
    const ids = stockResult.items.filter(i => i.sinStock && !i.esServicio).map(i => i.detalleId);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setExcluirIds(prev => [...prev, ...ids]);
    setShowStockDialog(false);
  };

  // --- Pagos ---
  const precargarRef = (metodo: string) => {
    setMetodoActual(metodo);
    // Métodos digitales precargan '000' (paridad Flutter, idempotente)
    if (METODOS_DIGITALES.includes(metodo) && !refInput.trim()) setRefInput('000');
    if (metodo === 'EFECTIVO' && refInput === '000') setRefInput('');
  };

  const agregarPago = useCallback((montoOverride?: number) => {
    const m = montoOverride ?? parseFloat(montoInput);
    if (isNaN(m) || m <= 0) return;
    setPagos(prev => [...prev, {
      metodoPago: metodoActual,
      monto: m,
      referencia: refInput.trim() || undefined,
    }]);
    setMontoInput('');
    setRefInput(METODOS_DIGITALES.includes(metodoActual) ? '000' : '');
  }, [montoInput, metodoActual, refInput]);

  // Auto-agregar si cubre exacto (paridad _onMontoChanged Flutter, tolerancia 0.005)
  useEffect(() => {
    const m = parseFloat(montoInput);
    if (isNaN(m) || m <= 0) return;
    if (Math.abs(totalPagado + m - totalACobrar) <= TOLERANCIA) {
      agregarPago(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montoInput]);

  // --- Cobrar ---
  const handleCobrar = async () => {
    if (!cotizacion) return;
    setError('');
    if (!cubiertoPorAdelanto && pagos.length === 0) { setError('Agrega al menos un pago'); return; }
    if (!cubierto && !cubiertoPorAdelanto) { setError(`Faltan S/ ${fmt(faltante)} por cubrir`); return; }
    if (items.length === 0) { setError('La venta no tiene items'); return; }
    setIsSubmitting(true);
    try {
      // ajustarCantidades: solo originales con cantidad cambiada
      const ajustar: Record<string, number> = {};
      items.filter(i => !i.esNuevo && i.cantidadOriginal != null && i.cantidad !== i.cantidadOriginal)
        .forEach(i => { ajustar[i.id] = i.cantidad; });

      const itemsAdicionales = items.filter(i => i.esNuevo && i.input).map(i => {
        const inp = i.input!;
        return {
          productoId: inp.productoId,
          varianteId: inp.varianteId,
          servicioId: inp.servicioId,
          descripcion: inp.descripcion,
          cantidad: inp.cantidad,
          precioUnitario: inp.precioUnitario,
          ...(inp.descuento > 0 && { descuento: inp.descuento }),
          porcentajeIGV: inp.porcentajeIGV,
          precioIncluyeIgv: inp.precioIncluyeIgv,
          tipoAfectacion: inp.tipoAfectacion,
          ...(inp.icbper > 0 && { icbper: inp.icbper }),
        };
      });

      const venta = await cotizacionService.convertirAVenta(cotizacion.id, {
        tipoComprobante,
        condicionPago: 'CONTADO',
        esCredito: false,
        tipoDocumentoCliente: tipoComprobante === 'FACTURA' ? '6' : '1',
        ...(pagos.length > 0 && {
          metodoPago: pagos[0].metodoPago,
          montoRecibido: totalPagado,
          pagos,
        }),
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        ...(excluirIds.length > 0 && { excluirDetalleIds: excluirIds }),
        ...(Object.keys(ajustar).length > 0 && { ajustarCantidades: ajustar }),
        ...(itemsAdicionales.length > 0 && { itemsAdicionales }),
      } as Parameters<typeof cotizacionService.convertirAVenta>[1]);
      setVentaOk({ id: venta?.id, codigo: venta?.codigo });
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al cobrar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  if (ventaOk) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="text-xl font-bold text-gray-900">¡Venta registrada!</h1>
        {ventaOk.codigo && <p className="font-mono text-sm text-gray-500">{ventaOk.codigo}</p>}
        {vuelto > TOLERANCIA && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs text-green-600">Vuelto a entregar</p>
            <p className="text-3xl font-bold text-green-700">S/ {fmt(vuelto)}</p>
          </div>
        )}
        <div className="flex justify-center gap-2">
          {ventaOk.id && (
            <Link href={`/dashboard/ventas/${ventaOk.id}/ticket`}
              className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570]">
              Ver Ticket
            </Link>
          )}
          <button onClick={() => router.push('/dashboard/pos')}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Volver a Cola POS
          </button>
          <Link href="/dashboard/caja" className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Ver Mi Caja
          </Link>
        </div>
      </div>
    );
  }

  if (error && !cotizacion) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">{error}</p>
        <Link href="/dashboard/pos" className="mt-2 inline-block text-sm text-[#437EFF]">← Volver a Cola POS</Link>
      </div>
    );
  }

  if (!cotizacion) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/pos" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cobrar {cotizacion.codigo}</h1>
          <p className="text-sm text-gray-500">{cotizacion.nombreCliente}{cotizacion.documentoCliente ? ` · ${cotizacion.documentoCliente}` : ''}</p>
        </div>
      </div>

      {/* Banner PENDIENTE (paridad Flutter) */}
      {cotizacion.estado === 'PENDIENTE' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-xs text-amber-700">⚠ Cotización <strong>pendiente</strong> — se aprobará automáticamente al cobrar.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* === Columna izquierda: items === */}
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Productos ({items.length})</p>
              <button onClick={() => setAgregarOpen(true)}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                + Agregar
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {it.descripcion}
                      {it.esNuevo && <span className="ml-1 rounded bg-blue-100 px-1 text-[9px] text-blue-700">NUEVO</span>}
                    </p>
                    <p className="text-[10px] text-gray-400">S/ {fmt(it.precioUnitario)} c/u</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button onClick={() => cambiarCantidad(it, it.cantidad - 1)} className="px-2 py-0.5 text-gray-400 hover:text-gray-700">−</button>
                      <span className="w-8 text-center text-sm font-medium">{it.cantidad}</span>
                      <button onClick={() => cambiarCantidad(it, it.cantidad + 1)} className="px-2 py-0.5 text-gray-400 hover:text-gray-700">+</button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-gray-800">S/ {fmt(it.total)}</span>
                    <button onClick={() => quitarItem(it)} className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin items</p>}
            </div>
            {/* Totales */}
            <div className="border-t border-gray-100 px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-900">S/ {fmt(total)}</span></div>
              {adelanto > 0 && (
                <>
                  <div className="flex justify-between text-green-600"><span>Adelanto pagado</span><span>− S/ {fmt(adelanto)}</span></div>
                  <div className="mt-1 flex justify-between rounded-md bg-[#437EFF]/5 px-2 py-1">
                    <span className="font-bold text-[#004A94]">Saldo a cobrar</span>
                    <span className="font-bold text-[#004A94]">S/ {fmt(totalACobrar)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Comprobante */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Comprobante</p>
            <div className="flex gap-2">
              {(['TICKET', 'BOLETA', 'FACTURA'] as const).map(t => (
                <button key={t} onClick={() => setTipoComprobante(t)}
                  className={`flex-1 rounded-lg border p-2 text-xs font-medium ${tipoComprobante === t ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {t}
                </button>
              ))}
            </div>
            {tipoComprobante === 'FACTURA' && !cotizacion.documentoCliente?.match(/^\d{11}$/) && (
              <p className="mt-1.5 text-[10px] text-amber-600">⚠ Factura requiere RUC (11 dígitos) — el documento del cliente es &quot;{cotizacion.documentoCliente || 'vacío'}&quot;</p>
            )}
            <input
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)" />
          </div>
        </div>

        {/* === Columna derecha: pagos === */}
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-gray-800">Pago</p>
              <p className="text-2xl font-bold text-[#004A94]">S/ {fmt(totalACobrar)}</p>
            </div>

            {cubiertoPorAdelanto ? (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-700">✓ Cubierto por el adelanto — no hay nada que cobrar hoy.</p>
              </div>
            ) : (
              <>
                {/* Métodos */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {METODOS.map(m => (
                    <button key={m.value} onClick={() => precargarRef(m.value)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoActual === m.value ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Monto + referencia */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:border-[#437EFF]"
                    type="number" step="0.01" min="0" value={montoInput}
                    onChange={e => setMontoInput(e.target.value)} placeholder={`S/ ${fmt(Math.max(0, faltante))}`} />
                  {METODOS_DIGITALES.includes(metodoActual) && (
                    <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                      value={refInput} onChange={e => setRefInput(e.target.value)} placeholder="Referencia / operación" />
                  )}
                </div>
                <button onClick={() => agregarPago()} disabled={!montoInput || parseFloat(montoInput) <= 0}
                  className="mt-2 w-full rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-40">
                  Agregar pago
                </button>

                {/* Pagos registrados */}
                {pagos.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {pagos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                        <span className="text-gray-700">{p.metodoPago}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                        <span className="flex items-center gap-2">
                          <strong>S/ {fmt(p.monto)}</strong>
                          <button onClick={() => setPagos(prev => prev.filter((_, j) => j !== i))}
                            className="text-gray-300 hover:text-red-500">✕</button>
                        </span>
                      </div>
                    ))}
                    {pagos.length > 1 && <p className="text-right text-[10px] text-purple-600 font-semibold">Pago MIXTO</p>}
                  </div>
                )}

                {/* Estado del pago */}
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Recibido</span><span className="font-medium">S/ {fmt(totalPagado)}</span></div>
                  {faltante > TOLERANCIA && (
                    <div className="flex justify-between text-red-500"><span>Faltante</span><span className="font-bold">S/ {fmt(faltante)}</span></div>
                  )}
                  {vuelto > TOLERANCIA && (
                    <div className="flex justify-between rounded-md bg-green-50 px-2 py-1 text-green-700">
                      <span className="font-semibold">Vuelto</span><span className="font-bold">S/ {fmt(vuelto)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

          <button onClick={handleCobrar}
            disabled={isSubmitting || items.length === 0 || (!cubiertoPorAdelanto && !cubierto)}
            className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Procesando...' : `COBRAR S/ ${fmt(totalACobrar)}`}
          </button>
        </div>
      </div>

      {/* Selector de items */}
      <CobrarItemSelector
        isOpen={agregarOpen}
        sedeId={cotizacion.sedeId}
        onAdd={agregarItem}
        onClose={() => setAgregarOpen(false)}
      />

      {/* Dialog stock insuficiente (paridad Flutter) */}
      {showStockDialog && stockResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-red-700">⚠ Stock insuficiente</h3>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {stockResult.items.filter(i => i.sinStock && !i.esServicio).map(i => (
                <p key={i.detalleId} className="text-xs text-gray-600">
                  <strong>{i.descripcion}</strong>: pide {i.cantidad}, hay {i.stockDisponible}
                </p>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {stockResult.items.some(i => i.sinStock && i.stockDisponible > 0) && (
                <button onClick={ajustarAStockDisponible}
                  className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
                  Ajustar a stock disponible
                </button>
              )}
              <button onClick={quitarSinStock}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                Quitar estos items
              </button>
              <button onClick={() => router.push('/dashboard/pos')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Volver para cambiar productos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
