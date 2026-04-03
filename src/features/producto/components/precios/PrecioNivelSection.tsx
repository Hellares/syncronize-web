'use client';

import { useState, useEffect } from 'react';
import { usePrecioNiveles } from '../../hooks/use-precio-niveles';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { PrecioNivel } from '@/core/types/precio';
import PrecioNivelFormDialog from './PrecioNivelFormDialog';

interface Props {
  productoId: string;
  varianteId?: string;
}

export default function PrecioNivelSection({ productoId, varianteId }: Props) {
  const { niveles, isLoading, isSubmitting, error, success, create, update, remove } = usePrecioNiveles(productoId, varianteId);
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrecioNivel | null>(null);

  useEffect(() => {
    if (!isSubmitting && (error || success)) setFormOpen(false);
  }, [isSubmitting, error, success]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Niveles de Precio</h3>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="rounded-lg border border-[#437EFF] px-2.5 py-1 text-[11px] font-medium text-[#437EFF] hover:bg-[#437EFF]/5">
            + Agregar Nivel
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : niveles.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Sin niveles de precio configurados. Los niveles permiten ofrecer descuentos por volumen.</p>
      ) : (
        <div className="space-y-2">
          {niveles.map(n => (
            <div key={n.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{n.nombre}</p>
                <p className="text-xs text-gray-500">
                  {n.cantidadMinima}{n.cantidadMaxima ? `-${n.cantidadMaxima}` : '+'} unid.
                  {' — '}
                  {n.tipoPrecio === 'PRECIO_FIJO'
                    ? <span className="text-green-600 font-medium">S/ {Number(n.precio).toFixed(2)}</span>
                    : <span className="text-blue-600 font-medium">{n.porcentajeDesc}% desc.</span>
                  }
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(n); setFormOpen(true); }} className="rounded p-1 text-gray-400 hover:text-[#437EFF]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => remove(n.id)} className="rounded p-1 text-gray-400 hover:text-red-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PrecioNivelFormDialog
        isOpen={formOpen}
        nivel={editing}
        isSubmitting={isSubmitting}
        onSave={async (data) => {
          if (editing) await update(editing.id, data);
          else await create(data);
          setFormOpen(false); setEditing(null);
        }}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />
    </div>
  );
}
