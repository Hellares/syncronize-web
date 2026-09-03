'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProductoForm } from '../hooks/use-producto-form';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Producto, AtributoPlantilla, PlantillaAtributo } from '@/core/types/producto';
import type { ConfiguracionPrecio } from '@/core/types/precio';
import type { CatalogoItem, UnidadMedida } from '@/features/catalogo/services/catalogo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import * as varianteService from '../services/variante-service';
import * as configPrecioService from '../services/configuracion-precio-service';
import ImageUploader from './ImageUploader';
import CodigoProductoSunatSelector from './CodigoProductoSunatSelector';
import PrecioNivelSection from './precios/PrecioNivelSection';
import { presentacionPlana } from '@/core/utils/unidad-presentacion';

interface Props {
  empresaId: string;
  producto?: Producto | null;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    // 🔴 Ring azul y no `border border-gray-200`: ese gris sobre el fondo
    // #f5f7fa del dashboard no se ve (lo mismo que `ui/Card.tsx`). La cabecera
    // usa la banda `#eaf2fd`/`#cfe0f5`, la misma de la tabla de productos.
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-[#eaf2fd] px-5 py-2.5 text-left transition-colors hover:bg-[#dfeafb]"
      >
        <span className="text-[13px] font-medium text-[#004A94]">{title}</span>
        <svg className={`h-4 w-4 text-[#7ea6d8] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-[#cfe0f5] px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de `CotizacionForm` y los dialogos de stock. El `border-gray-200` de
// antes casi no se veia. El ring va BAKED: el error de este formulario es un
// banner y un texto bajo el campo, no un cambio de color del borde.
const inputClass = "w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200";
// Un textarea no lleva alto fijo.
const textareaClass = "w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200";
const selectClass = inputClass;

export default function ProductoForm({ empresaId, producto }: Props) {
  const { form, updateField, isSubmitting, error, errors, handleSubmit, isEditing } = useProductoForm(empresaId, producto);
  const { sedes } = useEmpresa();

  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [plantillas, setPlantillas] = useState<AtributoPlantilla[]>([]);
  const [plantillasSeleccionadas, setPlantillasSeleccionadas] = useState<string[]>([]);
  const [configsPrecio, setConfigsPrecio] = useState<ConfiguracionPrecio[]>([]);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  // Las plantillas elegidas, en el orden en que se agregaron, y las que
  // todavia se pueden agregar.
  const plantillasElegidas = plantillasSeleccionadas
    .map(id => plantillas.find(p => p.id === id))
    .filter((p): p is AtributoPlantilla => !!p);
  const plantillasDisponibles = plantillas.filter(p => !plantillasSeleccionadas.includes(p.id));

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

  // Al editar, se marcan TODAS las plantillas que el producto ya cumple, no
  // solo la primera: un producto puede traer atributos de varias.
  useEffect(() => {
    if (!producto?.atributosValores?.length || plantillas.length === 0 || plantillasSeleccionadas.length) return;
    const attrIds = new Set(producto.atributosValores.map(av => av.atributoId));
    const coinciden = plantillas.filter(p =>
      p.atributos.length > 0 && p.atributos.every(pa => attrIds.has(pa.atributoId))
    );
    if (coinciden.length) {
      setPlantillasSeleccionadas(coinciden.map(p => p.id));
    }
  }, [producto, plantillas, plantillasSeleccionadas.length]);

  // Todos los atributos de las plantillas elegidas, sin repetir: un
  // dependiente puede colgar de uno que vive en OTRA plantilla.
  const atributosEnJuego = (() => {
    const mapa = new Map<string, PlantillaAtributo['atributo']>();
    for (const p of plantillasElegidas) {
      for (const pa of p.atributos) if (!mapa.has(pa.atributoId)) mapa.set(pa.atributoId, pa.atributo);
    }
    return mapa;
  })();

  /**
   * Los valores que este atributo puede ofrecer AHORA.
   *
   * 🔴 `atributo.valores` es un espejo PLANO de las opciones: en un
   * dependiente trae todas las ramas mezcladas (los procesadores de todas las
   * marcas). La jerarquia vive en `opciones[].padreValor`, asi que un
   * dependiente solo ofrece las opciones que cuelgan del valor elegido en su
   * padre. Sin padre elegido no ofrece nada y se bloquea.
   */
  const opcionesDe = (pa: PlantillaAtributo) => {
    const attr = pa.atributo;
    const override = pa.valoresOverride?.length ? pa.valoresOverride : null;

    if (attr.dependeDeAtributoId && attr.opciones?.length) {
      const padre = atributosEnJuego.get(attr.dependeDeAtributoId);
      const valorPadre = form.atributos[attr.dependeDeAtributoId] || '';
      if (!valorPadre) {
        return { valores: [] as string[], esperandoA: padre?.nombre ?? 'el atributo del que depende' };
      }
      let valores = attr.opciones.filter(o => o.padreValor === valorPadre).map(o => o.valor);
      // Un override de plantilla es una lista plana: no puede expresar la
      // jerarquia, asi que RESTRINGE lo ya filtrado en vez de reemplazarlo.
      if (override) valores = valores.filter(v => override.includes(v));
      return { valores, esperandoA: null as string | null };
    }

    return { valores: override ?? attr.valores ?? [], esperandoA: null as string | null };
  };

  /**
   * Escribe un valor y limpia EN CADENA los descendientes que dejaron de
   * colgar de el: elegido QUALCOMM despues de SAMSUNG, "Exynos" no puede
   * quedar seleccionado, ni el modelo que colgaba de Exynos.
   */
  const setValorAtributo = (atributoId: string, valor: string) => {
    const next = { ...form.atributos, [atributoId]: valor };
    const visitados = new Set<string>();
    const limpiarHijos = (padreId: string) => {
      if (visitados.has(padreId)) return;
      visitados.add(padreId);
      for (const [hijoId, hijo] of atributosEnJuego) {
        if (hijo.dependeDeAtributoId !== padreId) continue;
        const actual = next[hijoId];
        if (!actual) continue;
        const sigueColgando = hijo.opciones?.some(o => o.valor === actual && o.padreValor === next[padreId]);
        if (!sigueColgando) {
          next[hijoId] = '';
          limpiarHijos(hijoId);
        }
      }
    };
    limpiarHijos(atributoId);
    updateField('atributos', next);
  };

  const agregarPlantilla = (plantillaId: string) => {
    if (!plantillaId || plantillasSeleccionadas.includes(plantillaId)) return;
    const plantilla = plantillas.find(p => p.id === plantillaId);
    if (!plantilla) return;
    setPlantillasSeleccionadas(prev => [...prev, plantillaId]);
    // Se siembran las claves que falten SIN pisar lo que ya estaba cargado.
    const next = { ...form.atributos };
    for (const pa of plantilla.atributos) {
      if (next[pa.atributoId] === undefined) next[pa.atributoId] = '';
    }
    updateField('atributos', next);
  };

  const quitarPlantilla = (plantillaId: string) => {
    const restantes = plantillasSeleccionadas.filter(id => id !== plantillaId);
    setPlantillasSeleccionadas(restantes);
    // 🔴 Un atributo puede estar en DOS plantillas: su valor solo se descarta
    // si ninguna de las que quedan lo pide.
    const siguenPedidos = new Set(
      restantes.flatMap(id => plantillas.find(p => p.id === id)?.atributos.map(pa => pa.atributoId) ?? []),
    );
    const next: Record<string, string> = {};
    for (const [attrId, valor] of Object.entries(form.atributos)) {
      if (siguenPedidos.has(attrId)) next[attrId] = valor;
    }
    updateField('atributos', next);
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

      {/* 🔴 Dos columnas: a la izquierda lo que DEFINE al producto
          --nombre, clasificacion, atributos, medidas--; a la derecha lo que
          decide DONDE y COMO se vende, que casi nunca se toca al editar.
          La proporcion es la MISMA del detalle del producto (2/3 + 1/3), para
          que las dos pantallas del mismo producto se lean igual.
          En `lg` hacia abajo vuelve a una sola columna. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
        {/* Info Básica */}
        <Section title="Información Básica">
          <Field label="Nombre *" error={errors.nombre}>
            <input className={inputClass} value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Nombre del producto" />
          </Field>
          <Field label="Descripción">
            <textarea className={`${textareaClass} min-h-[80px]`} value={form.descripcion} onChange={(e) => updateField('descripcion', e.target.value)} placeholder="Descripción del producto" />
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

        {/* Atributos (via Plantilla) */}
        {!form.tieneVariantes && !form.esCombo && plantillas.length > 0 && (
          <Section title="Atributos" defaultOpen={isEditing && Object.keys(form.atributos).length > 0}>
            {/* Se pueden aplicar VARIAS plantillas, como en el app. Lo que se
                guarda no cambia --pares atributo/valor planos--: la plantilla
                solo decide que campos se piden. */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Agregar plantilla</label>
              {plantillasDisponibles.length > 0 ? (
                <select className={selectClass} value="" onChange={e => agregarPlantilla(e.target.value)}>
                  <option value="">Elegí una plantilla</option>
                  {plantillasDisponibles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.icono ? `${p.icono} ` : ''}{p.nombre} ({p.atributos.length} atributos)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-gray-400">Ya aplicaste todas las plantillas disponibles.</p>
              )}
            </div>

            {plantillasElegidas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {plantillasElegidas.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded bg-[#eaf2fd] py-1 pl-2 pr-1 text-[11px] font-medium text-[#004A94] ring-1 ring-[#cfe0f5]"
                  >
                    {p.icono ? `${p.icono} ` : ''}{p.nombre}
                    {/* La "x" va DENTRO del chip y con su propio click: la
                        plantilla se quita desde ahi, no tocando el chip entero. */}
                    <button
                      type="button"
                      onClick={() => quitarPlantilla(p.id)}
                      title={`Quitar ${p.nombre}`}
                      className="rounded p-0.5 text-[#7ea6d8] transition-colors hover:bg-white hover:text-[#004A94]"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Una CARD por plantilla, con sus atributos en dos columnas: es
                lo que aprovecha el ancho sin mezclar campos de plantillas
                distintas en la misma grilla. */}
            {plantillasElegidas.map(plantilla => {
              const requeridos = plantilla.atributos.filter(pa => pa.requeridoOverride ?? pa.atributo.requerido).length;
              return (
                <div key={plantilla.id} className="rounded-lg bg-zinc-50 ring-1 ring-[#cfe0f5]">
                  <div className="flex items-center justify-between border-b border-[#cfe0f5] px-3 py-2">
                    <span className="text-[12px] font-medium text-[#004A94]">
                      {plantilla.icono ? `${plantilla.icono} ` : ''}{plantilla.nombre}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {plantilla.atributos.length} atributos{requeridos > 0 ? ` · ${requeridos} requeridos` : ''}
                    </span>
                  </div>
                  <div className="grid gap-3 p-3 sm:grid-cols-2">
                    {[...plantilla.atributos]
                      .sort((a, b) => a.orden - b.orden)
                      .map(pa => {
                        const attr = pa.atributo;
                        const { valores, esperandoA } = opcionesDe(pa);
                        const esRequerido = pa.requeridoOverride ?? attr.requerido;
                        const valor = form.atributos[pa.atributoId] || '';
                        const setValor = (v: string) => setValorAtributo(pa.atributoId, v);

                        return (
                          <div key={pa.atributoId}>
                            <label className="mb-1 block text-[11px] font-medium text-gray-600">
                              {attr.nombre}
                              {attr.unidad ? ` (${attr.unidad})` : ''}
                              {esRequerido && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {esperandoA ? (
                              <select className={`${selectClass} cursor-not-allowed opacity-60`} value="" disabled>
                                <option value="">Elegí primero {esperandoA}</option>
                              </select>
                            ) : valores && valores.length > 0 ? (
                              <select className={selectClass} value={valor} onChange={e => setValor(e.target.value)}>
                                <option value="">Seleccionar</option>
                                {valores.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            ) : attr.dependeDeAtributoId ? (
                              <select className={`${selectClass} cursor-not-allowed opacity-60`} value="" disabled>
                                <option value="">Sin opciones para esa combinación</option>
                              </select>
                            ) : attr.tipo === 'BOOLEAN' ? (
                              <select className={selectClass} value={valor} onChange={e => setValor(e.target.value)}>
                                <option value="">Seleccionar</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                              </select>
                            ) : attr.tipo === 'NUMERO' ? (
                              <input
                                className={inputClass}
                                type="number"
                                step="any"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                placeholder={`Valor de ${attr.nombre}`}
                              />
                            ) : (
                              <input
                                className={inputClass}
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                placeholder={`Valor de ${attr.nombre}`}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </Section>
        )}

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
        </div>

        <div className="space-y-4">
        {/* Tipo */}
        <Section title="Tipo de Producto" defaultOpen={false}>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.tieneVariantes} onChange={(e) => { updateField('tieneVariantes', e.target.checked); if (e.target.checked) updateField('esCombo', false); }}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Tiene Variantes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.esCombo}
                onChange={(e) => { updateField('esCombo', e.target.checked); if (e.target.checked) updateField('tieneVariantes', false); }}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Es Combo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.esInsumo}
                onChange={(e) => {
                  updateField('esInsumo', e.target.checked);
                  // Igual que Flutter: solo deshabilita marketplace/destacado, no restringe combo ni variantes
                  if (e.target.checked) { updateField('visibleMarketplace', false); updateField('destacado', false); }
                }}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Es Insumo (materia prima)
            </label>
        </div>
          {form.esInsumo && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs text-amber-700">Los insumos quedan <strong>ocultos del POS, marketplace y carrito</strong> — solo se usan como componentes en fabricación (BOM).</p>
            </div>
          )}
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

        {/* Imágenes */}
        <Section title="Imágenes" defaultOpen={isEditing}>
          <ImageUploader
            empresaId={empresaId}
            productoId={producto?.id}
            initialImages={producto?.archivos || []}
          />
        </Section>

        {/* Unidad de Compra (disponible para todos los productos, como Flutter) */}
        <Section title="Unidad de Compra" defaultOpen={!!form.unidadCompraId}>
            <p className="text-xs text-gray-500">
              Configúrala si tu proveedor te vende en una unidad distinta a la de venta (ej: compras <strong>PAQUETE</strong> y vendes <strong>BOLSA</strong>).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unidad de Compra (opcional)" error={errors.unidadCompraId}>
                <select className={selectClass} value={form.unidadCompraId}
                  onChange={(e) => { updateField('unidadCompraId', e.target.value); if (!e.target.value) updateField('factorCompra', ''); }}>
                  <option value="">Misma unidad de venta</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </Field>
              {form.unidadCompraId && (
                <Field label="Factor de conversión *" error={errors.factorCompra}>
                  <input className={inputClass} type="number" step="0.0001" min="0.0001" value={form.factorCompra}
                    onChange={(e) => updateField('factorCompra', e.target.value)} placeholder="Ej: 100" />
                </Field>
              )}
            </div>
            {form.unidadCompraId && form.factorCompra && parseFloat(form.factorCompra) > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5">
                <p className="text-xs text-blue-700">
                  1 <strong>{unidades.find(u => u.id === form.unidadCompraId)?.nombre || 'unidad de compra'}</strong> = {form.factorCompra} <strong>{unidades.find(u => u.id === form.unidadMedidaId)?.nombre || 'unidades de venta'}</strong>
                </p>
              </div>
            )}
        </Section>

        {/* Configuración de Precio por Volumen */}
        {!form.tieneVariantes && !form.esCombo && (configsPrecio.length > 0 || (isEditing && !!producto)) && (
          <Section title="Precio por Volumen" defaultOpen={!!form.configuracionPrecioId || isEditing}>
            {configsPrecio.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Configuración de Precio</label>
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
              <p className="mt-1 text-[10px] text-gray-400">Una configuración es una PLANTILLA: al asignarla se crean los niveles de abajo.</p>
            </div>
            )}

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

            {/* 🔴 Los niveles que el producto TIENE de verdad, con el mismo
                componente del detalle. Sin esto el formulario decia "Sin
                configuración" en un producto con niveles cargados a mano: son
                dos cosas distintas --la configuración es la plantilla que los
                crea, el nivel es el dato--. Se guardan solos, no con el botón
                de guardar del formulario. */}
            {isEditing && producto && (
              <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-[#cfe0f5]">
                <PrecioNivelSection
                  productoId={producto.id}
                  presentacion={presentacionPlana(producto)}
                  precioBase={producto.stocksPorSede?.find(st => st.precioConfigurado)?.precio ?? null}
                  precioCosto={producto.stocksPorSede?.find(st => st.precioConfigurado)?.precioCosto ?? null}
                />
              </div>
            )}
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

          {/* Código Producto SUNAT (catálogo 25) */}
          <CodigoProductoSunatSelector
            value={form.codigoProductoSunat}
            onChange={(codigo) => updateField('codigoProductoSunat', codigo)}
          />

          {/* ICBPER */}
          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" checked={form.aplicaIcbper || false} onChange={(e) => updateField('aplicaIcbper', e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            <span>Aplica ICBPER (bolsa plástica) — S/ 0.50/unidad</span>
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.visibleMarketplace} disabled={form.esInsumo}
                onChange={(e) => updateField('visibleMarketplace', e.target.checked)}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF] disabled:opacity-40" />
              <span className={form.esInsumo ? 'opacity-40' : ''}>Visible en Marketplace</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.destacado} disabled={form.esInsumo}
                onChange={(e) => updateField('destacado', e.target.checked)}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF] disabled:opacity-40" />
              <span className={form.esInsumo ? 'opacity-40' : ''}>Producto Destacado</span>
            </label>
        </div>
          {form.esInsumo && (
            <p className="text-[10px] text-gray-400">Los insumos no se muestran en el marketplace.</p>
          )}
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
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end pt-2">
        <Link href="/dashboard/productos" className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
        </button>
      </div>
    </div>
  );
}
