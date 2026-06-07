'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { Producto, PaginationMeta } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

export default function PapeleraProductosPage() {
  const permissions = usePermissions();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Producto | null>(null);

  const fetchEliminados = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      // Nota backend: soloEliminados no se combina con filtros de stock
      const res = await productoService.getProductos({ page: p, limit: 10, soloEliminados: true });
      setProductos(res.data);
      setMeta(res.meta);
    } catch {
      setError('Error al cargar la papelera');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEliminados(page);
  }, [fetchEliminados, page]);

  const handleRestaurar = async (producto: Producto) => {
    setRestoringId(producto.id);
    try {
      await productoService.restaurarProducto(producto.id);
      setConfirmTarget(null);
      fetchEliminados(page);
    } catch {
      setError('No se pudo restaurar el producto');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/productos" className="text-gray-400 hover:text-gray-600" title="Volver a productos">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Papelera de Productos</h1>
          </div>
          <p className="text-sm text-gray-500">{meta ? `${meta.total} productos eliminados` : 'Cargando...'}</p>
        </div>
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
      ) : productos.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">🗑</p>
          <p className="text-gray-400">La papelera está vacía</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Producto</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Código</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Categoría</th>
                <th className="px-4 py-3 font-medium text-gray-500">Eliminado el</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productos.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{p.nombre}</span>
                      {p.esCombo && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Combo</span>}
                      {p.esInsumo && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Insumo</span>}
                      {p.tieneVariantes && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Variantes</span>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="font-mono text-xs text-gray-500">{p.codigoEmpresa}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-gray-500">{p.categoria?.nombre || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {permissions.canManageProducts && (
                      <button
                        onClick={() => setConfirmTarget(p)}
                        disabled={restoringId === p.id}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        {restoringId === p.id ? 'Restaurando...' : '↩ Restaurar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {meta.offset + 1}-{Math.min(meta.offset + meta.pageSize, meta.total)} de {meta.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(meta.page - 1)}
              disabled={!meta.hasPrevious}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="flex items-center px-3 text-xs text-gray-500">{meta.page} / {meta.totalPages}</span>
            <button
              onClick={() => setPage(meta.page + 1)}
              disabled={!meta.hasNext}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Restaurar producto</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Restaurar <strong>{confirmTarget.nombre}</strong>? Volverá a aparecer en el listado de productos.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRestaurar(confirmTarget)}
                disabled={restoringId === confirmTarget.id}
                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {restoringId === confirmTarget.id ? 'Restaurando...' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
