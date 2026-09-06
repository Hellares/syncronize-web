'use client';

/**
 * Edición masiva de stock, precios y mayoreo de las variantes de un producto.
 *
 * Réplica de `edicion_masiva_stock_page.dart`, que se abre desde Gestión de
 * Variantes. Vive en su propia ruta porque la grilla necesita todo el ancho y
 * el alto de la pantalla.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProductoVariante } from '@/core/types/producto';
import { getVariantes } from '@/features/producto/services/variante-service';
import { useProductoDetail } from '@/features/producto/hooks/use-producto-detail';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import EdicionMasivaVariantes from '@/features/producto/components/variantes/EdicionMasivaVariantes';

export default function EdicionMasivaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { producto, isLoading: cargandoProducto } = useProductoDetail(id);
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const sedesActivas = sedes.filter(s => s.isActive);

  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [sedeId, setSedeId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setVariantes(await getVariantes(id));
    } catch {
      setError('No se pudieron cargar las variantes');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (sedesActivas.length && !sedeId) setSedeId(sedesActivas[0].id);
  }, [sedesActivas, sedeId]);

  if (!permissions.canManageProducts) {
    return (
      <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-sm text-amber-800">No tenés permiso para editar productos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/dashboard/productos/${id}/variantes`}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            title="Volver a Gestión de Variantes"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">Edición masiva</h1>
            <p className="truncate text-sm text-gray-500">
              {producto?.nombre ?? '…'} · {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'}
            </p>
          </div>
        </div>

        {/* Stock, precio y costo son POR SEDE: sin decir cuál, los números no
            significan nada. El mayoreo NO, y eso lo aclara la confirmación. */}
        {sedesActivas.length > 1 && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Sede</label>
            <select
              value={sedeId}
              onChange={e => setSedeId(e.target.value)}
              className="h-[30px] rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all focus:shadow-lg focus:shadow-blue-200"
            >
              {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {cargando || cargandoProducto ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : variantes.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-blue-400/40">
          <p className="text-sm text-gray-500">Este producto todavía no tiene variantes.</p>
        </div>
      ) : !sedeId ? (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm text-amber-800">La empresa no tiene sedes activas.</p>
        </div>
      ) : (
        <EdicionMasivaVariantes producto={producto!} variantes={variantes} sedeId={sedeId} onGuardado={cargar} />
      )}
    </div>
  );
}
