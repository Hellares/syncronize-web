'use client';

import { useState, useMemo } from 'react';
import { useCatalogo } from '@/features/catalogo/hooks/use-catalogo';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import CatalogoPage from '@/features/catalogo/components/CatalogoPage';
import ActivarDialog from '@/features/catalogo/components/ActivarDialog';
import CrearDialog from '@/features/catalogo/components/CrearDialog';
import { getNombreDisplay } from '@/core/types/catalogo';
import type { CategoriaMaestra, EmpresaCategoria } from '@/core/types/catalogo';

export default function CategoriasPage() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id || '';

  const config = useMemo(() => ({
    fetchEmpresa: catalogoService.getCategoriasEmpresa,
    fetchMaestros: catalogoService.getCategoriasMaestras,
    activar: catalogoService.activarCategoria,
    desactivar: catalogoService.desactivarCategoria,
  }), []);

  const { itemsEmpresa, itemsMaestros, isLoadingEmpresa, isLoadingMaestros, isSubmitting, error, setError, handleActivar, handleDesactivar } = useCatalogo(config);

  const [tab, setTab] = useState<'activas' | 'disponibles'>('activas');
  const [search, setSearch] = useState('');
  const [activarTarget, setActivarTarget] = useState<CategoriaMaestra | null>(null);
  const [showCrear, setShowCrear] = useState(false);

  const activatedIds = new Set(itemsEmpresa.map((c) => c.categoriaMaestraId).filter(Boolean));

  const filteredEmpresa = itemsEmpresa.filter((c) =>
    getNombreDisplay(c).toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaestros = itemsMaestros.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogoPage
      title="Categorías"
      subtitle={`${itemsEmpresa.length} categorías activas`}
      activeTab={tab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
      onCreateCustom={() => setShowCrear(true)}
      isLoading={tab === 'activas' ? isLoadingEmpresa : isLoadingMaestros}
      error={error}
      onDismissError={() => setError(null)}
    >
      {tab === 'activas' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmpresa.length === 0 ? (
            <p className="col-span-full py-10 text-center text-gray-400">No hay categorías activas</p>
          ) : filteredEmpresa.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm">
              <div>
                <p className="text-sm font-medium text-gray-900">{getNombreDisplay(cat)}</p>
                <p className="text-xs text-gray-500">
                  {cat.categoriaMaestraId ? 'Del catálogo' : 'Personalizada'}
                  {cat.orden != null && ` · Orden: ${cat.orden}`}
                </p>
              </div>
              <button
                onClick={() => handleDesactivar(cat.id)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Eliminar"
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
            <p className="col-span-full py-10 text-center text-gray-400">No se encontraron categorías</p>
          ) : filteredMaestros.map((cat) => {
            const isActivated = activatedIds.has(cat.id);
            return (
              <div key={cat.id} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${isActivated ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white hover:shadow-sm'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    {cat.icono && <span className="text-lg">{cat.icono}</span>}
                    <p className="text-sm font-medium text-gray-900">{cat.nombre}</p>
                  </div>
                  {cat.descripcion && <p className="text-xs text-gray-500 mt-0.5">{cat.descripcion}</p>}
                </div>
                {isActivated ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Activa</span>
                ) : (
                  <button onClick={() => setActivarTarget(cat)} className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003570]">
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
        title="Activar Categoría"
        maestroNombre={activarTarget?.nombre || ''}
        maestroDescripcion={activarTarget?.descripcion}
        isLoading={isSubmitting}
        onConfirm={async (nombreLocal, orden) => {
          if (!activarTarget) return;
          const ok = await handleActivar({ empresaId, categoriaMaestraId: activarTarget.id, nombreLocal, orden });
          if (ok) setActivarTarget(null);
        }}
        onCancel={() => setActivarTarget(null)}
      />

      <CrearDialog
        isOpen={showCrear}
        title="Crear Categoría Personalizada"
        isLoading={isSubmitting}
        onConfirm={async (data) => {
          const ok = await handleActivar({ empresaId, nombrePersonalizado: data.nombre, descripcionPersonalizada: data.descripcion, orden: data.orden });
          if (ok) setShowCrear(false);
        }}
        onCancel={() => setShowCrear(false)}
      />
    </CatalogoPage>
  );
}
