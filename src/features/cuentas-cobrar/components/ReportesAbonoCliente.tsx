'use client';

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import type { FuenteIngreso } from '@/core/types/cuentas-cobrar';
import type { BancoEmpresa } from '@/core/types/compra';
import { getBancos } from '@/features/compras/services/compra-service';
import * as cxcService from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import type { ReporteAbonoCliente } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import { fmtFechaHora } from '@/core/utils/fecha';

const fmt = (n: number) => `S/ ${Number(n ?? 0).toFixed(2)}`;
const METODO: Record<string, { texto: string; clase: string }> = {
  YAPE: { texto: 'Yape', clase: 'bg-purple-50 text-purple-700' },
  PLIN: { texto: 'Plin', clase: 'bg-cyan-50 text-cyan-700' },
  TRANSFERENCIA: { texto: 'Transferencia', clase: 'bg-blue-50 text-blue-700' },
};

const mensaje = (err: unknown, porDefecto: string) => {
  const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
  return Array.isArray(msg) ? msg.join(', ') : msg || porDefecto;
};

/**
 * Pagos que los clientes reportan desde "Mis compras" de la tienda web.
 * No existe hasta que hay alguno pendiente: aprobar registra el abono (con su
 * ingreso a banco/caja, como el botón Abonar), rechazar le muestra el motivo
 * al cliente.
 */
export default function ReportesAbonoCliente({ puedeGestionar, onAprobado }: {
  puedeGestionar: boolean;
  /** Tras aprobar: recargar la lista y el resumen de la pantalla. */
  onAprobado: (msg: string) => void;
}) {
  const [reportes, setReportes] = useState<ReporteAbonoCliente[]>([]);
  const [aprobando, setAprobando] = useState<ReporteAbonoCliente | null>(null);
  const [visor, setVisor] = useState<{ fotos: string[]; i: number } | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try { setReportes(await cxcService.getReportesAbono('PENDIENTE')); } catch { /* sin permiso o sin red: la sección no aparece */ }
  }, []);

  useEffect(() => {
    let vivo = true;
    cxcService.getReportesAbono('PENDIENTE').then((r) => { if (vivo) setReportes(r); }).catch(() => { /* idem */ });
    return () => { vivo = false; };
  }, []);

  const rechazar = async (r: ReporteAbonoCliente) => {
    const motivo = prompt(`¿Rechazar el pago de ${fmt(r.monto)} de ${r.cliente}? El cliente verá el motivo:`, 'No encontramos el pago');
    if (motivo === null) return;
    if (!motivo.trim()) { setError('Escribe el motivo del rechazo'); return; }
    setError('');
    try {
      await cxcService.rechazarReporteAbono(r.id, motivo.trim());
      await cargar();
    } catch (err) {
      setError(mensaje(err, 'No se pudo rechazar el pago'));
    }
  };

  if (reportes.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl rounded-xl bg-white shadow-sm ring-1 ring-amber-300">
      <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-2.5 rounded-t-xl">
        <p className="text-sm font-medium text-amber-800">Pagos reportados por clientes ({reportes.length})</p>
        <p className="text-[11px] text-amber-700">Desde la tienda web · no descuentan hasta aprobarlos</p>
      </div>
      {error && <p className="px-4 pt-2 text-xs text-red-600">{error}</p>}
      <ul className="divide-y divide-gray-100">
        {reportes.map((r) => {
          const m = METODO[r.metodoPago] ?? { texto: r.metodoPago, clase: 'bg-gray-100 text-gray-600' };
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              {/* Un pago puede traer varias capturas (varios Yape): encimadas. */}
              <span className="flex flex-shrink-0 -space-x-3">
                {(r.comprobantes?.length ? r.comprobantes : [r.comprobanteUrl]).map((url, i, todas) => (
                  <button key={url} type="button" onClick={() => setVisor({ fotos: todas, i })} title={`Ver captura ${i + 1} de ${todas.length}`}
                    className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100 ring-2 ring-white hover:z-10 hover:ring-[#437EFF]">
                    <img src={url} alt={`Captura ${i + 1} del pago de ${r.cliente}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{r.cliente} <span className="font-mono text-xs text-gray-400">· {r.ventaCodigo}</span></p>
                <p className="text-[11px] text-gray-500">
                  {fmtFechaHora(r.creadoEn)}
                  {r.numeroOperacion && <> · Op. {r.numeroOperacion}</>}
                  {r.cuentaReportada && <> · a {r.cuentaReportada.nombreBanco} ·· {r.cuentaReportada.numeroCuenta.slice(-4)}</>}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.clase}`}>{m.texto}</span>
              <span className="w-24 text-right text-sm font-medium tabular-nums text-[#004A94]">{fmt(r.monto)}</span>
              {puedeGestionar && (
                <span className="flex gap-1.5">
                  <button type="button" onClick={() => void rechazar(r)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Rechazar</button>
                  <button type="button" onClick={() => { setError(''); setAprobando(r); }}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Aprobar</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {visor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setVisor(null)}>
          <img src={visor.fotos[visor.i]} alt={`Captura ${visor.i + 1} del pago`} className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setVisor(null)} aria-label="Cerrar"
            className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/15 text-lg text-white hover:bg-white/25">✕</button>
          {visor.fotos.length > 1 && (
            <>
              <button type="button" aria-label="Anterior"
                onClick={(e) => { e.stopPropagation(); setVisor({ ...visor, i: (visor.i - 1 + visor.fotos.length) % visor.fotos.length }); }}
                className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/15 text-xl text-white hover:bg-white/25">‹</button>
              <button type="button" aria-label="Siguiente"
                onClick={(e) => { e.stopPropagation(); setVisor({ ...visor, i: (visor.i + 1) % visor.fotos.length }); }}
                className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/15 text-xl text-white hover:bg-white/25">›</button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm tabular-nums text-white/80">{visor.i + 1} / {visor.fotos.length}</span>
            </>
          )}
        </div>
      )}

      {aprobando && (
        <AprobarDialog
          reporte={aprobando}
          onCerrar={() => setAprobando(null)}
          onListo={async () => {
            const r = aprobando;
            setAprobando(null);
            await cargar();
            onAprobado(`Abono de ${fmt(r.monto)} registrado a ${r.ventaCodigo}`);
          }}
        />
      )}
    </section>
  );
}

/** A dónde entró la plata del pago aprobado (igual que en Abonar). */
function AprobarDialog({ reporte, onCerrar, onListo }: { reporte: ReporteAbonoCliente; onCerrar: () => void; onListo: () => void }) {
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [fuente, setFuente] = useState<FuenteIngreso>('BANCO');
  const [bancoId, setBancoId] = useState(reporte.empresaBancoId ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    getBancos().then((b) => {
      if (!vivo) return;
      setBancos(b);
      // La cuenta que dijo el cliente; si no dijo (Yape/Plin), la principal.
      setBancoId((actual) => actual || (b.find((x) => x.esPrincipal) ?? b[0])?.id || '');
    }).catch(() => setBancos([]));
    return () => { vivo = false; };
  }, []);

  const aprobar = async () => {
    if (fuente === 'BANCO' && !bancoId) { setError('Elige la cuenta a la que entró el pago'); return; }
    setEnviando(true);
    setError('');
    try {
      await cxcService.aprobarReporteAbono(reporte.id, { fuente, ...(fuente === 'BANCO' ? { bancoId } : {}) });
      onListo();
    } catch (err) {
      setError(mensaje(err, 'No se pudo aprobar el pago'));
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-sm font-medium text-gray-900">Aprobar pago de {reporte.cliente}</h3>
        <p className="mt-1 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
          {fmt(reporte.monto)} por {METODO[reporte.metodoPago]?.texto ?? reporte.metodoPago} a {reporte.ventaCodigo}
          {reporte.numeroOperacion && <> · Op. {reporte.numeroOperacion}</>}
        </p>
        <p className="mt-2 text-[11px] text-gray-500">Verifica que el dinero llegó antes de aprobar: se registra como abono y baja el saldo del cliente.</p>

        <label className="mt-3 mb-1 block text-xs font-medium text-gray-600">Entra a</label>
        <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
          value={fuente} onChange={(e) => setFuente(e.target.value as FuenteIngreso)}>
          <option value="BANCO">Banco (cuenta de la empresa)</option>
          <option value="TESORERIA">Tesorería (Caja Central)</option>
          <option value="CAJA">Caja (mi caja abierta)</option>
        </select>
        {fuente === 'BANCO' && (
          bancos.length === 0 ? (
            <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">No hay cuentas bancarias. Crea una en Tesorería.</p>
          ) : (
            <select className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombreBanco} ·· {b.numeroCuenta} ({b.moneda ?? 'PEN'}){b.id === reporte.empresaBancoId ? ' — la que indicó el cliente' : ''}
                </option>
              ))}
            </select>
          )
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={enviando} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => void aprobar()} disabled={enviando}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {enviando ? 'Registrando...' : 'Aprobar y registrar abono'}
          </button>
        </div>
      </div>
    </div>
  );
}
