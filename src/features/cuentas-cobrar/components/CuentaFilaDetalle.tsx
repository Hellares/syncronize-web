'use client';

/**
 * Lo que se abre al desplegar una fila de cuentas por cobrar.
 *
 * Junta en un solo lugar las cuatro preguntas que se hacen cobrando: qué le
 * vendí, cómo se pactó, cuánto pagó y a quién estoy llamando.
 *
 * Los PRODUCTOS no vienen en el listado --la cuenta por cobrar es la venta
 * vista desde la plata, no desde la mercadería-- así que se piden al abrir la
 * fila, una vez por venta. Por eso este componente se monta recién al
 * desplegar: montarlo escondido dispararía un GET por cada fila de la lista.
 */

import { useEffect, useState } from 'react';
import type { CuentaPorCobrar } from '@/core/types/cuentas-cobrar';
import type { VentaDetalle } from '@/core/types/venta';
import { getVenta } from '@/features/venta/services/venta-service';
import VentaProductosTabla from '@/features/venta/components/VentaProductosTabla';
import { tonoDe, type TonoEstado } from './tono-estado';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

function Bloque({
  titulo,
  tono,
  children,
}: {
  titulo: string;
  tono: TonoEstado;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg bg-gradient-to-br p-3 shadow-sm ring-1 ${tono.fondo} ${tono.ring}`}>
      <p className={`mb-1.5 text-[9px] font-bold uppercase tracking-[0.06em] ${tono.titulo}`}>{titulo}</p>
      {children}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <div className="flex items-baseline gap-2 leading-6">
      <span className="w-[72px] shrink-0 text-[11px] text-gray-400">{etiqueta}</span>
      <span className="text-[11px] font-medium text-gray-700">
        {valor || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

interface Props {
  cuenta: CuentaPorCobrar;
  puedeGestionar: boolean;
  onAnularAbono: (pagoId: string) => void;
}

export default function CuentaFilaDetalle({ cuenta: c, puedeGestionar, onAnularAbono }: Props) {
  const [lineas, setLineas] = useState<VentaDetalle[] | null>(null);
  const [errorVenta, setErrorVenta] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getVenta(c.ventaId)
      .then(v => { if (!cancelado) setLineas(v.detalles ?? []); })
      .catch(() => { if (!cancelado) setErrorVenta(true); });
    return () => { cancelado = true; };
  }, [c.ventaId]);

  const tono = tonoDe(c.estado);
  const cuotas = c.cuotas ?? [];
  const pagos = c.pagos ?? [];
  const totalConMora = c.saldoPendiente + (c.totalMora ?? 0);

  return (
    <div className="space-y-3 bg-[#f9fbff] px-4 pb-4 pt-3 sm:pl-12">
      {/* Lo que se vendió: es lo primero que se pregunta cuando el cliente
          discute la deuda por teléfono. */}
      {/* Lo que se vendió: es lo primero que se pregunta cuando el cliente
          discute la deuda por teléfono. */}
      <Bloque titulo="Productos de la venta" tono={tono}>
        <VentaProductosTabla lineas={lineas} error={errorVenta} />
      </Bloque>

      <div className="grid gap-3 lg:grid-cols-3">
        <Bloque titulo="El crédito" tono={tono}>
          <Dato etiqueta="Vendido" valor={fmtFecha(c.fechaVenta)} />
          <Dato etiqueta="Vence" valor={fmtFecha(c.fechaVencimiento)} />
          <Dato etiqueta="Plazo" valor={c.plazoCredito ? `${c.plazoCredito} días` : null} />
          <Dato etiqueta="Total" valor={fmt(c.totalVenta)} />
          <Dato etiqueta="Pagado" valor={fmt(c.totalPagado)} />
          <Dato
            etiqueta="Saldo"
            valor={(c.totalMora ?? 0) > 0 ? `${fmt(c.saldoPendiente)} + ${fmt(c.totalMora)} de mora = ${fmt(totalConMora)}` : fmt(c.saldoPendiente)}
          />
        </Bloque>

        <Bloque titulo="El cliente" tono={tono}>
          <Dato etiqueta="Nombre" valor={c.nombreCliente} />
          <Dato etiqueta="Documento" valor={c.documentoCliente} />
          <Dato etiqueta="Teléfono" valor={c.telefonoCliente} />
          <Dato etiqueta="Sede" valor={c.sedeNombre} />
        </Bloque>

        <Bloque titulo={cuotas.length > 0 ? `Cuotas (${cuotas.length})` : 'Cuotas'} tono={tono}>
          {cuotas.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-gray-500">
              Crédito sin cuotas: se cobra el saldo completo al vencimiento.
            </p>
          ) : (
            <div className="space-y-1">
              {cuotas.map(cu => (
                <div key={cu.id} className="flex items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1 text-[11px]">
                  <span className="text-gray-600">
                    #{cu.numero} · {fmtFecha(cu.fechaVencimiento)}
                    {(cu.diasVencido ?? 0) > 0 && <span className="ml-1 font-semibold text-red-500">+{cu.diasVencido}d</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {(cu.montoMora ?? 0) > 0 && <span className="text-red-500">mora {fmt(cu.montoMora)}</span>}
                    <span className="text-gray-400">{fmt(cu.montoPagado)}/{fmt(cu.monto)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${cu.saldoPendiente <= 0.005 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cu.saldoPendiente <= 0.005 ? 'Pagada' : fmt(cu.saldoPendiente)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Bloque>
      </div>

      <Bloque titulo={pagos.length > 0 ? `Abonos (${pagos.length})` : 'Abonos'} tono={tono}>
        {pagos.length === 0 ? (
          <p className="text-[11px] text-gray-400">Todavía no abonó nada.</p>
        ) : (
          <div className="space-y-1">
            {pagos.map(p => (
              <div key={p.id} className={`flex items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1 text-[11px] ${p.anulado ? 'opacity-50' : ''}`}>
                <span className="text-gray-600">
                  {p.metodoPago} · {fmtFecha(p.fechaPago)}
                  {p.fuente && <span className="ml-1 text-[9px] text-gray-400">→ {p.fuente}</span>}
                  {p.anulado && <span className="ml-1 rounded bg-red-100 px-1 text-[8px] font-bold text-red-600">ANULADO</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`font-semibold ${p.anulado ? 'text-gray-400 line-through' : 'text-green-700'}`}>{fmt(p.monto)}</span>
                  {puedeGestionar && !p.anulado && c.estado !== 'PAGADA' && (
                    <button
                      type="button"
                      onClick={() => onAnularAbono(p.id)}
                      title="Anular abono (revierte el ingreso y recomputa cuotas)"
                      className="rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Bloque>
    </div>
  );
}
