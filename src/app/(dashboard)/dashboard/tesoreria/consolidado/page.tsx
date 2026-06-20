'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ConsolidadoTesoreria, CuentaRecaudacion } from '@/core/types/tesoreria-bancos';
import type { BancoEmpresa } from '@/core/types/compra';
import {
  getConsolidado, getCuentasRecaudacion, setCuentaRecaudacion, removeCuentaRecaudacion,
} from '@/features/tesoreria/services/bancos-service';
import BancoFormDialog from '@/features/tesoreria/components/BancoFormDialog';

const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const labelMetodo = (m: string) => ({ YAPE: 'Yape', PLIN: 'Plin', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', EFECTIVO: 'Efectivo' }[m] ?? m);
const METODOS_RECAUDABLES = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

export default function TesoreriaConsolidadoPage() {
  const router = useRouter();
  const [data, setData] = useState<ConsolidadoTesoreria | null>(null);
  const [recaudacion, setRecaudacion] = useState<CuentaRecaudacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BancoEmpresa | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([getConsolidado(), getCuentasRecaudacion().catch(() => [])]);
      setData(c);
      setRecaudacion(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const onRecaudacion = async (metodo: string, bancoId: string) => {
    try {
      if (bancoId) await setCuentaRecaudacion(metodo, bancoId);
      else await removeCuentaRecaudacion(metodo);
      cargar();
    } catch { showToast('No se pudo guardar el mapeo'); }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (!data) return <div className="p-6 text-sm text-red-600">Sin datos</div>;

  const efectivo = data.totalEfectivo;
  const bancosPen = data.bancosPorMoneda?.['PEN'] ?? 0;
  const bancosUsd = data.bancosPorMoneda?.['USD'] ?? 0;
  const metodos = Object.entries(data.recaudadoPorMetodo ?? {}).filter(([, v]) => Math.abs(v) > 0.001).sort((a, b) => b[1] - a[1]);
  const bancosPen_list = data.bancos.filter((b) => (b.moneda ?? 'PEN') === 'PEN');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard/tesoreria" className="text-xs text-[#437EFF]">← Tesorería</Link>
          <h1 className="text-lg font-semibold text-[#004A94]">Dónde está mi plata</h1>
        </div>
        <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]">
          + Nueva cuenta
        </button>
      </div>

      {/* Totales */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card label="Efectivo (bóveda)" valor={`S/ ${efectivo.toFixed(2)}`} color="text-green-700 bg-green-50" />
        <Card label="En bancos (PEN)" valor={`S/ ${bancosPen.toFixed(2)}`} color="text-[#004A94] bg-blue-50" />
        <Card label="Total (efectivo + bancos PEN)" valor={`S/ ${(efectivo + bancosPen).toFixed(2)}`} color="text-gray-800 bg-gray-100" />
      </div>
      {bancosUsd !== 0 && <p className="mb-3 text-xs text-gray-500">+ $ {bancosUsd.toFixed(2)} en cuentas USD</p>}

      {/* Desglose digital por método */}
      {metodos.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-2 text-xs font-medium text-gray-600">Recaudado por método (a los bancos)</div>
          <div className="flex flex-wrap gap-2">
            {metodos.map(([m, v]) => (
              <span key={m} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#004A94]">
                {labelMetodo(m)} · S/ {v.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bancos */}
      <h2 className="mb-2 text-sm font-semibold text-gray-700">Cuentas bancarias</h2>
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.bancos.length === 0 ? (
          <div className="text-sm text-gray-500">Sin cuentas bancarias. Creá una arriba.</div>
        ) : data.bancos.map((b) => (
          <div key={b.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-800">{b.nombreBanco}{b.esPrincipal && <span className="ml-1 text-[10px] text-[#437EFF]">★</span>}</div>
                <div className="text-xs text-gray-500">·· {b.numeroCuenta} ({b.moneda ?? 'PEN'})</div>
              </div>
            </div>
            <div className="mt-2 text-xl font-bold text-[#004A94]">{sim(b.moneda ?? 'PEN')} {(b.saldoActual ?? 0).toFixed(2)}</div>
            <button onClick={() => router.push(`/dashboard/tesoreria/bancos/${b.id}`)} className="mt-2 text-xs text-[#004A94] hover:underline">
              Estado de cuenta →
            </button>
          </div>
        ))}
      </div>

      {/* Cuentas de recaudación */}
      <h2 className="mb-2 text-sm font-semibold text-gray-700">Cuentas de recaudación (a qué banco entra cada método digital)</h2>
      <div className="grid grid-cols-1 gap-2 md:max-w-2xl">
        {METODOS_RECAUDABLES.map((m) => {
          const actual = recaudacion.find((r) => r.metodoPago === m)?.bancoId ?? '';
          return (
            <div key={m} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2">
              <span className="w-28 text-sm text-gray-700">{labelMetodo(m)}</span>
              <select
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#437EFF]"
                value={actual}
                onChange={(e) => onRecaudacion(m, e.target.value)}
              >
                <option value="">Sin asignar (va a Tesorería)</option>
                {bancosPen_list.map((b) => <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      <BancoFormDialog isOpen={dialogOpen} banco={editing} onClose={() => setDialogOpen(false)} onSuccess={(m) => { setDialogOpen(false); showToast(m); cargar(); }} />
      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function Card({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color.split(' ').slice(1).join(' ')}`}>
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className={`text-xl font-bold ${color.split(' ')[0]}`}>{valor}</div>
    </div>
  );
}
