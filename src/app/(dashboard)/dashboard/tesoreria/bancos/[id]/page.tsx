'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { EstadoCuentaBanco, AjusteBancoItem } from '@/core/types/tesoreria-bancos';
import {
  getEstadoCuentaBanco, conciliarBanco, ajustarBanco, getAjustesBanco,
} from '@/features/tesoreria/services/bancos-service';

const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const labelMetodo = (m: string) => ({ YAPE: 'Yape', PLIN: 'Plin', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', EFECTIVO: 'Efectivo' }[m] ?? m);
const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '');
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function EstadoCuentaBancoPage() {
  const params = useParams();
  const id = String(params.id);
  const hoy = new Date();
  const [desde, setDesde] = useState(ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
  const [hasta, setHasta] = useState(ymd(hoy));
  const [data, setData] = useState<EstadoCuentaBanco | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [ajustes, setAjustes] = useState<AjusteBancoItem[]>([]);
  // form ajuste
  const [aTipo, setATipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [aMonto, setAMonto] = useState('');
  const [aMotivo, setAMotivo] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setData(await getEstadoCuentaBanco(id, `${desde}T00:00:00.000`, `${hasta}T23:59:59.999`)); }
    finally { setLoading(false); }
  }, [id, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const onConciliar = async () => {
    const val = prompt('Saldo REAL según tu extracto bancario:');
    if (val == null) return;
    const saldo = parseFloat(val.replace(',', '.'));
    if (isNaN(saldo)) return showToast('Monto inválido');
    try { await conciliarBanco(id, saldo); showToast('Saldo conciliado'); cargar(); }
    catch { showToast('No se pudo conciliar'); }
  };

  const onAjustar = async () => {
    const monto = parseFloat(aMonto.replace(',', '.'));
    if (isNaN(monto) || monto <= 0) return showToast('Monto inválido');
    if (!aMotivo.trim()) return showToast('Indicá el motivo');
    try {
      await ajustarBanco(id, aTipo, monto, aMotivo.trim());
      setAjusteOpen(false); setAMonto(''); setAMotivo('');
      showToast('Ajuste registrado'); cargar();
    } catch { showToast('No se pudo ajustar'); }
  };

  const abrirHistorial = async () => {
    try { setAjustes(await getAjustesBanco(id)); setHistOpen(true); } catch { showToast('No se pudo cargar el historial'); }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (!data) return <div className="p-6 text-sm text-red-600">Sin datos</div>;

  const m = data.cuenta.moneda;
  const metodos = Object.entries(data.recaudadoPorMetodo ?? {}).filter(([, v]) => Math.abs(v) > 0.001).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/tesoreria/consolidado" className="text-xs text-[#437EFF]">← Consolidado</Link>

      {/* Saldo + acciones */}
      <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4">
        <div className="text-sm font-medium text-[#004A94]">{data.cuenta.nombreBanco}</div>
        <div className="text-xs text-gray-500">·· {data.cuenta.numeroCuenta} · {m}</div>
        <div className="mt-1 text-2xl font-bold text-[#004A94]">{sim(m)} {data.cuenta.saldoActual.toFixed(2)}</div>
        <div className="mt-3 flex gap-2">
          <button onClick={onConciliar} className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003a74]">Conciliar</button>
          <button onClick={() => setAjusteOpen(true)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Ajuste</button>
          <button onClick={abrirHistorial} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Historial</button>
        </div>
      </div>

      {/* Recaudado por método */}
      {metodos.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-2 text-xs font-medium text-gray-600">Recaudado por método</div>
          <div className="flex flex-wrap gap-2">
            {metodos.map(([k, v]) => (
              <span key={k} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#004A94]">{labelMetodo(k)} · {sim(m)} {v.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Resumen + rango */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-sm">
          <span className="text-green-700">Ingresos {sim(m)} {data.resumen.totalIngresos.toFixed(2)}</span>
          <span className="text-red-700">Egresos {sim(m)} {data.resumen.totalEgresos.toFixed(2)}</span>
          <span className="font-semibold text-[#004A94]">Neto {sim(m)} {data.resumen.neto.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="rounded border border-gray-200 px-2 py-1" />
          <span className="text-gray-400">→</span>
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="rounded border border-gray-200 px-2 py-1" />
        </div>
      </div>

      {/* Movimientos */}
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {data.movimientos.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">Sin movimientos en el período.</div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {data.movimientos.map((mov, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmtFecha(mov.fecha)}</td>
                  <td className="px-3 py-2 text-gray-800">{mov.concepto}{mov.detalle ? <span className="text-xs text-gray-400"> · {mov.detalle}</span> : null}</td>
                  <td className={`px-3 py-2 text-right font-medium ${mov.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'}`}>
                    {mov.tipo === 'INGRESO' ? '+' : '-'} {sim(m)} {mov.monto.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajuste */}
      {ajusteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAjusteOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold text-[#004A94]">Ajuste manual</h2>
            <div className="space-y-3">
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={aTipo} onChange={(e) => setATipo(e.target.value as 'INGRESO' | 'EGRESO')}>
                <option value="INGRESO">Ingreso (+)</option>
                <option value="EGRESO">Egreso (−)</option>
              </select>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Monto" value={aMonto} onChange={(e) => setAMonto(e.target.value)} inputMode="decimal" />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Motivo (ej: comisión bancaria)" value={aMotivo} onChange={(e) => setAMotivo(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAjusteOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={onAjustar} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {histOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold text-[#004A94]">Conciliaciones y ajustes</h2>
            {ajustes.length === 0 ? <div className="text-sm text-gray-500">Sin registros.</div> : (
              <div className="space-y-2">
                {ajustes.map((a, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">{a.origen} · {fmtFecha(a.creadoEn)}</span>
                      <span className={a.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'}>{a.tipo === 'INGRESO' ? '+' : '-'} {sim(m)} {a.monto.toFixed(2)}</span>
                    </div>
                    <div className="text-gray-700">{a.motivo}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-right">
              <button onClick={() => setHistOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
