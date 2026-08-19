'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OrdenCompra, OrdenCompraDetalle, EstadoOrdenCompra, LineaRecepcionOc } from '@/core/types/compra';
import { ESTADO_OC_CONFIG, TIPOS_DOC_PROVEEDOR } from '@/core/types/compra';
import {
  getOrdenCompra, cambiarEstadoOrdenCompra, eliminarOrdenCompra, duplicarOrdenCompra,
  getLineasPendientes, crearCompraDesdeOrden,
} from '@/features/compras/services/orden-compra-service';

const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const num = (v: number | string | null | undefined) => Number(v ?? 0);
const fmtFecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—');
// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de `servicios/nueva`, `CotizacionForm` y los formularios de compra. El
// ring va BAKED porque aca el error es un banner, no una marca por campo.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

export default function OrdenCompraDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [oc, setOc] = useState<OrdenCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recibirOpen, setRecibirOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setOc(await getOrdenCompra(id)); } catch { setError('No se pudo cargar la orden'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const cambiarEstado = async (estado: EstadoOrdenCompra, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    try { await cambiarEstadoOrdenCompra(id, estado); showToast(`Orden ${ESTADO_OC_CONFIG[estado].label.toLowerCase()}`); cargar(); }
    catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'No se pudo cambiar el estado');
    } finally { setBusy(false); }
  };

  const onEliminar = async () => {
    if (!confirm('¿Eliminar este borrador de orden?')) return;
    setBusy(true);
    try { await eliminarOrdenCompra(id); router.push('/dashboard/ordenes-compra'); }
    catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'No se pudo eliminar'); setBusy(false);
    }
  };

  const onDuplicar = async () => {
    setBusy(true);
    try { const dup = await duplicarOrdenCompra(id); router.push(`/dashboard/ordenes-compra/${dup.id}`); }
    catch { showToast('No se pudo duplicar'); setBusy(false); }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error || !oc) return <div className="p-6 text-sm text-red-600">{error ?? 'Sin datos'}</div>;

  const cfg = ESTADO_OC_CONFIG[oc.estado];
  const puedeRecibir = oc.estado === 'APROBADA' || oc.estado === 'PARCIAL';
  const totalPendiente = (oc.detalles ?? []).reduce((s, d) => s + (d.cantidadPendiente ?? 0), 0);

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/ordenes-compra" className="text-xs text-[#437EFF]">← Volver a Órdenes de Compra</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#004A94]">{oc.codigo}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.style}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-gray-700">{oc.nombreProveedor}</p>
          <p className="text-xs text-gray-500">
            Emitida {fmtFecha(oc.fechaEmision)} · entrega esperada {fmtFecha(oc.fechaEntregaEsperada)}
            · {oc.terminosPago?.replace('_', ' ') ?? 'CONTADO'}{oc.diasCredito ? ` (${oc.diasCredito} días)` : ''}
            {oc.sede?.nombre ? ` · ${oc.sede.nombre}` : ''}
          </p>
          {oc.observaciones && <p className="mt-0.5 text-xs italic text-gray-400">{oc.observaciones}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {oc.estado === 'BORRADOR' && (
            <>
              <button onClick={onEliminar} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-60">Eliminar</button>
              <button onClick={() => cambiarEstado('PENDIENTE', '¿Enviar la orden al proveedor? Pasará a PENDIENTE de aprobación.')} disabled={busy}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">Enviar</button>
            </>
          )}
          {oc.estado === 'PENDIENTE' && (
            <>
              <button onClick={() => cambiarEstado('CANCELADA', '¿Cancelar esta orden de compra?')} disabled={busy}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">Cancelar</button>
              <button onClick={() => cambiarEstado('APROBADA', '¿Aprobar la orden? Podrá recibirse (parcial o total).')} disabled={busy}
                className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">Aprobar</button>
            </>
          )}
          {puedeRecibir && totalPendiente > 0 && (
            <button onClick={() => setRecibirOpen(true)} disabled={busy}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
              📦 Recibir
            </button>
          )}
          <button onClick={onDuplicar} disabled={busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">Duplicar</button>
        </div>
      </div>

      {/* Compras generadas por recepciones */}
      {(oc.compras ?? []).length > 0 && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-blue-700">
            Recepciones: {oc.compras!.map((c, i) => (
              <Link key={c.id} href={`/dashboard/compras/${c.id}`} className="hover:underline">
                {i > 0 ? ' · ' : ''}{c.codigo} ({c.estado})
              </Link>
            ))}
          </p>
        </div>
      )}

      {/* Líneas con progreso de recepción */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-2 py-2 text-right">Pedido</th>
              <th className="px-2 py-2 text-right">Recibido</th>
              <th className="px-2 py-2 text-right">Pendiente</th>
              <th className="px-2 py-2 text-right">P. Unit.</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(oc.detalles ?? []).map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-gray-800">
                  {d.descripcion}
                  {d.usaUnidadCompra && d.cantidadOriginal != null && (
                    <span className="block text-[10px] text-gray-400">
                      Pedido: {num(d.cantidadOriginal)} {d.unidadOriginalSimbolo ?? 'paq.'} × {num(d.factorAplicado)} = {num(d.cantidad)} unid. base
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">{num(d.cantidad)}</td>
                <td className="px-2 py-2 text-right text-green-700">{d.cantidadRecibida ?? 0}</td>
                <td className={`px-2 py-2 text-right font-medium ${(d.cantidadPendiente ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{d.cantidadPendiente ?? 0}</td>
                <td className="px-2 py-2 text-right">{sim(oc.moneda)} {num(d.precioUnitario).toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-medium">{sim(oc.moneda)} {num(d.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{sim(oc.moneda)} {num(oc.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Impuestos</span><span>{sim(oc.moneda)} {num(oc.impuestos).toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-1 font-semibold text-[#004A94]">
            <span>Total</span><span>{sim(oc.moneda)} {num(oc.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {recibirOpen && (
        <RecibirDialog
          ordenId={id}
          moneda={oc.moneda}
          terminosPago={oc.terminosPago}
          onDone={(compraId) => { setRecibirOpen(false); router.push(`/dashboard/compras/${compraId}`); }}
          onClose={() => setRecibirOpen(false)}
        />
      )}

      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

/* ─── Recepción: elegir líneas/cantidades pendientes → crea Compra BORRADOR ── */
function RecibirDialog({ ordenId, moneda, terminosPago, onDone, onClose }: {
  ordenId: string; moneda: string; terminosPago?: string | null;
  onDone: (compraId: string) => void; onClose: () => void;
}) {
  const [pendientes, setPendientes] = useState<OrdenCompraDetalle[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [tipoDoc, setTipoDoc] = useState('FACTURA');
  const [serie, setSerie] = useState('');
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getLineasPendientes(ordenId)
      .then(lp => {
        if (!alive) return;
        setPendientes(lp);
        // Default: recibir TODO lo pendiente al precio de la OC
        const c: Record<string, string> = {};
        lp.forEach(d => { c[d.id] = String(d.cantidadPendiente ?? 0); });
        setCantidades(c);
      })
      .catch(() => { if (alive) setError('No se pudieron cargar las líneas pendientes'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ordenId]);

  const numVal = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;

  const submit = async () => {
    const lineas: LineaRecepcionOc[] = pendientes
      .map(d => {
        const cant = Math.trunc(numVal(cantidades[d.id] ?? ''));
        if (cant <= 0) return null;
        const precio = numVal(precios[d.id] ?? '');
        return {
          ordenCompraDetalleId: d.id,
          cantidad: Math.min(cant, d.cantidadPendiente ?? cant),
          ...(precio > 0 ? { precioUnitario: precio } : {}),
        };
      })
      .filter((x): x is LineaRecepcionOc => x !== null);
    if (lineas.length === 0) { setError('Indica al menos una cantidad a recibir'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const compra = await crearCompraDesdeOrden({
        ordenCompraId: ordenId,
        ...(terminosPago ? { terminosPago } : {}),
        tipoDocumentoProveedor: (serie.trim() || numero.trim()) ? tipoDoc : undefined,
        serieDocumentoProveedor: serie.trim() || undefined,
        numeroDocumentoProveedor: numero.trim() || undefined,
        lineas,
      });
      onDone(compra.id);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo registrar la recepción');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">📦 Recibir mercadería</h3>
        <p className="text-xs text-gray-500">Se crea una compra en BORRADOR con lo recibido; la confirmas (con o sin pago) desde su detalle. La orden pasa a PARCIAL o COMPLETADA según lo pendiente.</p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">Cargando líneas pendientes…</p>
        ) : pendientes.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">No hay líneas pendientes de recepción.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pendientes.map(d => (
              <div key={d.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{d.variante?.nombre ?? d.producto?.nombre ?? d.descripcion}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                  <span>Pendiente: <strong className="text-amber-600">{d.cantidadPendiente}</strong></span>
                  <label className="flex items-center gap-1">
                    Recibir:
                    <input type="number" min={0} max={d.cantidadPendiente} value={cantidades[d.id] ?? ''}
                      onChange={e => setCantidades(prev => ({ ...prev, [d.id]: e.target.value }))}
                      className={`${INPUT_STD} w-20 px-2 text-right`} />
                  </label>
                  <label className="flex items-center gap-1">
                    P. unit ({sim(moneda)}):
                    <input type="number" step="0.01" min={0} placeholder={num(d.precioUnitario).toFixed(2)} value={precios[d.id] ?? ''}
                      onChange={e => setPrecios(prev => ({ ...prev, [d.id]: e.target.value }))}
                      className={`${INPUT_STD} w-24 px-2 text-right`}
                      title="Solo si el precio real difiere del de la orden" />
                  </label>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-gray-500">Doc. proveedor</label>
                <select className={INPUT_STD} value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                  {TIPOS_DOC_PROVEEDOR.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-gray-500">Serie</label>
                <input className={INPUT_STD} value={serie} onChange={e => setSerie(e.target.value)} placeholder="F001" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-gray-500">N°</label>
                <input className={INPUT_STD} value={numero} onChange={e => setNumero(e.target.value)} placeholder="00012" />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting || loading || pendientes.length === 0}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Registrando…' : 'Registrar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}
