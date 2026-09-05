'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProductos } from '@/features/producto/hooks/use-productos';
import ProductoTable from '@/features/producto/components/ProductoTable';
import ProductoFilters from '@/features/producto/components/ProductoFilters';
import DeleteDialog from '@/features/producto/components/DeleteDialog';
import * as productoService from '@/features/producto/services/producto-service';
import * as stockService from '@/features/stock/services/stock-service';
import UpdatePreciosDialog from '@/features/stock/components/UpdatePreciosDialog';
import AjustarStockDialog from '@/features/stock/components/AjustarStockDialog';
import CompartirFichaDialog from '@/features/producto/components/CompartirFichaDialog';
import ProductoImagenesDialog from '@/features/producto/components/ProductoImagenesDialog';
import type { ProductoStock } from '@/core/types/stock';
import type { Producto } from '@/core/types/producto';
import { usePermissions, useEmpresa } from '@/features/empresa/context/empresa-context';

export default function ProductosPage() {
  const { productos, meta, filtros, isLoading, error, updateFiltros, setPage, reload, resetFiltros } = useProductos();
  const permissions = usePermissions();
  const { sedes, empresa } = useEmpresa();
  const sedeActiva = sedes.find((s) => s.id === filtros.sedeId);

  /**
   * Si hay algo filtrado ademas del default.
   *
   * Distingue los dos vacios: "todavia no cargaste productos" pide crear uno,
   * "el filtro no devolvio nada" pide limpiarlo. Antes los dos decian
   * "No se encontraron productos" y el segundo dejaba al usuario mirando una
   * lista vacia sin saber que el filtro seguia puesto.
   */
  const hayFiltros = !!(
    filtros.search ||
    filtros.empresaCategoriaId ||
    filtros.empresaMarcaId ||
    filtros.destacado ||
    filtros.enOferta ||
    filtros.stockBajo ||
    filtros.isActive !== undefined ||
    filtros.soloCombos ||
    filtros.soloProductos ||
    filtros.enLiquidacion ||
    filtros.esInsumo !== false ||
    filtros.orden
  );
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Producto | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // ── Configurar precios desde la lista (paridad con el botón de la card del app) ──
  const [preciosStock, setPreciosStock] = useState<ProductoStock | null>(null);
  const [preciosCargando, setPreciosCargando] = useState<string | null>(null);
  const [preciosError, setPreciosError] = useState<string | null>(null);
  const [imagenesTarget, setImagenesTarget] = useState<Producto | null>(null);
  const [stockAjuste, setStockAjuste] = useState<ProductoStock | null>(null);
  /**
   * La ficha compartible. NO exige `canManageProducts`: mandarle la ficha de un
   * producto a un cliente lo hace quien atiende, que casi nunca puede editar.
   */
  const [compartirId, setCompartirId] = useState<string | null>(null);

  /**
   * Los precios son POR SEDE, y la lista de productos no siempre tiene una
   * filtrada. Se usa la del filtro y, si no hay, la sede principal: es la misma
   * decisión que toma el app, que trabaja con "la sede actual".
   */
  const sedeParaPrecios =
    filtros.sedeId ?? sedes.find((s) => s.esPrincipal)?.id ?? sedes[0]?.id;

  /**
   * Ajustar el stock desde la lista, como el boton "+" de la card del app.
   *
   * Mismo camino que los precios: el stock es POR SEDE, asi que se resuelve el
   * `ProductoStock` de la sede activa y el dialogo --el mismo que usa la
   * pantalla de Stock-- trabaja sobre el. No hace falta uno nuevo.
   */
  const abrirAjusteStock = async (producto: Producto) => {
    if (!sedeParaPrecios) {
      setPreciosError('La empresa no tiene sedes: no hay dónde ajustar stock.');
      return;
    }
    setPreciosCargando(producto.id);
    setPreciosError(null);
    try {
      const stock = await stockService.getStockByProductoSede(producto.id, sedeParaPrecios);
      setStockAjuste(stock);
    } catch {
      setPreciosError(`No se pudo abrir el stock de "${producto.nombre}" en esta sede.`);
    } finally {
      setPreciosCargando(null);
    }
  };

  const abrirPrecios = async (producto: Producto) => {
    if (!sedeParaPrecios) {
      setPreciosError('La empresa no tiene sedes: no hay dónde configurar precios.');
      return;
    }
    setPreciosCargando(producto.id);
    setPreciosError(null);
    try {
      // El mismo camino del app: se resuelve el ProductoStock de esa sede y el
      // diálogo trabaja sobre él.
      const stock = await stockService.getStockByProductoSede(producto.id, sedeParaPrecios);
      setPreciosStock(stock);
    } catch {
      // Sin fila de stock en esa sede no hay precios que editar. Se dice cuál
      // es la sede: si no, parece que el producto está roto.
      const nombreSede = sedes.find((s) => s.id === sedeParaPrecios)?.nombre ?? 'esa sede';
      setPreciosError(`"${producto.nombre}" no tiene stock en ${nombreSede}, así que no hay precios que configurar ahí.`);
    } finally {
      setPreciosCargando(null);
    }
  };

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
      {/* Sin h1: la cabecera del dashboard ya dice "Productos". Acá queda el
          conteo, el contexto de sede y las acciones. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-gray-500">
          {meta ? <><strong className="text-[13px] text-gray-900">{meta.total}</strong> productos</> : 'Cargando…'}
        </p>
        {sedeActiva && (
          <>
            <span className="h-4 w-px bg-gray-200" />
            {/* El precio y el stock de la tabla son DE UNA SEDE. Sin decir cuál,
                el número se lee como si fuera el de la empresa. */}
            <p className="text-[11px] text-gray-400">
              precios y stock de <strong className="text-gray-600">{sedeActiva.nombre}</strong>
            </p>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Armar un catálogo NO es administrar productos: lo usa quien
              atiende, que muchas veces no puede editarlos. */}
          <Link
            href="/dashboard/productos/catalogo"
            className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-gray-200 px-3 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
            title="Armar un catálogo en PDF para compartir"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5a2 2 0 012-2h6v18H6a2 2 0 01-2-2V5zM12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6V3z" />
            </svg>
            Catálogo
          </Link>
          {permissions.canManageProducts && (
            <Link
              href="/dashboard/productos/papelera"
              className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-gray-200 px-3 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
              title="Productos eliminados"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
              Papelera
            </Link>
          )}
          {permissions.canManageProducts && (
            <Link
              href="/dashboard/productos/nuevo"
              // 30 px de alto y `px-3`: -4 de alto y -4 de ancho. Los 30 son,
              // ademas, la altura del input estandar de la web.
              className="inline-flex h-[30px] items-center gap-1.5 rounded-md bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nuevo producto
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
        onConfigurarPrecios={permissions.canManageProducts ? abrirPrecios : undefined}
        onAjustarStock={permissions.canManageProducts ? abrirAjusteStock : undefined}
        onGestionarImagenes={permissions.canManageProducts ? setImagenesTarget : undefined}
        onCompartir={(p) => setCompartirId(p.id)}
        hayFiltros={hayFiltros}
        onLimpiarFiltros={resetFiltros}
        puedeCrear={permissions.canManageProducts}
      />

      {preciosCargando && (
        <p className="text-xs text-gray-500">Cargando precios…</p>
      )}
      {preciosError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{preciosError}</p>
        </div>
      )}

      {imagenesTarget && (
        <ProductoImagenesDialog
          key={imagenesTarget.id}
          producto={imagenesTarget}
          empresaId={empresa?.id}
          onClose={() => setImagenesTarget(null)}
          onChanged={reload}
        />
      )}

      {compartirId && (
        <CompartirFichaDialog
          productoId={compartirId}
          sedeId={sedeParaPrecios}
          sedeNombre={sedes.find((s) => s.id === sedeParaPrecios)?.nombre}
          onClose={() => setCompartirId(null)}
        />
      )}

      <AjustarStockDialog
        isOpen={!!stockAjuste}
        stock={stockAjuste}
        onSuccess={() => { setStockAjuste(null); reload(); }}
        onClose={() => setStockAjuste(null)}
      />

      <UpdatePreciosDialog
        isOpen={!!preciosStock}
        stock={preciosStock}
        onSuccess={() => { setPreciosStock(null); reload(); }}
        onClose={() => setPreciosStock(null)}
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
            <h3 className="text-sm font-medium text-gray-900">
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
