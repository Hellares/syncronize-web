'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComboListItem } from '@/core/types/combo';
import * as comboService from '@/features/producto/services/combo-service';
import * as productoService from '@/features/producto/services/producto-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const TIPO_PRECIO_LABEL: Record<string, string> = {
  FIJO: 'Fijo',
  CALCULADO: 'Calculado',
  CALCULADO_CON_DESCUENTO: 'C/ Descuento',
};

export default function CombosPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState(defaultSede?.id ?? '');
  const [combos, setCombos] = useState<ComboListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros locales (paridad combos_page Flutter)
  const [search, setSearch] = useState('');
  const [filtroOferta, setFiltroOferta] = useState<'todos' | 'oferta' | 'sin-oferta'>('todos');
  const [soloConStock, setSoloConStock] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ComboListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCombos = useCallback(async (sede: string) => {
    if (!sede) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await comboService.getCombos(sede);
      setCombos(data);
    } catch {
      setError('Error al cargar combos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCombos(sedeId); }, [fetchCombos, sedeId]);

  const filtered = useMemo(() => combos.filter(c => {
    if (search) {
      const t = search.toLowerCase();
      if (!c.nombre.toLowerCase().includes(t) && !(c.descripcion ?? '').toLowerCase().includes(t)) return false;
    }
    if (filtroOferta === 'oferta' && !c.ofertaActiva) return false;
    if (filtroOferta === 'sin-oferta' && c.ofertaActiva) return false;
    if (soloConStock && c.stockDisponible <= 0) return false;
    return true;
  }), [combos, search, filtroOferta, soloConStock]);

  const precioFinal = (c: ComboListItem): number => {
    if (c.ofertaActiva && c.precioOferta != null) return Number(c.precioOferta);
    if (c.tipoPrecioCombo === 'CALCULADO') return Number(c.precioCalculado);
    return Number(c.precio);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Combo ES Producto: soft-delete vía /productos (paridad Flutter)
      await productoService.deleteProducto(deleteTarget.id);
      setDeleteTarget(null);
      fetchCombos(sedeId);
    } catch {
      setError('No se pudo eliminar el combo');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Combos</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${filtered.length} combos`}</p>
        </div>
        <div className="flex items-center gap-2">
          {sedes.filter(s => s.isActive).length > 1 && (
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200">
              {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          {permissions.canManageProducts && (
            <Link href={`/dashboard/combos/nuevo`}
              className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#003570] transition-colors">
              + Nuevo Combo
            </Link>
          )}
        </div>
      </div>

      {/* Filtros locales */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar combo..."
          className="w-56 bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200"
        />
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {([['todos', 'Todos'], ['oferta', 'En oferta'], ['sin-oferta', 'Sin oferta']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltroOferta(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${filtroOferta === v ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={soloConStock} onChange={e => setSoloConStock(e.target.checked)} 
            className="accent-[#004A94]" />
          Solo con stock
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-gray-400">No hay combos{search || filtroOferta !== 'todos' || soloConStock ? ' con estos filtros' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const pf = precioFinal(c);
            const sinStock = c.stockDisponible <= 0;
            return (
              <div key={c.id}
                onClick={() => router.push(`/dashboard/combos/${c.id}?sedeId=${sedeId}`)}
                className="cursor-pointer rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.nombre}</p>
                    {c.descripcion && <p className="text-xs text-gray-400 truncate">{c.descripcion}</p>}
                  </div>
                  {permissions.canManageProducts && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      title="Eliminar combo"
                      className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    {c.ofertaActiva && c.precioSinOferta != null && (
                      <p className="text-xs text-gray-400 line-through">S/ {Number(c.precioSinOferta).toFixed(2)}</p>
                    )}
                    <p className={`text-lg font-bold ${c.ofertaActiva ? 'text-green-600' : 'text-gray-900'}`}>
                      S/ {pf.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${sinStock ? 'text-red-500' : 'text-gray-700'}`}>
                      {c.stockDisponible} disp.
                    </p>
                    <p className="text-[10px] text-gray-400">{c.componentes?.length ?? 0} componentes</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                    {TIPO_PRECIO_LABEL[c.tipoPrecioCombo] ?? c.tipoPrecioCombo}
                  </span>
                  {(c.descuentoPorcentaje ?? 0) > 0 && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      -{c.descuentoPorcentaje}%
                    </span>
                  )}
                  {c.ofertaActiva && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Oferta</span>
                  )}
                  {(c.componentesSinStock?.length ?? 0) > 0 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">⚠ Stock parcial</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-medium text-gray-900">Eliminar combo</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Eliminar <strong>{deleteTarget.nombre}</strong>? Irá a la papelera de productos y podrás restaurarlo.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
