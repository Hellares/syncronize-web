'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { VentaItem, Venta, PagoVentaDto, DivergenciaPrecio, MetodoPagoVenta } from '@/core/types/venta';
import { requiereAutorizacionBajoCosto, recalcularNivelesEnLote, UMBRAL_BANCARIZACION_PEN } from '@/core/types/venta';
import type { Emisor } from '@/core/types/facturacion';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import * as ventaService from '../services/venta-service';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const METODOS = ['EFECTIVO', 'YAPE', 'TARJETA', 'PLIN', 'TRANSFERENCIA'] as const;
const METODOS_DIGITALES = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];
const REQUIEREN_BANCO = ['TARJETA', 'TRANSFERENCIA'];
const TOLERANCIA = 0.005;
const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

interface Pago { metodoPago: string; monto: number; referencia?: string; banco?: string }

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface InitialCliente { clienteId?: string; clienteEmpresaId?: string; nombre: string; documento: string }

interface Props {
  items: VentaItem[];
  setItems: React.Dispatch<React.SetStateAction<VentaItem[]>>;
  sedeId: string;
  total: number;
  onBack: () => void;
  onSuccess: (venta: Venta) => void;
  /** Adelantos ya pagados de órdenes de servicio en el carrito: hoy se cobra total − adelanto. */
  adelantoAplicado?: number;
  /** Cliente pre-cargado (ej. desde una orden de servicio). */
  initialCliente?: InitialCliente;
}

export default function CobroPanel({ items, setItems, sedeId, total, onBack, onSuccess, adelantoAplicado = 0, initialCliente }: Props) {
  const { state: authState } = useAuth();
  const { userRoles } = useEmpresa();
  const userId = authState.status === 'authenticated' ? authState.user.id : '';
  const esAutorizador = useMemo(() => userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol)), [userRoles]);

  const hayOrdenes = items.some(it => it.esOrdenServicio);
  const totalACobrar = Math.round((total - adelantoAplicado) * 100) / 100;

  // Comprobante + cliente (pre-cargado si viene de una orden)
  const [tipoComprobante, setTipoComprobante] = useState<'TICKET' | 'BOLETA' | 'FACTURA'>('TICKET');

  // Multi-RUC: emisores activos de la empresa. Sin emisor activo la venta
  // solo puede ser TICKET (gating de facturación, paridad Flutter); con 2+
  // se elige con cuál RUC se emite (emisorId solo para socios, id != null).
  const [emisores, setEmisores] = useState<Emisor[]>([]);
  const [emisorSel, setEmisorSel] = useState<Emisor | null>(null);
  useEffect(() => {
    facturacionService.getEmisores()
      .then(ems => {
        setEmisores(ems);
        const activos = ems.filter(e => e.activo);
        // Pre-selección: el principal (EMPRESA) si está activo, si no el primero
        setEmisorSel(activos.find(e => e.tipo === 'EMPRESA') ?? activos[0] ?? null);
      })
      .catch(() => setEmisores([]));
  }, []);
  const emisoresActivos = useMemo(() => emisores.filter(e => e.activo), [emisores]);
  const puedeEmitir = emisoresActivos.length > 0;
  const [documento, setDocumento] = useState(initialCliente?.documento ?? '');
  const [clienteNombre, setClienteNombre] = useState(initialCliente?.nombre ?? '');
  const [clienteId, setClienteId] = useState<string | undefined>(initialCliente?.clienteId);
  const [clienteEmpresaId, setClienteEmpresaId] = useState<string | undefined>(initialCliente?.clienteEmpresaId);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [esGenerico, setEsGenerico] = useState(false);

  // Crédito
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [numeroCuotas, setNumeroCuotas] = useState(1);
  const [plazoDias, setPlazoDias] = useState(30);

  // Pagos
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metodoActual, setMetodoActual] = useState<string>('EFECTIVO');
  const [montoInput, setMontoInput] = useState('');
  const [refInput, setRefInput] = useState('');
  const [bancoInput, setBancoInput] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 409 dialogs
  const [divergenciasPrecio, setDivergenciasPrecio] = useState<DivergenciaPrecio[] | null>(null);
  const [divergenciasStock, setDivergenciasStock] = useState<Array<{ descripcion: string; productoId?: string; varianteId?: string; cantidadSolicitada: number; stockDisponible: number }> | null>(null);
  const [showBancarizacion, setShowBancarizacion] = useState(false);
  const [showAutorizacionBC, setShowAutorizacionBC] = useState(false);

  const esCredito = condicionPago === 'CREDITO';
  const totalPagado = useMemo(() => pagos.reduce((a, p) => a + p.monto, 0), [pagos]);
  const faltante = totalACobrar - totalPagado;
  const vuelto = totalPagado - totalACobrar;
  const cubierto = faltante <= TOLERANCIA;

  // --- Cliente lookup (RENIEC/SUNAT) ---
  const buscarCliente = async () => {
    setError('');
    const doc = documento.trim();
    setBuscandoCliente(true);
    try {
      if (doc.length === 8) {
        const c = await ventaService.buscarClientePorDni(doc);
        setClienteNombre(c.nombreCompleto);
        setClienteId(c.clienteEmpresaId);
        setClienteEmpresaId(undefined);
        setEsGenerico(false);
      } else if (doc.length === 11) {
        const c = await ventaService.buscarClientePorRuc(doc);
        setClienteNombre(c.razonSocial);
        setClienteEmpresaId(c.clienteEmpresaId);
        setClienteId(undefined);
        setEsGenerico(false);
      } else {
        setError('Documento inválido: DNI (8 dígitos) o RUC (11 dígitos)');
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se encontró el documento');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const usarGenerico = () => {
    setEsGenerico(true);
    setDocumento('00000000');
    setClienteNombre('CLIENTES VARIOS');
    setClienteId(undefined);
    setClienteEmpresaId(undefined);
  };

  // --- Pagos ---
  const seleccionarMetodo = (m: string) => {
    setMetodoActual(m);
    if (METODOS_DIGITALES.includes(m) && !refInput.trim()) setRefInput('000');
    if (m === 'EFECTIVO' && refInput === '000') setRefInput('');
  };

  const agregarPago = (montoOverride?: number) => {
    const m = montoOverride ?? parseFloat(montoInput);
    if (isNaN(m) || m <= 0) return;
    if (REQUIEREN_BANCO.includes(metodoActual) && !bancoInput.trim()) {
      setError(`${metodoActual} requiere indicar el banco`);
      return;
    }
    setError('');
    setPagos(prev => [...prev, {
      metodoPago: metodoActual,
      monto: m,
      referencia: refInput.trim() || undefined,
      banco: REQUIEREN_BANCO.includes(metodoActual) ? bancoInput.trim() : undefined,
    }]);
    setMontoInput('');
    setRefInput(METODOS_DIGITALES.includes(metodoActual) ? '000' : '');
  };

  // --- Bancarización Ley 28194 (umbral fijo 2000, paridad Flutter) ---
  const totalEfectivo = pagos.filter(p => p.metodoPago === 'EFECTIVO').reduce((a, p) => a + p.monto, 0);
  const totalBancarizado = totalPagado - totalEfectivo;
  const aplicaBancarizacion = !esCredito && total >= UMBRAL_BANCARIZACION_PEN
    && totalEfectivo > 0 && totalBancarizado < UMBRAL_BANCARIZACION_PEN;

  // --- Cobrar ---
  const construirYEnviar = useCallback(async (opts?: { aceptaRiesgo?: boolean; bajoCostoAuthId?: string }) => {
    setIsSubmitting(true);
    setError('');
    try {
      const venta = await ventaService.crearYCobrar({
        canalVenta: 'POS',
        sedeId,
        vendedorId: userId,
        clienteId,
        clienteEmpresaId,
        nombreCliente: clienteNombre || 'CLIENTES VARIOS',
        documentoCliente: documento.trim() || '00000000',
        moneda: 'PEN',
        tipoComprobante,
        tipoDocumentoCliente: tipoComprobante === 'FACTURA' ? '6' : '1',
        // Multi-RUC: emisorId solo para socios (el principal va sin él)
        ...(tipoComprobante !== 'TICKET' && emisorSel?.id ? { emisorId: emisorSel.id } : {}),
        esCredito,
        ...(esCredito && { plazoCredito: plazoDias, numeroCuotas }),
        ...(pagos.length > 0 && {
          metodoPago: pagos[0].metodoPago as MetodoPagoVenta,
          montoRecibido: totalPagado,
          pagos: pagos as PagoVentaDto[],
        }),
        detalles: items.map(it => it.esOrdenServicio
          ? {
              // Línea de orden de servicio: pura, cantidad 1, sin descuento.
              ordenServicioId: it.ordenServicioId,
              descripcion: it.descripcion,
              cantidad: 1,
              precioUnitario: it.precioUnitario,
              porcentajeIGV: it.porcentajeIGV,
              precioIncluyeIgv: it.precioIncluyeIgv,
              tipoAfectacion: it.tipoAfectacion,
            }
          : {
              productoId: it.productoId,
              varianteId: it.varianteId,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              ...(it.descuento > 0 && { descuento: it.descuento }),
              porcentajeIGV: it.porcentajeIGV,
              precioIncluyeIgv: it.precioIncluyeIgv,
              tipoAfectacion: it.tipoAfectacion,
              ...(it.icbper > 0 && { icbper: it.icbper * it.cantidad }),
              // Trazabilidad de combo expandido
              ...(it.origenComboId && { origenComboId: it.origenComboId, origenComboNombre: it.origenComboNombre }),
            }),
        ...(opts?.aceptaRiesgo && { aceptaRiesgoBancarizacion: true }),
        ...(opts?.bajoCostoAuthId && { ventaBajoCostoAutorizadaPorId: opts.bajoCostoAuthId }),
      });
      onSuccess(venta);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        const data = err.response.data;
        if (data?.code === 'PRECIO_DESACTUALIZADO' && data?.divergencias) {
          setDivergenciasPrecio(data.divergencias);
          return;
        }
        if (data?.code === 'STOCK_INSUFICIENTE' && data?.divergencias) {
          setDivergenciasStock(data.divergencias);
          return;
        }
        if (data?.code === 'ORDEN_YA_COBRADA' && Array.isArray(data?.ordenes)) {
          const ids = new Set(data.ordenes.map((o: { ordenServicioId: string }) => o.ordenServicioId));
          setItems(prev => prev.filter(it => !(it.ordenServicioId && ids.has(it.ordenServicioId))));
          setError(data.message || 'La orden ya fue cobrada en otra venta — se quitó del carrito');
          return;
        }
        if (data?.code === 'SALDO_ORDEN_DESACTUALIZADO' && Array.isArray(data?.divergencias)) {
          const ids = new Set(data.divergencias.map((d: { ordenServicioId: string }) => d.ordenServicioId));
          setItems(prev => prev.filter(it => !(it.ordenServicioId && ids.has(it.ordenServicioId))));
          setError('El costo de la orden cambió — se quitó del carrito. Vuelve a agregarla desde Venta Rápida.');
          return;
        }
        setError(data?.message || 'Conflicto al cobrar — reintenta');
        return;
      }
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al cobrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  }, [items, setItems, pagos, sedeId, userId, clienteId, clienteEmpresaId, clienteNombre, documento, tipoComprobante, emisorSel, esCredito, plazoDias, numeroCuotas, totalPagado, onSuccess]);

  const handleCobrar = () => {
    setError('');
    // Validaciones (paridad Flutter)
    if (tipoComprobante === 'FACTURA' && !/^\d{11}$/.test(documento.trim())) {
      setError('FACTURA requiere un RUC válido de 11 dígitos'); return;
    }
    if (esCredito && (esGenerico || (!clienteId && !clienteEmpresaId))) {
      setError('El crédito requiere un cliente identificado (busca por DNI/RUC)'); return;
    }
    // Orden 100% adelantada (saldo 0): se emite el comprobante sin cobrar nada hoy.
    const sinSaldoHoy = totalACobrar <= TOLERANCIA;
    if (!esCredito && !sinSaldoHoy && pagos.length === 0) { setError('Agrega al menos un pago'); return; }
    if (!esCredito && !sinSaldoHoy && !cubierto) { setError(`Faltan S/ ${fmt(faltante)} por cubrir`); return; }
    if (!clienteNombre.trim()) { setError('Indica el cliente (busca por documento o usa Genérico)'); return; }

    // Venta bajo costo → autorización
    if (requiereAutorizacionBajoCosto(items)) {
      if (esAutorizador && userId) {
        preCobro(userId);
      } else {
        setShowAutorizacionBC(true);
      }
      return;
    }
    preCobro(undefined);
  };

  const preCobro = (bajoCostoAuthId?: string) => {
    // Bancarización: confirmar riesgo antes de enviar
    if (aplicaBancarizacion) {
      setPendingBajoCosto(bajoCostoAuthId);
      setShowBancarizacion(true);
      return;
    }
    construirYEnviar({ bajoCostoAuthId });
  };

  const [pendingBajoCosto, setPendingBajoCosto] = useState<string | undefined>();

  // 409 PRECIO: aplicar precios del server y dejar reintentar (paridad aplicarPreciosNuevosDeBackend simplificada)
  const aplicarPreciosServer = () => {
    if (!divergenciasPrecio) return;
    setItems(prev => prev.map(it => {
      const div = divergenciasPrecio.find(d =>
        (d.varianteId && d.varianteId === it.varianteId) ||
        (!d.varianteId && d.productoId === it.productoId && !it.varianteId)
      );
      if (!div) return it;
      return { ...it, precioBase: div.precioServer, precioUnitario: div.precioServer, nivelAplicado: null };
    }));
    setDivergenciasPrecio(null);
  };

  // 409 STOCK: ajustar al disponible (quita los de 0, recalcula niveles)
  const ajustarStockServer = () => {
    if (!divergenciasStock) return;
    // Cambian las cantidades: se reprecia el carrito ENTERO, porque bajar una
    // linea puede sacar del mayoreo a las otras del mismo grupo.
    setItems(prev => recalcularNivelesEnLote(prev.flatMap(it => {
      const div = divergenciasStock.find(d =>
        (d.varianteId && d.varianteId === it.varianteId) ||
        (!d.varianteId && d.productoId === it.productoId && !it.varianteId)
      );
      if (!div) return [it];
      if (div.stockDisponible <= 0) return [];
      return [{ ...it, cantidad: div.stockDisponible }];
    })));
    setDivergenciasStock(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Cobrar</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#004A94]">S/ {fmt(total)}</p>
          {adelantoAplicado > 0 && (
            <p className="text-[11px] text-gray-500">Adelanto −S/ {fmt(adelantoAplicado)} · <span className="font-semibold text-green-600">a cobrar hoy S/ {fmt(totalACobrar)}</span></p>
          )}
        </div>
      </div>

      {hayOrdenes && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <p className="text-[11px] text-blue-700">🛠 Incluye orden(es) de servicio: el comprobante se emite por el total del servicio y el adelanto ya pagado se aplica como pago.</p>
        </div>
      )}

      {total >= UMBRAL_BANCARIZACION_PEN && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-[11px] text-amber-700">⚖ Venta ≥ S/ {UMBRAL_BANCARIZACION_PEN} — Ley 28194: si se paga en efectivo, el cliente pierde el derecho a deducir el IGV.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* === Comprobante + cliente + crédito === */}
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Comprobante</p>
            <div className="flex gap-2">
              {(['TICKET', 'BOLETA', 'FACTURA'] as const).map(t => {
                const bloqueado = t !== 'TICKET' && !puedeEmitir;
                return (
                  <button key={t} onClick={() => !bloqueado && setTipoComprobante(t)} disabled={bloqueado}
                    title={bloqueado ? 'Configura la facturación electrónica para emitir boletas/facturas' : undefined}
                    className={`flex-1 rounded-lg border p-2 text-xs font-medium ${tipoComprobante === t ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : bloqueado ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500'}`}>
                    {t}
                  </button>
                );
              })}
            </div>
            {!puedeEmitir && (
              <p className="mt-2 text-[10px] text-amber-600">⚠ Sin facturación electrónica configurada — solo Ticket interno.</p>
            )}
            {/* Selector de emisor (multi-RUC): solo con 2+ activos y comprobante electrónico */}
            {emisoresActivos.length >= 2 && tipoComprobante !== 'TICKET' && (
              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase text-teal-700">Emisor (RUC)</label>
                <select
                  className="w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs text-teal-900 outline-none focus:border-teal-500"
                  value={emisorSel?.ruc ?? ''}
                  onChange={e => setEmisorSel(emisoresActivos.find(em => em.ruc === e.target.value) ?? null)}>
                  {emisoresActivos.map(em => (
                    <option key={em.ruc} value={em.ruc}>{em.razonSocial} — {em.ruc}{em.tipo === 'EMPRESA' ? ' (principal)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Cliente</p>
              {tipoComprobante !== 'FACTURA' && (
                <button onClick={usarGenerico}
                  className={`rounded-lg border px-2 py-1 text-[10px] ${esGenerico ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-bold' : 'border-gray-200 text-gray-500'}`}>
                  Genérico
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input className={inputClass} value={documento}
                onChange={e => { setDocumento(e.target.value); setEsGenerico(false); }}
                placeholder={tipoComprobante === 'FACTURA' ? 'RUC (11 dígitos)' : 'DNI (8) o RUC (11)'}
                maxLength={11}
                onKeyDown={e => { if (e.key === 'Enter') buscarCliente(); }} />
              <button onClick={buscarCliente} disabled={buscandoCliente}
                className="shrink-0 rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                {buscandoCliente ? '...' : 'Buscar'}
              </button>
            </div>
            {clienteNombre && (
              <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">✓ {clienteNombre}</p>
            )}
          </div>

          {/* Crédito */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Condición de pago</p>
            <div className="flex gap-2">
              {(['CONTADO', 'CREDITO'] as const).map(c => (
                <button key={c} onClick={() => { setCondicionPago(c); if (c === 'CREDITO') setPagos([]); }}
                  className={`flex-1 rounded-lg border p-2 text-xs font-medium ${condicionPago === c ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {c === 'CONTADO' ? '💵 Contado' : '📅 Crédito'}
                </button>
              ))}
            </div>
            {esCredito && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-500">Cuotas</label>
                  <input className={inputClass} type="number" min="1" value={numeroCuotas}
                    onChange={e => { const n = parseInt(e.target.value) || 1; setNumeroCuotas(n); setPlazoDias(n * 30); }} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-gray-500">Plazo (días)</label>
                  <input className={inputClass} type="number" min="1" value={plazoDias}
                    onChange={e => setPlazoDias(parseInt(e.target.value) || 30)} />
                </div>
                <p className="col-span-2 text-[10px] text-gray-400">
                  {numeroCuotas} cuota{numeroCuotas > 1 ? 's' : ''} de ~S/ {fmt(total / numeroCuotas)} · requiere cliente identificado
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === Pagos === */}
        <div className="space-y-3">
          {!esCredito && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">Pagos</p>
              <div className="flex flex-wrap gap-1.5">
                {METODOS.map(m => (
                  <button key={m} onClick={() => seleccionarMetodo(m)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoActual === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className={inputClass + ' text-right'} type="number" step="0.01" min="0" value={montoInput}
                  onChange={e => setMontoInput(e.target.value)} placeholder={`S/ ${fmt(Math.max(0, faltante))}`} />
                {METODOS_DIGITALES.includes(metodoActual) && (
                  <input className={inputClass} value={refInput} onChange={e => setRefInput(e.target.value)} placeholder="N° operación" />
                )}
                {REQUIEREN_BANCO.includes(metodoActual) && (
                  <input className={`${inputClass} col-span-2`} value={bancoInput} onChange={e => setBancoInput(e.target.value)} placeholder="Banco (BCP, Interbank...) *" />
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => agregarPago()} disabled={!montoInput || parseFloat(montoInput) <= 0}
                  className="flex-1 rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-40">
                  Agregar pago
                </button>
                <button onClick={() => agregarPago(Math.max(0, faltante))} disabled={faltante <= TOLERANCIA}
                  className="rounded-lg border border-green-500 px-3 py-2 text-xs font-bold text-green-600 hover:bg-green-50 disabled:opacity-40">
                  Exacto
                </button>
              </div>

              {pagos.length > 0 && (
                <div className="mt-3 space-y-1">
                  {pagos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="text-gray-700">{p.metodoPago}{p.banco ? ` · ${p.banco}` : ''}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                      <span className="flex items-center gap-2">
                        <strong>S/ {fmt(p.monto)}</strong>
                        <button onClick={() => setPagos(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">✕</button>
                      </span>
                    </div>
                  ))}
                  {pagos.length > 1 && <p className="text-right text-[10px] font-semibold text-purple-600">Pago MIXTO</p>}
                </div>
              )}

              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Recibido</span><span className="font-medium">S/ {fmt(totalPagado)}</span></div>
                {faltante > TOLERANCIA && <div className="flex justify-between text-red-500"><span>Faltante</span><span className="font-bold">S/ {fmt(faltante)}</span></div>}
                {vuelto > TOLERANCIA && (
                  <div className="flex justify-between rounded-md bg-green-50 px-2 py-1 text-green-700"><span className="font-semibold">Vuelto</span><span className="font-bold">S/ {fmt(vuelto)}</span></div>
                )}
              </div>
            </div>
          )}

          {esCredito && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">📅 Venta a crédito — sin pagos hoy. Se generarán {numeroCuotas} cuota{numeroCuotas > 1 ? 's' : ''} (vence en {plazoDias} días).</p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

          <button onClick={handleCobrar} disabled={isSubmitting || items.length === 0}
            className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Procesando...' : esCredito ? `REGISTRAR CRÉDITO S/ ${fmt(totalACobrar)}` : totalACobrar <= TOLERANCIA ? 'EMITIR COMPROBANTE (pagado)' : `COBRAR S/ ${fmt(totalACobrar)}`}
          </button>
        </div>
      </div>

      {/* 409 PRECIO_DESACTUALIZADO */}
      {divergenciasPrecio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-amber-700">⚠ Precios actualizados</h3>
            <p className="mt-1 text-xs text-gray-500">Los precios cambiaron mientras armabas la venta:</p>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {divergenciasPrecio.map((d, i) => (
                <p key={i} className="text-xs text-gray-600">
                  <strong>{d.descripcion}</strong>: <span className="line-through text-gray-400">S/ {fmt(d.precioCliente)}</span> → <strong className="text-[#004A94]">S/ {fmt(d.precioServer)}</strong>
                </p>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDivergenciasPrecio(null)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={aplicarPreciosServer} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Actualizar precios</button>
            </div>
          </div>
        </div>
      )}

      {/* 409 STOCK_INSUFICIENTE */}
      {divergenciasStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-red-700">⚠ Stock insuficiente</h3>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {divergenciasStock.map((d, i) => (
                <p key={i} className="text-xs text-gray-600"><strong>{d.descripcion}</strong>: pides {d.cantidadSolicitada}, hay {d.stockDisponible}</p>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDivergenciasStock(null)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={ajustarStockServer} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">Ajustar al disponible</button>
            </div>
          </div>
        </div>
      )}

      {/* Bancarización Ley 28194 */}
      {showBancarizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-amber-700">⚖ Ley 28194 — Bancarización</h3>
            <p className="mt-2 text-xs text-gray-600">
              La venta supera S/ {UMBRAL_BANCARIZACION_PEN} y se está pagando en <strong>efectivo</strong>. El cliente <strong>pierde el derecho a deducir el IGV</strong> de esta operación. ¿El cliente asume el riesgo y deseas continuar?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowBancarizacion(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => { setShowBancarizacion(false); construirYEnviar({ aceptaRiesgo: true, bajoCostoAuthId: pendingBajoCosto }); }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autorización venta bajo costo */}
      <AutorizacionDialog
        isOpen={showAutorizacionBC}
        operacion="VENTA_BAJO_COSTO"
        titulo="Autorizar venta bajo costo"
        descripcion="Hay líneas con margen negativo (precio < costo) fuera de liquidación. Requiere autorización de un administrador o gerente."
        onAuthorized={(auth) => { setShowAutorizacionBC(false); preCobro(auth.autorizadoPorId); }}
        onClose={() => setShowAutorizacionBC(false)}
      />
    </div>
  );
}
