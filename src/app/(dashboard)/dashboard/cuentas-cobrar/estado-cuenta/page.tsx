'use client';

// Estado de cuenta del cliente: resumen + ventas a crédito + abonos + PDF
// (paridad estado_cuenta_cliente_page.dart). Acepta ?clienteId= o ?clienteEmpresaId=.

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { EstadoCuentaCliente, VentaCreditoEC } from '@/core/types/cuentas-cobrar';
import { ESTADO_CUENTA_CONFIG } from '@/core/types/cuentas-cobrar';
import { getEstadoCuentaCliente } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import { descargarEstadoCuentaCliente, type DetallesPorVenta } from '@/features/cuentas-cobrar/components/estado-cuenta-cliente-pdf';
import { getVenta } from '@/features/venta/services/venta-service';
import VentaEstadoCuentaDetalle from '@/features/cuentas-cobrar/components/VentaEstadoCuentaDetalle';
import Plegable from '@/components/ui/Plegable';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fuenteLabel = (f?: string | null) =>
  f === 'TESORERIA' ? 'Tesorería' : f === 'CAJA' ? 'Caja' : f === 'BANCO' ? 'Banco' : f ?? '';

function EstadoCuentaClienteContent() {
  const params = useSearchParams();
  const { empresa } = useEmpresa();
  const clienteId = params.get('clienteId') ?? undefined;
  const clienteEmpresaId = params.get('clienteEmpresaId') ?? undefined;
  const nombreFallback = params.get('nombre') ?? undefined;

  const [data, setData] = useState<EstadoCuentaCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Una sola venta desplegada a la vez, como en cuentas por cobrar. */
  const [desplegada, setDesplegada] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [verAbonos, setVerAbonos] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const cargar = useCallback(async () => {
    if (!clienteId && !clienteEmpresaId) {
      setError('Falta el cliente (clienteId o clienteEmpresaId)');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getEstadoCuentaCliente({ clienteId, clienteEmpresaId }));
    } catch {
      setError('No se pudo cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  }, [clienteId, clienteEmpresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-600">{error ?? 'Sin datos'}</p>
        <button onClick={cargar} className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Reintentar</button>
      </div>
    );
  }

  const { cliente, resumen, ventas, abonos } = data;
  const pendientes = ventas.filter(v => v.saldoPendiente > 0.01);
  const historial = ventas.filter(v => v.saldoPendiente <= 0.01);
  const conSaldo = resumen.saldoPendiente > 0.005;

  const alternar = (ventaId: string) => setDesplegada(d => (d === ventaId ? null : ventaId));

  /**
   * El PDF lleva las líneas de cada venta PENDIENTE colgando de su fila, y el
   * estado de cuenta no las trae: se piden acá, una por venta y en paralelo,
   * recién al tocar el botón. Es lo que el cliente pregunta cuando recibe el
   * PDF --"¿qué me vendiste en esta?"-- y ahorra la llamada de vuelta.
   *
   * Una venta que falle sale sin detalle: el PDF igual se genera. Es un
   * resumen de deuda, no puede caerse porque una línea no cargó.
   */
  const descargarPdf = async () => {
    setGenerandoPdf(true);
    try {
      const detalles: DetallesPorVenta = {};
      await Promise.all(
        pendientes.map(async v => {
          try {
            const venta = await getVenta(v.ventaId);
            detalles[v.ventaId] = venta.detalles ?? [];
          } catch {
            // sin detalle para esa venta
          }
        }),
      );
      await descargarEstadoCuentaCliente(
        data,
        empresa?.razonSocial ?? empresa?.nombre ?? 'Mi empresa',
        empresa?.ruc ?? undefined,
        detalles,
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Header cliente */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icono dibujado y no emoji: es el unico de la pantalla y el resto de
              la web usa SVG en todos lados. */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#437EFF]/10 text-[#004A94]">
            {cliente.tipo === 'EMPRESA' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V5a1 1 0 011-1h7a1 1 0 011 1v16M14 21V9h4a1 1 0 011 1v11" />
                <path d="M8 8h2M8 12h2M8 16h2" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0115 0" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{cliente.nombre ?? nombreFallback ?? 'Cliente'}</h1>
            <p className="text-xs text-gray-500">
              {cliente.documento ? `${cliente.documento} · ` : ''}{cliente.tipo === 'EMPRESA' ? 'Empresa' : 'Persona'} · Estado de cuenta
            </p>
          </div>
        </div>
        <button
          onClick={descargarPdf}
          disabled={generandoPdf}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-zinc-100 px-3 text-[10px] font-medium text-[#004A94] shadow-md ring-1 ring-blue-400 transition-shadow hover:shadow-lg hover:shadow-blue-200 disabled:opacity-60">
          {generandoPdf ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#004A94]/30 border-t-[#004A94]" />
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M8 11l4 4 4-4M4 19h16" />
            </svg>
          )}
          {generandoPdf ? 'Armando el PDF…' : 'Descargar PDF'}
        </button>
      </div>

      {/* Resumen: el saldo manda, y su color dice si hay que llamar al cliente
          o no. Mismo tratamiento que las tarjetas de cuentas por cobrar --ring
          del color propio y degradado--, porque el borde gris no se ve sobre el
          fondo del dashboard. */}
      <div
        className={`rounded-xl bg-gradient-to-br p-4 shadow-sm ring-1 ${
          conSaldo ? 'from-white to-red-100 ring-red-400' : 'from-white to-green-100 ring-green-400'
        }`}
      >
        <p className="text-xs text-gray-500">Saldo pendiente</p>
        <p className={`text-2xl font-extrabold ${conSaldo ? 'text-red-600' : 'text-green-600'}`}>{fmt(resumen.saldoPendiente)}</p>
        {resumen.totalMora > 0 && <p className="text-[11px] font-semibold text-orange-700">incl. mora {fmt(resumen.totalMora)}</p>}

        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/60 pt-3 sm:grid-cols-3">
          {[
            { label: 'Vendido', val: fmt(resumen.totalVendido), color: 'text-[#004A94]', ring: 'ring-[#004A94]/50', fondo: 'from-white to-blue-100' },
            { label: 'Abonado', val: fmt(resumen.totalAbonado), color: 'text-green-700', ring: 'ring-green-400', fondo: 'from-white to-green-100' },
            {
              label: 'Ventas',
              val: `${resumen.cantidadVentas}${resumen.ventasConSaldo > 0 ? ` · ${resumen.ventasConSaldo} con saldo` : ''}`,
              color: 'text-gray-800',
              ring: 'ring-gray-300',
              fondo: 'from-white to-gray-100',
            },
          ].map(s => (
            <div key={s.label} className={`rounded-lg bg-gradient-to-br p-2.5 ring-1 ${s.fondo} ${s.ring}`}>
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ventas pendientes */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">Ventas pendientes</h2>
          <span className="rounded-full bg-[#437EFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#437EFF]">{pendientes.length}</span>
        </div>
        {pendientes.length === 0 ? (
          <p className="rounded-xl bg-white py-6 text-center text-xs text-gray-400 ring-1 ring-blue-400/40">
            Sin ventas pendientes 🎉
          </p>
        ) : (
          <TablaVentas ventas={pendientes} desplegada={desplegada} onAlternar={alternar} />
        )}
      </div>

      {/* Historial: es consulta, va plegado. */}
      {historial.length > 0 && (
        <Plegable
          titulo="Historial (pagadas)"
          resumen={`${historial.length} · ${fmt(historial.reduce((t, v) => t + v.total, 0))}`}
          abierto={verHistorial}
          onToggle={() => setVerHistorial(v => !v)}
        >
          <TablaVentas ventas={historial} desplegada={desplegada} onAlternar={alternar} />
        </Plegable>
      )}

      {/* Abonos: el detalle de cada uno ya vive dentro de su venta, acá va la
          película completa en orden. */}
      <Plegable
        titulo="Abonos"
        resumen={`${abonos.length} · ${fmt(abonos.reduce((t, a) => t + a.monto, 0))}`}
        abierto={verAbonos}
        onToggle={() => setVerAbonos(v => !v)}
      >
        {abonos.length === 0 ? (
          <p className="py-3 text-center text-xs text-gray-400">Sin abonos registrados</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400">
                <th className="w-px whitespace-nowrap py-1.5 pr-3 font-medium">Fecha</th>
                <th className="w-px whitespace-nowrap px-3 py-1.5 font-medium">Venta</th>
                <th className="py-1.5 pr-3 font-medium">Método</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-1.5 font-medium sm:table-cell">Entró a</th>
                <th className="w-px whitespace-nowrap py-1.5 pl-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {abonos.map(a => (
                <tr key={a.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="whitespace-nowrap py-1.5 pr-3 text-gray-600">{fmtFecha(a.fechaPago)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] tracking-tight text-gray-500">{a.ventaCodigo ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-gray-700">{a.metodoPago}</td>
                  <td className="hidden whitespace-nowrap px-3 py-1.5 text-gray-500 sm:table-cell">{fuenteLabel(a.fuente) || '—'}</td>
                  <td className="whitespace-nowrap bg-green-100 py-1.5 pl-3 pr-2 text-right font-semibold text-green-800">+ {fmt(a.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Plegable>
    </div>
  );
}

/**
 * Las ventas a crédito del cliente, con la misma cara que la tabla de cuentas
 * por cobrar: bandas de color en las columnas de plata y la fila que despliega
 * lo que se vendió.
 */
function TablaVentas({
  ventas,
  desplegada,
  onAlternar,
}: {
  ventas: VentaCreditoEC[];
  desplegada: string | null;
  onAlternar: (ventaId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
      <table className="w-full text-left text-[12px]">
        <thead className="border-b border-[#cfe0f5] bg-[#eaf2fd]">
          <tr>
            <th className="w-px px-2 py-3" />
            <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Fecha</th>
            <th className="w-full px-3 py-3 font-medium text-[#004A94]">Documento</th>
            <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] md:table-cell">Vence</th>
            <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Total</th>
            <th className="hidden w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94] lg:table-cell">Pagado</th>
            <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Saldo</th>
            <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Estado</th>
            <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ventas.map(v => {
            const cfg = ESTADO_CUENTA_CONFIG[v.estado];
            const abierta = desplegada === v.ventaId;
            const vencido = (v.diasVencimiento ?? 0) < 0;
            return (
              <Fragment key={v.ventaId}>
                <tr
                  onClick={() => onAlternar(v.ventaId)}
                  className={`cursor-pointer transition-colors ${abierta ? 'bg-[#f9fbff]' : 'hover:bg-gray-50/50'}`}
                >
                  <td className="w-px py-2 pl-3 pr-0">
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                        abierta ? 'bg-[#437EFF] text-white' : 'bg-blue-50 text-[#437EFF]'
                      }`}
                    >
                      <svg className={`h-3.5 w-3.5 transition-transform duration-150 ${abierta ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{fmtFecha(v.fechaVenta)}</td>

                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px] tracking-tight text-gray-500">{v.codigo}</span>
                    {(v.numeroCuotas ?? 0) > 0 && (
                      <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                        {v.numeroCuotas} cuotas
                      </span>
                    )}
                  </td>

                  <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell">
                    <span className="text-xs text-gray-600">{fmtFecha(v.fechaVencimiento)}</span>
                    {v.diasVencimiento != null && (
                      <span className={`block text-[10px] ${vencido ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
                        {vencido ? `vencido ${Math.abs(v.diasVencimiento)}d` : `en ${v.diasVencimiento}d`}
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap bg-sky-100 px-3 py-2 text-right text-gray-700">{fmt(v.total)}</td>

                  <td className="hidden whitespace-nowrap bg-green-100 px-3 py-2 text-right text-green-800 lg:table-cell">
                    {v.totalPagado > 0.005 ? fmt(v.totalPagado) : <span className="text-gray-400">—</span>}
                  </td>

                  <td className="whitespace-nowrap bg-orange-100 px-3 py-2 text-right">
                    <span className="font-bold text-gray-900">{fmt(v.saldoPendiente)}</span>
                    {(v.totalMora ?? 0) > 0 && (
                      <span className="block text-[10px] font-semibold text-red-600">+ {fmt(v.totalMora)} mora</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                    <Link href={`/dashboard/ventas/${v.ventaId}`} className="text-[11px] font-medium text-[#437EFF] hover:underline">
                      Ver la venta
                    </Link>
                  </td>
                </tr>

                {abierta && (
                  <tr className="bg-[#f9fbff]">
                    <td colSpan={9} className="p-0">
                      <VentaEstadoCuentaDetalle venta={v} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EstadoCuentaClientePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>}>
      <EstadoCuentaClienteContent />
    </Suspense>
  );
}
