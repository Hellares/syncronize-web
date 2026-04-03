'use client';

import { useState, useEffect } from 'react';
import { useConfiguracionesPrecio } from '@/features/producto/hooks/use-configuraciones-precio';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { ConfiguracionPrecio, CreateConfiguracionPrecioDto, TipoPrecioNivel } from '@/core/types/precio';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

const DEFAULT_NIVEL_NAMES = ['Precio Retail', 'Precio por Mayor', 'Precio Distribuidor'];

interface NivelForm {
  key: string;
  nombre: string;
  cantidadMinima: string;
  cantidadMaxima: string;
  tipoPrecio: TipoPrecioNivel;
  porcentajeDesc: string;
  descripcion: string;
}

function newNivel(index: number): NivelForm {
  return {
    key: `${Date.now()}-${index}`,
    nombre: DEFAULT_NIVEL_NAMES[index] || `Nivel ${index + 1}`,
    cantidadMinima: '',
    cantidadMaxima: '',
    tipoPrecio: 'PORCENTAJE_DESCUENTO',
    porcentajeDesc: '',
    descripcion: '',
  };
}

// --- Form Dialog ---

function ConfigFormDialog({ isOpen, config, isSubmitting, onSave, onClose }: {
  isOpen: boolean;
  config?: ConfiguracionPrecio | null;
  isSubmitting: boolean;
  onSave: (data: CreateConfiguracionPrecioDto) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [niveles, setNiveles] = useState<NivelForm[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (config) {
        setNombre(config.nombre);
        setDescripcion(config.descripcion || '');
        setNiveles(config.niveles.map((n, i) => ({
          key: `edit-${i}`,
          nombre: n.nombre,
          cantidadMinima: String(n.cantidadMinima),
          cantidadMaxima: n.cantidadMaxima != null ? String(n.cantidadMaxima) : '',
          tipoPrecio: n.tipoPrecio,
          porcentajeDesc: n.porcentajeDesc != null ? String(n.porcentajeDesc) : '',
          descripcion: '',
        })));
      } else {
        setNombre('');
        setDescripcion('');
        setNiveles([newNivel(0)]);
      }
      setErrors({});
    }
  }, [isOpen, config]);

  const addNivel = () => setNiveles([...niveles, newNivel(niveles.length)]);

  const removeNivel = (key: string) => setNiveles(niveles.filter(n => n.key !== key));

  const updateNivel = (key: string, field: keyof NivelForm, value: string) => {
    setNiveles(niveles.map(n => n.key === key ? { ...n, [field]: value } : n));
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'Requerido';
    if (niveles.length === 0) errs.niveles = 'Agrega al menos un nivel';

    for (let i = 0; i < niveles.length; i++) {
      const n = niveles[i];
      if (!n.nombre.trim()) errs[`nivel_${i}_nombre`] = 'Requerido';
      if (!n.cantidadMinima || parseInt(n.cantidadMinima) < 1) errs[`nivel_${i}_min`] = '>= 1';
      if (n.tipoPrecio === 'PORCENTAJE_DESCUENTO' && (!n.porcentajeDesc || parseFloat(n.porcentajeDesc) <= 0)) {
        errs[`nivel_${i}_desc`] = 'Requerido';
      }
    }

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    onSave({
      nombre: nombre.trim(),
      ...(descripcion.trim() && { descripcion: descripcion.trim() }),
      niveles: niveles.map((n, i) => ({
        nombre: n.nombre.trim(),
        cantidadMinima: parseInt(n.cantidadMinima),
        ...(n.cantidadMaxima && { cantidadMaxima: parseInt(n.cantidadMaxima) }),
        tipoPrecio: n.tipoPrecio,
        ...(n.tipoPrecio === 'PORCENTAJE_DESCUENTO' && n.porcentajeDesc && { porcentajeDesc: parseFloat(n.porcentajeDesc) }),
        ...(n.descripcion.trim() && { descripcion: n.descripcion.trim() }),
        orden: i,
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{config ? 'Editar Configuración' : 'Nueva Configuración de Precio'}</h3>

        <div className="mt-4 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
              <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Estándar 3 Niveles" />
              {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
              <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción opcional" />
            </div>
          </div>

          {/* Niveles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Niveles de Precio</label>
              <button onClick={addNivel} type="button" className="rounded-lg border border-[#437EFF] px-2.5 py-1 text-[11px] font-medium text-[#437EFF] hover:bg-[#437EFF]/5">
                + Agregar nivel
              </button>
            </div>
            {errors.niveles && <p className="text-xs text-red-500 mb-2">{errors.niveles}</p>}

            <div className="space-y-3">
              {niveles.map((n, i) => (
                <div key={n.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#437EFF] text-[10px] font-bold text-white">{i + 1}</span>
                      <span className="text-xs font-medium text-gray-700">Nivel {i + 1}</span>
                    </span>
                    {niveles.length > 1 && (
                      <button onClick={() => removeNivel(n.key)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500">Nombre *</label>
                      <input className={inputClass} value={n.nombre} onChange={e => updateNivel(n.key, 'nombre', e.target.value)} placeholder="Precio Retail" />
                      {errors[`nivel_${i}_nombre`] && <p className="text-[10px] text-red-500">{errors[`nivel_${i}_nombre`]}</p>}
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500">Cant. Mín *</label>
                      <input className={inputClass} type="number" min="1" value={n.cantidadMinima} onChange={e => updateNivel(n.key, 'cantidadMinima', e.target.value)} placeholder="1" />
                      {errors[`nivel_${i}_min`] && <p className="text-[10px] text-red-500">{errors[`nivel_${i}_min`]}</p>}
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500">Cant. Máx</label>
                      <input className={inputClass} type="number" min="1" value={n.cantidadMaxima} onChange={e => updateNivel(n.key, 'cantidadMaxima', e.target.value)} placeholder="Sin límite" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500">Tipo</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateNivel(n.key, 'tipoPrecio', 'PRECIO_FIJO')}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${n.tipoPrecio === 'PRECIO_FIJO' ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                          P. Fijo
                        </button>
                        <button type="button" onClick={() => updateNivel(n.key, 'tipoPrecio', 'PORCENTAJE_DESCUENTO')}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${n.tipoPrecio === 'PORCENTAJE_DESCUENTO' ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                          % Desc.
                        </button>
                      </div>
                    </div>
                    <div>
                      {n.tipoPrecio === 'PORCENTAJE_DESCUENTO' ? (
                        <>
                          <label className="mb-0.5 block text-[10px] text-gray-500">Descuento % *</label>
                          <input className={inputClass} type="number" step="0.1" min="0" max="100" value={n.porcentajeDesc} onChange={e => updateNivel(n.key, 'porcentajeDesc', e.target.value)} placeholder="10" />
                          {errors[`nivel_${i}_desc`] && <p className="text-[10px] text-red-500">{errors[`nivel_${i}_desc`]}</p>}
                        </>
                      ) : (
                        <>
                          <label className="mb-0.5 block text-[10px] text-gray-500">Precio</label>
                          <p className="text-xs text-gray-400 mt-1.5">Se define en el producto</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : config ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Page ---

export default function ConfiguracionesPrecioPage() {
  const { configs, isLoading, isSubmitting, error, success, create, update, remove } = useConfiguracionesPrecio();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfiguracionPrecio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfiguracionPrecio | null>(null);

  useEffect(() => { if (success) { const t = setTimeout(() => {}, 4000); return () => clearTimeout(t); } }, [success]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuraciones de Precio</h1>
          <p className="text-sm text-gray-500">Plantillas de niveles de precio por volumen reutilizables</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nueva Configuración
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{success}</p></div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No hay configuraciones de precio</p>
          <p className="mt-1 max-w-sm text-xs text-gray-400">Crea plantillas con niveles de precio por volumen para aplicarlas a múltiples productos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(config => (
            <div key={config.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{config.nombre}</h4>
                    <span className="rounded-full bg-[#437EFF]/10 px-2 py-0.5 text-[10px] font-medium text-[#437EFF]">
                      {config.niveles.length} niveles
                    </span>
                    {config.cantidadProductosUsando != null && config.cantidadProductosUsando > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
                        {config.cantidadProductosUsando} productos
                      </span>
                    )}
                  </div>
                  {config.descripcion && <p className="text-xs text-gray-500 mt-0.5">{config.descripcion}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(config); setFormOpen(true); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]" title="Editar">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteTarget(config)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
              {config.niveles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {config.niveles.sort((a, b) => a.orden - b.orden).map((n, i) => (
                    <div key={n.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#437EFF] text-[9px] font-bold text-white">{i + 1}</span>
                      <span className="font-medium text-gray-700 flex-1">{n.nombre}</span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
                        {n.cantidadMinima}{n.cantidadMaxima ? `-${n.cantidadMaxima}` : '+'} unid.
                      </span>
                      <span className={`font-medium ${n.porcentajeDesc != null ? 'text-green-600' : 'text-gray-500'}`}>
                        {n.porcentajeDesc != null ? `${n.porcentajeDesc}% desc.` : 'P. Fijo'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfigFormDialog
        isOpen={formOpen}
        config={editing}
        isSubmitting={isSubmitting}
        onSave={async (data) => {
          if (editing) await update(editing.id, data);
          else await create(data);
          setFormOpen(false); setEditing(null);
        }}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Eliminar Configuración</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar <strong>{deleteTarget.nombre}</strong>?
              {deleteTarget.cantidadProductosUsando != null && deleteTarget.cantidadProductosUsando > 0 &&
                ` Esta configuración está en uso por ${deleteTarget.cantidadProductosUsando} producto(s).`
              }
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button onClick={async () => { await remove(deleteTarget.id); setDeleteTarget(null); }} disabled={isSubmitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
