'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { OrdenServicioComponente, TipoAccionComponente, UpdateServicioComponenteDto } from '@/core/types/orden-servicio';
import { TIPOS_ACCION, TIPO_ACCION_LABEL } from '@/core/types/orden-servicio';
import * as osService from '../services/orden-servicio-service';
import * as storageService from '@/features/storage/services/storage-service';
import type { ArchivoResponse } from '@/features/storage/services/storage-service';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nombreComponente(c: OrdenServicioComponente): string {
  const tipo = c.componente?.tipoComponente?.nombre;
  const marca = c.componente?.marca;
  const modelo = c.componente?.modelo;
  return [tipo ?? marca ?? 'Componente', modelo].filter(Boolean).join(' ');
}

/** Detalle de un componente de la orden: info, costos, edición de acción e imágenes de evidencia. */
export function ComponenteDetailDialog({
  ordenId, empresaId, componente, canManage, onClose, onChanged,
}: {
  ordenId: string;
  empresaId: string;
  componente: OrdenServicioComponente;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const c = componente;
  const costoTotal = Number(c.costoAccion ?? 0) + Number(c.costoRepuestos ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{nombreComponente(c)}</h3>
            {c.componente?.codigo && <p className="text-[11px] text-gray-400">{c.componente.codigo}</p>}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600">✕</button>
        </div>

        {editando ? (
          <EditComponenteForm
            ordenId={ordenId}
            componente={c}
            onCancel={() => setEditando(false)}
            onSaved={() => { setEditando(false); onChanged(); }}
          />
        ) : (
          <>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Acción</span><span className="font-medium text-gray-700">{TIPO_ACCION_LABEL[c.tipoAccion as TipoAccionComponente] ?? c.tipoAccion}</span></div>
              {c.descripcionAccion && <div className="flex justify-between gap-3"><span className="text-gray-400">Descripción</span><span className="text-right text-gray-600">{c.descripcionAccion}</span></div>}
              {/* Desglose de costo */}
              <div className="rounded-lg bg-gray-50 p-2.5">
                <div className="flex justify-between text-gray-500"><span>Mano de obra</span><span>{fmt(c.costoAccion)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Repuesto / compra</span><span>{fmt(c.costoRepuestos)}</span></div>
                <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-700"><span>Total</span><span>{fmt(costoTotal)}</span></div>
              </div>
              {(c.tiempoAccion ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-400">Tiempo</span><span className="text-gray-600">{c.tiempoAccion} min</span></div>}
              {(c.garantiaMeses ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-400">Garantía</span><span className="text-gray-600">{c.garantiaMeses} meses</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Prueba realizada</span><span className="text-gray-600">{c.pruebaRealizada ? 'Sí' : 'No'}</span></div>
              {c.resultadoAccion && <div className="flex justify-between gap-3"><span className="text-gray-400">Resultado</span><span className="text-right text-gray-600">{c.resultadoAccion}</span></div>}
              {c.observaciones && <div className="flex justify-between gap-3"><span className="text-gray-400">Observaciones</span><span className="text-right text-gray-600">{c.observaciones}</span></div>}
            </div>

            {canManage && (
              <button onClick={() => setEditando(true)}
                className="mt-3 w-full rounded-lg border border-[#437EFF] px-4 py-2 text-xs font-semibold text-[#437EFF] hover:bg-[#437EFF]/5">
                Editar acción / costos
              </button>
            )}

            <div className="mt-4 border-t border-gray-100 pt-3">
              <ComponenteImagenes empresaId={empresaId} componenteId={c.id} canManage={canManage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --- Formulario de edición de acción/costos (PATCH parcial; null limpia) --- */
function EditComponenteForm({
  ordenId, componente, onCancel, onSaved,
}: {
  ordenId: string;
  componente: OrdenServicioComponente;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const c = componente;
  const fmtNum = (v: number | null | undefined) => (v == null ? '' : (v === Math.round(v) ? String(Math.round(v)) : String(v)));
  const [tipoAccion, setTipoAccion] = useState<TipoAccionComponente>(
    (TIPOS_ACCION as string[]).includes(c.tipoAccion) ? (c.tipoAccion as TipoAccionComponente) : 'DIAGNOSTICAR'
  );
  const [descripcion, setDescripcion] = useState(c.descripcionAccion ?? '');
  const [costoAccion, setCostoAccion] = useState(fmtNum(c.costoAccion));
  const [tiempoAccion, setTiempoAccion] = useState(fmtNum(c.tiempoAccion));
  const [costoRepuestos, setCostoRepuestos] = useState(fmtNum(c.costoRepuestos));
  const [garantiaMeses, setGarantiaMeses] = useState(fmtNum(c.garantiaMeses));
  const [resultado, setResultado] = useState(c.resultadoAccion ?? '');
  const [observaciones, setObservaciones] = useState(c.observaciones ?? '');
  const [pruebaRealizada, setPruebaRealizada] = useState(!!c.pruebaRealizada);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    setIsSubmitting(true);
    // Se envían todos los campos (null para limpiar) — el DTO backend es parcial.
    const data: UpdateServicioComponenteDto = {
      tipoAccion,
      descripcionAccion: descripcion.trim() || null,
      costoAccion: costoAccion.trim() ? parseFloat(costoAccion) : null,
      tiempoAccion: tiempoAccion.trim() ? parseInt(tiempoAccion, 10) : null,
      costoRepuestos: costoRepuestos.trim() ? parseFloat(costoRepuestos) : null,
      resultadoAccion: resultado.trim() || null,
      pruebaRealizada,
      observaciones: observaciones.trim() || null,
      garantiaMeses: garantiaMeses.trim() ? parseInt(garantiaMeses, 10) : null,
    };
    try {
      await osService.updateComponente(ordenId, c.id, data);
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo actualizar el componente');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Acción a realizar</label>
        <select className={`${inputClass} bg-white`} value={tipoAccion} onChange={e => setTipoAccion(e.target.value as TipoAccionComponente)}>
          {TIPOS_ACCION.map(a => <option key={a} value={a}>{TIPO_ACCION_LABEL[a]}</option>)}
        </select>
      </div>
      <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" />
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mb-1 block text-[10px] text-gray-400">Costo acción (M.O.)</label><input className={inputClass} type="number" step="0.01" min="0" value={costoAccion} onChange={e => setCostoAccion(e.target.value)} /></div>
        <div><label className="mb-1 block text-[10px] text-gray-400">Tiempo (min)</label><input className={inputClass} type="number" step="1" min="0" value={tiempoAccion} onChange={e => setTiempoAccion(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mb-1 block text-[10px] text-gray-400">Repuestos / compra</label><input className={inputClass} type="number" step="0.01" min="0" value={costoRepuestos} onChange={e => setCostoRepuestos(e.target.value)} /></div>
        <div><label className="mb-1 block text-[10px] text-gray-400">Garantía (meses)</label><input className={inputClass} type="number" step="1" min="0" value={garantiaMeses} onChange={e => setGarantiaMeses(e.target.value)} /></div>
      </div>
      <input className={inputClass} value={resultado} onChange={e => setResultado(e.target.value)} placeholder="Resultado (opcional)" />
      <input className={inputClass} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)" />
      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Prueba realizada</span>
        <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={pruebaRealizada} onChange={e => setPruebaRealizada(e.target.checked)} />
      </label>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={submit} disabled={isSubmitting}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

/* --- Imágenes de evidencia del componente (entidadTipo SERVICIO_COMPONENTE) --- */
function ComponenteImagenes({ empresaId, componenteId, canManage }: { empresaId: string; componenteId: string; canManage: boolean }) {
  const [imagenes, setImagenes] = useState<ArchivoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const list = await storageService.getFilesByEntity('SERVICIO_COMPONENTE', componenteId, empresaId);
      setImagenes(list);
    } catch {
      setImagenes([]);
    } finally {
      setLoading(false);
    }
  }, [componenteId, empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    setError('');
    setProgress(0);
    try {
      await storageService.uploadFile({
        file, empresaId, entidadTipo: 'SERVICIO_COMPONENTE', entidadId: componenteId, categoria: 'EVIDENCIA',
        onProgress: setProgress,
      });
      await cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo subir la imagen');
    } finally {
      setProgress(null);
    }
  };

  const eliminar = async (archivoId: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    setError('');
    try {
      await storageService.deleteFile(archivoId, empresaId, 'SERVICIO_COMPONENTE');
      await cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo eliminar la imagen');
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-gray-400">Evidencia ({imagenes.length})</p>
        {canManage && (
          <button onClick={() => fileRef.current?.click()} disabled={progress != null}
            className="text-[11px] font-semibold text-[#437EFF] hover:underline disabled:opacity-50">
            {progress != null ? `Subiendo ${progress}%` : '+ Subir imagen'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {error && <p className="mb-2 text-[11px] text-red-500">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
      ) : imagenes.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-400">Sin imágenes de evidencia.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {imagenes.map(img => (
            <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
              <img src={img.urlThumbnail || img.url} alt={img.nombreOriginal}
                onClick={() => setViewer(img.url)}
                className="h-full w-full cursor-pointer object-cover" />
              {canManage && (
                <button onClick={() => eliminar(img.id)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/50 px-1.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {viewer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
