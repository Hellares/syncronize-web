'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import type { FuenteIngreso } from '@/core/types/cuentas-cobrar';
import type { BancoEmpresa } from '@/core/types/compra';
import { getBancos } from '@/features/compras/services/compra-service';
import * as cxcService from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import type { SugerenciaReparto, TitularDeposito } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import NumeroInput from '@/components/ui/NumeroInput';
import {
  INPUT_STD, LABEL, DIALOG_PANEL_RELIEVE_3XL, DIALOG_HEAD, DIALOG_BODY, DIALOG_FOOT,
} from '@/components/ui/dialogo';

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDia = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });

const mensaje = (err: unknown, porDefecto: string) => {
  const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
  return Array.isArray(msg) ? msg.join(', ') : msg || porDefecto;
};

const METODOS = [
  { id: 'TRANSFERENCIA', texto: 'Transferencia' },
  { id: 'YAPE', texto: 'Yape' },
  { id: 'PLIN', texto: 'Plin' },
  { id: 'EFECTIVO', texto: 'Efectivo' },
  { id: 'TARJETA', texto: 'Tarjeta' },
];

interface Props {
  titular: TitularDeposito;
  nombre: string;
  /**
   * `nuevo`: entra plata ahora (se registra el depósito) y se reparte.
   * `repartir`: la plata ya entró; solo se reparte el saldo a favor.
   */
  modo: 'nuevo' | 'repartir';
  onCerrar: () => void;
  onListo: (msg: string) => void;
}

/**
 * Depósito del cliente sin indicar qué paga + su reparto entre las ventas.
 *
 * El sistema PROPONE: cuotas completas, de la que vence primero a la última,
 * hasta donde alcance. La tienda puede cambiar cualquier monto. Lo que no se
 * reparte no se pierde: queda como saldo a favor del cliente.
 */
export default function DepositoClienteDialog({ titular, nombre, modo, onCerrar, onListo }: Props) {
  const [monto, setMonto] = useState(0);
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [fuente, setFuente] = useState<FuenteIngreso>('BANCO');
  const [bancoId, setBancoId] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);

  const [sugerencia, setSugerencia] = useState<SugerenciaReparto | null>(null);
  /** Cuánto va a cada venta (lo propuesto, o lo que la tienda corrigió). */
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // El saldo que ya tenía a favor, fijado en la primera consulta.
  const [saldoPrevio, setSaldoPrevio] = useState(0);
  const disponible = r2((modo === 'nuevo' ? monto : 0) + saldoPrevio);

  useEffect(() => {
    if (modo !== 'nuevo') return;
    let vivo = true;
    getBancos().then((b) => {
      if (!vivo) return;
      const enSoles = b.filter((x) => (x.moneda ?? 'PEN') === 'PEN');
      setBancos(enSoles);
      setBancoId((actual) => actual || (enSoles.find((x) => x.esPrincipal) ?? enSoles[0])?.id || '');
    }).catch(() => setBancos([]));
    return () => { vivo = false; };
  }, [modo]);

  // La propuesta se pide con lo que hay para repartir. Al abrir se pide con 0
  // para conocer la deuda y el saldo previo; después, cada vez que cambia el
  // monto (con una pausa, para no pedir en cada tecla).
  const pedido = useRef(0);
  const proponer = async (total: number) => {
    const n = ++pedido.current;
    try {
      const s = await cxcService.sugerirRepartoDeposito(titular, total);
      if (n !== pedido.current) return null;
      setSugerencia(s);
      setMontos(Object.fromEntries(s.ventas.filter((v) => v.sugerido > 0).map((v) => [v.ventaId, v.sugerido])));
      return s;
    } catch (err) {
      if (n === pedido.current) setError(mensaje(err, 'No se pudo cargar la deuda del cliente'));
      return null;
    }
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const s = await proponer(0);
      if (!vivo || !s) { if (vivo) setCargando(false); return; }
      setSaldoPrevio(s.saldoAFavor);
      if (s.saldoAFavor > 0) await proponer(s.saldoAFavor);
      if (vivo) setCargando(false);
    })();
    return () => { vivo = false; };
    // Una sola vez al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarMonto = (n: number) => {
    setMonto(n);
    setError('');
  };
  useEffect(() => {
    if (modo !== 'nuevo' || cargando) return;
    const t = setTimeout(() => { void proponer(r2(monto + saldoPrevio)); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monto]);

  const ventas = sugerencia?.ventas ?? [];
  const repartido = useMemo(() => r2(Object.values(montos).reduce((s, n) => s + (n || 0), 0)), [montos]);
  const queda = r2(disponible - repartido);
  const deuda = sugerencia?.deuda ?? 0;

  const pasadas = ventas.filter((v) => (montos[v.ventaId] ?? 0) > v.saldo + 0.001);
  const invalido = queda < -0.001 || pasadas.length > 0;

  const cambiarMetodo = (m: string) => {
    setMetodoPago(m);
    // El efectivo no entra a un banco; lo digital, por defecto, sí.
    setFuente(m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO');
  };

  const confirmar = async () => {
    const lineas = ventas
      .map((v) => ({ ventaId: v.ventaId, monto: r2(montos[v.ventaId] ?? 0) }))
      .filter((l) => l.monto > 0);
    if (modo === 'nuevo') {
      if (!(monto > 0)) { setError('Escribe cuánto depositó el cliente'); return; }
      if (fuente === 'BANCO' && !bancoId) { setError('Elige la cuenta a la que entró el depósito'); return; }
    } else if (!lineas.length) {
      setError('Indica cuánto va a cada venta');
      return;
    }
    if (invalido) return;
    setEnviando(true);
    setError('');
    try {
      if (modo === 'nuevo') {
        await cxcService.registrarDepositoCliente({
          ...(titular.clienteEmpresaId ? { clienteEmpresaId: titular.clienteEmpresaId } : { clienteId: titular.clienteId }),
          monto,
          metodoPago,
          referencia: referencia.trim() || undefined,
          fuente,
          ...(fuente === 'BANCO' ? { bancoId } : {}),
          ...(lineas.length ? { lineas } : {}),
        });
      } else {
        await cxcService.aplicarSaldoAFavor(titular, lineas);
      }
      const partes = [
        modo === 'nuevo' ? `Depósito de ${fmt(monto)} registrado` : 'Saldo repartido',
        lineas.length ? `${fmt(repartido)} en ${lineas.length} ${lineas.length === 1 ? 'venta' : 'ventas'}` : null,
        queda > 0.001 ? `${fmt(queda)} quedan a favor` : null,
      ].filter(Boolean);
      onListo(partes.join(' · '));
    } catch (err) {
      setError(mensaje(err, 'No se pudo registrar'));
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={enviando ? undefined : onCerrar}>
      <div role="dialog" aria-modal="true" className={DIALOG_PANEL_RELIEVE_3XL} onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">
            {modo === 'nuevo' ? 'Registrar depósito' : 'Repartir saldo a favor'} · {nombre}
          </h3>
          <p className="text-[11px] text-gray-500">
            {modo === 'nuevo'
              ? 'El cliente pagó sin decir qué compras cancela. Repártelo entre sus ventas; lo que no alcance queda a su favor.'
              : 'Plata que el cliente ya entregó y todavía no se aplicó a ninguna venta.'}
          </p>
        </div>

        <div className={DIALOG_BODY}>
          <div className="space-y-4 pb-3 pt-1">
            {modo === 'nuevo' && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label className={LABEL}>Monto depositado *</label>
                  <NumeroInput value={monto} onChange={cambiarMonto} ocultarSi={0} decimales={2} placeholder="0.00" className={`${INPUT_STD} text-right`} />
                </div>
                <div>
                  <label className={LABEL}>Método</label>
                  <select className={INPUT_STD} value={metodoPago} onChange={(e) => cambiarMetodo(e.target.value)}>
                    {METODOS.map((m) => <option key={m.id} value={m.id}>{m.texto}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>N° de operación</label>
                  <input className={INPUT_STD} value={referencia} maxLength={60} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
                </div>
                <div>
                  <label className={LABEL}>Entra a</label>
                  <select className={INPUT_STD} value={fuente} onChange={(e) => setFuente(e.target.value as FuenteIngreso)}>
                    {metodoPago !== 'EFECTIVO' && <option value="BANCO">Banco</option>}
                    <option value="TESORERIA">Tesorería (Caja Central)</option>
                    <option value="CAJA">Caja (mi caja abierta)</option>
                  </select>
                </div>
                {fuente === 'BANCO' && (
                  <div className="col-span-2 md:col-span-4">
                    <label className={LABEL}>Cuenta</label>
                    {bancos.length === 0 ? (
                      <p className="rounded-[6px] bg-orange-50 px-3 py-2 text-[11px] text-orange-700 ring-1 ring-orange-200">No hay cuentas bancarias en soles. Crea una en Tesorería.</p>
                    ) : (
                      <select className={INPUT_STD} value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
                        {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* De dónde sale lo que se reparte y cuánto debe. */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Cifra etiqueta="Deuda del cliente" valor={fmt(deuda)} clase="text-red-600" />
              <Cifra
                etiqueta="Para repartir"
                valor={fmt(disponible)}
                clase="text-[#004A94]"
                nota={modo === 'nuevo' && saldoPrevio > 0 ? `incluye ${fmt(saldoPrevio)} que ya tenía a favor` : undefined}
              />
              <Cifra etiqueta="Repartido" valor={fmt(repartido)} clase="text-green-700" />
              <Cifra
                etiqueta={queda < -0.001 ? 'Te pasaste por' : 'Queda a favor'}
                valor={fmt(Math.abs(queda))}
                clase={queda < -0.001 ? 'text-red-600' : 'text-amber-700'}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-700">Ventas con deuda</p>
                {ventas.length > 0 && (
                  <button type="button" onClick={() => void proponer(disponible)} className="text-[11px] font-medium text-[#437EFF] hover:underline">
                    Volver a proponer
                  </button>
                )}
              </div>
              {cargando ? (
                <p className="py-6 text-center text-xs text-gray-400">Cargando la deuda…</p>
              ) : ventas.length === 0 ? (
                <p className="rounded-[6px] bg-zinc-50 py-5 text-center text-xs text-gray-500 ring-1 ring-blue-400/40">
                  Este cliente no tiene ventas a crédito con saldo. {modo === 'nuevo' ? 'El depósito queda entero a su favor.' : ''}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-[6px] ring-1 ring-blue-400/40">
                  <table className="w-full text-left text-[12px]">
                    <thead className="border-b border-[#cfe0f5] bg-[#eaf2fd]">
                      <tr>
                        <th className="px-3 py-2 font-medium text-[#004A94]">Venta</th>
                        <th className="hidden whitespace-nowrap px-3 py-2 font-medium text-[#004A94] sm:table-cell">Próxima cuota</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-[#004A94]">Saldo</th>
                        <th className="w-32 whitespace-nowrap px-3 py-2 text-right font-medium text-[#004A94]">Aplicar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventas.map((v) => {
                        const aplica = montos[v.ventaId] ?? 0;
                        const pasada = aplica > v.saldo + 0.001;
                        return (
                          <tr key={v.ventaId} className={aplica > 0 ? 'bg-green-50/50' : undefined}>
                            <td className="px-3 py-1.5">
                              <span className="font-mono text-[11px] tracking-tight text-gray-700">{v.codigo}</span>
                              <span className="block text-[10px] text-gray-400">{fmtDia(v.fechaVenta)}</span>
                            </td>
                            <td className="hidden whitespace-nowrap px-3 py-1.5 text-gray-600 sm:table-cell">
                              {fmt(v.proximaCuota.monto)}
                              <span className="block text-[10px] text-gray-400">
                                {v.proximaCuota.numero ? `cuota ${v.proximaCuota.numero} · ` : ''}vence {fmtDia(v.proximaCuota.fechaVencimiento)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-900">{fmt(v.saldo)}</td>
                            <td className="px-3 py-1.5">
                              <NumeroInput
                                value={aplica}
                                onChange={(n) => { setError(''); setMontos((m) => ({ ...m, [v.ventaId]: n })); }}
                                ocultarSi={0}
                                decimales={2}
                                placeholder="0.00"
                                className={`${INPUT_STD} text-right`}
                              />
                              {pasada ? (
                                <span className="mt-0.5 block text-right text-[10px] text-red-600">máx. {fmt(v.saldo)}</span>
                              ) : aplica > 0 && aplica < v.saldo - 0.001 ? (
                                <button type="button" onClick={() => setMontos((m) => ({ ...m, [v.ventaId]: v.saldo }))}
                                  className="mt-0.5 block w-full text-right text-[10px] text-[#437EFF] hover:underline">
                                  saldar ({fmt(v.saldo)})
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {queda > 0.001 && ventas.length > 0 && deuda - repartido > 0.001 && (
                <p className="mt-2 rounded-[6px] bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
                  {fmt(queda)} no alcanzan para cubrir una cuota entera: quedan a favor del cliente, que aún deberá {fmt(r2(deuda - repartido))}.
                  Si prefieres, escríbelos como pago parcial en la venta que quieras.
                </p>
              )}
            </div>

            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>
        </div>

        <div className={DIALOG_FOOT}>
          <button type="button" onClick={onCerrar} disabled={enviando}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={() => void confirmar()} disabled={enviando || cargando || invalido}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {enviando ? 'Registrando…' : modo === 'nuevo' ? 'Registrar depósito' : 'Repartir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Cifra({ etiqueta, valor, clase, nota }: { etiqueta: string; valor: string; clase: string; nota?: string }) {
  return (
    <div className="rounded-[6px] bg-zinc-50 px-3 py-2 ring-1 ring-blue-400/40">
      <p className="text-[10px] text-gray-500">{etiqueta}</p>
      <p className={`text-sm font-medium tabular-nums ${clase}`}>{valor}</p>
      {nota && <p className="text-[10px] text-gray-400">{nota}</p>}
    </div>
  );
}
