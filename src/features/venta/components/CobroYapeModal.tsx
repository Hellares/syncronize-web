'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import type { Venta, YapePrevio } from '@/core/types/venta';
import * as ventaService from '../services/venta-service';

/**
 * Cobro Yape/Plin con QR y validación — la misma hoja del app
 * (`cobro_yape_sheet.dart`), en la web.
 *
 * La venta YA existe (registro diferido: stock descontado, sin comprobante).
 * El cliente escanea el QR del monitor y paga; el celular lector de la tienda
 * recibe la notificación, api-yape la empareja con este cobro y el webhook
 * registra el pago. La web no tiene push: se entera consultando la venta cada
 * 3 s (el app hace lo mismo como respaldo del FCM).
 *
 * Si la notificación no llega, la cajera aprueba a mano — o elige el Yape
 * que ya había entrado antes de la venta. Cancelar borra la venta y el stock
 * vuelve. El modal no se cierra por accidente: la venta y el stock ya están
 * tomados.
 */

const POLL_MS = 3000;

// Mismo estilo que los inputs del cobro (CobroPanel).
const inputClass =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hace(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

function mensajeDeError(err: unknown, porDefecto: string): string {
  const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
  return Array.isArray(msg) ? msg.join(', ') : msg || porDefecto;
}

interface Props {
  ventaId: string;
  codigo: string;
  /** Monto Yape/Plin a cobrar (fase 1: un solo tramo, hasta el límite por transacción). */
  monto: number;
  metodo: 'YAPE' | 'PLIN';
  onPagada: (venta: Venta) => void;
  onCancelada: (mensaje: string) => void;
}

export default function CobroYapeModal({ ventaId, codigo, monto, metodo, onPagada, onCancelada }: Props) {
  const [iniciando, setIniciando] = useState(true);
  const [habilitado, setHabilitado] = useState(false); // api-yape generó el cobro
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [previos, setPrevios] = useState<YapePrevio[]>([]);
  const [previoSel, setPrevioSel] = useState<string | null>(null);
  const [referencia, setReferencia] = useState('00000');
  const [procesando, setProcesando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [error, setError] = useState('');

  // Refs y no estado: los leen el polling y callbacks asíncronos.
  const montado = useRef(true);
  const cerrado = useRef(false); // ya se avisó al padre (pagada o cancelada)
  const ocupado = useRef(false); // aprobando/cancelando: el polling espera
  const iniciado = useRef(false); // el cobro en api-yape se crea UNA vez

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  // Los callbacks del padre llegan nuevos en cada render: van por ref para
  // que el polling no se rearme en cada render del panel.
  const onPagadaRef = useRef(onPagada);
  const onCanceladaRef = useRef(onCancelada);
  useEffect(() => {
    onPagadaRef.current = onPagada;
    onCanceladaRef.current = onCancelada;
  }, [onPagada, onCancelada]);

  const cerrarPagada = useCallback((venta: Venta) => {
    if (cerrado.current) return;
    cerrado.current = true;
    onPagadaRef.current(venta);
  }, []);

  const cerrarCancelada = useCallback((mensaje: string) => {
    if (cerrado.current) return;
    cerrado.current = true;
    onCanceladaRef.current(mensaje);
  }, []);

  const cargarPrevios = useCallback(async () => {
    try {
      const lista = await ventaService.pagosYapePrevios(ventaId, monto);
      if (!montado.current) return;
      setPrevios(lista);
      // Si el elegido ya no está (lo tomó otra caja), se suelta.
      setPrevioSel(sel => (sel && lista.some(p => p.id === sel) ? sel : null));
    } catch {
      // Sin lista queda la aprobación manual de siempre.
    }
  }, [ventaId, monto]);

  // Crear el cobro en api-yape (QR + monto único). Una sola vez: en desarrollo
  // React monta dos veces y un segundo cobro reservaría otro monto único.
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    (async () => {
      try {
        const c = await ventaService.cobroYape(ventaId, monto);
        if (!montado.current) return;
        setHabilitado(c.habilitado);
        setPayAmount(c.payAmount ?? null);
        setQrUrl(metodo === 'PLIN' ? (c.qrPlinUrl ?? c.qrYapeUrl) : (c.qrYapeUrl ?? c.qrPlinUrl));
      } catch {
        // api-yape caído: queda la aprobación manual (nunca se bloquea).
      } finally {
        if (montado.current) setIniciando(false);
      }
      cargarPrevios();
    })();
  }, [ventaId, monto, metodo, cargarPrevios]);

  // ¿Ya entró el pago? La web no tiene push: se consulta la venta.
  useEffect(() => {
    const t = setInterval(async () => {
      if (cerrado.current || ocupado.current) return;
      try {
        const v = await ventaService.getVenta(ventaId);
        if (v.estado === 'PAGADA_COMPLETA') cerrarPagada(v);
        else if (v.estado === 'ANULADA') cerrarCancelada(`La venta ${codigo} se anuló: el cobro expiró.`);
      } catch (err) {
        // 404: la borró el vencimiento automático (30 min sin pagar) o se
        // canceló desde otro lado. Cualquier otro error es la red: reintenta.
        if (err instanceof AxiosError && err.response?.status === 404) {
          cerrarCancelada(`La venta ${codigo} ya no existe: se canceló o venció sin pago.`);
        }
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [ventaId, codigo, cerrarPagada, cerrarCancelada]);

  // Cerrar la pestaña con el cobro abierto deja la venta pendiente (el
  // vencimiento la borra a los 30-40 min): se avisa antes.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (cerrado.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, []);

  const aprobar = async () => {
    if (ocupado.current || cerrado.current) return;
    ocupado.current = true;
    setProcesando(true);
    setError('');
    try {
      const registrada = await ventaService.procesarPago(ventaId, {
        metodoPago: metodo,
        monto,
        // Con un Yape del buzón elegido, el backend lo verifica y guarda SU
        // referencia real; sin él, el N° a mano (00000 si queda vacío).
        ...(previoSel ? { yapePagoId: previoSel } : { referencia: referencia.trim() || '00000' }),
      });
      let venta = registrada;
      try {
        venta = await ventaService.getVenta(ventaId);
      } catch {
        // El pago quedó registrado: se sigue con lo que devolvió el cobro.
      }
      cerrarPagada(venta);
    } catch (err) {
      if (montado.current) setError(mensajeDeError(err, 'No se pudo registrar el pago'));
      // Si otra caja tomó el Yape elegido, la lista se actualiza.
      if (previoSel) cargarPrevios();
    } finally {
      ocupado.current = false;
      if (montado.current) setProcesando(false);
    }
  };

  const cancelar = async () => {
    if (ocupado.current || cerrado.current) return;
    ocupado.current = true;
    setProcesando(true);
    setError('');
    try {
      const r = await ventaService.cancelarCobroYape(ventaId);
      if (r.yaPagada) {
        // El pago entró justo antes de cancelar: la venta está pagada.
        cerrarPagada(await ventaService.getVenta(ventaId));
        return;
      }
      cerrarCancelada(
        r.devuelto && r.devuelto > 0
          ? `Venta ${codigo} anulada: devolvé S/ ${fmt(r.devuelto)} al cliente.`
          : `Venta ${codigo} cancelada: el stock volvió.`,
      );
    } catch (err) {
      if (montado.current) {
        setError(mensajeDeError(err, 'No se pudo cancelar la venta'));
        setConfirmarCancelar(false);
      }
    } finally {
      ocupado.current = false;
      if (montado.current) setProcesando(false);
    }
  };

  const montoAPagar = payAmount ?? monto;
  const conCentimos = payAmount != null && Math.abs(payAmount - monto) >= 0.005;
  const nombreMetodo = metodo === 'PLIN' ? 'Plin' : 'Yape';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#004A94]">Cobro {nombreMetodo}</h3>
          <span className="text-[11px] text-gray-500">{codigo}</span>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="flex items-center justify-center">
            {iniciando ? (
              <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-gray-100" />
            ) : qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR de ${nombreMetodo}`}
                className="h-[200px] w-[200px] rounded-lg border border-blue-200 object-contain p-2"
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 p-3 text-center text-[11px] text-gray-500">
                Sin QR configurado: el cliente paga al número de {nombreMetodo} de la tienda.
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-3">
            <p className="text-xs text-gray-600">
              {qrUrl ? 'Escaneá el QR y pagá exactamente:' : 'Pedile al cliente que pague exactamente:'}
            </p>
            <p className="text-3xl font-bold text-[#004A94]">S/ {fmt(montoAPagar)}</p>
            {conCentimos && (
              <p className="text-[11px] text-amber-700">
                Con los céntimos: hay otro cobro igual abierto y así cada pago va a su venta.
              </p>
            )}
            {habilitado ? (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-[#004A94]" />
                Esperando el pago…
              </div>
            ) : (
              !iniciando && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                  Verificá el comprobante del cliente y aprobá el pago.
                </div>
              )
            )}
          </div>
        </div>

        {previos.length > 0 && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-[11px] text-[#004A94]">
              Ya entró un Yape por este monto. ¿Es alguno de estos?
            </p>
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
              {previos.map(p => {
                const sel = previoSel === p.id;
                const detalle = [hace(p.receivedAt), p.calzaNombre ? 'coincide el nombre' : '']
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={procesando}
                    onClick={() => setPrevioSel(sel ? null : p.id)}
                    className={sel
                      ? 'flex w-full items-center gap-2.5 rounded-md bg-white px-2 py-2 text-left ring-1 ring-blue-400'
                      : 'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-white'}
                  >
                    <span className={sel
                      ? 'h-3.5 w-3.5 shrink-0 rounded-full border-4 border-[#004A94]'
                      : 'h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-400'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-[#004A94]">
                        {p.senderName?.trim() || 'Sin nombre'}
                      </span>
                      {detalle && (
                        <span className={p.calzaNombre ? 'block text-[10px] text-green-700' : 'block text-[10px] text-gray-500'}>
                          {detalle}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[#004A94]">S/ {fmt(p.amount)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!previoSel && (
          <div className="mt-4">
            <label htmlFor="cobro-yape-ref" className="mb-1 block text-[11px] text-gray-500">
              N° de operación (opcional)
            </label>
            <input
              id="cobro-yape-ref"
              value={referencia}
              onChange={e => setReferencia(e.target.value.replace(/\D/g, '').slice(0, 12))}
              inputMode="numeric"
              placeholder="N° op."
              className={inputClass}
            />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">{error}</div>
        )}

        {confirmarCancelar ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              ¿Cancelar la venta {codigo}? Se borra y el stock vuelve.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarCancelar(false)}
                disabled={procesando}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                No, seguir cobrando
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={procesando}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {procesando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirmarCancelar(true)}
              disabled={procesando}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar venta
            </button>
            <button
              type="button"
              onClick={aprobar}
              disabled={procesando || iniciando}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003a75] disabled:opacity-50"
            >
              {procesando ? 'Procesando…' : previoSel ? 'Aprobar con este Yape' : 'Aprobar pago'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
