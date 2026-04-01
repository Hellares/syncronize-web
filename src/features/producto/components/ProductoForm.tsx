'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProductoForm } from '../hooks/use-producto-form';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Producto } from '@/core/types/producto';
import type { CatalogoItem, UnidadMedida } from '@/features/catalogo/services/catalogo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import ImageUploader from './ImageUploader';

interface Props {
  empresaId: string;
  producto?: Producto | null;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

export default function ProductoForm({ empresaId, producto }: Props) {
  const { form, updateField, isSubmitting, error, errors, handleSubmit, isEditing } = useProductoForm(empresaId, producto);
  const { sedes } = useEmpresa();

  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  useEffect(() => {
    let failed = false;
    Promise.all([
      catalogoService.getCategorias().then(setCategorias),
      catalogoService.getMarcas().then(setMarcas),
      catalogoService.getUnidadesMedida().then(setUnidades),
    ]).catch(() => {
      if (!failed) { failed = true; setCatalogoError('Error al cargar catálogos. Los dropdowns pueden estar vacíos.'); }
    });
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {catalogoError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-600">{catalogoError}</p>
        </div>
      )}

      {/* Info Básica */}
      <Section title="Información Básica">
        <Field label="Nombre *" error={errors.nombre}>
          <input className={inputClass} value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Nombre del producto" />
        </Field>
        <Field label="Descripción">
          <textarea className={`${inputClass} min-h-[80px]`} value={form.descripcion} onChange={(e) => updateField('descripcion', e.target.value)} placeholder="Descripción del producto" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU">
            <input className={inputClass} value={form.sku} onChange={(e) => updateField('sku', e.target.value)} placeholder="SKU-001" />
          </Field>
          <Field label="Código de Barras">
            <input className={inputClass} value={form.codigoBarras} onChange={(e) => updateField('codigoBarras', e.target.value)} placeholder="7750000000000" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Peso (kg)">
            <input className={inputClass} type="number" step="0.001" value={form.peso} onChange={(e) => updateField('peso', e.target.value)} placeholder="0.000" />
          </Field>
          <Field label="Video URL">
            <input className={inputClass} value={form.videoUrl} onChange={(e) => updateField('videoUrl', e.target.value)} placeholder="https://..." />
          </Field>
        </div>
      </Section>

      {/* Clasificación */}
      <Section title="Clasificación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Categoría">
            <select className={selectClass} value={form.empresaCategoriaId} onChange={(e) => updateField('empresaCategoriaId', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Marca">
            <select className={selectClass} value={form.empresaMarcaId} onChange={(e) => updateField('empresaMarcaId', e.target.value)}>
              <option value="">Sin marca</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Field>
          <Field label="Unidad de Medida">
            <select className={selectClass} value={form.unidadMedidaId} onChange={(e) => updateField('unidadMedidaId', e.target.value)}>
              <option value="">Seleccionar</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Tipo */}
      <Section title="Tipo de Producto" defaultOpen={false}>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.tieneVariantes} onChange={(e) => { updateField('tieneVariantes', e.target.checked); if (e.target.checked) updateField('esCombo', false); }}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Tiene Variantes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.esCombo} onChange={(e) => { updateField('esCombo', e.target.checked); if (e.target.checked) updateField('tieneVariantes', false); }}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Es Combo
          </label>
        </div>
        {form.esCombo && (
          <Field label="Tipo Precio Combo">
            <select className={selectClass} value={form.tipoPrecioCombo} onChange={(e) => updateField('tipoPrecioCombo', e.target.value)}>
              <option value="FIJO">Precio Fijo</option>
              <option value="CALCULADO">Calculado (suma componentes)</option>
              <option value="CALCULADO_CON_DESCUENTO">Calculado con descuento</option>
            </select>
          </Field>
        )}
      </Section>

      {/* Impuestos y Marketplace */}
      <Section title="Impuestos y Marketplace" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="IGV %">
            <input className={inputClass} type="number" step="0.01" value={form.impuestoPorcentaje} onChange={(e) => updateField('impuestoPorcentaje', e.target.value)} />
          </Field>
          <Field label="Descuento Máximo %">
            <input className={inputClass} type="number" step="0.01" value={form.descuentoMaximo} onChange={(e) => updateField('descuentoMaximo', e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.visibleMarketplace} onChange={(e) => updateField('visibleMarketplace', e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Visible en Marketplace
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.destacado} onChange={(e) => updateField('destacado', e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Producto Destacado
          </label>
        </div>
      </Section>

      {/* Sedes */}
      {!isEditing && (
        <Section title="Sedes" defaultOpen={false}>
          <p className="text-xs text-gray-500 mb-2">Selecciona las sedes donde estará disponible este producto</p>
          <div className="space-y-2">
            {sedes.filter((s) => s.isActive).map((sede) => (
              <label key={sede.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sedesIds.includes(sede.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.sedesIds, sede.id]
                      : form.sedesIds.filter((id) => id !== sede.id);
                    updateField('sedesIds', next);
                  }}
                  className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]"
                />
                {sede.nombre} {sede.esPrincipal && <span className="text-xs text-[#437EFF]">(Principal)</span>}
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Imágenes */}
      <Section title="Imágenes" defaultOpen={isEditing}>
        <ImageUploader
          empresaId={empresaId}
          productoId={producto?.id}
          initialImages={producto?.archivos || []}
        />
      </Section>

      {/* Submit */}
      <div className="flex gap-3 justify-end pt-2">
        <Link href="/dashboard/productos" className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
        </button>
      </div>
    </div>
  );
}
