'use client';

import { useState, useEffect } from 'react';
import type { ProductoVariante, ProductoAtributo, CreateVarianteDto } from '@/core/types/producto';

interface Props {
  isOpen: boolean;
  variante?: ProductoVariante | null;
  atributosDisponibles: ProductoAtributo[];
  productoIsActive: boolean;
  isSubmitting: boolean;
  onSave: (data: CreateVarianteDto) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function VarianteFormDialog({
  isOpen, variante, atributosDisponibles, productoIsActive, isSubmitting, onSave, onClose,
}: Props) {
  const isEditing = !!variante;

  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [peso, setPeso] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [atributos, setAtributos] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (variante) {
        setNombre(variante.nombre);
        setSku(variante.sku);
        setCodigoBarras(variante.codigoBarras || '');
        setPeso(variante.peso != null ? String(variante.peso) : '');
        setIsActive(variante.isActive);
        const attrMap: Record<string, string> = {};
        variante.atributosValores.forEach(av => { attrMap[av.atributoId] = av.valor; });
        setAtributos(attrMap);
      } else {
        setNombre('');
        setSku('');
        setCodigoBarras('');
        setPeso('');
        setIsActive(true);
        setAtributos({});
      }
      setErrors({});
    }
  }, [isOpen, variante]);

  const generateSku = () => {
    const prefix = nombre.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'VAR';
    const ts = String(Date.now()).slice(-4);
    setSku(`${prefix}-VAR-${ts}`);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!sku.trim()) newErrors.sku = 'El SKU es requerido';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const atributosEstructurados = Object.entries(atributos)
      .filter(([, valor]) => valor.trim())
      .map(([atributoId, valor]) => ({ atributoId, valor: valor.trim() }));

    const data: CreateVarianteDto = {
      nombre: nombre.trim(),
      sku: sku.trim(),
      ...(codigoBarras.trim() && { codigoBarras: codigoBarras.trim() }),
      ...(peso && { peso: parseFloat(peso) }),
      isActive,
      ...(atributosEstructurados.length > 0 && { atributosEstructurados }),
    };
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">
          {isEditing ? 'Editar Variante' : 'Nueva Variante'}
        </h3>

        <div className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rojo - Talla M" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* SKU */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
            <div className="flex gap-2">
              <input className={`${inputClass} flex-1`} value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-VAR-001" />
              <button onClick={generateSku} type="button" className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50" title="Auto-generar SKU">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
          </div>

          {/* Código de Barras y Peso */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Código de Barras</label>
              <input className={inputClass} value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} placeholder="7750000000000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Peso (kg)</label>
              <input className={inputClass} type="number" step="0.001" value={peso} onChange={e => setPeso(e.target.value)} placeholder="0.000" />
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Estado activo</label>
            <button
              type="button"
              onClick={() => productoIsActive && setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-[#437EFF]' : 'bg-gray-300'} ${!productoIsActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {!productoIsActive && (
            <p className="text-xs text-amber-600">No se puede activar porque el producto padre está inactivo.</p>
          )}

          {/* Atributos */}
          {atributosDisponibles.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">Atributos</label>
              <div className="space-y-3">
                {atributosDisponibles.map(attr => (
                  <div key={attr.id}>
                    <label className="mb-1 block text-xs text-gray-500">{attr.nombre}{attr.unidad ? ` (${attr.unidad})` : ''}</label>
                    {attr.valores.length > 0 ? (
                      <select
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white"
                        value={atributos[attr.id] || ''}
                        onChange={e => setAtributos(prev => ({ ...prev, [attr.id]: e.target.value }))}
                      >
                        <option value="">Seleccionar</option>
                        {attr.valores.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input
                        className={inputClass}
                        value={atributos[attr.id] || ''}
                        onChange={e => setAtributos(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        placeholder={`Valor de ${attr.nombre}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> El precio se hereda del producto base. El stock se configura desde inventario.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Variante'}
          </button>
        </div>
      </div>
    </div>
  );
}
