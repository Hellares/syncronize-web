'use client';

import { useState, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { Venta, EstadoVenta, MetodoPagoVenta } from '@/core/types/venta';
import { ESTADO_VENTA_CONFIG, puedeAnularVenta, puedePagarVenta, saldoPendienteVenta, esLineaGratuita } from '@/core/types/venta';
import EnvioVentaCard from '@/features/venta/components/EnvioVentaCard';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as ventaService from '@/features/venta/services/venta-service';
import * as devolucionService from '@/features/devoluciones/services/devolucion-service';
import type { Devolucion } from '@/core/types/devolucion';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';

const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];
const METODOS_PAGO: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VentaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userRoles } = useEmpresa();
  const permissions = usePermissions();
  const { state: authState } = useAuth();
  const userId = authState.status === 'authenticated' ? authState.user.id : '';
  const esAutorizador = userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol));

  const [venta, setVenta] = useState<Venta | null>(null);
  const [reversion, setReversion] = useState<Devolucion | null>(null);
  const [showReversion, setShowReversion] = useState(false);
  const [motivoReversion, setMotivoReversion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Dialogs
  const [showAnular, setShowAnular] = useState(false);
  const [showAutorizacion, setShowAutorizacion] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [showPago, setShowPago] = useState(false);
  const [showComprobante, setShowComprobante] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    try {
      setVenta(await ventaService.getVenta(id));
    } catch {
      setError('Error al cargar la venta');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // Reversión total existente (banner "venta revertida")
  useEffect(() => {
    if (!permissions.canViewDevoluciones) return;
    devolucionService.getReversionTotal(id).then(setReversion).catch(() => {});
  }, [id, permissions.canViewDevoluciones]);

  const procesarReversion = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const rev = await devolucionService.crearReversionTotal(id, motivoReversion.trim() || undefined);
      setReversion(rev);
      setShowReversion(false);
      setInfo('Reversión total procesada — stock reingresado y caja reversada');
      reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo procesar la reversión total');
      setShowReversion(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const anular = async (autorizadoPorId: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      await ventaService.anularVenta(id, { autorizadoPorId, motivo: motivoAnulacion.trim() });
      setShowAnular(false);
      setInfo('Venta anulada — stock revertido y egreso registrado en caja');
      reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al anular la venta');
      setShowAnular(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnular = () => {
    if (!motivoAnulacion.trim()) { setError('El motivo es obligatorio'); return; }
    setError('');
    if (esAutorizador && userId) anular(userId);
    else setShowAutorizacion(true);
  };

  const reintentarSunat = async () => {
    if (!venta?.comprobanteId) return;
    setIsSubmitting(true);
    setError('');
    try {
      await ventaService.reenviarComprobanteSunat(venta.comprobanteId);
      setInfo('Comprobante reenviado a SUNAT — revisa el estado en unos segundos');
      reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo reenviar el comprobante');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  if (!venta) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">{error || 'Venta no encontrada'}</p>
        <Link href="/dashboard/ventas" className="mt-2 inline-block text-sm text-[#437EFF]">← Ventas</Link>
      </div>
    );
  }

  const cfg = ESTADO_VENTA_CONFIG[(venta.estado ?? '') as EstadoVenta];
  const saldo = saldoPendienteVenta(venta);
  const totalPagado = (venta.pagos ?? []).reduce((a, p) => a + Number(p.monto), 0);
  const esMixto = (venta.pagos ?? []).length > 1;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href="/dashboard/ventas" className="text-sm text-gray-500 hover:text-[#004A94]">← Ventas</Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{venta.codigo}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg?.color ?? ''} ${cfg?.bg ?? 'bg-gray-100'}`}>{cfg?.label ?? venta.estado}</span>
            {venta.esCredito && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">📅 Crédito</span>}
            {venta.cotizacionCodigo && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{venta.cotizacionCodigo}</span>}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {fmtFecha(venta.fechaVenta ?? venta.creadoEn)} · {venta.sedeNombre ?? ''} · {(venta.vendedorAlias || venta.vendedorNombre) ?? ''}
            {venta.cajeroNombre ? ` · cobró ${venta.cajeroNombre}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/ventas/${id}/ticket`}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            🖨 Ticket
          </Link>
          {!venta.codigoComprobante && venta.estado === 'PAGADA_COMPLETA' && permissions.canManageVentas && (
            <button onClick={() => setShowComprobante(true)}
              className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5">
              Generar Comprobante
            </button>
          )}
          {puedePagarVenta(venta) && saldo > 0.005 && permissions.canManageVentas && (
            <button onClick={() => setShowPago(true)}
              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">
              Registrar Pago
            </button>
          )}
          {puedeAnularVenta(venta) && permissions.canManageVentas && (
            <button onClick={() => { setMotivoAnulacion(''); setShowAnular(true); }}
              className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
              Anular
            </button>
          )}
          {puedeAnularVenta(venta) && permissions.canManageDevoluciones && !reversion && (
            <Link href={`/dashboard/devoluciones/nueva?ventaId=${id}`}
              className="rounded-lg border border-orange-300 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50">
              Devolver
            </Link>
          )}
          {venta.comprobanteAnulado && !reversion && permissions.canManageDevoluciones && (
            <button onClick={() => { setMotivoReversion(''); setShowReversion(true); }}
              className="rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-600 hover:bg-purple-50">
              Reversión total
            </button>
          )}
        </div>
      </div>

      {info && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{info}</p></div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {venta.estado === 'ANULADA' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-red-700">⛔ VENTA ANULADA{venta.motivoAnulacion ? ` — ${venta.motivoAnulacion}` : ''}</p>
        </div>
      )}

      {reversion && (
        <Link href={`/dashboard/devoluciones/${reversion.id}`}
          className="block rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 hover:bg-purple-100">
          <p className="text-xs font-semibold text-purple-700">↩ VENTA REVERTIDA — {reversion.codigo} ({reversion.estado}). Ver devolución →</p>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cliente + comprobante */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Cliente</p>
            <p className="text-sm font-medium text-gray-900">{venta.nombreCliente ?? '—'}</p>
            {venta.documentoCliente && <p className="text-xs text-gray-500">{venta.documentoCliente}</p>}
            {(venta as { telefonoCliente?: string }).telefonoCliente && <p className="text-xs text-gray-500">📞 {(venta as { telefonoCliente?: string }).telefonoCliente}</p>}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Comprobante</p>
            {venta.codigoComprobante ? (
              <>
                <p className="font-mono text-sm font-medium text-gray-900">{venta.tipoComprobante} {venta.codigoComprobante}</p>
                {venta.comprobanteSunatStatus && (
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                    venta.comprobanteSunatStatus === 'ACEPTADO' ? 'bg-green-100 text-green-700'
                    : venta.comprobanteSunatStatus === 'RECHAZADO' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'}`}>
                    SUNAT: {venta.comprobanteSunatStatus}
                  </span>
                )}
                {venta.comprobanteSunatStatus === 'RECHAZADO' && venta.comprobanteErrorProveedor && (
                  <p className="mt-1 text-[10px] text-red-600">{venta.comprobanteErrorProveedor}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {venta.comprobanteSunatPdfUrl && <a href={venta.comprobanteSunatPdfUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#437EFF] hover:underline">PDF</a>}
                  {venta.comprobanteSunatXmlUrl && <a href={venta.comprobanteSunatXmlUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#437EFF] hover:underline">XML</a>}
                  {venta.comprobanteEnlaceProveedor && <a href={venta.comprobanteEnlaceProveedor} target="_blank" rel="noreferrer" className="text-[11px] text-[#437EFF] hover:underline">Ver online</a>}
                  {/* Reintentar solo PENDIENTE/ERROR_COMUNICACION (paridad app); RECHAZADOS se reenvían desde Facturación */}
                  {(venta.comprobanteSunatStatus === 'PENDIENTE' || venta.comprobanteSunatStatus === 'ERROR_COMUNICACION') && venta.comprobanteId && permissions.canManageVentas && (
                    <button onClick={reintentarSunat} disabled={isSubmitting}
                      className="text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-50">
                      ↻ Reintentar envío
                    </button>
                  )}
                  {venta.comprobanteSunatStatus === 'RECHAZADO' && (
                    <Link href="/dashboard/facturacion" className="text-[11px] font-semibold text-red-500 hover:underline">
                      Reenviar desde Facturación →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">{venta.tipoComprobante ?? 'TICKET'} interno (sin comprobante electrónico)</p>
            )}
          </div>

          {/* Envío (rótulo de agencia) */}
          {(venta.conEnvio || permissions.canManageVentas) && venta.estado !== 'ANULADA' && (
            <EnvioVentaCard venta={venta} canManage={permissions.canManageVentas} onUpdated={reload} />
          )}

          {/* Pago */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Pago{esMixto ? ' (MIXTO)' : ''}</p>
            {(venta.pagos ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">{venta.esCredito ? 'Crédito — sin pagos aún' : 'Sin pagos registrados'}</p>
            ) : (
              <div className="space-y-1">
                {venta.pagos!.map(p => (
                  <div key={p.id} className="flex justify-between rounded-md bg-gray-50 px-2 py-1.5 text-xs">
                    <span className="text-gray-600">{METODO_PAGO_LABEL[p.metodoPago] ?? p.metodoPago}{p.banco ? ` · ${p.banco}` : ''}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                    <strong>{fmt(p.monto)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 space-y-0.5 border-t border-gray-100 pt-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Pagado</span><strong>{fmt(totalPagado)}</strong></div>
              {Number(venta.montoCambio ?? 0) > 0 && <div className="flex justify-between text-green-600"><span>Vuelto</span><strong>{fmt(venta.montoCambio)}</strong></div>}
              {saldo > 0.005 && venta.estado !== 'ANULADA' && <div className="flex justify-between text-amber-600"><span>Saldo pendiente</span><strong>{fmt(saldo)}</strong></div>}
            </div>
          </div>

          {/* Cuotas crédito */}
          {venta.esCredito && (venta.cuotas ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Cuotas ({venta.cuotas!.length})</p>
              <div className="space-y-1">
                {venta.cuotas!.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5 text-xs">
                    <span className="text-gray-600">
                      #{c.numero ?? i + 1} · vence {c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-PE') : '—'}
                      {(c.diasVencido ?? 0) > 0 && <span className="ml-1 text-red-500 font-semibold">+{c.diasVencido}d</span>}
                    </span>
                    <span className="flex items-center gap-1">
                      <strong>{fmt(c.monto)}</strong>
                      <span className={`rounded px-1 text-[9px] font-bold ${c.estado === 'COMPLETADO' || c.estado === 'PAGADA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.estado}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Items ({(venta.detalles ?? []).length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {(venta.detalles ?? []).map(d => {
                const gratuita = esLineaGratuita(d);
                return (
                  <div key={d.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${d.origenComboId ? 'bg-purple-50/40' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {d.origenComboId && <span className="mr-1 rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">COMBO {d.origenComboNombre}</span>}
                        {d.ordenServicioId && <span className="mr-1 rounded bg-blue-100 px-1 text-[8px] font-bold text-blue-700">OS</span>}
                        {gratuita && <span className="mr-1 rounded bg-violet-100 px-1 text-[8px] font-bold text-violet-700" title="Operación gratuita (regalo/bonificación) — precio de lista como referencial SUNAT">GRATUITA</span>}
                        {d.descripcion}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {Number(d.cantidad)} × {fmt(d.precioUnitario)}
                        {!gratuita && Number(d.descuento ?? 0) > 0 && <span className="text-amber-600"> · desc {fmt(d.descuento)}</span>}
                        {d.nivelAplicadoSnapshot && <span className="ml-1 rounded bg-blue-100 px-1 text-blue-700">{d.nivelAplicadoSnapshot}</span>}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${gratuita ? 'text-violet-600' : 'text-gray-800'}`}>{gratuita ? 'S/ 0.00' : fmt(d.total)}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-0.5 border-t border-gray-100 px-4 py-3 text-sm">
              {venta.codigoComprobante ? (
                // Desglose fiscal SUNAT (paridad footer Flutter): el descuento fiscal excluye
                // el "descuento" de líneas gratuitas (esas van como Op. Gratuitas referenciales)
                (() => {
                  const descGratuitas = (venta.detalles ?? []).filter(esLineaGratuita).reduce((a, d) => a + Number(d.descuento ?? 0), 0);
                  const descuentoFiscal = Math.max(0, Number(venta.descuento ?? 0) - descGratuitas);
                  return (
                    <>
                      {Number(venta.comprobanteGravada ?? 0) > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Op. Gravada</span><span>{fmt(venta.comprobanteGravada)}</span></div>}
                      {Number(venta.comprobanteExonerada ?? 0) > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Op. Exonerada</span><span>{fmt(venta.comprobanteExonerada)}</span></div>}
                      {Number(venta.comprobanteInafecta ?? 0) > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Op. Inafecta</span><span>{fmt(venta.comprobanteInafecta)}</span></div>}
                      {Number(venta.comprobanteGratuitas ?? 0) > 0 && (
                        <div className="flex justify-between text-xs text-violet-600" title="Valor referencial de regalos/bonificaciones — no suma al total">
                          <span>Op. Gratuitas</span><span>{fmt(venta.comprobanteGratuitas)}</span>
                        </div>
                      )}
                      {descuentoFiscal > 0.005 && <div className="flex justify-between text-xs text-amber-600"><span>Descuento</span><span>−{fmt(descuentoFiscal)}</span></div>}
                      <div className="flex justify-between text-xs text-gray-500"><span>IGV</span><span>{fmt(venta.comprobanteIgv ?? venta.impuestos)}</span></div>
                      {Number(venta.comprobanteIcbper ?? 0) > 0 && <div className="flex justify-between text-xs text-gray-500"><span>ICBPER</span><span>{fmt(venta.comprobanteIcbper)}</span></div>}
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(venta.subtotal)}</span></div>
                  {Number(venta.descuento ?? 0) > 0 && <div className="flex justify-between text-xs text-amber-600"><span>Descuento</span><span>−{fmt(venta.descuento)}</span></div>}
                  <div className="flex justify-between text-xs text-gray-500"><span>IGV</span><span>{fmt(venta.impuestos)}</span></div>
                </>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-bold text-gray-900"><span>Total</span><span>{fmt(venta.total)}</span></div>
            </div>
          </div>

          {venta.observaciones && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Observaciones</p>
              <p className="text-sm text-gray-600">{venta.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog anular */}
      {showAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAnular(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-red-700">Anular venta {venta.codigo}</h3>
            <p className="mt-1 text-xs text-gray-500">Se revertirá el stock y se registrará el egreso en caja. {venta.codigoComprobante ? 'El comprobante se anulará con nota de crédito.' : ''}</p>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[60px]"
              value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)}
              placeholder="Motivo de la anulación *" autoFocus />
            {!esAutorizador && <p className="mt-1 text-[10px] text-amber-600">⚠ Se pedirá autorización de un administrador.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAnular(false)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAnular} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Anulando...' : 'Anular Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AutorizacionDialog
        isOpen={showAutorizacion}
        operacion="ANULAR_VENTA"
        titulo="Autorizar anulación de venta"
        descripcion="Anular una venta requiere autorización de un administrador o gerente."
        motivo={motivoAnulacion}
        onAuthorized={(auth) => { setShowAutorizacion(false); anular(auth.autorizadoPorId); }}
        onClose={() => setShowAutorizacion(false)}
      />

      {/* Dialog pago */}
      {showPago && (
        <RegistrarPagoDialog
          ventaId={id}
          saldo={saldo}
          onSuccess={() => { setShowPago(false); setInfo('Pago registrado'); reload(); }}
          onClose={() => setShowPago(false)}
        />
      )}

      {/* Dialog generar comprobante */}
      {showComprobante && (
        <GenerarComprobanteDialog
          ventaId={id}
          documentoCliente={venta.documentoCliente ?? ''}
          onSuccess={() => { setShowComprobante(false); setInfo('Comprobante en proceso — revisa el estado SUNAT'); reload(); }}
          onClose={() => setShowComprobante(false)}
        />
      )}

      {/* Dialog reversión total */}
      {showReversion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowReversion(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-purple-700">Reversión total de {venta.codigo}</h3>
            <p className="mt-1 text-xs text-gray-500">
              El comprobante (y sus notas) ya están anulados en SUNAT. Se reingresará todo el stock, se reversará la caja del cobro y se anularán las cuotas pendientes. Esta acción es definitiva.
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[60px]"
              value={motivoReversion} onChange={e => setMotivoReversion(e.target.value)}
              placeholder="Motivo (opcional)" autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowReversion(false)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={procesarReversion} disabled={isSubmitting}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                {isSubmitting ? 'Procesando...' : 'Procesar reversión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Registrar pago de crédito (paridad bottomsheet Flutter) --- */
function RegistrarPagoDialog({ ventaId, saldo, onSuccess, onClose }: { ventaId: string; saldo: number; onSuccess: () => void; onClose: () => void }) {
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('EFECTIVO');
  const [monto, setMonto] = useState(saldo > 0 ? saldo.toFixed(2) : '');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Monto inválido'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await ventaService.procesarPago(ventaId, {
        metodoPago,
        monto: m,
        referencia: metodoPago !== 'EFECTIVO' ? (referencia.trim() || undefined) : undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Registrar pago</h3>
        <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Saldo pendiente: <strong>{fmt(saldo)}</strong></p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {METODOS_PAGO.map(m => (
            <button key={m} onClick={() => setMetodoPago(m)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoPago === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
              {METODO_PAGO_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:border-[#437EFF]"
            type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
          {metodoPago !== 'EFECTIVO' && (
            <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Referencia" />
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Generar comprobante (TICKET → BOLETA/FACTURA) --- */
function GenerarComprobanteDialog({ ventaId, documentoCliente, onSuccess, onClose }: { ventaId: string; documentoCliente: string; onSuccess: () => void; onClose: () => void }) {
  const esRuc = /^\d{11}$/.test(documentoCliente);
  const [tipo, setTipo] = useState<'BOLETA' | 'FACTURA'>(esRuc ? 'FACTURA' : 'BOLETA');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await ventaService.generarComprobante(ventaId, { tipoComprobante: tipo });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al generar el comprobante');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Generar comprobante</h3>
        <div className="mt-3 flex gap-2">
          {(['BOLETA', 'FACTURA'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg border p-2 text-xs font-medium ${tipo === t ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>
        {tipo === 'FACTURA' && !esRuc && <p className="mt-2 text-[10px] text-amber-600">⚠ El documento del cliente no es un RUC de 11 dígitos.</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>
    </div>
  );
}
