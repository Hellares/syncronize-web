'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CuentaPagarDetalle, RegistrarPagoDto } from '@/core/types/cuentas-pagar';
import { getDetalleCxP, registrarPago, anularPagoCxP } from '@/features/cuentas-pagar/services/cuentas-pagar-service';
import PagoProveedorDialog from '@/features/cuentas-pagar/components/PagoProveedorDialog';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const num = (v: number | string) => Number(v ?? 0);
const fmtFechaHora = (iso?: string) => (iso ? new Date(iso).toLocaleString('es-PE') : '');

export default function CxPDetallePage() {
  const params = useParams();
  const compraId = String(params.compraId);
  const [c, setC] = useState<CuentaPagarDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setC(await getDetalleCxP(compraId)); } catch { setError('No se pudo cargar el detalle'); }
    finally { setLoading(false); }
  }, [compraId]);

  useEffect(() => { cargar(); }, [cargar]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message;

  const onRegistrar = async (dto: RegistrarPagoDto) => {
    setBusy(true);
    setPagoOpen(false);
    try { await registrarPago(compraId, dto); showToast('Pago registrado'); cargar(); }
    catch (e) { showToast(errMsg(e) ?? 'No se pudo registrar el pago'); }
    finally { setBusy(false); }
  };

  const onAnularPago = async (pagoId: string) => {
    const motivo = prompt('Motivo de la anulación (opcional):') ?? undefined;
    if (motivo === undefined && !confirm('¿Anular este pago? Se revertirá el egreso.')) return;
    setBusy(true);
    try { await anularPagoCxP(pagoId, motivo || undefined); showToast('Pago anulado'); cargar(); }
    catch (e) { showToast(errMsg(e) ?? 'No se pudo anular'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error || !c) return <div className="p-6 text-sm text-red-600">{error ?? 'Sin datos'}</div>;

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/cuentas-pagar" className="text-xs text-[#437EFF]">← Volver a Cuentas por Pagar</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#004A94]">{c.codigo}</h1>
          <p className="text-sm text-gray-700">{c.nombreProveedor}</p>
          <p className="text-xs text-gray-500">{c.estado} · saldo {sim(c.moneda)} {num(c.saldoPendiente).toFixed(2)} de {sim(c.moneda)} {num(c.totalCompra).toFixed(2)}</p>
        </div>
        {num(c.saldoPendiente) > 0.001 && (
          <button onClick={() => setPagoOpen(true)} disabled={busy} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
            Registrar pago
          </button>
        )}
      </div>

      {/* Ítems */}
      <h2 className="mt-4 mb-1 text-sm font-semibold text-gray-700">Ítems</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-right">Cant.</th><th className="px-3 py-2 text-right">P. Unit.</th><th className="px-3 py-2 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(c.detalles ?? []).map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-gray-800">{d.descripcion}</td>
                <td className="px-3 py-2 text-right">{num(d.cantidad)}</td>
                <td className="px-3 py-2 text-right">{sim(c.moneda)} {num(d.precioUnitario).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-medium">{sim(c.moneda)} {num(d.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historial de pagos */}
      <h2 className="mt-4 mb-1 text-sm font-semibold text-gray-700">Historial de pagos</h2>
      {(c.pagos ?? []).length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">Sin pagos registrados.</div>
      ) : (
        <div className="space-y-1.5">
          {c.pagos.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-gray-800">{p.metodoPago}</span>
                {p.fuente && <span className="text-xs text-gray-500"> · {p.fuente}</span>}
                {p.referencia && <span className="text-xs text-gray-400"> · {p.referencia}</span>}
                <div className="text-xs text-gray-500">{fmtFechaHora(p.fechaPago)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-green-700">{sim(c.moneda)} {num(p.monto).toFixed(2)}</span>
                <button onClick={() => onAnularPago(p.id)} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">Anular</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PagoProveedorDialog
        isOpen={pagoOpen}
        saldo={num(c.saldoPendiente)}
        moneda={c.moneda}
        onRegistrar={onRegistrar}
        onClose={() => setPagoOpen(false)}
      />

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
