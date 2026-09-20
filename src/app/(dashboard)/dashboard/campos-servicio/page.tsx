'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CampoServicio, TipoCampoServicio, CategoriaCampo } from '@/core/types/servicio-catalogo';
import { TIPO_CAMPO_LABEL, CATEGORIA_CAMPO_LABEL } from '@/core/types/servicio-catalogo';
import * as service from '@/features/ordenes-servicio/services/configuracion-campos-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import { CampoFormDialog } from '@/features/ordenes-servicio/components/campo-form-dialog';

export default function CamposServicioPage() {
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageServices;
  const [campos, setCampos] = useState<CampoServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<CampoServicio | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await service.getCampos();
      setCampos([...list].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    } catch {
      setError('No se pudieron cargar los campos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditando(null); setDialogOpen(true); };
  const abrirEditar = (c: CampoServicio) => { setEditando(c); setDialogOpen(true); };

  // ── Reordenar (drag & drop nativo) ──
  const onDrop = async (destino: number) => {
    if (dragIndex === null || dragIndex === destino) { setDragIndex(null); return; }
    const reordenados = [...campos];
    const [movido] = reordenados.splice(dragIndex, 1);
    reordenados.splice(destino, 0, movido);
    setCampos(reordenados);
    setDragIndex(null);
    try {
      await service.reordenarCampos(reordenados.map(c => c.id));
    } catch {
      setError('No se pudo guardar el nuevo orden');
      cargar();
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campos de servicio</h1>
          <p className="text-xs text-gray-500">Plantilla de campos personalizados para tus órdenes de servicio. Arrastra para reordenar.</p>
        </div>
        {puedeGestionar && (
          <button onClick={abrirCrear} className="shrink-0 rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">+ Nuevo campo</button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : campos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No hay campos configurados</p>
          <p className="mt-1 text-xs text-gray-400">Crea campos personalizados para capturar en tus órdenes de servicio.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {campos.map((c, i) => {
            const tipo = c.tipoCampo as TipoCampoServicio;
            const cat = c.categoria as CategoriaCampo | undefined;
            return (
              <div
                key={c.id}
                draggable={puedeGestionar}
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { if (puedeGestionar) e.preventDefault(); }}
                onDrop={() => onDrop(i)}
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${dragIndex === i ? 'border-[#437EFF] opacity-60' : 'border-gray-200'} ${puedeGestionar ? 'cursor-pointer hover:border-gray-300' : ''}`}
                onClick={() => puedeGestionar && abrirEditar(c)}
              >
                {puedeGestionar && <span className="cursor-grab select-none text-gray-300" title="Arrastrar para reordenar">⠿</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{c.nombre}</p>
                  <p className="text-[11px] text-gray-400">
                    {TIPO_CAMPO_LABEL[tipo] ?? c.tipoCampo}
                    {cat ? ` · ${CATEGORIA_CAMPO_LABEL[cat] ?? cat}` : ''}
                  </p>
                </div>
                {c.esRequerido && <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Requerido</span>}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <CampoFormDialog
          campo={editando}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); cargar(); }}
        />
      )}
    </div>
  );
}

