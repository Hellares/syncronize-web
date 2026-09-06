'use client';

/**
 * Lo que se abre al desplegar una venta en el estado de cuenta del cliente.
 *
 * Una sola llamada: `getVenta` trae los tres bloques --productos, cuotas y
 * abonos-- así que desplegar cuesta un GET, no tres. El estado de cuenta no
 * manda nada de esto en su respuesta y por eso se pide acá, recién al abrir.
 */

import { useEffect, useState } from 'react';
import type { VentaCreditoEC } from '@/core/types/cuentas-cobrar';
import type { Venta, VentaDetalle } from '@/core/types/venta';
import { getVenta } from '@/features/venta/services/venta-service';
import VentaProductosTabla from '@/features/venta/components/VentaProductosTabla';
import { tonoDe, type TonoEstado } from './tono-estado';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

function Bloque({ titulo, tono, children }: { titulo: string; tono: TonoEstado; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg bg-gradient-to-br p-3 shadow-sm ring-1 ${tono.fondo} ${tono.ring}`}>
      <p className={`mb-1.5 text-[9px] font-bold uppercase tracking-[0.06em] ${tono.titulo}`}>{titulo}</p>
      {children}
    </div>
  );
}

export default function VentaEstadoCuentaDetalle({ venta }: { venta: VentaCreditoEC }) {
  const [data, setData] = useState<Venta | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getVenta(venta.ventaId)
      .then(v => { if (!cancelado) setData(v); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, [venta.ventaId]);

  const tono = tonoDe(venta.estado);
  const lineas: VentaDetalle[] | null = data ? (data.detalles ?? []) : null;
  const cuotas = data?.cuotas ?? [];
  // Los abonos anulados no cuentan para el saldo, pero SI se muestran: explican
  // por que el saldo no bajo cuando alguien recuerda haber cobrado.
  const pagos = data?.pagos ?? [];

  return (
    <div className="space-y-3 bg-[#f9fbff] px-4 pb-4 pt-3 sm:pl-12">
      <Bloque titulo="Productos de la venta" tono={tono}>
        <VentaProductosTabla lineas={lineas} error={error} />
      </Bloque>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bloque titulo={cuotas.length > 0 ? `Cuotas (${cuotas.length})` : 'Cuotas'} tono={tono}>
          {data == null ? (
            <p className="text-[11px] text-gray-400">Cargando…</p>
          ) : cuotas.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-gray-500">
              Crédito sin cuotas: se cobra el saldo completo al vencimiento
              {venta.fechaVencimiento ? ` (${fmtFecha(venta.fechaVencimiento)})` : ''}.
            </p>
          ) : (
            <div className="space-y-1">
              {cuotas.map(cu => {
                const saldo = Number(cu.saldoPendiente ?? 0);
                return (
                  <div key={cu.id} className="flex items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1 text-[11px]">
                    <span className="text-gray-600">
                      #{cu.numero} · {fmtFecha(cu.fechaVencimiento)}
                      {Number(cu.diasVencido ?? 0) > 0 && (
                        <span className="ml-1 font-semibold text-red-600">+{Number(cu.diasVencido)}d</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {Number(cu.mora ?? cu.montoMora ?? 0) > 0 && (
                        <span className="text-red-600">mora {fmt(Number(cu.mora ?? cu.montoMora))}</span>
                      )}
                      <span className="text-gray-400">{fmt(Number(cu.montoPagado ?? 0))}/{fmt(Number(cu.monto))}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${saldo <= 0.005 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {saldo <= 0.005 ? 'Pagada' : fmt(saldo)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Bloque>

        <Bloque titulo={pagos.length > 0 ? `Abonos (${pagos.length})` : 'Abonos'} tono={tono}>
          {data == null ? (
            <p className="text-[11px] text-gray-400">Cargando…</p>
          ) : pagos.length === 0 ? (
            <p className="text-[11px] text-gray-400">Todavía no abonó nada de esta venta.</p>
          ) : (
            <div className="space-y-1">
              {pagos.map(p => {
                // `PagoVenta` declara solo id/metodoPago/monto/referencia/banco/
                // creadoEn: `fechaPago` y `anulado` caen en su index signature y
                // llegan como `unknown`, asi que se estrechan a mano.
                const anulado = p.anulado === true;
                const cuando = typeof p.fechaPago === 'string' ? p.fechaPago : p.creadoEn ?? null;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1 text-[11px] ${anulado ? 'opacity-50' : ''}`}
                  >
                    <span className="text-gray-600">
                      {p.metodoPago} · {fmtFecha(cuando)}
                      {anulado && <span className="ml-1 rounded bg-red-100 px-1 text-[8px] font-bold text-red-600">ANULADO</span>}
                    </span>
                    <span className={`font-semibold ${anulado ? 'text-gray-400 line-through' : 'text-green-700'}`}>
                      {fmt(Number(p.monto))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Bloque>
      </div>
    </div>
  );
}
