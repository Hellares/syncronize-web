'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVariantes } from '../../hooks/use-variantes';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { ProductoVariante, CreateVarianteDto } from '@/core/types/producto';
import VarianteCard from './VarianteCard';
import VarianteTable from './VarianteTable';
import VarianteFormDialog from './VarianteFormDialog';
import GenerarCombinacionesDialog from './GenerarCombinacionesDialog';
import VarianteDetailDialog from './VarianteDetailDialog';

interface Props {
  productoId: string;
  productoNombre: string;
  productoIsActive: boolean;
  /** Variante elegida en la pagina: la galeria y los precios la siguen. */
  seleccionadaId?: string | null;
  onSeleccionar?: (v: ProductoVariante) => void;
  /** Para que la pagina pueda leer las variantes ya cargadas por el hook. */
  onVariantesCargadas?: (vs: ProductoVariante[]) => void;
}

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-2.5 shadow-md focus:shadow-lg focus:shadow-blue-200';

/** A partir de aca la grilla de tarjetas deja de servir y arranca en tabla. */
const UMBRAL_TABLA = 12;

type Rapido = 'todas' | 'activas' | 'problemas';

export default function VarianteList({ productoId, productoNombre, productoIsActive, seleccionadaId, onSeleccionar, onVariantesCargadas }: Props) {
  const {
    variantes, atributosDisponibles, isLoading, isSubmitting,
    error, successMessage, clearMessages,
    createVariante, updateVariante, deleteVariante, generarCombinaciones,
  } = useVariantes(productoId);

  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [formOpen, setFormOpen] = useState(false);
  const [editingVariante, setEditingVariante] = useState<ProductoVariante | null>(null);
  const [generarOpen, setGenerarOpen] = useState(false);
  const [detailVariante, setDetailVariante] = useState<ProductoVariante | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductoVariante | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [porEje, setPorEje] = useState<Record<string, string>>({});
  const [rapido, setRapido] = useState<Rapido>('todas');
  const [vista, setVista] = useState<'tabla' | 'tarjetas' | null>(null);

  /**
   * Los EJES del producto, en el orden en que vienen en la primera variante
   * que los declara.
   *
   * Se derivan de las variantes y no de `atributosDisponibles` porque lo que
   * importa es que ejes usa ESTE producto, no cuales existen en la empresa.
   */
  const ejes = useMemo(() => {
    const vistos: string[] = [];
    for (const v of variantes) {
      for (const av of v.atributosValores) {
        const nombre = av.atributo.nombre;
        if (!vistos.includes(nombre)) vistos.push(nombre);
      }
    }
    return vistos;
  }, [variantes]);

  /** Valores distintos de cada eje, para armar los desplegables. */
  const valoresPorEje = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const eje of ejes) {
      const vals: string[] = [];
      for (const v of variantes) {
        const av = v.atributosValores.find((a) => a.atributo.nombre === eje);
        const valor = av?.valor?.trim();
        if (valor && !vals.includes(valor)) vals.push(valor);
      }
      mapa[eje] = vals.sort((a, b) => a.localeCompare(b, 'es'));
    }
    return mapa;
  }, [ejes, variantes]);

  /** Le falta algun eje, o no tiene precio configurado. */
  const tieneProblema = useCallback((v: ProductoVariante) => {
    const faltaEje = ejes.some((e) => {
      const av = v.atributosValores.find((a) => a.atributo.nombre === e);
      return !av?.valor?.trim();
    });
    const sinPrecio = !v.stocksPorSede?.some((st) => st.precioConfigurado);
    return faltaEje || sinPrecio;
  }, [ejes]);

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return variantes.filter((v) => {
      if (rapido === 'activas' && !v.isActive) return false;
      if (rapido === 'problemas' && !tieneProblema(v)) return false;
      for (const [eje, valor] of Object.entries(porEje)) {
        if (!valor) continue;
        const av = v.atributosValores.find((a) => a.atributo.nombre === eje);
        if (av?.valor?.trim() !== valor) return false;
      }
      if (!t) return true;
      return `${v.nombre} ${v.sku} ${v.codigoEmpresa} ${v.codigoBarras ?? ''}`.toLowerCase().includes(t);
    });
  }, [variantes, busqueda, porEje, rapido, tieneProblema]);

  // La pagina necesita las variantes ya cargadas (para las imagenes de la
  // galeria) y este hook es quien las tiene.
  useEffect(() => {
    if (onVariantesCargadas) onVariantesCargadas(variantes);
  }, [variantes, onVariantesCargadas]);

  const hayFiltro = !!busqueda.trim() || rapido !== 'todas' || Object.values(porEje).some(Boolean);
  // La vista arranca sola segun cuantas hay; una eleccion manual la fija.
  const vistaEfectiva = vista ?? (variantes.length > UMBRAL_TABLA ? 'tabla' : 'tarjetas');
  const conProblema = useMemo(() => variantes.filter(tieneProblema).length, [variantes, tieneProblema]);
  const activas = useMemo(() => variantes.filter((v) => v.isActive).length, [variantes]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(clearMessages, 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, clearMessages]);

  const handleCreate = () => {
    setEditingVariante(null);
    setFormOpen(true);
  };

  const handleEdit = (v: ProductoVariante) => {
    setEditingVariante(v);
    setFormOpen(true);
  };

  const handleFormSave = useCallback(async (data: CreateVarianteDto) => {
    if (editingVariante) {
      await updateVariante(editingVariante.id, data);
    } else {
      await createVariante(data);
    }
    setFormOpen(false);
    setEditingVariante(null);
  }, [editingVariante, createVariante, updateVariante]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteVariante(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteVariante]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Variantes</h3>
          {/* Resumen: con 91 variantes, "cuantas hay" no alcanza — lo que se
              busca saber es cuantas tienen algo mal. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-gray-500">
            <span><strong className="text-gray-900">{variantes.length}</strong> variantes</span>
            <span className="text-gray-300">·</span>
            <span><strong className="text-green-700">{activas}</strong> activas</span>
            {conProblema > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setRapido('problemas')}
                  className="font-semibold text-amber-600 underline decoration-dotted hover:text-amber-700"
                >
                  {conProblema} con problemas
                </button>
              </>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setGenerarOpen(true)}
              className="rounded-lg border border-[#437EFF] px-3 py-1.5 text-xs font-medium text-[#437EFF] hover:bg-[#437EFF]/5"
            >
              <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Generar Combinaciones
            </button>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#003570]"
            >
              <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Variante
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Buscador + filtros: con muchas variantes no se scrollea, se filtra */}
      {variantes.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-gray-100 bg-slate-50/70 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] max-w-[280px] flex-1">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar variante, SKU o código…"
                className={`${INPUT_STD} w-full pl-8`}
              />
            </div>

            <div className="flex gap-0.5 rounded-[7px] border border-gray-200 bg-white p-0.5">
              {([['todas', 'Todas'], ['activas', 'Activas'], ['problemas', 'Con problemas']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRapido(key)}
                  className={`rounded-[5px] px-2.5 py-1 text-[11px] transition-colors ${
                    rapido === key ? 'bg-[#004A94] font-bold text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-0.5 rounded-[7px] border border-gray-200 bg-white p-0.5">
              <button
                onClick={() => setVista('tabla')}
                title="Ver como tabla"
                className={`flex h-[22px] w-7 items-center justify-center rounded-[5px] transition-colors ${
                  vistaEfectiva === 'tabla' ? 'bg-blue-50 text-[#004A94]' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
              <button
                onClick={() => setVista('tarjetas')}
                title="Ver como tarjetas"
                className={`flex h-[22px] w-7 items-center justify-center rounded-[5px] transition-colors ${
                  vistaEfectiva === 'tarjetas' ? 'bg-blue-50 text-[#004A94]' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
              </button>
            </div>
          </div>

          {/* Un desplegable por EJE: con 5 atributos es como se busca de verdad */}
          {ejes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Filtrar por</span>
              {ejes.map((eje) => (
                <select
                  key={eje}
                  value={porEje[eje] ?? ''}
                  onChange={(e) => setPorEje((prev) => ({ ...prev, [eje]: e.target.value }))}
                  className={`${INPUT_STD} h-[27px] text-[11px]`}
                >
                  <option value="">{eje}</option>
                  {valoresPorEje[eje]?.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              {hayFiltro && (
                <button
                  onClick={() => { setBusqueda(''); setPorEje({}); setRapido('todas'); }}
                  className="rounded px-2 py-1 text-[11px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : variantes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No hay variantes</p>
          <p className="mt-1 text-xs text-gray-400">
            {canManage ? 'Crea una variante o genera combinaciones automáticamente.' : 'Este producto aún no tiene variantes.'}
          </p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm font-medium text-gray-500">Ninguna variante coincide</p>
          <button
            onClick={() => { setBusqueda(''); setPorEje({}); setRapido('todas'); }}
            className="mt-2 text-xs font-semibold text-[#437EFF] hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : vistaEfectiva === 'tabla' ? (
        <>
          <VarianteTable
            variantes={filtradas}
            ejes={ejes}
            canManage={canManage}
            seleccionadaId={seleccionadaId}
            onView={(v) => (onSeleccionar ? onSeleccionar(v) : setDetailVariante(v))}
            onEdit={(v) => handleEdit(v)}
            onDelete={(v) => setDeleteTarget(v)}
          />
          {filtradas.length !== variantes.length && (
            <p className="text-[11px] text-gray-400">Mostrando {filtradas.length} de {variantes.length}</p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map(v => (
            <VarianteCard
              key={v.id}
              variante={v}
              canManage={canManage}
              onView={() => (onSeleccionar ? onSeleccionar(v) : setDetailVariante(v))}
              onEdit={() => handleEdit(v)}
              onDelete={() => setDeleteTarget(v)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <VarianteFormDialog
        isOpen={formOpen}
        variante={editingVariante}
        atributosDisponibles={atributosDisponibles}
        productoIsActive={productoIsActive}
        isSubmitting={isSubmitting}
        onSave={handleFormSave}
        onClose={() => { setFormOpen(false); setEditingVariante(null); }}
      />

      <GenerarCombinacionesDialog
        isOpen={generarOpen}
        productoNombre={productoNombre}
        atributosDisponibles={atributosDisponibles}
        isSubmitting={isSubmitting}
        onGenerar={async (data) => { await generarCombinaciones(data); setGenerarOpen(false); }}
        onClose={() => setGenerarOpen(false)}
      />

      <VarianteDetailDialog
        isOpen={!!detailVariante}
        variante={detailVariante}
        onClose={() => setDetailVariante(null)}
      />

      {/* Delete Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Eliminar Variante</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Estás seguro de eliminar <strong>{deleteTarget.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={isSubmitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
