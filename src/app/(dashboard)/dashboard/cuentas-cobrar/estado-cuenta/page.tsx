'use client';

// Estado de cuenta del cliente: resumen + ventas a crédito + abonos + PDF
// (paridad estado_cuenta_cliente_page.dart). Acepta ?clienteId= o ?clienteEmpresaId=.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { EstadoCuentaCliente, VentaCreditoEC } from '@/core/types/cuentas-cobrar';
import { ESTADO_CUENTA_CONFIG } from '@/core/types/cuentas-cobrar';
import { getEstadoCuentaCliente } from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';
import { descargarEstadoCuentaCliente } from '@/features/cuentas-cobrar/components/estado-cuenta-cliente-pdf';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const fmt = (n: number | undefined | null) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—');
const fuenteLabel = (f?: string | null) =>
  f === 'TESORERIA' ? 'Tesorería' : f === 'CAJA' ? 'Caja' : f === 'BANCO' ? 'Banco' : f ?? '';

function EstadoCuentaClienteContent() {
  const params = useSearchParams();
  const { empresa } = useEmpresa();
  const clienteId = params.get('clienteId') ?? undefined;
  const clienteEmpresaId = params.get('clienteEmpresaId') ?? undefined;
  const nombreFallback = params.get('nombre') ?? undefined;

  const [data, setData] = useState<EstadoCuentaCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!clienteId && !clienteEmpresaId) {
      setError('Falta el cliente (clienteId o clienteEmpresaId)');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getEstadoCuentaCliente({ clienteId, clienteEmpresaId }));
    } catch {
      setError('No se pudo cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  }, [clienteId, clienteEmpresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-600">{error ?? 'Sin datos'}</p>
        <button onClick={cargar} className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Reintentar</button>
      </div>
    );
  }

  const { cliente, resumen, ventas, abonos } = data;
  const pendientes = ventas.filter(v => v.saldoPendiente > 0.01);
  const historial = ventas.filter(v => v.saldoPendiente <= 0.01);
  const conSaldo = resumen.saldoPendiente > 0.005;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header cliente */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#437EFF]/10 text-lg">
            {cliente.tipo === 'EMPRESA' ? '🏢' : '👤'}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{cliente.nombre ?? nombreFallback ?? 'Cliente'}</h1>
            <p className="text-xs text-gray-500">
              {cliente.documento ? `${cliente.documento} · ` : ''}{cliente.tipo === 'EMPRESA' ? 'Empresa' : 'Persona'} · Estado de cuenta
            </p>
          </div>
        </div>
        <button
          onClick={() => descargarEstadoCuentaCliente(data, empresa?.razonSocial ?? empresa?.nombre ?? 'Mi empresa', empresa?.ruc ?? undefined)}
          className="rounded-lg border border-[#004A94] px-4 py-2 text-sm font-medium text-[#004A94] hover:bg-blue-50">
          Descargar PDF
        </button>
      </div>

      {/* Resumen */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">Saldo pendiente</p>
        <p className={`text-2xl font-extrabold ${conSaldo ? 'text-red-600' : 'text-green-600'}`}>{fmt(resumen.saldoPendiente)}</p>
        {resumen.totalMora > 0 && <p className="text-[11px] text-orange-700">incl. mora {fmt(resumen.totalMora)}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
          {[
            { label: 'Vendido', val: fmt(resumen.totalVendido) },
            { label: 'Abonado', val: fmt(resumen.totalAbonado) },
            { label: 'Ventas', val: `${resumen.cantidadVentas}${resumen.ventasConSaldo > 0 ? ` (${resumen.ventasConSaldo} con saldo)` : ''}` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className="text-sm font-bold text-gray-900">{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ventas pendientes */}
      <Seccion titulo="Ventas pendientes" contador={pendientes.length}>
        {pendientes.length === 0
          ? <Vacio texto="Sin ventas pendientes" />
          : pendientes.map(v => <VentaRow key={v.ventaId} v={v} />)}
      </Seccion>

      {/* Abonos */}
      <Seccion titulo="Abonos" contador={abonos.length}>
        {abonos.length === 0
          ? <Vacio texto="Sin abonos registrados" />
          : abonos.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  {a.metodoPago}{a.fuente ? ` · ${fuenteLabel(a.fuente)}` : ''}
                </p>
                <p className="text-[10px] text-gray-500">{fmtFecha(a.fechaPago)}{a.ventaCodigo ? ` · ${a.ventaCodigo}` : ''}</p>
              </div>
              <p className="text-sm font-extrabold text-green-700">+ {fmt(a.monto)}</p>
            </div>
          ))}
      </Seccion>

      {/* Historial pagadas */}
      {historial.length > 0 && (
        <Seccion titulo="Historial (pagadas)" contador={historial.length}>
          {historial.map(v => <VentaRow key={v.ventaId} v={v} />)}
        </Seccion>
      )}
    </div>
  );
}

function Seccion({ titulo, contador, children }: { titulo: string; contador: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
        <span className="rounded-full bg-[#437EFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#437EFF]">{contador}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function VentaRow({ v }: { v: VentaCreditoEC }) {
  const cfg = ESTADO_CUENTA_CONFIG[v.estado];
  const saldado = v.saldoPendiente <= 0.01;
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-gray-900">{v.codigo}</span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
          {(v.numeroCuotas ?? 0) > 0 && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">{v.numeroCuotas} cuotas</span>}
        </div>
        <p className="text-[10px] text-gray-500">
          {fmtFecha(v.fechaVenta)} · Vence {fmtFecha(v.fechaVencimiento)}
          {(v.totalMora ?? 0) > 0 && <span className="text-red-500"> · mora {fmt(v.totalMora)}</span>}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-extrabold ${saldado ? 'text-green-700' : v.estado === 'VENCIDA' ? 'text-red-600' : 'text-blue-700'}`}>
          {fmt(v.saldoPendiente)}
        </p>
        <p className="text-[9px] text-gray-400">de {fmt(v.total)}</p>
      </div>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="py-4 text-center text-xs text-gray-400">{texto}</p>;
}

export default function EstadoCuentaClientePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>}>
      <EstadoCuentaClienteContent />
    </Suspense>
  );
}
