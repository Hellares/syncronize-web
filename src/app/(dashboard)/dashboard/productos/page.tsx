'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProductos } from '@/features/producto/hooks/use-productos';
import ProductoTable from '@/features/producto/components/ProductoTable';
import ProductoFilters from '@/features/producto/components/ProductoFilters';
import DeleteDialog from '@/features/producto/components/DeleteDialog';
import * as productoService from '@/features/producto/services/producto-service';
import type { Producto } from '@/core/types/producto';
import { usePermissions } from '@/features/empresa/context/empresa-context';

export default function ProductosPage() {
  const { productos, meta, filtros, isLoading, error, updateFiltros, setPage, reload, resetFiltros } = useProductos();
  const permissions = usePermissions();
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Producto | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await productoService.deleteProducto(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch {
      // error silently
    } finally {
      setIsDeleting(false);
    }
  };

  // Con confirmación previa, igual que Flutter (producto_detail_page._toggleActive)
  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setIsToggling(true);
    try {
      await productoService.toggleActiveProducto(toggleTarget.id);
      setToggleTarget(null);
      reload();
    } catch {
      // error silently
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">{meta ? `${meta.total} productos` : 'Cargando...'}</p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canManageProducts && (
            <Link
              href="/dashboard/productos/papelera"
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Productos eliminados"
            >
              🗑 Papelera
            </Link>
          )}
          {permissions.canManageProducts && (
            <Link
              href="/dashboard/productos/nuevo"
              className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] transition-colors"
            >
              + Nuevo Producto
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <ProductoFilters filtros={filtros} onUpdate={updateFiltros} onReset={resetFiltros} />

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Table */}
      <ProductoTable
        productos={productos}
        meta={meta}
        isLoading={isLoading}
        sedeId={filtros.sedeId}
        canManage={permissions.canManageProducts}
        onPageChange={setPage}
        onDelete={setDeleteTarget}
        onToggleActive={setToggleTarget}
      />

      {/* Delete dialog */}
      <DeleteDialog
        isOpen={!!deleteTarget}
        nombre={deleteTarget?.nombre || ''}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toggle activo dialog */}
      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">
              {toggleTarget.isActive ? 'Desactivar producto' : 'Activar producto'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {toggleTarget.isActive
                ? <>¿Desactivar <strong>{toggleTarget.nombre}</strong>? No estará disponible para la venta.</>
                : <>¿Activar <strong>{toggleTarget.nombre}</strong>? Volverá a estar disponible para la venta.</>}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setToggleTarget(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleActive}
                disabled={isToggling}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                  toggleTarget.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isToggling ? 'Guardando...' : toggleTarget.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
