'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CuentaPorPagar, ResumenCxP, DeudaProveedor, EstadoCxP } from '@/core/types/cuentas-pagar';
import { listarCxP, getResumenCxP, getPorProveedor } from '@/features/cuentas-pagar/services/cuentas-pagar-service';
import { fmtFechaHoraCompra } from '@/core/utils/fecha-compra';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
// 🔴 La fecha de la COMPRA es un momento y lleva hora; el VENCIMIENTO es un
// dia y no la lleva: sale de `fechaRecepcion + N dias`, asi que arrastra la
// hora de la compra y una deuda no vence "a las 19:00".
const fmtFecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—');
const porMoneda = (m: Record<string, number>) => {
  const e = Object.entries(m).filter(([, v]) => Math.abs(v) > 0.001);
  return e.length ? e.map(([k, v]) => `${sim(k)} ${v.toFixed(2)}`).join('  ·  ') : 'S/ 0.00';
};

const ESTADO_STYLE: Record<EstadoCxP, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700',
  VENCIDA: 'bg-red-50 text-red-700',
  PAGADA: 'bg-green-50 text-green-700',
};

export default function CuentasPagarPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'compra' | 'proveedor'>('compra');
  const [estado, setEstado] = useState<EstadoCxP | undefined>(undefined);
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [resumen, setResumen] = useState<ResumenCxP | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, d] = await Promise.all([
        getResumenCxP(),
        listarCxP({ estado }),
        getPorProveedor(),
      ]);
      setResumen(r);
      setCuentas(c);
      setDeudas(d);
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-semibold text-[#004A94]">Cuentas por Pagar</h1>
      <p className="mb-4 text-xs text-gray-500">Deudas con proveedores por compras a crédito o contado no pagadas.</p>

      {/* Resumen por moneda */}
      {resumen && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:max-w-lg">
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="text-xs font-medium text-amber-700">Pendiente ({resumen.cantidadPendientes})</div>
            <div className="text-base font-bold text-amber-700">{porMoneda(resumen.pendientePorMoneda)}</div>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <div className="text-xs font-medium text-red-700">Vencido ({resumen.cantidadVencidas})</div>
            <div className="text-base font-bold text-red-700">{porMoneda(resumen.vencidoPorMoneda)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setTab('compra')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'compra' ? 'bg-[#004A94] text-white' : 'bg-gray-100 text-gray-600'}`}>Por compra</button>
        <button onClick={() => setTab('proveedor')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'proveedor' ? 'bg-[#004A94] text-white' : 'bg-gray-100 text-gray-600'}`}>Por proveedor</button>
        {tab === 'compra' && (
          <div className="ml-auto flex gap-1">
            {([['Todas', undefined], ['Pendientes', 'PENDIENTE'], ['Vencidas', 'VENCIDA'], ['Pagadas', 'PAGADA']] as const).map(([l, v]) => (
              <button key={l} onClick={() => setEstado(v as EstadoCxP | undefined)} className={`rounded-lg px-2.5 py-1 text-xs ${estado === v ? 'bg-[#004A94] text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>
      ) : tab === 'compra' ? (
        cuentas.length === 0 ? <div className="py-16 text-center text-sm text-gray-500">Sin cuentas.</div> : (
          <div className="max-h-[calc(100vh-20rem)] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
            {/* Mismo armado que la tabla de Productos: ring azul (el gris se
                pierde sobre el #f5f7fa del dashboard), cabecera pegada con la
                banda #eaf2fd, y alto tope + overflow-auto, que es lo que hace
                que el sticky funcione. */}
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
                <tr>
                  <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Código</th>
                  <th className="w-full px-4 py-3 font-medium text-[#004A94]">Proveedor</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Fecha</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Vence</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Total</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Saldo</th>
                  <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cuentas.map((c) => (
                  <tr key={c.compraId} className="cursor-pointer hover:bg-[#f9fbff]" onClick={() => router.push(`/dashboard/cuentas-pagar/${c.compraId}`)}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-gray-500">{c.codigo}</td>
                    <td className="px-4 py-2 text-gray-800">{c.nombreProveedor}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{fmtFechaHoraCompra(c.fechaCompra)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{fmtFecha(c.fechaVencimiento)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">{sim(c.moneda)} {c.totalCompra.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">{sim(c.moneda)} {c.saldoPendiente.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_STYLE[c.estado]}`}>{c.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        deudas.length === 0 ? <div className="py-16 text-center text-sm text-gray-500">Sin deudas.</div> : (
          <div className="max-h-[calc(100vh-20rem)] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
                <tr>
                  <th className="w-full px-4 py-3 font-medium text-[#004A94]">Proveedor</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 text-center font-medium text-[#004A94]">Compras</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Deuda</th>
                  <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Vencido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deudas.map((d) => (
                  <tr key={d.proveedorId} className="hover:bg-[#f9fbff]">
                    <td className="px-4 py-2">
                      <div className="text-gray-800">{d.nombreProveedor}</div>
                      {d.documentoProveedor && <div className="text-[11px] text-gray-500">{d.documentoProveedor}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center text-gray-600">{d.cantidadCompras}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">{porMoneda(d.deudaPorMoneda)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-red-600">{d.totalVencido > 0 ? d.totalVencido.toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
