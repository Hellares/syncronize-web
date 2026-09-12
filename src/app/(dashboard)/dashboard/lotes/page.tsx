'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import type { EstadoLote, Lote } from '@/core/types/lote';
import { diasParaVencer, formatearDiaCalendario, nombreDeLote, situacionDeLote } from '@/core/types/lote';
import * as loteService from '@/features/compras/services/lote-service';
import BajaLoteDialog from '@/features/compras/components/BajaLoteDialog';
import CorregirVencimientoDialog from '@/features/compras/components/CorregirVencimientoDialog';

const INPUT_STD =
  'h-[30px] rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200';

const fmt = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Los filtros rápidos. `vencidos` y `porVencer` se resuelven en el cliente:
 *  el backend filtra por estado, no por "cuánto le falta". */
type Vista = 'todos' | 'porVencer' | 'vencidos' | 'agotados';

const VISTAS: Array<{ id: Vista; label: string }> = [
  { id: 'todos', label: 'En stock' },
  { id: 'porVencer', label: 'Por vencer' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'agotados', label: 'Agotados' },
];

const SITUACION_FILA: Record<string, string> = {
  vencido: 'bg-red-50/70 hover:bg-red-50',
  'por-vencer': 'bg-amber-50/60 hover:bg-amber-50',
  ok: 'hover:bg-[#f9fbff]',
  agotado: 'text-gray-400 hover:bg-gray-50',
};

export default function LotesPage() {
  const { empresa, sedes } = useEmpresa();
  const permissions = usePermissions();
  const empresaId = empresa?.id ?? '';

  const [vista, setVista] = useState<Vista>('todos');
  const [sedeId, setSedeId] = useState('');
  const [search, setSearch] = useState('');
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);

  // Los dos diálogos de acción.
  const [bajaTarget, setBajaTarget] = useState<Lote | null>(null);
  const [vencTarget, setVencTarget] = useState<Lote | null>(null);

  const cargar = useCallback(async (append = false, desde: string | null = null) => {
    if (!empresaId) return;
    setCargando(true);
    setError('');
    try {
      const res = await loteService.getLotes(empresaId, {
        limit: 50,
        ...(desde ? { cursor: desde } : {}),
        ...(sedeId ? { sedeId } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        // AGOTADO solo cuando se piden explícitamente: si no, la lista se
        // llena de lotes que ya no existen y tapa lo que hay que mirar.
        ...(vista === 'agotados' ? { estado: 'AGOTADO' as EstadoLote } : {}),
      });
      setLotes((prev) => (append ? [...prev, ...res.data] : res.data));
      setHayMas(res.meta.hasNext);
      setCursor(res.meta.nextCursor);
    } catch {
      setError('No se pudieron cargar los lotes');
    } finally {
      setCargando(false);
    }
  }, [empresaId, sedeId, search, vista]);

  // El debounce sirve al buscador: sin él cada tecla dispara una consulta.
  useEffect(() => {
    const t = setTimeout(() => cargar(false, null), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargar, search]);

  const visibles = useMemo(() => {
    const conSituacion = lotes.map((l) => ({ l, s: situacionDeLote(l) }));
    switch (vista) {
      case 'porVencer':
        return conSituacion.filter((x) => x.s === 'por-vencer');
      case 'vencidos':
        return conSituacion.filter((x) => x.s === 'vencido');
      case 'agotados':
        return conSituacion.filter((x) => x.s === 'agotado');
      default:
        return conSituacion.filter((x) => x.s !== 'agotado');
    }
  }, [lotes, vista]);

  const alertas = useMemo(() => {
    const vivos = lotes.filter((l) => situacionDeLote(l) !== 'agotado');
    return {
      vencidos: vivos.filter((l) => situacionDeLote(l) === 'vencido').length,
      porVencer: vivos.filter((l) => situacionDeLote(l) === 'por-vencer').length,
    };
  }, [lotes]);

  const puedeActuar = permissions.canManageProducts;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-[#004A94]">Lotes</h1>
          <p className="text-[11px] text-gray-500">
            Sale primero el que vence antes. Lo vencido frena la venta hasta
            darlo de baja o corregirle la fecha.
          </p>
        </div>
        {/* Lo que hay que mirar, antes que la tabla. */}
        <div className="flex gap-2">
          {alertas.vencidos > 0 && (
            <button onClick={() => setVista('vencidos')}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">
              {alertas.vencidos} vencido{alertas.vencidos === 1 ? '' : 's'}
            </button>
          )}
          {alertas.porVencer > 0 && (
            <button onClick={() => setVista('porVencer')}
              className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
              {alertas.porVencer} por vencer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {VISTAS.map((v) => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className={`rounded-lg px-2.5 py-1 text-xs ${vista === v.id ? 'bg-[#004A94] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {v.label}
            </button>
          ))}
        </div>
        <input className={`${INPUT_STD} w-56`} value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Producto, código de lote o proveedor…" />
        {sedes.filter((s) => s.isActive).length > 1 && (
          <select className={INPUT_STD} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {cargando && lotes.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>
      ) : visibles.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">
          {vista === 'vencidos' ? 'Nada vencido. '
            : vista === 'porVencer' ? 'Nada por vencer en los próximos 30 días. '
              : 'Sin lotes. '}
          {vista === 'todos' && 'Los lotes se crean al confirmar una compra.'}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-18rem)] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
              <tr>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Lote</th>
                <th className="w-full px-4 py-3 font-medium text-[#004A94]">Producto</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Quedan</th>
                <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Costo</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Vence</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Proveedor</th>
                <th className="w-px whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Sede</th>
                {puedeActuar && <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibles.map(({ l, s }) => {
                const dias = diasParaVencer(l.fechaVencimiento);
                const prodId = l.productoStock?.producto?.id;
                return (
                  <tr key={l.id} className={SITUACION_FILA[s]}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-gray-500">{l.codigo}</td>
                    <td className="px-4 py-2 text-gray-800">
                      {prodId ? (
                        <Link href={`/dashboard/productos/${prodId}`} className="hover:text-[#437EFF] hover:underline">
                          {nombreDeLote(l)}
                        </Link>
                      ) : nombreDeLote(l)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className="font-medium text-gray-900">{l.cantidadActual}</span>
                      <span className="text-gray-400"> de {l.cantidadInicial}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      S/ {fmt(Number(l.precioCosto))}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 font-medium ${
                      s === 'vencido' ? 'text-red-700' : s === 'por-vencer' ? 'text-amber-800' : 'text-gray-600'
                    }`}>
                      {l.fechaVencimiento ? (
                        <>
                          {formatearDiaCalendario(l.fechaVencimiento, { mes: 'short' })}
                          {dias != null && (
                            <span className="ml-1 text-[10px] font-normal">
                              {dias < 0 ? `(hace ${-dias} d)` : `(${dias} d)`}
                            </span>
                          )}
                        </>
                      ) : <span className="text-gray-400">no vence</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{l.nombreProveedor ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{l.sede?.nombre ?? '—'}</td>
                    {puedeActuar && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setVencTarget(l)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
                            Fecha
                          </button>
                          {l.cantidadActual > 0 && (
                            <button onClick={() => setBajaTarget(l)}
                              className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50">
                              Dar de baja
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hayMas && vista === 'todos' && (
        <div className="text-center">
          <button onClick={() => cargar(true, cursor)} disabled={cargando}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {cargando ? 'Cargando…' : 'Ver más'}
          </button>
        </div>
      )}

      {bajaTarget && (
        <BajaLoteDialog
          empresaId={empresaId}
          lote={bajaTarget}
          onClose={() => setBajaTarget(null)}
          onHecho={() => { setBajaTarget(null); cargar(false, null); }}
        />
      )}
      {vencTarget && (
        <CorregirVencimientoDialog
          empresaId={empresaId}
          lote={vencTarget}
          onClose={() => setVencTarget(null)}
          onHecho={() => { setVencTarget(null); cargar(false, null); }}
        />
      )}
    </div>
  );
}
