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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">{meta ? `${meta.total} productos` : 'Cargando...'}</p>
        </div>
        {permissions.canManageProducts && (
          <Link
            href="/dashboard/productos/nuevo"
            className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] transition-colors"
          >
            + Nuevo Producto
          </Link>
        )}
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
      />

      {/* Delete dialog */}
      <DeleteDialog
        isOpen={!!deleteTarget}
        nombre={deleteTarget?.nombre || ''}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
