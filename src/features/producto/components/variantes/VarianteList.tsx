'use client';

import { useState, useEffect, useCallback } from 'react';
import { useVariantes } from '../../hooks/use-variantes';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { ProductoVariante, CreateVarianteDto } from '@/core/types/producto';
import VarianteCard from './VarianteCard';
import VarianteFormDialog from './VarianteFormDialog';
import GenerarCombinacionesDialog from './GenerarCombinacionesDialog';
import VarianteDetailDialog from './VarianteDetailDialog';

interface Props {
  productoId: string;
  productoNombre: string;
  productoIsActive: boolean;
}

export default function VarianteList({ productoId, productoNombre, productoIsActive }: Props) {
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">Variantes</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {variantes.length}
          </span>
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
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variantes.map(v => (
            <VarianteCard
              key={v.id}
              variante={v}
              canManage={canManage}
              onView={() => setDetailVariante(v)}
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
