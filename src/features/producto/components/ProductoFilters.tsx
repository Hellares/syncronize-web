'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProductoFiltros, OrdenProducto } from '@/core/types/producto';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

// Tabs alineados con la app Flutter: TODOS (vendibles, sin insumos) / PRODUCTOS / COMBOS / LIQUIDACIÓN / INSUMOS
const TABS = [
  { label: 'Todos', key: 'todos' },
  { label: 'Productos', key: 'productos' },
  { label: 'Combos', key: 'combos' },
  { label: 'Liquidación', key: 'liquidacion' },
  { label: 'Insumos', key: 'insumos' },
] as const;

const ESTADO_CHIPS = [
  { label: 'Activos', value: true },
  { label: 'Inactivos', value: false },
  { label: 'Todos', value: undefined },
] as const;

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo del modulo de compras y de servicios/nueva.
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/**
 * Los cuatro desplegables de filtro, un escalón por debajo del estándar: 26 px
 * de alto y 10 px de fuente.
 *
 * Van más chicos que el buscador a propósito: el buscador es donde se escribe y
 * los filtros son de apoyo, así que la barra se lee mejor si no compiten. El
 * buscador se queda con el `INPUT_STD` de siempre.
 */
const SELECT_FILTRO =
  'bg-zinc-100 text-[#004A94] font-sans text-[10px] ring-1 ring-blue-400 outline-none transition-all duration-300 rounded-[6px] h-[26px] px-2.5 shadow-md focus:shadow-lg focus:shadow-blue-200';

const ORDEN_OPTIONS: { label: string; value: OrdenProducto }[] = [
  { label: 'Nombre A-Z', value: 'nombre_asc' },
  { label: 'Nombre Z-A', value: 'nombre_desc' },
  { label: 'Precio menor', value: 'precio_asc' },
  { label: 'Precio mayor', value: 'precio_desc' },
  { label: 'Stock menor', value: 'stock_asc' },
  { label: 'Stock mayor', value: 'stock_desc' },
  { label: 'Más recientes', value: 'recientes' },
  { label: 'Más antiguos', value: 'antiguos' },
];

interface Props {
  filtros: ProductoFiltros;
  onUpdate: (partial: Partial<ProductoFiltros>) => void;
  onReset: () => void;
}

export default function ProductoFilters({ filtros, onUpdate, onReset }: Props) {
  const { sedes } = useEmpresa();
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);

  const activeTab = filtros.esInsumo === true ? 'insumos'
    : filtros.enLiquidacion ? 'liquidacion'
    : filtros.soloCombos ? 'combos'
    : filtros.soloProductos ? 'productos'
    : 'todos';

  useEffect(() => {
    catalogoService.getCategorias().then(setCategorias).catch(() => {});
    catalogoService.getMarcas().then(setMarcas).catch(() => {});
  }, []);

  const handleTab = (tab: string) => {
    // Semántica idéntica a Flutter (productos_page.dart): todos los tabs envían esInsumo=false salvo INSUMOS
    const base = { soloProductos: false, soloCombos: false, enLiquidacion: undefined, esInsumo: false as boolean };
    if (tab === 'productos') onUpdate({ ...base, soloProductos: true });
    else if (tab === 'combos') onUpdate({ ...base, soloCombos: true });
    else if (tab === 'liquidacion') onUpdate({ ...base, enLiquidacion: true });
    else if (tab === 'insumos') onUpdate({ ...base, esInsumo: true });
    else onUpdate(base); // TODOS = vendibles (excluye insumos)
  };

  return (
    <div className="space-y-4">
      {/* Tabs y chips. El BUSCADOR ya no vive acá: se dibuja pegado a los
          controles de la tabla, que es donde se mira mientras se busca. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTab(tab.key)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#004A94] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Chips de estado */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {ESTADO_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => onUpdate({ isActive: chip.value })}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
                filtros.isActive === chip.value
                  ? 'bg-white text-[#004A94] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <select
          value={filtros.empresaCategoriaId || ''}
          onChange={(e) => onUpdate({ empresaCategoriaId: e.target.value || undefined })}
          className={SELECT_FILTRO}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.empresaMarcaId || ''}
          onChange={(e) => onUpdate({ empresaMarcaId: e.target.value || undefined })}
          className={SELECT_FILTRO}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.sedeId || ''}
          onChange={(e) => onUpdate({ sedeId: e.target.value || undefined })}
          className={SELECT_FILTRO}
        >
          <option value="">Todas las sedes</option>
          {sedes.filter((s) => s.isActive).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.orden || ''}
          onChange={(e) => onUpdate({ orden: (e.target.value || undefined) as OrdenProducto | undefined })}
          className={SELECT_FILTRO}
        >
          <option value="">Ordenar por...</option>
          {ORDEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>


        <button
          onClick={onReset}
          className="h-[26px] rounded-lg px-2 text-[10px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}

/**
 * Los cuatro atajos de siempre --oferta, stock bajo, destacados,
 * marketplace-- que se dibujan en la CABECERA, al lado del conteo.
 *
 * Estaban al final de la barra de filtros, detrás de cinco desplegables: son
 * los que más se tocan y quedaban en el peor lugar. Viven en este archivo
 * porque sus claves son las mismas de `ProductoFiltros` y conviene que se
 * cambien de a una sola vez.
 */
export function TogglesRapidos({
  filtros,
  onUpdate,
}: {
  filtros: ProductoFiltros;
  onUpdate: (partial: Partial<ProductoFiltros>) => void;
}) {
  return (
    <>
      {([
        { label: '🏷 En oferta', key: 'enOferta' },
        { label: '⚠ Stock bajo', key: 'stockBajo' },
        { label: '★ Destacados', key: 'destacado' },
        { label: '🛒 Marketplace', key: 'visibleMarketplace' },
      ] as const).map((t) => {
        const active = filtros[t.key] === true;
        return (
          <button
            key={t.key}
            onClick={() => onUpdate({ [t.key]: active ? undefined : true })}
            className={`inline-flex h-[26px] items-center rounded-md border px-2.5 text-[10px] font-medium transition-colors ${
              active
                ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </>
  );
}

/**
 * El buscador del catálogo, con su rebote de 400 ms.
 *
 * Vive en este archivo --y no suelto en la página-- porque el rebote y la
 * clave `search` son de `ProductoFiltros`: si cambian, cambian acá. Se dibuja
 * en la barra de la tabla, al lado de vista, densidad y columnas: es donde se
 * mira mientras se escribe.
 */
export function BuscadorProductos({
  filtros,
  onUpdate,
}: {
  filtros: ProductoFiltros;
  onUpdate: (partial: Partial<ProductoFiltros>) => void;
}) {
  const [local, setLocal] = useState(filtros.search || '');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  const escribir = (valor: string) => {
    setLocal(valor);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onUpdate({ search: valor || undefined }), 400);
  };

  return (
    <div className="relative w-full max-w-md">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => escribir(e.target.value)}
        placeholder="Buscar por nombre, código o SKU…"
        className={`${INPUT_STD} w-full pl-9`}
      />
    </div>
  );
}
