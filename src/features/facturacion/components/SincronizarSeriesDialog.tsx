'use client';

import { useState, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import type {
  SincronizacionPreview,
  BranchPreviewInfo,
  DiffSerie,
  SeleccionSerie,
  ResultadoSincronizacion,
} from '@/core/types/facturacion';
import { ACCION_DIFF_CONFIG } from '@/core/types/facturacion';
import * as facturacionService from '../services/facturacion-service';

interface Props {
  isOpen: boolean;
  sedeId: string;
  sedeNombre?: string;
  onSuccess: (resultado: ResultadoSincronizacion) => void;
  onClose: () => void;
}

const diffAplicable = (d: DiffSerie) =>
  ACCION_DIFF_CONFIG[d.accion]?.aplicable && d.serieProveedor != null && d.correlativoProveedor != null;

export default function SincronizarSeriesDialog({ isOpen, sedeId, sedeNombre, onSuccess, onClose }: Props) {
  const [preview, setPreview] = useState<SincronizacionPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchIdx, setBranchIdx] = useState(0);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({}); // tipoDocumento -> aplicar
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError('');
    setPreview(null);
    setSeleccion({});
    setBranchIdx(0);
    facturacionService.previewSincronizacionSeries(sedeId)
      .then((p) => {
        setPreview(p);
        const idxActual = p.branches.findIndex(b => b.esActualDeLaSede);
        const idx = idxActual >= 0 ? idxActual : 0;
        setBranchIdx(idx);
        // Pre-marcar todos los diffs aplicables del branch activo
        const branch = p.branches[idx];
        if (branch) {
          const sel: Record<string, boolean> = {};
          branch.diffs.forEach(d => { if (diffAplicable(d)) sel[d.tipoDocumento] = true; });
          setSeleccion(sel);
        }
      })
      .catch((err) => {
        const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
        setError(msg || 'No se pudo obtener la información de series del proveedor');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, sedeId]);

  const branch: BranchPreviewInfo | undefined = preview?.branches[branchIdx];

  const cambiarBranch = (idx: number) => {
    setBranchIdx(idx);
    const b = preview?.branches[idx];
    const sel: Record<string, boolean> = {};
    b?.diffs.forEach(d => { if (diffAplicable(d)) sel[d.tipoDocumento] = true; });
    setSeleccion(sel);
  };

  const aplicables = useMemo(() => (branch?.diffs ?? []).filter(diffAplicable), [branch]);
  const totalMarcados = aplicables.filter(d => seleccion[d.tipoDocumento]).length;

  const handleAplicar = async () => {
    if (!branch || totalMarcados === 0) { setError('Marca al menos una serie para aplicar'); return; }
    setError('');
    const selecciones: SeleccionSerie[] = aplicables.map(d => ({
      tipoDocumento: d.tipoDocumento,
      serieProveedor: d.serieProveedor as string,
      correlativoProveedor: d.correlativoProveedor as number,
      accion: seleccion[d.tipoDocumento] ? 'APLICAR' : 'OMITIR',
    }));
    setIsSubmitting(true);
    try {
      const res = await facturacionService.aplicarSincronizacionSeries({
        sedeId,
        selecciones,
        branchIdProveedor: branch.branchIdProveedor,
      });
      onSuccess(res);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo aplicar la sincronización');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Sincronizar series con el proveedor</h3>
          <p className="mt-0.5 text-xs text-gray-500">{sedeNombre ?? preview?.sedeNombre ?? 'Sede'} · compara el correlativo local contra el del proveedor</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
          ) : error && !preview ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>
          ) : preview && branch ? (
            <div className="space-y-3">
              {preview.branches.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sucursal del proveedor</label>
                  <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                    value={branchIdx} onChange={e => cambiarBranch(Number(e.target.value))}>
                    {preview.branches.map((b, i) => (
                      <option key={String(b.branchIdProveedor)} value={i}>
                        {b.codigo} · {b.nombre}{b.esActualDeLaSede ? ' (actual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="divide-y divide-gray-50 overflow-hidden rounded-lg border border-gray-100">
                {branch.diffs.map(d => {
                  const cfg = ACCION_DIFF_CONFIG[d.accion];
                  const aplicable = diffAplicable(d);
                  return (
                    <div key={d.tipoDocumento} className="flex items-start gap-3 p-3">
                      {aplicable ? (
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#437EFF]"
                          checked={!!seleccion[d.tipoDocumento]}
                          onChange={e => setSeleccion(s => ({ ...s, [d.tipoDocumento]: e.target.checked }))} />
                      ) : (
                        <span className="mt-0.5 h-4 w-4" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800">{d.tipoDocumentoNombre}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="rounded bg-gray-50 px-2 py-1">
                            <span className="text-gray-400">Local: </span>
                            <span className="font-mono text-gray-700">{d.serieLocal ?? '—'}{d.correlativoLocal != null ? ` · ${d.correlativoLocal}` : ''}</span>
                          </div>
                          <div className="rounded bg-blue-50 px-2 py-1">
                            <span className="text-gray-400">Proveedor: </span>
                            <span className="font-mono text-blue-700">{d.serieProveedor ?? '—'}{d.correlativoProveedor != null ? ` · ${d.correlativoProveedor}` : ''}</span>
                          </div>
                        </div>
                        {d.mensaje && <p className="mt-1 text-[10px] text-amber-600">{d.mensaje}</p>}
                        {d.accion === 'REEMPLAZAR_SERIE' && d.comprobantesEmitidosLocalmente > 0 && (
                          <p className="mt-0.5 text-[10px] text-amber-600">{d.comprobantesEmitidosLocalmente} comprobante(s) ya emitidos con la serie local.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {aplicables.length === 0 && (
                <div className="rounded-lg bg-green-50 p-3"><p className="text-xs text-green-700">Todas las series están en sincronía. No hay cambios por aplicar.</p></div>
              )}
              {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cerrar</button>
          {preview && aplicables.length > 0 && (
            <button onClick={handleAplicar} disabled={isSubmitting || totalMarcados === 0}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Aplicando...' : `Aplicar (${totalMarcados})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
