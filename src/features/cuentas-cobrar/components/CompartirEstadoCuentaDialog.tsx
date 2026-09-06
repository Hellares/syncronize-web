'use client';

/**
 * Qué se le manda al cliente y por dónde.
 *
 * Nace de un problema concreto: una vez saldada la venta, su fila en el
 * historial y sus abonos hacen RUIDO en el PDF con el que se le cobra. Y al
 * revés, a veces el cliente pide justo lo contrario --el detalle de pagos de
 * UNA venta puntual--. Son el mismo documento con distinto filtro, así que en
 * vez de tres PDF distintos hay uno con casillas: las combinaciones son del que
 * cobra, no nuestras.
 *
 * 🔴 El PDF se arma AL CONFIRMAR, no al abrir el cuadro: pide las líneas de
 * cada venta elegida, y armarlo para que después cancelen es trabajo tirado.
 */

import { useState } from 'react';
import type { EstadoCuentaCliente } from '@/core/types/cuentas-cobrar';
import { getVenta } from '@/features/venta/services/venta-service';
import EnviarPorWhatsappDialog from '@/features/whatsapp/components/EnviarPorWhatsappDialog';
import {
  construirEstadoCuentaClientePdf,
  descargarEstadoCuentaCliente,
  OPCIONES_POR_DEFECTO,
  type DetallesPorVenta,
  type OpcionesEstadoCuenta,
} from './estado-cuenta-cliente-pdf';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

function Casilla({
  marcada,
  onToggle,
  etiqueta,
  ayuda,
  fija = false,
}: {
  marcada: boolean;
  onToggle: () => void;
  etiqueta: string;
  ayuda?: string;
  fija?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={fija ? undefined : onToggle}
      disabled={fija}
      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${fija ? 'cursor-default' : 'hover:bg-gray-50'}`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] ${
          marcada ? 'bg-[#004A94] text-white' : 'text-transparent ring-1 ring-gray-300'
        } ${fija ? 'opacity-60' : ''}`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-gray-800">{etiqueta}</span>
        {ayuda && <span className="block text-[10px] leading-snug text-gray-400">{ayuda}</span>}
      </span>
    </button>
  );
}

interface Props {
  data: EstadoCuentaCliente;
  empresaNombre: string;
  empresaRuc?: string;
  onClose: () => void;
}

export default function CompartirEstadoCuentaDialog({ data, empresaNombre, empresaRuc, onClose }: Props) {
  const pendientes = data.ventas.filter(v => v.saldoPendiente > 0.01);

  const [opciones, setOpciones] = useState<OpcionesEstadoCuenta>(OPCIONES_POR_DEFECTO);
  // Arranca con las pendientes: es el documento con el que se cobra.
  const [elegidas, setElegidas] = useState<Set<string>>(new Set(pendientes.map(v => v.ventaId)));
  const [trabajando, setTrabajando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alternarVenta = (ventaId: string) =>
    setElegidas(prev => {
      const s = new Set(prev);
      if (s.has(ventaId)) s.delete(ventaId); else s.add(ventaId);
      return s;
    });

  const ventasIds = [...elegidas];
  const opcionesFinales: OpcionesEstadoCuenta = { ...opciones, ventasIds };

  /** Las líneas de las ventas elegidas, solo si el PDF las va a mostrar. */
  const traerDetalles = async (): Promise<DetallesPorVenta> => {
    if (!opciones.incluirDetalle) return {};
    const detalles: DetallesPorVenta = {};
    await Promise.all(
      data.ventas
        .filter(v => elegidas.has(v.ventaId))
        .map(async v => {
          try {
            const venta = await getVenta(v.ventaId);
            detalles[v.ventaId] = venta.detalles ?? [];
          } catch {
            // esa venta sale sin detalle; el PDF se genera igual
          }
        }),
    );
    return detalles;
  };

  const descargar = async () => {
    setTrabajando(true);
    setError(null);
    try {
      await descargarEstadoCuentaCliente(data, empresaNombre, empresaRuc, await traerDetalles(), opcionesFinales);
      onClose();
    } catch {
      setError('No se pudo armar el PDF');
    } finally {
      setTrabajando(false);
    }
  };

  const construirAdjunto = async (): Promise<Blob> => {
    const doc = await construirEstadoCuentaClientePdf(
      data, empresaNombre, empresaRuc, await traerDetalles(), opcionesFinales,
    );
    return doc.output('blob');
  };

  const nadaQueMostrar =
    (!opciones.incluirPendientes && !opciones.incluirHistorial && !opciones.incluirAbonos) ||
    elegidas.size === 0;

  const nombreArchivo = `estado-cuenta-${(data.cliente.nombre ?? 'cliente').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;

  if (enviando) {
    return (
      <EnviarPorWhatsappDialog
        titulo="Enviar estado de cuenta"
        textoInicial={
          `Hola${data.cliente.nombre ? ` *${data.cliente.nombre}*` : ''}, te comparto tu estado de cuenta.` +
          (data.resumen.saldoPendiente > 0.005 ? `\nSaldo pendiente: *${fmt(data.resumen.saldoPendiente)}*` : '')
        }
        numeroInicial={data.cliente.telefono ?? undefined}
        ayudaNumero={
          data.cliente.telefono
            ? 'Es el teléfono del cliente. Se puede cambiar antes de enviar.'
            : 'El cliente no tiene teléfono registrado: escribí a dónde mandarlo.'
        }
        adjunto={{
          nombre: nombreArchivo,
          detalle: 'El PDF se envía con el mensaje',
          tipo: 'pdf',
          construir: construirAdjunto,
        }}
        onClose={() => setEnviando(false)}
        onEnviado={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-900">Compartir estado de cuenta</h3>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {data.cliente.nombre ?? 'Cliente'} · saldo {fmt(data.resumen.saldoPendiente)}
        </p>

        <div className="mt-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Qué incluir</p>
          <Casilla
            marcada={opciones.incluirPendientes}
            onToggle={() => setOpciones(o => ({ ...o, incluirPendientes: !o.incluirPendientes }))}
            etiqueta="Ventas pendientes"
            ayuda="Lo que todavía debe."
          />
          <Casilla
            marcada={opciones.incluirHistorial}
            onToggle={() => setOpciones(o => ({ ...o, incluirHistorial: !o.incluirHistorial }))}
            etiqueta="Historial de ventas pagadas"
            ayuda="Apagado: en un documento de cobro, lo saldado distrae."
          />
          <Casilla
            marcada={opciones.incluirAbonos}
            onToggle={() => setOpciones(o => ({ ...o, incluirAbonos: !o.incluirAbonos }))}
            etiqueta="Abonos"
            ayuda="Los pagos que fue haciendo, con su fecha y método."
          />
          <Casilla
            marcada={opciones.incluirDetalle}
            onToggle={() => setOpciones(o => ({ ...o, incluirDetalle: !o.incluirDetalle }))}
            etiqueta="Detalle de productos de cada venta"
            ayuda="Cuelga de cada fila. Suma una llamada por venta al armar el PDF."
          />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Qué ventas ({elegidas.size} de {data.ventas.length})
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setElegidas(new Set(data.ventas.map(v => v.ventaId)))}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#437EFF] hover:bg-blue-50"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setElegidas(new Set(pendientes.map(v => v.ventaId)))}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#437EFF] hover:bg-blue-50"
              >
                Solo pendientes
              </button>
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg ring-1 ring-gray-200">
            {data.ventas.map(v => {
              const marcada = elegidas.has(v.ventaId);
              const saldada = v.saldoPendiente <= 0.01;
              return (
                <button
                  key={v.ventaId}
                  type="button"
                  onClick={() => alternarVenta(v.ventaId)}
                  className="flex w-full items-center gap-2 border-b border-gray-100 px-2 py-1.5 text-left last:border-0 transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] ${
                      marcada ? 'bg-[#004A94] text-white' : 'text-transparent ring-1 ring-gray-300'
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="font-mono text-[11px] tracking-tight text-gray-500">{v.codigo}</span>
                  <span className="text-[10px] text-gray-400">{fmtFecha(v.fechaVenta)}</span>
                  <span className="ml-auto text-[11px] font-semibold text-gray-800">{fmt(v.saldoPendiente)}</span>
                  {saldada && (
                    <span className="rounded-full bg-green-100 px-1.5 text-[9px] font-bold text-green-700">pagada</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        {nadaQueMostrar && (
          <p className="mt-3 text-[11px] text-amber-600">
            Con eso el PDF saldría vacío: elegí al menos una sección y una venta.
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            onClick={onClose}
            disabled={trabajando}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={descargar}
            disabled={trabajando || nadaQueMostrar}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-[#004A94] ring-1 ring-blue-400 hover:shadow-md disabled:opacity-50"
          >
            {trabajando && <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#004A94]/30 border-t-[#004A94]" />}
            {trabajando ? 'Armando…' : 'Descargar'}
          </button>
          <button
            onClick={() => setEnviando(true)}
            disabled={trabajando || nadaQueMostrar}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1121 11.5z" />
            </svg>
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
