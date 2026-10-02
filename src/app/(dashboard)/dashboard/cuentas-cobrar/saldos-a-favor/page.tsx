'use client';

// Clientes con saldo a favor: plata que ya entró a caja/banco y todavía no se
// aplicó a ninguna venta. Se llega desde la tarjeta "Saldos a favor" de
// Tesorería; de acá se abre el estado de cuenta para repartirla.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSaldosAFavor } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import type { ClienteSaldoAFavor } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import { fmtFechaHora } from '@/core/utils/fecha';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const hrefEstadoCuenta = (c: ClienteSaldoAFavor) => {
  const q = new URLSearchParams();
  if (c.clienteEmpresaId) q.set('clienteEmpresaId', c.clienteEmpresaId);
  else if (c.clienteId) q.set('clienteId', c.clienteId);
  q.set('nombre', c.nombre);
  return `/dashboard/cuentas-cobrar/estado-cuenta?${q.toString()}`;
};

export default function SaldosAFavorPage() {
  const [clientes, setClientes] = useState<ClienteSaldoAFavor[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    getSaldosAFavor()
      .then((r) => { if (vivo) { setClientes(r.clientes); setTotal(r.total); } })
      .catch(() => { if (vivo) setError('No se pudieron cargar los saldos a favor'); });
    return () => { vivo = false; };
  }, []);

  const porRepartir = (clientes ?? []).filter((c) => c.deuda > 0.005);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Saldos a favor de clientes</h1>
          <p className="text-sm text-gray-500">Plata que los clientes ya depositaron y todavía no se aplicó a ninguna venta.</p>
        </div>
        <Link href="/dashboard/tesoreria" className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Volver a Tesorería
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{error}</p>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-white to-amber-100 p-3 shadow-sm ring-1 ring-amber-400">
          <p className="text-lg font-bold text-amber-700">{fmt(total)}</p>
          <p className="text-[11px] text-gray-500">Total a favor de clientes</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-400/40">
          <p className="text-lg font-bold text-gray-900">{clientes?.length ?? 0}</p>
          <p className="text-[11px] text-gray-500">Clientes con saldo a favor</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-400/40">
          <p className="text-lg font-bold text-[#004A94]">{porRepartir.length}</p>
          <p className="text-[11px] text-gray-500">Con ventas pendientes: se puede repartir</p>
        </div>
      </div>

      {clientes === null && !error ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : (clientes ?? []).length === 0 ? (
        <p className="rounded-xl bg-white py-10 text-center text-xs text-gray-400 ring-1 ring-blue-400/40">
          Ningún cliente tiene saldo a favor.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[#cfe0f5] bg-[#eaf2fd]">
              <tr>
                <th className="w-full px-3 py-3 font-medium text-[#004A94]">Cliente</th>
                <th className="hidden w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94] md:table-cell">Último depósito</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Debe</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">A favor</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(clientes ?? []).map((c) => (
                <tr key={c.clienteEmpresaId ?? c.clienteId ?? c.nombre} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-3 py-2">
                    <span className="text-gray-900">{c.nombre}</span>
                    <span className="block text-[10px] text-gray-400">
                      {c.documento ? `${c.documento} · ` : ''}{c.tipo === 'EMPRESA' ? 'Empresa' : 'Persona'} · {c.depositos} {c.depositos === 1 ? 'depósito' : 'depósitos'}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-gray-600 md:table-cell">{fmtFechaHora(c.ultimoDeposito)}</td>
                  <td className="whitespace-nowrap bg-orange-100 px-3 py-2 text-right text-gray-900">
                    {c.deuda > 0.005 ? fmt(c.deuda) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap bg-amber-100 px-3 py-2 text-right font-bold text-amber-800">{fmt(c.saldoAFavor)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link href={hrefEstadoCuenta(c)} className="text-[11px] font-medium text-[#437EFF] hover:underline">
                      {c.deuda > 0.005 ? 'Estado de cuenta y repartir' : 'Ver estado de cuenta'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
