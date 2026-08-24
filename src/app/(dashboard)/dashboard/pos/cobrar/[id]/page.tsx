'use client';

import { useState, useCallback, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Cotizacion, StockValidationResult } from '@/core/types/cotizacion';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import * as ventaService from '@/features/venta/services/venta-service';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import CobrarItemSelector, { calcularItem, type ItemAdicional } from '@/features/cotizacion/components/CobrarItemSelector';

const METODOS = [
  { value: 'EFECTIVO', label: '💵 Efectivo' },
  { value: 'YAPE', label: '📱 Yape' },
  { value: 'TARJETA', label: '💳 Tarjeta' },
  { value: 'PLIN', label: '📲 Plin' },
  { value: 'TRANSFERENCIA', label: '🏦 Transf.' },
] as const;

const METODOS_DIGITALES = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];
/** Quien puede autorizar sin que le pidan credenciales (paridad con el detalle). */
const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];
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

  // Cliente: la cotización trae el suyo, pero al cobrar se puede cambiar.
  const [clienteOverride, setClienteOverride] = useState<{
    clienteId?: string; clienteEmpresaId?: string; nombre: string; documento: string; direccion?: string;
  } | null>(null);
  const [cambiarCliente, setCambiarCliente] = useState(false);
  const [docInput, setDocInput] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // Comprobante
  const [tipoComprobante, setTipoComprobante] = useState<'TICKET' | 'BOLETA' | 'FACTURA'>('BOLETA');
  const [observaciones, setObservaciones] = useState('');

  // Descuento global al cobrar (S/ o %), como en el app y en el detalle.
  const [descInput, setDescInput] = useState('');
  const [descEsPct, setDescEsPct] = useState(false);

  // Crédito: la cotización se cobra después. Sin esto solo se podía CONTADO.
  const [esCredito, setEsCredito] = useState(false);
  const [plazoCredito, setPlazoCredito] = useState('30');
  const [numeroCuotas, setNumeroCuotas] = useState('1');

  // Autorizaciones pendientes (descuento / venta bajo costo)
  const [authPendiente, setAuthPendiente] = useState<null | 'DESCUENTO' | 'BAJO_COSTO'>(null);
  const [pendiente, setPendiente] = useState<Parameters<typeof cotizacionService.convertirAVenta>[1] | null>(null);

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

  const { state: authState } = useAuth();
  const { userRoles } = useEmpresa();
  const userId = authState.status === 'authenticated' ? authState.user.id : '';
  const esAutorizador = userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol));

  // --- Totales (suma de items visibles) ---
  const total = useMemo(() => items.reduce((acc, it) => acc + it.total, 0), [items]);
  const adelanto = Number(cotizacion?.adelantoMonto ?? 0);
  /** Descuento global efectivo: el input es S/ o % del total de los items. */
  const descuentoGlobal = useMemo(() => {
    const v = parseFloat(descInput) || 0;
    if (v <= 0) return 0;
    const monto = descEsPct ? (total * Math.min(v, 100)) / 100 : v;
    return Math.min(Number(monto.toFixed(2)), total);
  }, [descInput, descEsPct, total]);
  const totalACobrar = Math.max(0, total - descuentoGlobal - adelanto);
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

  /** El de la cotización, salvo que el cajero lo haya cambiado acá. */
  const clienteEfectivo = useMemo(() => clienteOverride ?? {
    clienteId: cotizacion?.clienteId,
    clienteEmpresaId: cotizacion?.clienteEmpresaId,
    nombre: cotizacion?.nombreCliente ?? '',
    documento: cotizacion?.documentoCliente ?? '',
  }, [clienteOverride, cotizacion]);

  const rucValido = /^\d{11}$/.test((clienteEfectivo.documento ?? '').trim());
  const facturaSinRuc = tipoComprobante === 'FACTURA' && !rucValido;

  /**
   * Resuelve el documento contra RENIEC/SUNAT, igual que la Venta Rápida.
   *
   * 🔴 El endpoint por DNI devuelve el id en un campo llamado
   * `clienteEmpresaId`, pero ES una EmpresaPersona: viaja como `clienteId`.
   * El de RUC sí es un ClienteEmpresa. Cruzarlos deja al backend sin encontrar
   * al cliente y la venta sale sin él.
   */
  const buscarCliente = async () => {
    const doc = docInput.trim();
    setError('');
    if (doc.length !== 8 && doc.length !== 11) {
      setError('Documento inválido: DNI (8 dígitos) o RUC (11 dígitos)');
      return;
    }
    setBuscandoCliente(true);
    try {
      if (doc.length === 8) {
        const c = await ventaService.buscarClientePorDni(doc);
        setClienteOverride({ clienteId: c.clienteEmpresaId, nombre: c.nombreCompleto, documento: doc, direccion: c.direccion ?? undefined });
      } else {
        const c = await ventaService.buscarClientePorRuc(doc);
        setClienteOverride({ clienteEmpresaId: c.clienteEmpresaId, nombre: c.razonSocial, documento: doc, direccion: c.direccion ?? undefined });
      }
      setCambiarCliente(false);
      setDocInput('');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se encontró el documento');
    } finally {
      setBuscandoCliente(false);
    }
  };

  // --- Cobrar ---
  const handleCobrar = async () => {
    if (!cotizacion) return;
    setError('');
    if (!esCredito && !cubiertoPorAdelanto && pagos.length === 0) { setError('Agrega al menos un pago'); return; }
    if (!esCredito && !cubierto && !cubiertoPorAdelanto) { setError(`Faltan S/ ${fmt(faltante)} por cubrir`); return; }
    if (esCredito && !clienteEfectivo.clienteId && !clienteEfectivo.clienteEmpresaId) {
      setError('El crédito necesita un cliente identificado: cambialo y buscalo por documento.');
      setCambiarCliente(true);
      return;
    }
    if (items.length === 0) { setError('La venta no tiene items'); return; }
    // El backend rechaza la FACTURA sin RUC válido con un 400; avisamos acá,
    // donde además se puede arreglar.
    if (facturaSinRuc) {
      setError('La factura necesita un cliente con RUC de 11 dígitos. Cambiá el cliente o emití boleta.');
      setCambiarCliente(true);
      return;
    }
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

      const doc = (clienteEfectivo.documento ?? '').trim();
      const dto = {
        tipoComprobante,
        condicionPago: esCredito ? 'CREDITO' : 'CONTADO',
        esCredito,
        // 🔴 Mismo criterio que el app: FACTURA siempre RUC; 9 dígitos es carné
        // de extranjería (tipo 4), y el resto DNI. Deducirlo del comprobante
        // mandaba a un extranjero como DNI en el comprobante electrónico.
        tipoDocumentoCliente: tipoComprobante === 'FACTURA' ? '6' : doc.length === 9 ? '4' : '1',
        ...(clienteOverride && {
          clienteId: clienteOverride.clienteId,
          clienteEmpresaId: clienteOverride.clienteEmpresaId,
          nombreCliente: clienteOverride.nombre,
          documentoCliente: clienteOverride.documento,
          ...(clienteOverride.direccion && { direccionCliente: clienteOverride.direccion }),
        }),
        // A crédito no se cobra hoy: los pagos solo viajan en el contado.
        ...(!esCredito && pagos.length > 0 && {
          metodoPago: pagos[0].metodoPago,
          montoRecibido: totalPagado,
          pagos,
        }),
        ...(esCredito && {
          plazoCredito: Number(plazoCredito) || 30,
          numeroCuotas: Math.max(1, Number(numeroCuotas) || 1),
          fechaVencimientoPago: new Date(Date.now() + (Number(plazoCredito) || 30) * 86400000).toISOString(),
        }),
        ...(descuentoGlobal > 0 && {
          descuentoGlobal,
          ...(descEsPct ? { descuentoGlobalPorcentaje: parseFloat(descInput) } : {}),
        }),
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        ...(excluirIds.length > 0 && { excluirDetalleIds: excluirIds }),
        ...(Object.keys(ajustar).length > 0 && { ajustarCantidades: ajustar }),
        ...(itemsAdicionales.length > 0 && { itemsAdicionales }),
      } as Parameters<typeof cotizacionService.convertirAVenta>[1];

      // Un descuento global necesita autorización; el admin se auto-autoriza.
      if (descuentoGlobal > 0 && !dto.descuentoAutorizadoPorId) {
        if (esAutorizador && userId) {
          dto.descuentoAutorizadoPorId = userId;
        } else {
          setPendiente(dto);
          setAuthPendiente('DESCUENTO');
          setIsSubmitting(false);
          return;
        }
      }
      await ejecutar(dto);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al cobrar la cotización');
      setIsSubmitting(false);
    }
  };

  /**
   * Manda el cobro y resuelve el guard de MARGEN NEGATIVO.
   *
   * 🔴 Sin esto, una cotización con una línea bajo costo devolvía 400 y el
   * cajero no tenía forma de seguir: el app y el detalle sí piden la
   * autorización y reintentan.
   */
  const ejecutar = async (dto: Parameters<typeof cotizacionService.convertirAVenta>[1]) => {
    if (!cotizacion) return;
    setIsSubmitting(true);
    try {
      const venta = await cotizacionService.convertirAVenta(cotizacion.id, dto);
      setVentaOk({ id: venta?.id as string | undefined, codigo: venta?.codigo as string | undefined });
    } catch (err) {
      const raw = err instanceof AxiosError ? err.response?.data?.message : undefined;
      const msg = Array.isArray(raw) ? raw.join(', ') : raw || '';
      if (msg.includes('BAJO_COSTO') || msg.toLowerCase().includes('bajo costo')) {
        if (esAutorizador && userId && !dto.ventaBajoCostoAutorizadaPorId) {
          return ejecutar({ ...dto, ventaBajoCostoAutorizadaPorId: userId });
        }
        setPendiente(dto);
        setAuthPendiente('BAJO_COSTO');
        return;
      }
      setError(msg || 'Error al cobrar la cotización');
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

              {/* Descuento al cobrar: el app lo permite y acá no existía. Pide
                  autorización igual que en la Venta Rápida. */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-gray-500">Descuento</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="flex overflow-hidden rounded-md border border-gray-200">
                    {([['S/', false], ['%', true]] as const).map(([lbl, pct]) => (
                      <button key={lbl} onClick={() => setDescEsPct(pct)}
                        className={`px-2 py-1 text-[11px] font-bold ${descEsPct === pct ? 'bg-[#437EFF]/10 text-[#437EFF]' : 'text-gray-400'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <input value={descInput} onChange={e => setDescInput(e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal" placeholder="0"
                    className="w-20 rounded-md border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-[#437EFF]" />
                </div>
              </div>
              {descuentoGlobal > 0 && (
                <div className="mt-1 flex justify-between text-amber-600">
                  <span>Descuento aplicado</span><span>− S/ {fmt(descuentoGlobal)}</span>
                </div>
              )}

              {adelanto > 0 && (
                <div className="flex justify-between text-green-600"><span>Adelanto pagado</span><span>− S/ {fmt(adelanto)}</span></div>
              )}
              {(adelanto > 0 || descuentoGlobal > 0) && (
                <div className="mt-1 flex justify-between rounded-md bg-[#437EFF]/5 px-2 py-1">
                  <span className="font-bold text-[#004A94]">Saldo a cobrar</span>
                  <span className="font-bold text-[#004A94]">S/ {fmt(totalACobrar)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cliente: se puede cambiar AL COBRAR.
              🔴 Es la única salida cuando la cotización se hizo a CLIENTES VARIOS
              y al pagar piden FACTURA: el backend exige RUC válido y una
              cotización APROBADA ya no se edita, así que sin esto el cobro
              quedaba trabado en un 400 sin arreglo posible. */}
          <div className={`rounded-xl border bg-white p-4 ${facturaSinRuc ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Cliente</p>
                <p className="mt-0.5 truncate text-sm text-gray-700">{clienteEfectivo.nombre || '—'}</p>
                <p className="text-xs text-gray-400">
                  {clienteEfectivo.documento || 'sin documento'}
                  {clienteOverride && <span className="ml-1.5 rounded bg-blue-50 px-1 text-[10px] font-bold text-blue-700">CAMBIADO</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {clienteOverride && (
                  <button onClick={() => { setClienteOverride(null); setDocInput(''); }}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Deshacer
                  </button>
                )}
                <button onClick={() => setCambiarCliente(v => !v)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  {cambiarCliente ? 'Cerrar' : 'Cambiar'}
                </button>
              </div>
            </div>

            {(cambiarCliente || facturaSinRuc) && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-xs text-gray-500">
                  {facturaSinRuc
                    ? 'La factura necesita un cliente con RUC. Busca por RUC (11 dígitos) para cambiarlo.'
                    : 'Busca por DNI (8 dígitos) o RUC (11 dígitos).'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={docInput}
                    onChange={e => setDocInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    onKeyDown={e => { if (e.key === 'Enter') void buscarCliente(); }}
                    inputMode="numeric"
                    placeholder={tipoComprobante === 'FACTURA' ? 'RUC del cliente' : 'DNI o RUC'}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                  />
                  <button onClick={() => void buscarCliente()} disabled={buscandoCliente || docInput.length < 8}
                    className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                    {buscandoCliente ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
              </div>
            )}
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
            {facturaSinRuc && (
              <p className="mt-1.5 text-[10px] font-semibold text-red-600">
                ⚠ La factura necesita un RUC. El cliente tiene &quot;{clienteEfectivo.documento || 'sin documento'}&quot; — cambialo arriba.
              </p>
            )}
            <input
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)" />
          </div>

          {/* Condición de pago. Antes esto era CONTADO fijo: una cotización
              aprobada a crédito no se podía cobrar desde la web. */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">Condición de pago</p>
            <div className="flex gap-2">
              {([['CONTADO', false], ['CRÉDITO', true]] as const).map(([lbl, credito]) => (
                <button key={lbl} onClick={() => setEsCredito(credito)}
                  className={`flex-1 rounded-lg border p-2 text-xs font-medium ${esCredito === credito ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            {esCredito && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-500">Plazo (días)</span>
                  <input value={plazoCredito} onChange={e => setPlazoCredito(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-500">Cuotas</span>
                  <input value={numeroCuotas} onChange={e => setNumeroCuotas(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
                </label>
                <p className="col-span-2 text-[11px] text-gray-500">
                  No se cobra nada hoy. El crédito necesita un cliente identificado.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === Columna derecha: pagos === */}
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-gray-800">Pago</p>
              <p className="text-2xl font-bold text-[#004A94]">S/ {fmt(totalACobrar)}</p>
            </div>

            {esCredito ? (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-700">
                  A crédito: no se cobra hoy. Se genera la cuenta por cobrar con vencimiento a {Number(plazoCredito) || 30} días.
                </p>
              </div>
            ) : cubiertoPorAdelanto ? (
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
                {/* "Exacto" carga lo que falta de una, igual que en Venta Rápida:
                    es el caso normal —el cliente paga justo— y tipearlo a mano
                    invita a equivocarse en el céntimo. */}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => agregarPago()} disabled={!montoInput || parseFloat(montoInput) <= 0}
                    className="flex-1 rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-40">
                    Agregar pago
                  </button>
                  <button onClick={() => agregarPago(Math.max(0, faltante))} disabled={faltante <= TOLERANCIA}
                    className="rounded-lg border border-green-500 px-3 py-2 text-xs font-bold text-green-600 hover:bg-green-50 disabled:opacity-40">
                    Exacto S/ {fmt(Math.max(0, faltante))}
                  </button>
                </div>

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
            disabled={isSubmitting || items.length === 0 || (!esCredito && !cubiertoPorAdelanto && !cubierto)}
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

      {/* Autorización de descuento / venta bajo costo (paridad con el app) */}
      <AutorizacionDialog
        isOpen={authPendiente !== null}
        operacion={authPendiente === 'BAJO_COSTO' ? 'VENTA_BAJO_COSTO' : 'DESCUENTO_VENTA'}
        titulo={authPendiente === 'BAJO_COSTO' ? 'Autorizar venta bajo costo' : 'Autorizar descuento'}
        descripcion={authPendiente === 'BAJO_COSTO'
          ? 'Una o más líneas quedan con margen negativo. Requiere autorización de un administrador o gerente.'
          : 'Aplicar un descuento al cobrar requiere autorización de un administrador o gerente.'}
        motivo={`Cobro de cotización ${cotizacion.codigo}`}
        onAuthorized={(auth) => {
          const tipo = authPendiente;
          const dto = pendiente;
          setAuthPendiente(null);
          setPendiente(null);
          if (!dto) return;
          void ejecutar(tipo === 'BAJO_COSTO'
            ? { ...dto, ventaBajoCostoAutorizadaPorId: auth.autorizadoPorId }
            : { ...dto, descuentoAutorizadoPorId: auth.autorizadoPorId });
        }}
        onClose={() => { setAuthPendiente(null); setPendiente(null); }}
      />
    </div>
  );
}
