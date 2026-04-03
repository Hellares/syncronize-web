'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProductoForm } from '../hooks/use-producto-form';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Producto, AtributoPlantilla } from '@/core/types/producto';
import type { ConfiguracionPrecio } from '@/core/types/precio';
import type { CatalogoItem, UnidadMedida } from '@/features/catalogo/services/catalogo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import * as varianteService from '../services/variante-service';
import * as configPrecioService from '../services/configuracion-precio-service';
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
  const [plantillas, setPlantillas] = useState<AtributoPlantilla[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>('');
  const [configsPrecio, setConfigsPrecio] = useState<ConfiguracionPrecio[]>([]);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  const selectedPlantilla = plantillas.find(p => p.id === selectedPlantillaId) ?? null;

  useEffect(() => {
    let failed = false;
    Promise.all([
      catalogoService.getCategorias().then(setCategorias),
      catalogoService.getMarcas().then(setMarcas),
      catalogoService.getUnidadesMedida().then(setUnidades),
      varianteService.getPlantillas().then(data => setPlantillas(data.filter(p => p.isActive))),
      configPrecioService.getConfiguraciones().then(data => setConfigsPrecio(data.filter(c => c.isActive))),
    ]).catch(() => {
      if (!failed) { failed = true; setCatalogoError('Error al cargar catálogos. Los dropdowns pueden estar vacíos.'); }
    });
  }, []);

  // Auto-detect plantilla when editing a product with existing attributes
  useEffect(() => {
    if (!producto?.atributosValores?.length || plantillas.length === 0 || selectedPlantillaId) return;
    const attrIds = new Set(producto.atributosValores.map(av => av.atributoId));
    const match = plantillas.find(p =>
      p.atributos.length > 0 && p.atributos.every(pa => attrIds.has(pa.atributoId))
    );
    if (match) {
      setSelectedPlantillaId(match.id);
    }
  }, [producto, plantillas, selectedPlantillaId]);

  const handlePlantillaChange = (plantillaId: string) => {
    setSelectedPlantillaId(plantillaId);
    if (!plantillaId) {
      updateField('atributos', {});
      return;
    }
    const plantilla = plantillas.find(p => p.id === plantillaId);
    if (plantilla) {
      const newAttrs: Record<string, string> = {};
      for (const pa of plantilla.atributos) {
        // Keep existing value if available, otherwise empty
        newAttrs[pa.atributoId] = form.atributos[pa.atributoId] || '';
      }
      updateField('atributos', newAttrs);
    }
  };

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
        {isEditing && form.tieneVariantes && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs text-blue-700">Las variantes se gestionan desde el <strong>detalle del producto</strong>.</p>
          </div>
        )}
        {isEditing && form.esCombo && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <p className="text-xs text-purple-700">Los componentes del combo se gestionan desde el <strong>detalle del producto</strong>.</p>
          </div>
        )}
      </Section>

      {/* Dimensiones */}
      <Section title="Dimensiones (cm)" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Largo">
            <input className={inputClass} type="number" step="0.1" value={form.dimensiones?.largo ?? ''} onChange={(e) => updateField('dimensiones', { ...(form.dimensiones || {}), largo: e.target.value ? parseFloat(e.target.value) : 0 })} placeholder="0.0" />
          </Field>
          <Field label="Ancho">
            <input className={inputClass} type="number" step="0.1" value={form.dimensiones?.ancho ?? ''} onChange={(e) => updateField('dimensiones', { ...(form.dimensiones || {}), ancho: e.target.value ? parseFloat(e.target.value) : 0 })} placeholder="0.0" />
          </Field>
          <Field label="Alto">
            <input className={inputClass} type="number" step="0.1" value={form.dimensiones?.alto ?? ''} onChange={(e) => updateField('dimensiones', { ...(form.dimensiones || {}), alto: e.target.value ? parseFloat(e.target.value) : 0 })} placeholder="0.0" />
          </Field>
        </div>
      </Section>

      {/* Atributos (via Plantilla) */}
      {!form.tieneVariantes && !form.esCombo && plantillas.length > 0 && (
        <Section title="Atributos" defaultOpen={isEditing && Object.keys(form.atributos).length > 0}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Plantilla de Atributos</label>
            <select className={selectClass} value={selectedPlantillaId} onChange={e => handlePlantillaChange(e.target.value)}>
              <option value="">Ninguna (sin plantilla)</option>
              {plantillas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icono ? `${p.icono} ` : ''}{p.nombre} ({p.atributos.length} atributos)
                </option>
              ))}
            </select>
          </div>

          {selectedPlantilla && (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5">
                <p className="text-xs text-blue-700">
                  <strong>{selectedPlantilla.atributos.length}</strong> atributos
                  {selectedPlantilla.atributos.filter(pa => pa.requeridoOverride ?? pa.atributo.requerido).length > 0 &&
                    <> — <strong>{selectedPlantilla.atributos.filter(pa => pa.requeridoOverride ?? pa.atributo.requerido).length}</strong> requeridos</>
                  }
                  . Complete los valores para guardar.
                </p>
              </div>

              <div className="space-y-3">
                {selectedPlantilla.atributos
                  .sort((a, b) => a.orden - b.orden)
                  .map(pa => {
                    const attr = pa.atributo;
                    const valores = pa.valoresOverride?.length ? pa.valoresOverride : attr.valores;
                    const esRequerido = pa.requeridoOverride ?? attr.requerido;

                    return (
                      <div key={pa.atributoId}>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          {attr.nombre}
                          {attr.unidad ? ` (${attr.unidad})` : ''}
                          {esRequerido && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {valores && valores.length > 0 ? (
                          <select
                            className={selectClass}
                            value={form.atributos[pa.atributoId] || ''}
                            onChange={(e) => updateField('atributos', { ...form.atributos, [pa.atributoId]: e.target.value })}
                          >
                            <option value="">Seleccionar</option>
                            {valores.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : attr.tipo === 'BOOLEAN' ? (
                          <select
                            className={selectClass}
                            value={form.atributos[pa.atributoId] || ''}
                            onChange={(e) => updateField('atributos', { ...form.atributos, [pa.atributoId]: e.target.value })}
                          >
                            <option value="">Seleccionar</option>
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        ) : attr.tipo === 'NUMERO' ? (
                          <input
                            className={inputClass}
                            type="number"
                            step="any"
                            value={form.atributos[pa.atributoId] || ''}
                            onChange={(e) => updateField('atributos', { ...form.atributos, [pa.atributoId]: e.target.value })}
                            placeholder={`Valor de ${attr.nombre}`}
                          />
                        ) : (
                          <input
                            className={inputClass}
                            value={form.atributos[pa.atributoId] || ''}
                            onChange={(e) => updateField('atributos', { ...form.atributos, [pa.atributoId]: e.target.value })}
                            placeholder={`Valor de ${attr.nombre}`}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </Section>
      )}

      {/* Configuración de Precio por Volumen */}
      {!form.tieneVariantes && !form.esCombo && configsPrecio.length > 0 && (
        <Section title="Precio por Volumen" defaultOpen={!!form.configuracionPrecioId}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Configuración de Precio</label>
            <select
              className={selectClass}
              value={form.configuracionPrecioId}
              onChange={e => updateField('configuracionPrecioId', e.target.value)}
            >
              <option value="">Sin configuración</option>
              {configsPrecio.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.niveles.length} niveles)</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400">Al asignar una configuración, se crearán niveles de precio automáticamente.</p>
          </div>

          {/* Preview de niveles */}
          {form.configuracionPrecioId && (() => {
            const selected = configsPrecio.find(c => c.id === form.configuracionPrecioId);
            if (!selected || selected.niveles.length === 0) return null;
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-[10px] font-medium uppercase text-gray-400 mb-2">Vista previa de niveles</p>
                <div className="space-y-1">
                  {selected.niveles.sort((a, b) => a.orden - b.orden).map((n, i) => (
                    <div key={n.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#437EFF] text-[9px] font-bold text-white">{i + 1}</span>
                      <span className="font-medium text-gray-700">{n.nombre}</span>
                      <span className="text-gray-400">
                        {n.cantidadMinima}{n.cantidadMaxima ? `-${n.cantidadMaxima}` : '+'} unid.
                      </span>
                      <span className="text-green-600 font-medium">
                        {n.porcentajeDesc != null ? `${n.porcentajeDesc}% desc.` : 'Precio fijo'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </Section>
      )}

      {/* Impuestos y Marketplace */}
      <Section title="Impuestos y Marketplace" defaultOpen={false}>
        {/* Tipo Afectación IGV */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de Afectación IGV (SUNAT)</label>
          <div className="grid grid-cols-3 gap-2">
            {(['GRAVADO', 'EXONERADO', 'INAFECTO'] as const).map(tipo => (
              <button key={tipo} type="button" onClick={() => { updateField('tipoAfectacionIgv', tipo); if (tipo !== 'GRAVADO') updateField('impuestoPorcentaje', ''); }}
                className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${form.tipoAfectacionIgv === tipo ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {tipo === 'GRAVADO' ? 'Gravado' : tipo === 'EXONERADO' ? 'Exonerado' : 'Inafecto'}
              </button>
            ))}
          </div>
          {form.tipoAfectacionIgv !== 'GRAVADO' && (
            <p className="mt-1 text-[10px] text-amber-600">
              {form.tipoAfectacionIgv === 'EXONERADO' ? 'Producto exonerado de IGV. No se cobrará impuesto.' : 'Producto inafecto al IGV. No está sujeto al impuesto.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="IGV % (personalizado)">
            <input className={inputClass} type="number" step="0.01" value={form.impuestoPorcentaje}
              onChange={(e) => updateField('impuestoPorcentaje', e.target.value)}
              placeholder={form.tipoAfectacionIgv === 'GRAVADO' ? 'Usa IGV global' : '0'}
              disabled={form.tipoAfectacionIgv !== 'GRAVADO'} />
          </Field>
          <Field label="Descuento Máximo %">
            <input className={inputClass} type="number" step="0.01" value={form.descuentoMaximo} onChange={(e) => updateField('descuentoMaximo', e.target.value)} />
          </Field>
        </div>

        {/* ICBPER */}
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={form.aplicaIcbper || false} onChange={(e) => updateField('aplicaIcbper', e.target.checked)}
            className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
          <span>Aplica ICBPER (bolsa plástica) — S/ 0.50/unidad</span>
        </label>
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
