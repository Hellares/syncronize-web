'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { CampoServicio, TipoCampoServicio, CategoriaCampo, SubCampoObjeto, SubCampoTipo, ConfiguracionCampoDto } from '@/core/types/servicio-catalogo';
import {
  TIPOS_CAMPO, TIPO_CAMPO_LABEL, TIPOS_CAMPO_CON_OPCIONES,
  CATEGORIAS_CAMPO, CATEGORIA_CAMPO_LABEL, SUB_CAMPO_TIPO_LABEL, opcionesAStrings,
} from '@/core/types/servicio-catalogo';
import * as service from '@/features/ordenes-servicio/services/configuracion-campos-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

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

/* --- Form crear/editar campo (incl. sub-campos OBJETO) --- */
function CampoFormDialog({ campo, onClose, onSaved }: { campo: CampoServicio | null; onClose: () => void; onSaved: () => void }) {
  const esEdicion = !!campo;
  const [nombre, setNombre] = useState(campo?.nombre ?? '');
  const [tipoCampo, setTipoCampo] = useState<TipoCampoServicio>((campo?.tipoCampo as TipoCampoServicio) ?? 'TEXTO');
  const [categoria, setCategoria] = useState<string>(campo?.categoria ?? '');
  const [descripcion, setDescripcion] = useState(campo?.descripcion ?? '');
  const [placeholder, setPlaceholder] = useState(campo?.placeholder ?? '');
  const [esRequerido, setEsRequerido] = useState(!!campo?.esRequerido);
  const [permiteOtro, setPermiteOtro] = useState(!!campo?.permiteOtro);
  const [opcionesTxt, setOpcionesTxt] = useState(
    campo && TIPOS_CAMPO_CON_OPCIONES.includes(campo.tipoCampo as TipoCampoServicio)
      ? opcionesAStrings(campo.opciones).join(', ')
      : ''
  );
  const [subCampos, setSubCampos] = useState<SubCampoObjeto[]>(
    campo?.tipoCampo === 'OBJETO' && Array.isArray(campo.opciones)
      ? (campo.opciones as Record<string, unknown>[]).map(o => ({
          nombre: String(o.nombre ?? ''),
          tipo: (o.tipo as SubCampoTipo) ?? 'TEXTO',
          opciones: Array.isArray(o.opciones) ? (o.opciones as unknown[]).map(String) : undefined,
        }))
      : []
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usaOpciones = TIPOS_CAMPO_CON_OPCIONES.includes(tipoCampo);
  const esObjeto = tipoCampo === 'OBJETO';
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('Ingresa el nombre del campo'); return; }
    if (esObjeto && subCampos.filter(s => s.nombre.trim()).length === 0) { setError('Agrega al menos un sub-campo'); return; }

    let opciones: unknown = undefined;
    if (usaOpciones) {
      opciones = opcionesTxt.split(',').map(s => s.trim()).filter(Boolean);
    } else if (esObjeto) {
      opciones = subCampos
        .filter(s => s.nombre.trim())
        .map(s => {
          const entry: Record<string, unknown> = { nombre: s.nombre.trim(), tipo: s.tipo };
          if (s.tipo === 'OPCION_SIMPLES' && s.opciones?.length) entry.opciones = s.opciones;
          return entry;
        });
    }

    const data: ConfiguracionCampoDto = {
      nombre: nombre.trim(),
      tipoCampo,
      categoria: categoria || null,
      descripcion: descripcion.trim() || null,
      placeholder: placeholder.trim() || null,
      esRequerido,
      permiteOtro: usaOpciones ? permiteOtro : false,
      opciones,
    };

    setIsSubmitting(true);
    try {
      if (esEdicion) await service.actualizarCampo(campo!.id, data);
      else await service.crearCampo(data);
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el campo');
      setIsSubmitting(false);
    }
  };

  const eliminar = async () => {
    if (!campo || !confirm('¿Eliminar este campo? Las órdenes existentes conservan los datos ya capturados.')) return;
    setIsSubmitting(true);
    try { await service.eliminarCampo(campo.id); onSaved(); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo eliminar el campo');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar campo' : 'Nuevo campo'}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre del campo *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Número de serie, IMEI..." autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de campo</label>
            <select className={`${inputClass} bg-white`} value={tipoCampo} onChange={e => setTipoCampo(e.target.value as TipoCampoServicio)}>
              {TIPOS_CAMPO.map(t => <option key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Categoría (opcional)</label>
            <select className={`${inputClass} bg-white`} value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Sin categoría</option>
              {CATEGORIAS_CAMPO.map(c => <option key={c} value={c}>{CATEGORIA_CAMPO_LABEL[c]}</option>)}
            </select>
          </div>

          {usaOpciones && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Opciones (separadas por coma)</label>
                <input className={inputClass} value={opcionesTxt} onChange={e => setOpcionesTxt(e.target.value)} placeholder="Opción 1, Opción 2, Opción 3" />
              </div>
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Permitir &quot;Otro&quot;</span>
                <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={permiteOtro} onChange={e => setPermiteOtro(e.target.checked)} />
              </label>
            </>
          )}

          <input className={inputClass} value={placeholder} onChange={e => setPlaceholder(e.target.value)} placeholder="Placeholder (opcional)" />
          <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción de ayuda (opcional)" />

          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Campo requerido</span>
            <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={esRequerido} onChange={e => setEsRequerido(e.target.checked)} />
          </label>

          {/* Sub-campos para tipo OBJETO */}
          {esObjeto && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Sub-campos</span>
                <button type="button" onClick={() => setSubCampos([...subCampos, { nombre: '', tipo: 'TEXTO' }])}
                  className="text-[11px] font-semibold text-[#437EFF] hover:underline">+ Agregar</button>
              </div>
              {subCampos.length === 0 && <p className="text-[11px] text-gray-400">Agrega sub-campos con el botón +.</p>}
              <div className="space-y-2">
                {subCampos.map((sub, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <input className={`${inputClass} flex-1`} value={sub.nombre} placeholder="Nombre"
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, nombre: e.target.value } : s))} />
                      <select className={`${inputClass} w-28 bg-white`} value={sub.tipo}
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, tipo: e.target.value as SubCampoTipo, opciones: undefined } : s))}>
                        {(Object.keys(SUB_CAMPO_TIPO_LABEL) as SubCampoTipo[]).map(t => <option key={t} value={t}>{SUB_CAMPO_TIPO_LABEL[t]}</option>)}
                      </select>
                      <button type="button" onClick={() => setSubCampos(subCampos.filter((_, j) => j !== i))}
                        className="px-1 text-red-400 hover:text-red-600">✕</button>
                    </div>
                    {sub.tipo === 'OPCION_SIMPLES' && (
                      <input className={`${inputClass} text-xs`} placeholder="Opciones separadas por coma (ej: AM5, AM4)"
                        value={(sub.opciones ?? []).join(', ')}
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, opciones: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } : s))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {esEdicion ? (
            <button onClick={eliminar} disabled={isSubmitting} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={isSubmitting}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
