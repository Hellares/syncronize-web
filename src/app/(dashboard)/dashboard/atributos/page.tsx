'use client';

import { useState, useEffect } from 'react';
import { useAtributos } from '@/features/producto/hooks/use-atributos';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { ProductoAtributo, AtributoTipo, CreateProductoAtributoDto } from '@/core/types/producto';

// --- Tipo config: icono, color, label ---

const TIPO_CONFIG: Record<AtributoTipo, { label: string; icon: string; color: string }> = {
  COLOR:        { label: 'Color',           icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'bg-pink-100 text-pink-700' },
  TALLA:        { label: 'Talla',           icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4', color: 'bg-blue-100 text-blue-700' },
  MATERIAL:     { label: 'Material',        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'bg-amber-100 text-amber-700' },
  CAPACIDAD:    { label: 'Capacidad',       icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color: 'bg-cyan-100 text-cyan-700' },
  SELECT:       { label: 'Selección',       icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'bg-indigo-100 text-indigo-700' },
  MULTI_SELECT: { label: 'Multi-Selección', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'bg-violet-100 text-violet-700' },
  BOOLEAN:      { label: 'Sí/No',           icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-green-100 text-green-700' },
  NUMERO:       { label: 'Número',          icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14', color: 'bg-orange-100 text-orange-700' },
  TEXTO:        { label: 'Texto',           icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'bg-gray-100 text-gray-600' },
};

// Tipos que REQUIEREN valores predefinidos
const TIPOS_REQUIEREN_VALORES: AtributoTipo[] = ['SELECT', 'MULTI_SELECT'];
// Tipos que PROHÍBEN valores predefinidos
const TIPOS_PROHIBEN_VALORES: AtributoTipo[] = ['TEXTO', 'NUMERO', 'BOOLEAN'];

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

// --- Form Dialog ---

function AtributoFormDialog({ isOpen, atributo, isSubmitting, onSave, onClose }: {
  isOpen: boolean;
  atributo?: ProductoAtributo | null;
  isSubmitting: boolean;
  onSave: (data: CreateProductoAtributoDto) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [tipo, setTipo] = useState<AtributoTipo>('SELECT');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('');
  const [requerido, setRequerido] = useState(false);
  const [mostrarEnListado, setMostrarEnListado] = useState(true);
  const [usarParaFiltros, setUsarParaFiltros] = useState(true);
  const [mostrarEnMarketplace, setMostrarEnMarketplace] = useState(true);
  const [valoresText, setValoresText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (atributo) {
        setNombre(atributo.nombre);
        setClave(atributo.clave);
        setTipo(atributo.tipo);
        setDescripcion(atributo.descripcion || '');
        setUnidad(atributo.unidad || '');
        setRequerido(atributo.requerido || false);
        setValoresText(atributo.valores?.join(', ') || '');
        // These fields may not be in the current type, use defaults
        setMostrarEnListado(true);
        setUsarParaFiltros(true);
        setMostrarEnMarketplace(true);
      } else {
        setNombre(''); setClave(''); setTipo('SELECT'); setDescripcion('');
        setUnidad(''); setRequerido(false); setValoresText('');
        setMostrarEnListado(true); setUsarParaFiltros(true); setMostrarEnMarketplace(true);
      }
      setErrors({});
    }
  }, [isOpen, atributo]);

  const generarClave = (v: string) => {
    return v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'atributo';
  };

  const handleNombreChange = (v: string) => {
    setNombre(v);
    if (!atributo) setClave(generarClave(v));
  };

  const handleTipoChange = (nuevoTipo: AtributoTipo) => {
    setTipo(nuevoTipo);
    // Limpiar valores si el tipo los prohíbe
    if (TIPOS_PROHIBEN_VALORES.includes(nuevoTipo)) {
      setValoresText('');
    }
  };

  const parseValores = (): string[] => {
    return valoresText.split(',').map(v => v.trim()).filter(v => v.length > 0);
  };

  const requiereValores = TIPOS_REQUIEREN_VALORES.includes(tipo);
  const prohibeValores = TIPOS_PROHIBEN_VALORES.includes(tipo);

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!clave.trim()) errs.clave = 'La clave es requerida';

    const valores = parseValores();

    // Validación por tipo
    if (requiereValores && valores.length === 0) {
      errs.valores = `El tipo ${TIPO_CONFIG[tipo].label} requiere al menos un valor predefinido`;
    }
    if (prohibeValores && valores.length > 0) {
      errs.valores = `El tipo ${TIPO_CONFIG[tipo].label} no permite valores predefinidos`;
    }

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    onSave({
      nombre: nombre.trim(),
      clave: clave.trim(),
      tipo,
      ...(descripcion.trim() && { descripcion: descripcion.trim() }),
      ...(!prohibeValores && valores.length > 0 && { valores }),
      ...(unidad.trim() && { unidad: unidad.trim() }),
      requerido,
      mostrarEnListado,
      usarParaFiltros,
      mostrarEnMarketplace,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{atributo ? 'Editar Atributo' : 'Nuevo Atributo'}</h3>

        <div className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => handleNombreChange(e.target.value)} placeholder="Ej: Color, Talla, Material" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* Clave + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Clave *</label>
              <input className={inputClass} value={clave} onChange={e => setClave(e.target.value)} placeholder="color" />
              <p className="mt-0.5 text-[10px] text-gray-400">Identificador único, se genera automáticamente</p>
              {errors.clave && <p className="mt-1 text-xs text-red-500">{errors.clave}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo *</label>
              <select className={selectClass} value={tipo} onChange={e => handleTipoChange(e.target.value as AtributoTipo)}>
                {Object.entries(TIPO_CONFIG).map(([value, cfg]) => (
                  <option key={value} value={value}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
            <textarea className={`${inputClass} min-h-[60px]`} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción opcional del atributo" />
          </div>

          {/* Unidad (solo para tipos que la usen) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Unidad</label>
            <input className={inputClass} value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="Ej: GB, cm, MHz, kg" />
          </div>

          {/* Valores (solo si el tipo no los prohíbe) */}
          {!prohibeValores && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Valores Predefinidos {requiereValores && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className={`${inputClass} min-h-[60px]`}
                value={valoresText}
                onChange={e => setValoresText(e.target.value)}
                placeholder="Separa los valores con comas. Ej: Rojo, Azul, Verde, Negro"
              />
              {parseValores().length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {parseValores().map(v => (
                    <span key={v} className="rounded-full bg-[#437EFF]/10 px-2 py-0.5 text-[11px] font-medium text-[#437EFF]">{v}</span>
                  ))}
                </div>
              )}
              {errors.valores && <p className="mt-1 text-xs text-red-500">{errors.valores}</p>}
            </div>
          )}

          {prohibeValores && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
              <p className="text-xs text-gray-500">El tipo <strong>{TIPO_CONFIG[tipo].label}</strong> no usa valores predefinidos. El valor se ingresa directamente al asignar.</p>
            </div>
          )}

          {/* Checkboxes de configuración */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Configuración</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requerido} onChange={e => setRequerido(e.target.checked)} className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Requerido al crear variantes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mostrarEnListado} onChange={e => setMostrarEnListado(e.target.checked)} className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Mostrar en listado de productos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={usarParaFiltros} onChange={e => setUsarParaFiltros(e.target.checked)} className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Usar para filtros de búsqueda
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mostrarEnMarketplace} onChange={e => setMostrarEnMarketplace(e.target.checked)} className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Mostrar en marketplace
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : atributo ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Attribute Card (expandible) ---

function AtributoCard({ attr, canManage, onEdit, onDelete }: {
  attr: ProductoAtributo;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TIPO_CONFIG[attr.tipo] || TIPO_CONFIG.TEXTO;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header (always visible) */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icono tipo */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
          </svg>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">{attr.nombre}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
            {attr.requerido && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Requerido</span>}
            {!attr.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Inactivo</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Clave: <span className="font-mono">{attr.clave}</span>
            {attr.unidad && <> | Unidad: {attr.unidad}</>}
            {attr.valores.length > 0 && <> | {attr.valores.length} valores</>}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <button onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]" title="Editar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
          {/* Descripción */}
          {attr.descripcion && (
            <div>
              <p className="text-[10px] font-medium uppercase text-gray-400 mb-0.5">Descripción</p>
              <p className="text-xs text-gray-600">{attr.descripcion}</p>
            </div>
          )}

          {/* Valores */}
          {attr.valores.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase text-gray-400 mb-1">Valores ({attr.valores.length})</p>
              <div className="flex flex-wrap gap-1">
                {attr.valores.map(v => (
                  <span key={v} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${attr.requerido ? 'bg-green-500' : 'bg-gray-300'}`} />
              Requerido
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En listado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En filtros
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En marketplace
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Page ---

export default function AtributosPage() {
  const { atributos, isLoading, isSubmitting, error, success, clearMessages, create, update, remove } = useAtributos();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductoAtributo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductoAtributo | null>(null);

  useEffect(() => { if (success) { const t = setTimeout(clearMessages, 4000); return () => clearTimeout(t); } }, [success, clearMessages]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Atributos de Producto</h1>
          <p className="text-sm text-gray-500">Define atributos para crear variantes (color, talla, material, etc.)</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nuevo Atributo
          </button>
        )}
      </div>

      {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5"><p className="text-sm text-green-700">{success}</p></div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : atributos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No hay atributos</p>
          <p className="mt-1 max-w-sm text-xs text-gray-400">
            Los atributos te permiten definir características como color, talla o material. Se usan para crear variantes y filtrar productos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {atributos.map(attr => (
            <AtributoCard
              key={attr.id}
              attr={attr}
              canManage={canManage}
              onEdit={() => { setEditing(attr); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(attr)}
            />
          ))}
        </div>
      )}

      <AtributoFormDialog
        isOpen={formOpen}
        atributo={editing}
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
            <h3 className="text-lg font-bold text-gray-900">Eliminar Atributo</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar <strong>{deleteTarget.nombre}</strong>? Si está en uso en plantillas activas, no se podrá eliminar.
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
