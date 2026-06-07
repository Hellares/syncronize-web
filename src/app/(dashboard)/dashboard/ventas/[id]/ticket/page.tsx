'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import type { Venta } from '@/core/types/venta';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as ventaService from '@/features/venta/services/venta-service';
import { apiClient } from '@/core/api/client';
import { generarTicketVenta } from '@/features/impresion/escpos';
import { getImpresoraConfig, imprimirEnPrincipal } from '@/features/impresion/qz-service';
import ImpresoraConfigDialog from '@/features/impresion/ImpresoraConfigDialog';

const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_ATTEMPTS = 8;

function fmt(n: number | undefined | null): string {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ConfigSunat {
  razonSocial?: string;
  nombreComercial?: string;
  ruc?: string;
  direccionFiscal?: string;
  telefono?: string;
  [key: string]: unknown;
}

/** Estado SUNAT terminal: deja de hacer polling (paridad venta_ticket_preview 2s×8) */
function esTerminal(v: Venta): boolean {
  if (v.comprobanteSunatHash || v.comprobanteSunatXmlUrl || v.comprobanteEnlaceProveedor) return true;
  return ['ACEPTADO', 'RECHAZADO', 'ANULADO'].includes(v.comprobanteSunatStatus ?? '');
}

export default function VentaTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [config, setConfig] = useState<ConfigSunat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Impresión térmica (QZ Tray)
  const [showImpresoraConfig, setShowImpresoraConfig] = useState(false);
  const [printMsg, setPrintMsg] = useState('');
  const [printing, setPrinting] = useState(false);
  const autoPrintRef = useRef(false);

  const imprimirTermica = async (v: Venta, cfg: ConfigSunat | null) => {
    const ic = getImpresoraConfig();
    if (!ic) { setShowImpresoraConfig(true); return; }
    setPrinting(true);
    setPrintMsg('');
    try {
      const bytes = generarTicketVenta(v, cfg ?? {}, ic.paperWidth);
      await imprimirEnPrincipal(bytes);
      setPrintMsg('✓ Enviado a la impresora');
    } catch (err) {
      setPrintMsg(`⚠ ${err instanceof Error ? err.message : 'Error al imprimir'} — ¿QZ Tray está corriendo?`);
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      try {
        const v = await ventaService.getVenta(id);
        if (cancelled) return;
        setVenta(v);
        // Config fiscal de la sede (para encabezado) + auto-print térmica (paridad Flutter)
        const maybeAutoPrint = (cfg: ConfigSunat | null) => {
          if (cancelled || autoPrintRef.current) return;
          const ic = getImpresoraConfig();
          if (ic?.autoImprimirVenta) {
            autoPrintRef.current = true;
            imprimirTermica(v, cfg);
          }
        };
        apiClient.get(`/sunat/configuracion${v.sedeId ? `?sedeId=${v.sedeId}` : ''}`)
          .then(r => { if (!cancelled) { setConfig(r.data); maybeAutoPrint(r.data); } })
          .catch(() => maybeAutoPrint(null));
        // Polling SUNAT si tiene comprobante sin estado terminal
        if (v.codigoComprobante && !esTerminal(v)) {
          setPolling(true);
          const poll = async () => {
            if (cancelled || attemptsRef.current >= MAX_POLLING_ATTEMPTS) { setPolling(false); return; }
            attemptsRef.current += 1;
            try {
              const nv = await ventaService.getVenta(id);
              if (cancelled) return;
              setVenta(nv);
              if (esTerminal(nv)) { setPolling(false); return; }
            } catch { /* sigue */ }
            timerRef.current = setTimeout(poll, POLLING_INTERVAL_MS);
          };
          timerRef.current = setTimeout(poll, POLLING_INTERVAL_MS);
        }
      } catch { /* error */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [id]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  if (!venta) {
    return <div className="py-20 text-center"><p className="text-gray-400">Venta no encontrada</p></div>;
  }

  const totalPagado = (venta.pagos ?? []).reduce((a, p) => a + Number(p.monto), 0);
  const vuelto = Number(venta.montoCambio ?? 0);
  const vendedorTicket = venta.vendedorAlias || venta.vendedorNombre;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Barra de acciones (oculta al imprimir) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/dashboard/ventas/${id}`} className="text-sm text-gray-500 hover:text-[#004A94]">← Detalle</Link>
        <div className="flex items-center gap-2">
          {polling && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Consultando SUNAT...
            </span>
          )}
          <button onClick={() => imprimirTermica(venta, config)} disabled={printing}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {printing ? 'Imprimiendo...' : '🖨 Térmica'}
          </button>
          <button onClick={() => setShowImpresoraConfig(true)} title="Configurar impresora"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={() => window.print()} title="Imprimir con el navegador"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Navegador
          </button>
        </div>
      </div>

      {printMsg && (
        <p className={`text-xs print:hidden ${printMsg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{printMsg}</p>
      )}

      <ImpresoraConfigDialog
        isOpen={showImpresoraConfig}
        onSaved={(cfg) => { setShowImpresoraConfig(false); if (cfg) setPrintMsg(`Impresora: ${cfg.impresoraNombre} (${cfg.paperWidth}mm)`); }}
        onClose={() => setShowImpresoraConfig(false)}
      />

      {/* === TICKET === */}
      <div className="mx-auto w-[300px] rounded-lg border border-gray-200 bg-white px-4 py-5 font-mono text-[11px] leading-tight text-gray-900 shadow-sm print:w-full print:border-0 print:shadow-none">
        {/* Encabezado fiscal */}
        <div className="text-center">
          <p className="text-sm font-bold">{config?.nombreComercial || config?.razonSocial || 'EMPRESA'}</p>
          {config?.razonSocial && config?.nombreComercial && <p>{config.razonSocial}</p>}
          {config?.ruc && <p>RUC: {config.ruc}</p>}
          {config?.direccionFiscal && <p className="text-[10px]">{config.direccionFiscal}</p>}
          {config?.telefono && <p className="text-[10px]">Tel: {config.telefono}</p>}
          {venta.sedeNombre && <p className="text-[10px]">Sede: {venta.sedeNombre}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-gray-300" />

        {/* Comprobante */}
        <div className="text-center">
          {venta.codigoComprobante ? (
            <>
              <p className="font-bold">{venta.tipoComprobante === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}</p>
              <p className="font-bold">{venta.codigoComprobante}</p>
            </>
          ) : (
            <p className="font-bold">TICKET {venta.codigo}</p>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-gray-300" />

        {/* Datos */}
        <p>Fecha: {venta.fechaVenta ? new Date(venta.fechaVenta).toLocaleString('es-PE') : ''}</p>
        <p>Cliente: {venta.nombreCliente ?? 'CLIENTES VARIOS'}</p>
        {venta.documentoCliente && venta.documentoCliente !== '00000000' && <p>Doc: {venta.documentoCliente}</p>}
        {vendedorTicket && <p>Vendedor: {vendedorTicket}</p>}

        <div className="my-2 border-t border-dashed border-gray-300" />

        {/* Items */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-dashed border-gray-300 text-left">
              <th className="py-0.5 font-bold">Desc</th>
              <th className="py-0.5 text-center font-bold">Cant</th>
              <th className="py-0.5 text-right font-bold">P.U.</th>
              <th className="py-0.5 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(venta.detalles ?? []).map(d => (
              <tr key={d.id}>
                <td className="py-0.5 pr-1">{d.descripcion}</td>
                <td className="py-0.5 text-center">{Number(d.cantidad)}</td>
                <td className="py-0.5 text-right">{fmt(d.precioUnitario)}</td>
                <td className="py-0.5 text-right">{fmt(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-2 border-t border-dashed border-gray-300" />

        {/* Totales */}
        <div className="space-y-0.5">
          <div className="flex justify-between"><span>SUBTOTAL:</span><span>S/ {fmt(venta.subtotal)}</span></div>
          {Number(venta.descuento ?? 0) > 0 && <div className="flex justify-between"><span>DESCUENTO:</span><span>-S/ {fmt(venta.descuento)}</span></div>}
          <div className="flex justify-between"><span>IGV (18%):</span><span>S/ {fmt(venta.impuestos)}</span></div>
          <div className="flex justify-between text-sm font-bold"><span>TOTAL:</span><span>S/ {fmt(venta.total)}</span></div>
        </div>

        {/* Pagos */}
        {(venta.pagos ?? []).length > 0 && (
          <>
            <div className="my-2 border-t border-dashed border-gray-300" />
            <div className="space-y-0.5">
              {venta.pagos!.map(p => (
                <div key={p.id} className="flex justify-between">
                  <span>{METODO_PAGO_LABEL[p.metodoPago]?.toUpperCase() ?? p.metodoPago}{p.referencia ? ` (${p.referencia})` : ''}:</span>
                  <span>S/ {fmt(p.monto)}</span>
                </div>
              ))}
              <div className="flex justify-between"><span>RECIBIDO:</span><span>S/ {fmt(totalPagado)}</span></div>
              {vuelto > 0 && <div className="flex justify-between font-bold"><span>VUELTO:</span><span>S/ {fmt(vuelto)}</span></div>}
            </div>
          </>
        )}

        {/* Crédito */}
        {venta.esCredito && (
          <>
            <div className="my-2 border-t border-dashed border-gray-300" />
            <p className="text-center font-bold">VENTA A CRÉDITO</p>
            {venta.numeroCuotas && <p className="text-center">{venta.numeroCuotas} cuota(s)</p>}
          </>
        )}

        {/* SUNAT */}
        {venta.codigoComprobante && (
          <>
            <div className="my-2 border-t border-dashed border-gray-300" />
            <div className="text-center text-[10px]">
              <p>Estado SUNAT: {venta.comprobanteSunatStatus ?? 'PENDIENTE'}</p>
              {venta.comprobanteSunatHash && <p className="break-all">Hash: {venta.comprobanteSunatHash}</p>}
              <p className="mt-1">Representación impresa del comprobante electrónico.</p>
              {venta.comprobanteEnlaceProveedor && <p className="break-all">Consulta: {venta.comprobanteEnlaceProveedor}</p>}
            </div>
          </>
        )}

        <div className="my-2 border-t border-dashed border-gray-300" />
        <p className="text-center text-[10px]">¡Gracias por su compra!</p>
      </div>
    </div>
  );
}
