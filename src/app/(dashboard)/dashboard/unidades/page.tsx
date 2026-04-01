'use client';

import { useState, useMemo } from 'react';
import { useCatalogo } from '@/features/catalogo/hooks/use-catalogo';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import CatalogoPage from '@/features/catalogo/components/CatalogoPage';
import ActivarDialog from '@/features/catalogo/components/ActivarDialog';
import CrearDialog from '@/features/catalogo/components/CrearDialog';
import { getUnidadNombreDisplay, getUnidadSimboloDisplay } from '@/core/types/catalogo';
import type { UnidadMedidaMaestra, CategoriaUnidad } from '@/core/types/catalogo';

const CATEGORIAS: { label: string; value: CategoriaUnidad }[] = [
  { label: 'Cantidad', value: 'CANTIDAD' },
  { label: 'Masa', value: 'MASA' },
  { label: 'Longitud', value: 'LONGITUD' },
  { label: 'Área', value: 'AREA' },
  { label: 'Volumen', value: 'VOLUMEN' },
  { label: 'Tiempo', value: 'TIEMPO' },
  { label: 'Servicio', value: 'SERVICIO' },
];

export default function UnidadesPage() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id || '';

  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaUnidad | ''>('');

  const config = useMemo(() => ({
    fetchEmpresa: catalogoService.getUnidadesEmpresa,
    fetchMaestros: () => catalogoService.getUnidadesMaestras(categoriaFiltro || undefined),
    activar: catalogoService.activarUnidad,
    desactivar: catalogoService.desactivarUnidad,
  }), [categoriaFiltro]);

  const { itemsEmpresa, itemsMaestros, isLoadingEmpresa, isLoadingMaestros, isSubmitting, error, setError, handleActivar, handleDesactivar } = useCatalogo(config);

  const [tab, setTab] = useState<'activas' | 'disponibles'>('activas');
  const [search, setSearch] = useState('');
  const [activarTarget, setActivarTarget] = useState<UnidadMedidaMaestra | null>(null);
  const [showCrear, setShowCrear] = useState(false);

  const activatedIds = new Set(itemsEmpresa.map((u) => u.unidadMaestraId).filter(Boolean));

  const filteredEmpresa = itemsEmpresa.filter((u) =>
    getUnidadNombreDisplay(u).toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaestros = itemsMaestros.filter((u) =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogoPage
      title="Unidades de Medida"
      subtitle={`${itemsEmpresa.length} unidades activas`}
      activeTab={tab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
      onCreateCustom={() => setShowCrear(true)}
      isLoading={tab === 'activas' ? isLoadingEmpresa : isLoadingMaestros}
      error={error}
      onDismissError={() => setError(null)}
      extraFilters={
        tab === 'disponibles' ? (
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value as CategoriaUnidad | '')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#437EFF]"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        ) : undefined
      }
    >
      {tab === 'activas' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmpresa.length === 0 ? (
            <p className="col-span-full py-10 text-center text-gray-400">No hay unidades activas</p>
          ) : filteredEmpresa.map((unidad) => (
            <div key={unidad.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#437EFF]/10 text-xs font-bold text-[#437EFF]">
                  {getUnidadSimboloDisplay(unidad) || getUnidadNombreDisplay(unidad).charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{getUnidadNombreDisplay(unidad)}</p>
                  <p className="text-xs text-gray-500">
                    {unidad.unidadMaestraId ? `Código: ${unidad.unidadMaestra?.codigo || ''}` : 'Personalizada'}
                    {unidad.orden != null && ` · Orden: ${unidad.orden}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDesactivar(unidad.id)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaestros.length === 0 ? (
            <p className="col-span-full py-10 text-center text-gray-400">No se encontraron unidades</p>
          ) : filteredMaestros.map((unidad) => {
            const isActivated = activatedIds.has(unidad.id);
            return (
              <div key={unidad.id} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${isActivated ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white hover:shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                    {unidad.simbolo || unidad.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{unidad.nombre}</p>
                    <p className="text-xs text-gray-500">{unidad.codigo} · {unidad.categoria}</p>
                  </div>
                </div>
                {isActivated ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Activa</span>
                ) : (
                  <button onClick={() => setActivarTarget(unidad)} className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003570]">
                    Activar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ActivarDialog
        isOpen={!!activarTarget}
        title="Activar Unidad de Medida"
        maestroNombre={activarTarget ? `${activarTarget.codigo} — ${activarTarget.nombre} (${activarTarget.simbolo || ''})` : ''}
        maestroDescripcion={activarTarget?.descripcion}
        isLoading={isSubmitting}
        onConfirm={async (nombreLocal, orden) => {
          if (!activarTarget) return;
          const ok = await handleActivar({ empresaId, unidadMaestraId: activarTarget.id, nombreLocal, orden });
          if (ok) setActivarTarget(null);
        }}
        onCancel={() => setActivarTarget(null)}
      />

      <CrearDialog
        isOpen={showCrear}
        title="Crear Unidad Personalizada"
        isLoading={isSubmitting}
        showSimbolo
        onConfirm={async (data) => {
          const ok = await handleActivar({ empresaId, nombrePersonalizado: data.nombre, simboloPersonalizado: data.simbolo, descripcion: data.descripcion, orden: data.orden });
          if (ok) setShowCrear(false);
        }}
        onCancel={() => setShowCrear(false)}
      />
    </CatalogoPage>
  );
}
