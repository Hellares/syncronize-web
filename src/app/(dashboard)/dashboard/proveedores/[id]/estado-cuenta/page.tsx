'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { EstadoCuentaTercero, EcDoc } from '@/core/types/proveedor';
import { estadoCuentaTercero } from '@/features/proveedores/services/proveedor-service';

const sim = (m?: string) => (m === 'USD' ? '$' : m === 'PEN' || !m ? 'S/' : `${m} `);
const money = (m: string, v: number) => `${sim(m)} ${v.toFixed(2)}`;
const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '');
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function EstadoCuentaProveedorPage() {
  const params = useParams();
  const id = String(params.id);
  const hoy = new Date();
  const [desde, setDesde] = useState(ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
  const [hasta, setHasta] = useState(ymd(hoy));
  const [data, setData] = useState<EstadoCuentaTercero | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // El backend toma fecha-sin-hora hasta fin del día.
      const d = await estadoCuentaTercero(id, `${desde}T00:00:00.000`, `${hasta}T23:59:59.999`);
      setData(d);
    } catch {
      setError('No se pudo cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  }, [id, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error || !data) return <div className="p-6 text-sm text-red-600">{error ?? 'Sin datos'}</div>;

  const netoEntries = Object.entries(data.netoPorMoneda);

  const netoLinea = (moneda: string, v: number) => {
    if (Math.abs(v) < 0.01) return { txt: `${sim(moneda)} 0.00 · saldado`, cls: 'text-gray-500' };
    if (v > 0) return { txt: `Le debés ${money(moneda, v)}`, cls: 'text-red-600' };
    return { txt: `Te debe ${money(moneda, -v)}`, cls: 'text-green-600' };
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-semibold text-[#004A94]">Estado de cuenta</h1>
      <p className="mb-4 text-sm text-gray-600">{data.proveedor.nombre} · {data.proveedor.numeroDocumento}</p>

      {/* Neto */}
      <div className="mb-3 rounded-xl border border-gray-100 bg-white p-4">
        <div className="text-xs text-gray-500">Saldo neto</div>
        {netoEntries.length === 0 ? (
          <div className="text-base font-semibold text-gray-500">Sin saldos</div>
        ) : (
          netoEntries.map(([m, v]) => {
            const n = netoLinea(m, v);
            return <div key={m} className={`text-lg font-bold ${n.cls}`}>{n.txt}</div>;
          })
        )}
      </div>

      {/* Le debo / Me debe */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <LadoCard titulo="Le debo (compras)" porMoneda={data.leDeboPorMoneda} color="red" />
        <LadoCard titulo="Me debe (ventas)" porMoneda={data.meDebePorMoneda} color="green" />
      </div>
      {!data.esTercero && (
        <p className="mb-4 text-xs text-gray-500">
          Este proveedor todavía no está registrado como cliente, por eso “Me debe” está vacío.
        </p>
      )}

      {/* PENDIENTES */}
      <h2 className="mb-2 text-sm font-semibold text-[#004A94]">Pendientes de pago</h2>
      {data.pendientes.ventas.length === 0 && data.pendientes.compras.length === 0 ? (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">No hay saldos pendientes 🎉</div>
      ) : (
        <div className="mb-4 space-y-3">
          {data.pendientes.ventas.length > 0 && <Grupo titulo="Ventas por cobrar" docs={data.pendientes.ventas} />}
          {data.pendientes.compras.length > 0 && <Grupo titulo="Compras por pagar" docs={data.pendientes.compras} />}
        </div>
      )}

      {/* HISTORIAL */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#004A94]">Historial</h2>
        <div className="flex items-center gap-1 text-xs">
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="rounded border border-gray-200 px-2 py-1" />
          <span className="text-gray-400">→</span>
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="rounded border border-gray-200 px-2 py-1" />
        </div>
      </div>
      {data.historial.ventas.length === 0 && data.historial.compras.length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">Sin movimientos en el período.</div>
      ) : (
        <div className="space-y-3">
          {data.historial.ventas.length > 0 && <Grupo titulo="Ventas" docs={data.historial.ventas} />}
          {data.historial.compras.length > 0 && <Grupo titulo="Compras" docs={data.historial.compras} />}
        </div>
      )}
    </div>
  );
}

function LadoCard({ titulo, porMoneda, color }: { titulo: string; porMoneda: Record<string, number>; color: 'red' | 'green' }) {
  const entradas = Object.entries(porMoneda).filter(([, v]) => Math.abs(v) > 0.001);
  const cls = color === 'red' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';
  return (
    <div className={`rounded-xl p-3 ${color === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
      <div className={`text-xs font-medium ${color === 'red' ? 'text-red-700' : 'text-green-700'}`}>{titulo}</div>
      {entradas.length === 0 ? (
        <div className="text-sm text-gray-400">—</div>
      ) : (
        entradas.map(([m, v]) => <div key={m} className={`text-base font-bold ${cls.split(' ')[0]}`}>{money(m, v)}</div>)
      )}
    </div>
  );
}

function Grupo({ titulo, docs }: { titulo: string; docs: EcDoc[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600">{titulo}</div>
      <div className="space-y-1.5">
        {docs.map((d) => <DocRow key={d.id} d={d} />)}
      </div>
    </div>
  );
}

function DocRow({ d }: { d: EcDoc }) {
  const esCompra = d.tipo === 'COMPRA';
  const color = esCompra ? 'text-red-600' : 'text-green-600';
  return (
    <details className="rounded-lg border border-gray-100 bg-white">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
        <span>
          <span className={`font-medium ${color}`}>{esCompra ? 'Compra' : 'Venta'}</span>
          <span className="text-gray-700"> · {d.codigo}</span>
          <span className="ml-2 text-xs text-gray-500">{fmtFecha(d.fecha)} · {d.estado}</span>
        </span>
        <span className="text-right">
          <span className="font-semibold text-gray-800">{money(d.moneda, d.total)}</span>
          {d.saldoPendiente > 0.001 && (
            <span className={`ml-2 text-xs ${color}`}>saldo {money(d.moneda, d.saldoPendiente)}</span>
          )}
        </span>
      </summary>
      <div className="border-t border-gray-100 px-3 py-2">
        {d.items.length === 0 ? (
          <div className="text-xs text-gray-400">Sin ítems</div>
        ) : (
          d.items.map((it, i) => (
            <div key={i} className="flex justify-between py-0.5 text-xs text-gray-600">
              <span>{it.cantidad} × {it.descripcion}</span>
              <span>{money(d.moneda, it.total)}</span>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
