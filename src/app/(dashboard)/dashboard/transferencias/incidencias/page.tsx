'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { TransferenciaIncidencia, AccionResolucionIncidencia } from '@/core/types/stock';
import { TIPO_INCIDENCIA_LABEL, ACCION_RESOLUCION_LABEL } from '@/core/types/stock';
import * as transferenciaService from '@/features/stock/services/transferencia-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const TABS = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'resueltas', label: 'Resueltas' },
  { key: 'todas', label: 'Todas' },
] as const;

const TIPO_COLOR: Record<string, string> = {
  FALTANTE: 'bg-red-100 text-red-700',
  DANADO: 'bg-amber-100 text-amber-700',
  CALIDAD_RECHAZADA: 'bg-orange-100 text-orange-700',
  EXCEDENTE: 'bg-blue-100 text-blue-700',
  EMPAQUE_DANADO: 'bg-amber-100 text-amber-700',
  PRODUCTO_INCORRECTO: 'bg-purple-100 text-purple-700',
};

export default function IncidenciasPage() {
  const permissions = usePermissions();
  const [tab, setTab] = useState<typeof TABS[number]['key']>('pendientes');
  const [items, setItems] = useState<TransferenciaIncidencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolverTarget, setResolverTarget] = useState<TransferenciaIncidencia | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resuelto = tab === 'pendientes' ? false : tab === 'resueltas' ? true : undefined;
      const data = await transferenciaService.getIncidencias({ resuelto });
      setItems(data);
    } catch {
      setError('Error al cargar incidencias');
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transferencias" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Incidencias de Transferencias</h1>
            <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${items.length} incidencias`}</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${tab === t.key ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-400">Sin incidencias {tab === 'pendientes' ? 'pendientes' : tab === 'resueltas' ? 'resueltas' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((inc) => (
            <div key={inc.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TIPO_COLOR[inc.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TIPO_INCIDENCIA_LABEL[inc.tipo] ?? inc.tipo}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{inc.cantidadAfectada} unid.</span>
                    {inc.transferencia?.codigo && (
                      <Link href={`/dashboard/transferencias/${inc.transferenciaId}`}
                        className="font-mono text-[10px] text-[#437EFF] hover:underline">
                        {inc.transferencia.codigo}
                      </Link>
                    )}
                    {inc.resuelto ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Resuelta</span>
                    ) : (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Pendiente</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    {inc.item?.variante?.nombre ?? inc.item?.producto?.nombre ?? 'Producto'}
                    {inc.transferencia?.sedeOrigen?.nombre && (
                      <span className="text-xs text-gray-400"> · {inc.transferencia.sedeOrigen.nombre} → {inc.transferencia.sedeDestino?.nombre}</span>
                    )}
                  </p>
                  {inc.descripcion && <p className="text-xs text-gray-500">{inc.descripcion}</p>}
                  {inc.resuelto && inc.accionTomada && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ {ACCION_RESOLUCION_LABEL[inc.accionTomada as AccionResolucionIncidencia] ?? inc.accionTomada}
                      {inc.fechaResolucion && ` · ${new Date(inc.fechaResolucion).toLocaleDateString('es-PE')}`}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    Reportada {new Date(inc.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {!inc.resuelto && permissions.canManageProducts && (
                  <button onClick={() => setResolverTarget(inc)}
                    className="shrink-0 rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570]">
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resolverTarget && (
        <ResolverDialog incidencia={resolverTarget}
          onResolved={() => { setResolverTarget(null); fetch(); }}
          onClose={() => setResolverTarget(null)} />
      )}
    </div>
  );
}

function ResolverDialog({ incidencia, onResolved, onClose }: {
  incidencia: TransferenciaIncidencia;
  onResolved: () => void;
  onClose: () => void;
}) {
  const [accion, setAccion] = useState<AccionResolucionIncidencia>('RECLAMAR_PROVEEDOR');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await transferenciaService.resolverIncidencia(incidencia.id, {
        accion,
        observaciones: observaciones.trim() || undefined,
      });
      onResolved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al resolver la incidencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Resolver incidencia</h3>
        <p className="mt-1 text-xs text-gray-500">
          {TIPO_INCIDENCIA_LABEL[incidencia.tipo]} · {incidencia.cantidadAfectada} unid.
        </p>
        <div className="mt-3 space-y-2">
          {(Object.entries(ACCION_RESOLUCION_LABEL) as Array<[AccionResolucionIncidencia, string]>).map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 rounded-lg border border-gray-100 p-2 text-xs hover:bg-gray-50 cursor-pointer">
              <input type="radio" checked={accion === value} onChange={() => setAccion(value)} className="mt-0.5 text-[#437EFF]" />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[55px]"
            value={observaciones} onChange={e => setObservaciones(e.target.value)}
            placeholder="Observaciones (n° de reclamo, condiciones, etc.)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Resolviendo...' : 'Resolver'}
          </button>
        </div>
      </div>
    </div>
  );
}
