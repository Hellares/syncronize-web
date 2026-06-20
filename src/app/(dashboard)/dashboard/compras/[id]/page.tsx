'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CompraDetalle, PagoContadoCompra } from '@/core/types/compra';
import { getCompra, confirmarCompra, anularCompra } from '@/features/compras/services/compra-service';
import ConfirmarPagoDialog from '@/features/compras/components/ConfirmarPagoDialog';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const num = (v: number | string) => Number(v ?? 0);
const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '');

export default function CompraDetallePage() {
  const params = useParams();
  const id = String(params.id);
  const [c, setC] = useState<CompraDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setC(await getCompra(id)); } catch { setError('No se pudo cargar la compra'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const doConfirmar = async (pago?: PagoContadoCompra) => {
    setBusy(true);
    setPagoOpen(false);
    try {
      await confirmarCompra(id, pago);
      showToast('Compra confirmada');
      cargar();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'No se pudo confirmar');
    } finally { setBusy(false); }
  };

  const onConfirmar = () => {
    if (!c) return;
    const t = (c.terminosPago ?? '').toUpperCase();
    const esContado = t === '' || t === 'CONTADO';
    if (esContado) { setPagoOpen(true); return; }
    // Crédito → va directo a CxP.
    if (confirm('Al confirmar se actualizará el stock y la compra quedará en Cuentas por Pagar. ¿Continuar?')) {
      doConfirmar();
    }
  };

  const onAnular = async () => {
    if (!confirm('Anular la compra revierte el stock y los pagos. ¿Continuar?')) return;
    setBusy(true);
    try { await anularCompra(id); showToast('Compra anulada'); cargar(); }
    catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'No se pudo anular');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error || !c) return <div className="p-6 text-sm text-red-600">{error ?? 'Sin datos'}</div>;

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/compras" className="text-xs text-[#437EFF]">← Volver a Compras</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#004A94]">{c.codigo}</h1>
          <p className="text-sm text-gray-700">{c.nombreProveedor}</p>
          <p className="text-xs text-gray-500">
            {fmtFecha(c.fechaRecepcion)} · {c.terminosPago?.replace('_', ' ') ?? 'CONTADO'} · {c.estado}
            {c.estado === 'CONFIRMADA' && (c.pagoPendiente ? ' · CxP pendiente' : ' · pagada')}
          </p>
        </div>
        <div className="flex gap-2">
          {c.estado === 'BORRADOR' && (
            <button onClick={onConfirmar} disabled={busy} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
              Confirmar
            </button>
          )}
          {c.estado === 'CONFIRMADA' && (
            <button onClick={onAnular} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
              Anular
            </button>
          )}
        </div>
      </div>

      {/* Ítems */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-right">Cant.</th>
              <th className="px-3 py-2 text-right">P. Unit.</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
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

      {/* Totales */}
      <div className="mt-3 flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <Row label="Subtotal" val={`${sim(c.moneda)} ${num(c.subtotal).toFixed(2)}`} />
          {num(c.descuento) > 0 && <Row label="Descuento" val={`- ${sim(c.moneda)} ${num(c.descuento).toFixed(2)}`} />}
          <Row label="Impuestos" val={`${sim(c.moneda)} ${num(c.impuestos).toFixed(2)}`} />
          <div className="flex justify-between border-t pt-1 font-semibold text-[#004A94]">
            <span>Total</span><span>{sim(c.moneda)} {num(c.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <ConfirmarPagoDialog
        isOpen={pagoOpen}
        total={num(c.total)}
        moneda={c.moneda}
        onRegistrar={(pago) => doConfirmar(pago)}
        onOmitir={() => doConfirmar()}
        onClose={() => setPagoOpen(false)}
      />

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return <div className="flex justify-between text-gray-600"><span>{label}</span><span>{val}</span></div>;
}
