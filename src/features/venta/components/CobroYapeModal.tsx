'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import type { MetodoPagoVenta, Venta, YapePrevio } from '@/core/types/venta';
import * as ventaService from '../services/venta-service';

/**
 * Cobro Yape/Plin con QR y validación — la misma hoja del app
 * (`cobro_yape_sheet.dart`), en la web.
 *
 * La venta YA existe: 100% Yape nace pendiente sin comprobante (registro
 * diferido); en un pago MIXTO nace con la parte no-Yape ya cobrada y acá se
 * cobra solo la porción Yape/Plin.
 *
 * Se cobra por TRAMOS: cada uno es un QR por hasta el límite por transacción
 * de la cuenta (una venta de 1500 con límite 500 son tres), y los métodos en
 * el orden en que el cajero los cargó (Yape primero, luego Plin). El cliente
 * escanea y paga; el celular lector recibe la notificación, api-yape la
 * empareja con el cobro del tramo y el webhook registra el pago. La web no
 * tiene push: consulta la venta cada 3 s — cuando sube el monto recibido,
 * pasa al siguiente tramo; con la venta pagada, se cierra.
 *
 * Si la notificación no llega, la cajera aprueba el tramo a mano —o elige el
 * Yape que ya había entrado antes—, o cubre parte con otro medio. Cancelar
 * borra la venta (o la anula y avisa cuánto devolver si ya entró plata). El
 * modal no se cierra por accidente: la venta y el stock ya están tomados.
 */

const POLL_MS = 3000;
const OTROS_MEDIOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN'] as const;
const REQUIEREN_BANCO = ['TARJETA', 'TRANSFERENCIA'];

// Mismo estilo que los inputs del cobro (CobroPanel).
const inputClass =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

export type MetodoQr = 'YAPE' | 'PLIN';
export interface TramoYape { metodo: MetodoQr; monto: number }

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

/** Método del tramo que cubre lo ya cobrado (Yape primero, luego Plin…). */
function metodoEnAcumulado(tramos: TramoYape[], acum: number): MetodoQr {
  let inicio = 0;
  for (const t of tramos) {
    const fin = inicio + t.monto;
    if (acum < fin - 0.001) return t.metodo;
    inicio = fin;
  }
  return tramos.length ? tramos[tramos.length - 1].metodo : 'YAPE';
}

/** Cuánto falta para cerrar el tramo actual: no se mezcla con el siguiente método. */
function restanteEnTramo(tramos: TramoYape[], montoTotal: number, acum: number): number {
  let inicio = 0;
  for (const t of tramos) {
    const fin = inicio + t.monto;
    if (acum < fin - 0.001) return r2(fin - acum);
    inicio = fin;
  }
  return r2(montoTotal - acum);
}

/**
 * Tramos por MÉTODO en el orden en que el cajero cargó los pagos (Yape 50 +
 * Plin 100 → Yape primero, luego Plin), recortados a `tope` desde el último
 * método si se cargó de más: al cliente no se le cobra de más.
 */
export function tramosPorMetodo(pagos: Array<{ metodoPago: string; monto: number }>, tope: number): TramoYape[] {
  const orden: TramoYape[] = [];
  for (const p of pagos) {
    if (p.metodoPago !== 'YAPE' && p.metodoPago !== 'PLIN') continue;
    const t = orden.find(x => x.metodo === p.metodoPago);
    if (t) t.monto += p.monto;
    else orden.push({ metodo: p.metodoPago, monto: p.monto });
  }
  let exceso = orden.reduce((a, t) => a + t.monto, 0) - tope;
  for (let i = orden.length - 1; i >= 0 && exceso > 0.001; i--) {
    const quita = Math.min(orden[i].monto, exceso);
    orden[i].monto -= quita;
    exceso -= quita;
  }
  return orden.filter(t => t.monto > 0.001).map(t => ({ metodo: t.metodo, monto: r2(t.monto) }));
}

/** El cobro que toca: lo que falta del tramo, hasta el límite por transacción. */
function siguienteCobro(tramos: TramoYape[], montoTotal: number, max: number, acum: number) {
  return {
    metodo: metodoEnAcumulado(tramos, acum),
    monto: r2(Math.min(restanteEnTramo(tramos, montoTotal, acum), max)),
  };
}

interface Props {
  ventaId: string;
  codigo: string;
  /** Porción Yape/Plin a cobrar (el total si es 100% Yape). */
  montoTotal: number;
  /** Por método, en el orden en que el cajero los cargó. */
  tramos: TramoYape[];
  /** Límite por transacción de la cuenta Yape: cada cobro va hasta ahí. */
  maxPorTransaccion: number;
  /** Cobrado con otros medios al crear la venta (pago mixto): cuenta al cancelar. */
  yaCobradoOtrosMedios?: number;
  onPagada: (venta: Venta) => void;
  onCancelada: (mensaje: string) => void;
}

export default function CobroYapeModal({
  ventaId, codigo, montoTotal, tramos, maxPorTransaccion, yaCobradoOtrosMedios = 0, onPagada, onCancelada,
}: Props) {
  const [acumulado, setAcumulado] = useState(0); // cobrado DESDE el modal
  const [cobro, setCobro] = useState(() => siguienteCobro(tramos, montoTotal, maxPorTransaccion, 0));
  const [iniciando, setIniciando] = useState(true);
  const [habilitado, setHabilitado] = useState(false); // api-yape generó el cobro
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [previos, setPrevios] = useState<YapePrevio[]>([]);
  const [previoSel, setPrevioSel] = useState<string | null>(null);
  const [referencia, setReferencia] = useState('00000');
  const [procesando, setProcesando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [otroMedio, setOtroMedio] = useState<{ metodo: string; monto: string; referencia: string; banco: string } | null>(null);
  const [error, setError] = useState('');

  // Refs y no estado: los leen el polling y callbacks asíncronos.
  const montado = useRef(true);
  const cerrado = useRef(false); // ya se avisó al padre (pagada o cancelada)
  const ocupado = useRef(false); // aprobando/cancelando: el polling espera
  const iniciado = useRef(false); // el primer cobro se crea UNA vez
  const listo = useRef(false); // el tramo actual tiene su línea base
  const generacion = useRef(0); // descarta respuestas de un tramo anterior
  const acumuladoRef = useRef(0);
  const cobroRef = useRef(cobro);
  const base = useRef(0); // monto recibido de la venta al empezar el tramo
  const ultimaVenta = useRef<Venta | null>(null);

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

  /** Crea el cobro del tramo en api-yape y trae QR, monto único y Yapes previos. */
  const cargarCobro = useCallback(async (metodo: MetodoQr, monto: number, gen: number) => {
    // Línea base ANTES de crear el cobro: un pago que entre justo después ya
    // no puede quedar contado adentro y trabar el avance del tramo.
    try {
      const v = await ventaService.getVenta(ventaId);
      ultimaVenta.current = v;
      if (gen === generacion.current) base.current = Number(v.montoRecibido ?? 0);
    } catch {
      // Sin línea base el tramo igual se cierra al pagarse la venta completa.
    }
    try {
      const c = await ventaService.cobroYape(ventaId, monto);
      if (!montado.current || gen !== generacion.current) return;
      setHabilitado(c.habilitado);
      setPayAmount(c.payAmount ?? null);
      setQrUrl(metodo === 'PLIN' ? (c.qrPlinUrl ?? c.qrYapeUrl) : (c.qrYapeUrl ?? c.qrPlinUrl));
    } catch {
      // api-yape caído: queda la aprobación manual (nunca se bloquea).
    } finally {
      if (montado.current && gen === generacion.current) {
        listo.current = true;
        setIniciando(false);
      }
    }
    try {
      const lista = await ventaService.pagosYapePrevios(ventaId, monto);
      if (!montado.current || gen !== generacion.current) return;
      setPrevios(lista);
    } catch {
      // Sin lista queda la aprobación manual de siempre.
    }
  }, [ventaId]);

  /** Pasa a otro cobro (siguiente tramo, u "otro medio" por Yape/Plin). */
  const prepararCobro = useCallback((metodo: MetodoQr, monto: number) => {
    const gen = ++generacion.current;
    listo.current = false;
    cobroRef.current = { metodo, monto };
    setCobro({ metodo, monto });
    setIniciando(true);
    setHabilitado(false);
    setPayAmount(null);
    setQrUrl(null);
    setPrevios([]);
    setPrevioSel(null);
    setReferencia('00000');
    setError('');
    cargarCobro(metodo, monto, gen);
  }, [cargarCobro]);

  const cerrarComoPagada = useCallback(async () => {
    let venta = ultimaVenta.current;
    try {
      venta = await ventaService.getVenta(ventaId);
    } catch {
      // Se sigue con la última lectura: el cobro ya quedó registrado.
    }
    if (venta) cerrarPagada(venta);
  }, [ventaId, cerrarPagada]);

  /** Un tramo se cobró (webhook, aprobación a mano u otro medio). */
  const avanzar = useCallback((monto: number) => {
    const acum = r2(acumuladoRef.current + monto);
    acumuladoRef.current = acum;
    setAcumulado(acum);
    if (acum >= montoTotal - 0.001) {
      listo.current = false;
      cerrarComoPagada();
      return;
    }
    const sig = siguienteCobro(tramos, montoTotal, maxPorTransaccion, acum);
    prepararCobro(sig.metodo, sig.monto);
  }, [tramos, montoTotal, maxPorTransaccion, cerrarComoPagada, prepararCobro]);

  // Primer cobro. Una sola vez: en desarrollo React monta dos veces y un
  // segundo cobro reservaría otro monto único en api-yape.
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    cargarCobro(cobroRef.current.metodo, cobroRef.current.monto, generacion.current);
  }, [cargarCobro]);

  // ¿Ya entró el pago? La web no tiene push: se consulta la venta.
  useEffect(() => {
    const t = setInterval(async () => {
      if (cerrado.current || ocupado.current || !listo.current) return;
      const gen = generacion.current;
      try {
        const v = await ventaService.getVenta(ventaId);
        ultimaVenta.current = v;
        if (gen !== generacion.current || ocupado.current || cerrado.current) return;
        if (v.estado === 'PAGADA_COMPLETA') {
          cerrarPagada(v);
        } else if (v.estado === 'ANULADA') {
          cerrarCancelada(`La venta ${codigo} se anuló: el cobro expiró.`);
        } else if (Number(v.montoRecibido ?? 0) >= base.current + cobroRef.current.monto - 0.5) {
          // Entró el pago de ESTE tramo (con tolerancia por los céntimos de
          // ruteo): al siguiente.
          avanzar(cobroRef.current.monto);
        }
      } catch (err) {
        // 404: la borró el vencimiento automático (30 min sin pagar) o se
        // canceló desde otro lado. Cualquier otro error es la red: reintenta.
        if (err instanceof AxiosError && err.response?.status === 404) {
          cerrarCancelada(`La venta ${codigo} ya no existe: se canceló o venció sin pago.`);
        }
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [ventaId, codigo, cerrarPagada, cerrarCancelada, avanzar]);

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

  const pendiente = r2(montoTotal - acumulado);

  /** Registra un pago a mano (tramo Yape/Plin o "otro medio") y avanza. */
  const registrar = async (
    data: Parameters<typeof ventaService.procesarPago>[1],
    alFallar?: () => void,
  ): Promise<boolean> => {
    if (ocupado.current || cerrado.current) return false;
    ocupado.current = true;
    setProcesando(true);
    setError('');
    try {
      await ventaService.procesarPago(ventaId, data);
      avanzar(data.monto);
      return true;
    } catch (err) {
      if (montado.current) setError(mensajeDeError(err, 'No se pudo registrar el pago'));
      alFallar?.();
      return false;
    } finally {
      ocupado.current = false;
      if (montado.current) setProcesando(false);
    }
  };

  const aprobar = () => {
    const sel = previoSel;
    return registrar(
      {
        metodoPago: cobro.metodo,
        monto: cobro.monto,
        // Con un Yape del buzón elegido, el backend lo verifica y guarda SU
        // referencia real; sin él, el N° a mano (00000 si queda vacío).
        ...(sel ? { yapePagoId: sel } : { referencia: referencia.trim() || '00000' }),
      },
      // Si otra caja tomó el Yape elegido, la lista se actualiza.
      sel ? () => {
        ventaService.pagosYapePrevios(ventaId, cobro.monto)
          .then(lista => {
            if (!montado.current) return;
            setPrevios(lista);
            setPrevioSel(s => (s && lista.some(p => p.id === s) ? s : null));
          })
          .catch(() => undefined);
      } : undefined,
    );
  };

  const abrirOtroMedio = () => {
    setError('');
    setOtroMedio({ metodo: 'EFECTIVO', monto: pendiente.toFixed(2), referencia: '', banco: '' });
  };

  const confirmarOtroMedio = async () => {
    if (!otroMedio) return;
    const leido = parseFloat(otroMedio.monto.replace(',', '.'));
    if (!(leido > 0)) {
      setError('Ingresá un monto válido');
      return;
    }
    const monto = r2(Math.min(leido, pendiente));
    const metodo = otroMedio.metodo;
    if (metodo === 'YAPE' || metodo === 'PLIN') {
      // Otro QR por ese método y monto (ej. se le acabó el Yape: el resto por Plin).
      setOtroMedio(null);
      prepararCobro(metodo, monto);
      return;
    }
    if (REQUIEREN_BANCO.includes(metodo) && !otroMedio.banco.trim()) {
      setError(`${metodo === 'TARJETA' ? 'La tarjeta' : 'La transferencia'} requiere indicar el banco`);
      return;
    }
    const ok = await registrar({
      metodoPago: metodo as MetodoPagoVenta,
      monto,
      ...(metodo !== 'EFECTIVO' && { referencia: otroMedio.referencia.trim() || '00000' }),
      ...(REQUIEREN_BANCO.includes(metodo) && { banco: otroMedio.banco.trim() }),
      // La bancarización ya se validó al armar el cobro (contando la porción
      // Yape como medio de pago): el backend solo ve este pago suelto.
      aceptaRiesgoBancarizacion: true,
    });
    if (ok && montado.current) setOtroMedio(null);
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
        await cerrarComoPagada();
        return;
      }
      cerrarCancelada(
        r.devuelto && r.devuelto > 0
          ? `Venta ${codigo} anulada: devolvé S/ ${fmt(r.devuelto)} al cliente (no se emitió comprobante).`
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

  const montoAPagar = payAmount ?? cobro.monto;
  const conCentimos = payAmount != null && Math.abs(payAmount - cobro.monto) >= 0.005;
  const nombreMetodo = cobro.metodo === 'PLIN' ? 'Plin' : 'Yape';
  const enPartes = acumulado > 0 || tramos.length > 1 || montoTotal > maxPorTransaccion + 0.001;
  const quedaMasDespues = cobro.monto < pendiente - 0.001;
  const yaEntroPlata = acumulado > 0 || yaCobradoOtrosMedios > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#004A94]">Cobro {nombreMetodo}</h3>
          <span className="text-[11px] text-gray-500">{codigo}</span>
        </div>
        {enPartes && (
          <p className="mt-1 text-[11px] text-gray-500">
            Cobrado S/ {fmt(acumulado)} de S/ {fmt(montoTotal)} · falta S/ {fmt(pendiente)}
          </p>
        )}

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
            {quedaMasDespues && (
              <p className="text-[11px] text-gray-500">
                Después de este pago quedan S/ {fmt(r2(pendiente - cobro.monto))}.
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

        {previos.length > 0 && !otroMedio && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-[11px] text-[#004A94]">
              Ya entró un {nombreMetodo} por este monto. ¿Es alguno de estos?
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

        {!previoSel && !otroMedio && (
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

        {otroMedio && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-[11px] text-[#004A94]">
              Pagar con otro medio (hasta S/ {fmt(pendiente)})
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                aria-label="Medio de pago"
                value={otroMedio.metodo}
                onChange={e => setOtroMedio({ ...otroMedio, metodo: e.target.value })}
                className={inputClass}
              >
                {OTROS_MEDIOS.map(m => (
                  <option key={m} value={m}>
                    {m === 'YAPE' ? 'Yape (QR)' : m === 'PLIN' ? 'Plin (QR)' : m.charAt(0) + m.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <input
                aria-label="Monto"
                value={otroMedio.monto}
                onChange={e => setOtroMedio({ ...otroMedio, monto: e.target.value })}
                inputMode="decimal"
                placeholder="Monto"
                className={inputClass}
              />
              {otroMedio.metodo !== 'EFECTIVO' && otroMedio.metodo !== 'YAPE' && otroMedio.metodo !== 'PLIN' && (
                <input
                  aria-label="N° de operación o voucher"
                  value={otroMedio.referencia}
                  onChange={e => setOtroMedio({ ...otroMedio, referencia: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  inputMode="numeric"
                  placeholder="N° op. / voucher (opcional)"
                  className={inputClass}
                />
              )}
              {REQUIEREN_BANCO.includes(otroMedio.metodo) && (
                <input
                  aria-label="Banco"
                  value={otroMedio.banco}
                  onChange={e => setOtroMedio({ ...otroMedio, banco: e.target.value })}
                  placeholder="Banco (BCP, Interbank...) *"
                  className={inputClass}
                />
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOtroMedio(null); setError(''); }}
                disabled={procesando}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmarOtroMedio}
                disabled={procesando}
                className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003a75] disabled:opacity-50"
              >
                {procesando ? 'Procesando…' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">{error}</div>
        )}

        {confirmarCancelar ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              {yaEntroPlata
                ? `Ya se cobró parte de la venta ${codigo}. Si cancelás, se ANULA y hay que DEVOLVERLE al cliente lo que pagó (no se emite comprobante). ¿Cancelar igual?`
                : `¿Cancelar la venta ${codigo}? Se borra y el stock vuelve.`}
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
                {procesando ? 'Cancelando…' : yaEntroPlata ? 'Cancelar y devolver' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        ) : !otroMedio && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
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
                onClick={abrirOtroMedio}
                disabled={procesando}
                className="rounded-lg border border-blue-200 px-3 py-2 text-xs text-[#004A94] hover:bg-blue-50 disabled:opacity-50"
              >
                ⇄ Pagar con otro medio
              </button>
            </div>
            <button
              type="button"
              onClick={aprobar}
              disabled={procesando || iniciando}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003a75] disabled:opacity-50"
            >
              {procesando
                ? 'Procesando…'
                : previoSel
                  ? 'Aprobar con este Yape'
                  : quedaMasDespues ? 'Aprobar y seguir' : 'Aprobar pago'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
