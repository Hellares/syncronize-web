'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Tercerizacion, TipoTercerizacion } from '@/core/types/tercerizacion';
import { ESTADO_TERCERIZACION_CONFIG } from '@/core/types/tercerizacion';
import * as service from '@/features/tercerizacion/services/tercerizacion-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TABS: { key: TipoTercerizacion | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'enviadas', label: 'Enviadas' },
  { key: 'recibidas', label: 'Recibidas' },
];

export default function TercerizacionListPage() {
  const router = useRouter();
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id;
  const [tab, setTab] = useState<TipoTercerizacion | 'todas'>('todas');
  const [items, setItems] = useState<Tercerizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await service.listar({ tipo: tab === 'todas' ? undefined : tab, limit: 50 });
      setItems(res.data);
    } catch {
      setError('No se pudieron cargar las tercerizaciones');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tercerización B2B</h1>
        <p className="text-xs text-gray-500">Órdenes derivadas a/desde otras empresas vinculadas.</p>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === t.key ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">Sin tercerizaciones</p>
          <p className="mt-1 text-xs text-gray-400">Las órdenes que derives a otras empresas (o que recibas) aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(t => {
            const cfg = ESTADO_TERCERIZACION_CONFIG[t.estado];
            const enviada = empresaId && t.empresaOrigenId === empresaId;
            const contraparte = enviada ? t.empresaDestino : t.empresaOrigen;
            return (
              <button key={t.id} onClick={() => router.push(`/dashboard/tercerizacion/${t.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-[#437EFF]">
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${enviada ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                  {enviada ? '↗ Enviada' : '↘ Recibida'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{t.ordenOrigen?.codigo ?? 'Orden'}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {contraparte?.nombre ?? '—'}
                    {t.ordenOrigen?.tipoEquipo ? ` · ${t.ordenOrigen.tipoEquipo}` : ''}
                    {t.ordenOrigen?.marcaEquipo ? ` ${t.ordenOrigen.marcaEquipo}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {cfg && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>}
                  <p className="mt-1 text-[10px] text-gray-400">{fmtFecha(t.fechaSolicitud)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
