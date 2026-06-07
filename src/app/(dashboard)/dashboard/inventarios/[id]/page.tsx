'use client';

import { useState, useCallback, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { Inventario, InventarioItem } from '@/core/types/inventario';
import { ESTADO_INVENTARIO_LABEL, ESTADO_INVENTARIO_COLOR } from '@/core/types/inventario';
import * as inventarioService from '@/features/stock/services/inventario-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function InventarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [inv, setInv] = useState<Inventario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [conteoTarget, setConteoTarget] = useState<InventarioItem | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [soloDiferencias, setSoloDiferencias] = useState(false);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await inventarioService.getInventario(id);
      setInv(data);
    } catch {
      setError('Error al cargar el inventario');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // El backend desnormaliza nombreProducto/codigoProducto en el item (histórico)
  const nombreItem = (it: InventarioItem) =>
    it.nombreProducto ?? it.variante?.nombre ?? it.varianteNombre ?? it.producto?.nombre ?? it.productoNombre ?? 'Producto';

  const items = useMemo(() => (inv?.items ?? []).filter(it => {
    if (soloPendientes && it.cantidadContada != null) return false;
    if (soloDiferencias && !(it.diferencia != null && it.diferencia !== 0)) return false;
    if (search && !nombreItem(it).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [inv, soloPendientes, soloDiferencias, search]);

  const accion = async (fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActionLoading(true);
    setError(''); setInfo('');
    try {
      await fn();
      await reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error en la operación');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading && !inv) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }
  if (!inv) {
    return <div className="py-20 text-center"><p className="text-gray-400">{error || 'Inventario no encontrado'}</p></div>;
  }

  const progreso = inv.totalItems ? Math.round(((inv.itemsContados ?? 0) / inv.totalItems) * 100) : 0;
  const puedeContar = inv.estado === 'EN_PROCESO';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventarios" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{inv.nombre}</h1>
            <p className="text-xs text-gray-500">
              {inv.sede?.nombre}{inv.fechaPlanificada && ` · planificado ${new Date(inv.fechaPlanificada).toLocaleDateString('es-PE')}`}
            </p>
          </div>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${ESTADO_INVENTARIO_COLOR[inv.estado]}`}>
          {ESTADO_INVENTARIO_LABEL[inv.estado]}
        </span>
      </div>

      {/* Progreso + acciones del workflow */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{inv.itemsContados ?? 0}/{inv.totalItems ?? 0} items contados ({progreso}%)</span>
          {(inv.itemsConDiferencia ?? 0) > 0 && <span className="text-amber-600">{inv.itemsConDiferencia} con diferencia</span>}
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-[#437EFF] transition-all" style={{ width: `${progreso}%` }} />
        </div>

        {canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            {inv.estado === 'PLANIFICADO' && (
              <button onClick={() => accion(() => inventarioService.iniciarInventario(id))}
                disabled={actionLoading}
                className="rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                ▶ Iniciar conteo
              </button>
            )}
            {inv.estado === 'EN_PROCESO' && (
              <button onClick={() => accion(() => inventarioService.finalizarConteo(id),
                (inv.itemsContados ?? 0) < (inv.totalItems ?? 0)
                  ? `Hay ${(inv.totalItems ?? 0) - (inv.itemsContados ?? 0)} items sin contar. ¿Finalizar de todas formas?`
                  : '¿Finalizar el conteo?')}
                disabled={actionLoading}
                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                Finalizar conteo
              </button>
            )}
            {(inv.estado === 'CONTEO_COMPLETO' || inv.estado === 'EN_REVISION') && (
              <button onClick={() => accion(() => inventarioService.aprobarInventario(id), '¿Aprobar el inventario? Quedará listo para aplicar ajustes.')}
                disabled={actionLoading}
                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                ✓ Aprobar
              </button>
            )}
            {inv.estado === 'APROBADO' && (
              <button onClick={() => accion(() => inventarioService.aplicarAjustes(id),
                `¿Aplicar los ajustes al stock? Se generarán movimientos AJUSTE por cada diferencia (${inv.itemsConDiferencia ?? 0} items). Esta acción no se puede deshacer.`)}
                disabled={actionLoading}
                className="rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50">
                ⚡ Aplicar ajustes al stock
              </button>
            )}
            {!['AJUSTADO', 'CANCELADO'].includes(inv.estado) && (
              <button onClick={() => accion(() => inventarioService.cancelarInventario(id), '¿Cancelar el inventario? No se aplicará ningún ajuste.')}
                disabled={actionLoading}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                Cancelar inventario
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {info && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{info}</p></div>}

      {/* Filtros de items */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item..."
          className="w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#437EFF]" />
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} className="rounded border-gray-300 text-[#437EFF]" />
          Solo pendientes
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={soloDiferencias} onChange={e => setSoloDiferencias(e.target.checked)} className="rounded border-gray-300 text-[#437EFF]" />
          Solo con diferencia
        </label>
        <span className="text-xs text-gray-400">{items.length} items</span>
      </div>

      {/* Items */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Sistema</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Contado</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-center">Diferencia</th>
              {puedeContar && canManage && <th className="px-4 py-3 font-medium text-gray-500 text-right">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((it) => {
              const dif = it.diferencia;
              return (
                <tr key={it.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{nombreItem(it)}</p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {it.codigoProducto ?? it.producto?.codigoEmpresa ?? it.codigoEmpresa ?? ''}{it.ubicacion ? ` · ${it.ubicacion}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{it.cantidadSistema}</td>
                  <td className="px-4 py-3 text-center">
                    {it.cantidadContada != null
                      ? <span className="font-medium text-gray-900">{it.cantidadContada}</span>
                      : <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">Pendiente</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {dif != null && it.cantidadContada != null ? (
                      <span className={`font-bold ${dif === 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {dif > 0 ? '+' : ''}{dif}
                      </span>
                    ) : '—'}
                  </td>
                  {puedeContar && canManage && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setConteoTarget(it)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                        {it.cantidadContada != null ? 'Recontar' : 'Contar'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog conteo */}
      {conteoTarget && (
        <ConteoDialog item={conteoTarget} nombre={nombreItem(conteoTarget)}
          onSave={async (data) => {
            await accion(() => inventarioService.registrarConteo(id, conteoTarget.id, data));
            setConteoTarget(null);
          }}
          onClose={() => setConteoTarget(null)} />
      )}
    </div>
  );
}

function ConteoDialog({ item, nombre, onSave, onClose }: {
  item: InventarioItem;
  nombre: string;
  onSave: (data: { cantidadContada: number; ubicacionFisica?: string; observaciones?: string }) => void;
  onClose: () => void;
}) {
  const [cantidad, setCantidad] = useState(item.cantidadContada != null ? String(item.cantidadContada) : '');
  const [ubicacion, setUbicacion] = useState(item.ubicacionFisica ?? '');
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const c = parseInt(cantidad);
    if (cantidad === '' || isNaN(c) || c < 0) { setError('Ingresa la cantidad contada (≥ 0)'); return; }
    onSave({ cantidadContada: c, ubicacionFisica: ubicacion.trim() || undefined, observaciones: obs.trim() || undefined });
  };

  const c = parseInt(cantidad);
  const dif = !isNaN(c) ? c - item.cantidadSistema : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Registrar conteo</h3>
        <p className="mt-1 text-xs text-gray-500">{nombre} · sistema: {item.cantidadSistema}</p>
        <div className="mt-3 space-y-3">
          <input className={inputClass} type="number" min="0" step="1" value={cantidad}
            onChange={e => setCantidad(e.target.value)} placeholder="Cantidad contada *" autoFocus />
          {dif != null && (
            <p className={`text-xs font-medium ${dif === 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-amber-600'}`}>
              Diferencia: {dif > 0 ? '+' : ''}{dif} {dif === 0 ? '✓ cuadra' : dif < 0 ? '(faltante)' : '(sobrante)'}
            </p>
          )}
          <input className={inputClass} value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ubicación física (opcional)" />
          <input className={inputClass} value={obs} onChange={e => setObs(e.target.value)} placeholder="Observaciones (opcional)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Guardar</button>
        </div>
      </div>
    </div>
  );
}
