'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { PlantillaServicio, TipoCampoServicio, SubCampoTipo, SubCampoObjeto, ConfiguracionCampoDto, CatalogoPlantilla } from '@/core/types/servicio-catalogo';
import {
  TIPOS_CAMPO, TIPO_CAMPO_LABEL, TIPOS_CAMPO_CON_OPCIONES,
  CATEGORIAS_CAMPO, CATEGORIA_CAMPO_LABEL, SUB_CAMPO_TIPO_LABEL,
} from '@/core/types/servicio-catalogo';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';
import { CATALOGO_PLANTILLAS } from '@/features/ordenes-servicio/data/catalogo-plantillas';
import { usePermissions } from '@/features/empresa/context/empresa-context';

export default function PlantillasServicioPage() {
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageServices;
  const [plantillas, setPlantillas] = useState<PlantillaServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState<PlantillaServicio | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [campoEnPlantilla, setCampoEnPlantilla] = useState<PlantillaServicio | null>(null);
  const [catalogoOpen, setCatalogoOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlantillas(await catalogoService.getPlantillas());
    } catch {
      setError('No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const q = search.trim().toLowerCase();
  const filtradas = q
    ? plantillas.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion ?? '').toLowerCase().includes(q))
    : plantillas;

  const eliminar = async (p: PlantillaServicio) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? Los servicios vinculados perderán esta plantilla.`)) return;
    try { await catalogoService.eliminarPlantilla(p.id); cargar(); }
    catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo eliminar');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plantillas de servicio</h1>
          <p className="text-xs text-gray-500">Agrupa campos en plantillas reutilizables y vincúlalas a tus servicios.</p>
        </div>
        {puedeGestionar && (
          <div className="flex gap-2">
            <button onClick={() => setCatalogoOpen(true)} className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-semibold text-[#437EFF] hover:bg-[#437EFF]/5">✨ Catálogo</button>
            <button onClick={() => { setEditando(null); setFormOpen(true); }} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">+ Nueva plantilla</button>
          </div>
        )}
      </div>

      <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
        value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o descripción..." />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">{q ? 'Sin resultados' : 'No hay plantillas creadas'}</p>
          {!q && puedeGestionar && <p className="mt-1 text-xs text-gray-400">Crea una nueva o usa una del <button onClick={() => setCatalogoOpen(true)} className="font-semibold text-[#437EFF] hover:underline">catálogo</button>.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(p => (
            <PlantillaCard key={p.id} plantilla={p} canManage={puedeGestionar}
              onEdit={() => { setEditando(p); setFormOpen(true); }}
              onDelete={() => eliminar(p)}
              onAddCampo={() => setCampoEnPlantilla(p)} />
          ))}
        </div>
      )}

      {formOpen && (
        <PlantillaFormDialog plantilla={editando} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); cargar(); }} />
      )}
      {campoEnPlantilla && (
        <CampoFormDialog plantilla={campoEnPlantilla} onClose={() => setCampoEnPlantilla(null)} onSaved={() => { setCampoEnPlantilla(null); cargar(); }} />
      )}
      {catalogoOpen && (
        <CatalogoDialog onClose={() => setCatalogoOpen(false)} onCreated={() => { setCatalogoOpen(false); cargar(); }} />
      )}
    </div>
  );
}

/* --- Card de plantilla --- */
function PlantillaCard({ plantilla, canManage, onEdit, onDelete, onAddCampo }: {
  plantilla: PlantillaServicio; canManage: boolean; onEdit: () => void; onDelete: () => void; onAddCampo: () => void;
}) {
  const campos = plantilla.campos ?? [];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{plantilla.nombre}</p>
          {plantilla.descripcion && <p className="text-[13px] text-gray-500">{plantilla.descripcion}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-2 text-[11px] font-semibold">
            <button onClick={onAddCampo} className="text-[#437EFF] hover:underline">+ Campo</button>
            <button onClick={onEdit} className="text-gray-500 hover:underline">Editar</button>
            <button onClick={onDelete} className="text-red-500 hover:underline">Eliminar</button>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {campos.length === 0 ? (
          <span className="text-[11px] text-gray-400">Sin campos. Usa “+ Campo” para agregar.</span>
        ) : campos.map(c => (
          <span key={c.id} className="rounded bg-[#437EFF]/5 px-1.5 py-0.5 text-[11px] text-[#004A94]">
            {c.nombre}{c.esRequerido ? ' *' : ''}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
        <span>{campos.length} campos</span>
        {(plantilla.serviciosCount ?? 0) > 0 && <span>{plantilla.serviciosCount} servicios</span>}
        <span className={plantilla.isActive === false ? 'text-gray-400' : 'text-green-600'}>{plantilla.isActive === false ? 'Inactiva' : 'Activa'}</span>
      </div>
    </div>
  );
}

/* --- Crear/editar plantilla (nombre + descripción) --- */
function PlantillaFormDialog({ plantilla, onClose, onSaved }: { plantilla: PlantillaServicio | null; onClose: () => void; onSaved: () => void }) {
  const esEdicion = !!plantilla;
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('Ingresa el nombre'); return; }
    setSaving(true);
    try {
      if (esEdicion) await catalogoService.actualizarPlantilla(plantilla!.id, { nombre: nombre.trim(), descripcion: descripcion.trim() || null });
      else await catalogoService.crearPlantilla({ nombre: nombre.trim(), descripcion: descripcion.trim() || null });
      onSaved();
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo guardar');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
        <div className="mt-3 space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label><input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Reparación de PC" autoFocus /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Descripción (opcional)</label><textarea className={`${inputClass} resize-none`} rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Propósito de esta plantilla" /></div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">{saving ? 'Guardando...' : esEdicion ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </div>
  );
}

/* --- Agregar campo a una plantilla --- */
function CampoFormDialog({ plantilla, onClose, onSaved }: { plantilla: PlantillaServicio; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [tipoCampo, setTipoCampo] = useState<TipoCampoServicio>('TEXTO');
  const [categoria, setCategoria] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [esRequerido, setEsRequerido] = useState(false);
  const [permiteOtro, setPermiteOtro] = useState(false);
  const [opcionesTxt, setOpcionesTxt] = useState('');
  const [subCampos, setSubCampos] = useState<SubCampoObjeto[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const usaOpciones = TIPOS_CAMPO_CON_OPCIONES.includes(tipoCampo);
  const esObjeto = tipoCampo === 'OBJETO';
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('Ingresa el nombre del campo'); return; }
    if (esObjeto && subCampos.filter(s => s.nombre.trim()).length === 0) { setError('Agrega al menos un sub-campo'); return; }
    let opciones: unknown;
    if (usaOpciones) opciones = opcionesTxt.split(',').map(s => s.trim()).filter(Boolean);
    else if (esObjeto) opciones = subCampos.filter(s => s.nombre.trim()).map(s => {
      const e: Record<string, unknown> = { nombre: s.nombre.trim(), tipo: s.tipo };
      if (s.tipo === 'OPCION_SIMPLES' && s.opciones?.length) e.opciones = s.opciones;
      return e;
    });
    const data: ConfiguracionCampoDto = {
      nombre: nombre.trim(), tipoCampo, categoria: categoria || null,
      placeholder: placeholder.trim() || null, esRequerido,
      permiteOtro: usaOpciones ? permiteOtro : false, opciones,
    };
    setSaving(true);
    try { await catalogoService.addCampoPlantilla(plantilla.id, data); onSaved(); }
    catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo agregar el campo');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Agregar campo</h3>
        <p className="text-[11px] text-gray-500">{plantilla.nombre}</p>
        <div className="mt-3 space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Nombre del campo *</label><input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Número de serie, IMEI..." autoFocus /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Tipo de campo</label>
            <select className={`${inputClass} bg-white`} value={tipoCampo} onChange={e => setTipoCampo(e.target.value as TipoCampoServicio)}>
              {TIPOS_CAMPO.map(t => <option key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Categoría (opcional)</label>
            <select className={`${inputClass} bg-white`} value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Sin categoría</option>
              {CATEGORIAS_CAMPO.map(c => <option key={c} value={c}>{CATEGORIA_CAMPO_LABEL[c]}</option>)}
            </select>
          </div>
          {usaOpciones && (
            <>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Opciones (separadas por coma)</label><input className={inputClass} value={opcionesTxt} onChange={e => setOpcionesTxt(e.target.value)} placeholder="Opción 1, Opción 2, Opción 3" /></div>
              <label className="flex items-center justify-between"><span className="text-xs font-medium text-gray-700">Permitir &quot;Otro&quot;</span><input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={permiteOtro} onChange={e => setPermiteOtro(e.target.checked)} /></label>
            </>
          )}
          <input className={inputClass} value={placeholder} onChange={e => setPlaceholder(e.target.value)} placeholder="Placeholder (opcional)" />
          <label className="flex items-center justify-between"><span className="text-xs font-medium text-gray-700">Campo requerido</span><input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={esRequerido} onChange={e => setEsRequerido(e.target.checked)} /></label>

          {esObjeto && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Sub-campos</span>
                <button type="button" onClick={() => setSubCampos([...subCampos, { nombre: '', tipo: 'TEXTO' }])} className="text-[11px] font-semibold text-[#437EFF] hover:underline">+ Agregar</button>
              </div>
              {subCampos.length === 0 && <p className="text-[11px] text-gray-400">Agrega sub-campos con el botón +.</p>}
              <div className="space-y-2">
                {subCampos.map((sub, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <input className={`${inputClass} flex-1`} value={sub.nombre} placeholder="Nombre" onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, nombre: e.target.value } : s))} />
                      <select className={`${inputClass} w-28 bg-white`} value={sub.tipo} onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, tipo: e.target.value as SubCampoTipo, opciones: undefined } : s))}>
                        {(Object.keys(SUB_CAMPO_TIPO_LABEL) as SubCampoTipo[]).map(t => <option key={t} value={t}>{SUB_CAMPO_TIPO_LABEL[t]}</option>)}
                      </select>
                      <button type="button" onClick={() => setSubCampos(subCampos.filter((_, j) => j !== i))} className="px-1 text-red-400 hover:text-red-600">✕</button>
                    </div>
                    {sub.tipo === 'OPCION_SIMPLES' && (
                      <input className={`${inputClass} text-xs`} placeholder="Opciones separadas por coma" value={(sub.opciones ?? []).join(', ')} onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, opciones: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } : s))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">{saving ? 'Agregando...' : 'Agregar'}</button>
        </div>
      </div>
    </div>
  );
}

/* --- Catálogo de plantillas predefinidas --- */
function CatalogoDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [creando, setCreando] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [error, setError] = useState('');

  const usar = async (p: CatalogoPlantilla) => {
    setCreando(p.nombre); setError('');
    try {
      await catalogoService.crearPlantilla({ nombre: p.nombre, descripcion: p.descripcion, campos: p.campos });
      onCreated();
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo crear la plantilla');
      setCreando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Catálogo de plantillas</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600">✕</button>
        </div>
        {error && <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        <div className="space-y-2">
          {CATALOGO_PLANTILLAS.map(p => {
            const abierta = expandida === p.nombre;
            return (
              <div key={p.nombre} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#004A94]">{p.nombre}</p>
                    <p className="text-[11px] text-gray-500">{p.descripcion}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{p.campos.length} campos</p>
                  </div>
                  <button onClick={() => usar(p)} disabled={creando != null}
                    className="shrink-0 rounded-lg bg-[#004A94] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                    {creando === p.nombre ? 'Creando...' : 'Usar'}
                  </button>
                </div>
                <button onClick={() => setExpandida(abierta ? null : p.nombre)} className="mt-2 text-[11px] font-semibold text-[#437EFF] hover:underline">
                  {abierta ? 'Ocultar campos' : 'Ver campos incluidos'}
                </button>
                {abierta && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.campos.map((c, i) => (
                      <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                        {c.nombre} <span className="text-gray-400">· {TIPO_CAMPO_LABEL[c.tipoCampo as TipoCampoServicio] ?? c.tipoCampo}</span>{c.esRequerido ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
