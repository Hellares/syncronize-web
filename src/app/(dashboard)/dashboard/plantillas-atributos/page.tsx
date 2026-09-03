'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import { useAtributos } from '@/features/producto/hooks/use-atributos';
import * as varianteService from '@/features/producto/services/variante-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import type { AtributoPlantilla, CreateAtributoPlantillaDto, ProductoAtributo } from '@/core/types/producto';

/**
 * Plantillas de atributos: los paquetes de campos que se aplican a un producto
 * ("Procesador" trae fabricante, familia y modelo).
 *
 * Replica la pantalla del app (`plantillas_atributos_page.dart`): buscador,
 * filtros Sistema/Personalizadas, cards con sus chips y el alta en un diálogo.
 *
 * 🔴 Las plantillas del SISTEMA (`esPredefinida`) no se pueden editar ni
 * borrar --el backend lo rechaza-- asi que sus acciones ni se muestran.
 */

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const TEXTAREA_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const CARD = 'rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm';

function Chip({ texto, tono = 'azul' }: { texto: string; tono?: 'azul' | 'violeta' | 'gris' | 'ambar' }) {
  const tonos = {
    azul: 'bg-[#eaf2fd] text-[#004A94] ring-[#cfe0f5]',
    violeta: 'bg-violet-50 text-violet-700 ring-violet-200',
    gris: 'bg-zinc-100 text-gray-600 ring-zinc-200',
    ambar: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${tonos[tono]}`}>{texto}</span>;
}

function PlantillaCard({ plantilla, categorias, puedeGestionar, onEditar, onEliminar }: {
  plantilla: AtributoPlantilla;
  categorias: CatalogoItem[];
  puedeGestionar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const requeridos = plantilla.atributos.filter(pa => pa.requeridoOverride ?? pa.atributo.requerido).length;
  const categoria = categorias.find(c => c.id === plantilla.categoriaId)?.nombre;
  // Solo las personalizadas se tocan: el backend rechaza editar o borrar una
  // del sistema.
  const editable = puedeGestionar && !plantilla.esPredefinida;

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf2fd] text-base ring-1 ring-[#cfe0f5]">
          {plantilla.icono ? plantilla.icono : (
            <svg className="h-4 w-4 text-[#004A94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v4H4zM14 16h6v4h-6z" />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{plantilla.nombre}</p>
          {plantilla.descripcion && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">{plantilla.descripcion}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip texto={plantilla.esPredefinida ? 'Sistema' : 'Personalizada'} tono={plantilla.esPredefinida ? 'azul' : 'violeta'} />
            {categoria && <Chip texto={categoria} tono="gris" />}
            <Chip texto={`${plantilla.atributos.length} atributos`} tono="gris" />
            {requeridos > 0 && <Chip texto={`${requeridos} requeridos`} tono="ambar" />}
          </div>
        </div>

        {editable && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEditar} title="Editar"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button onClick={onEliminar} title="Eliminar"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.2v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlantillaDialog({ plantilla, atributos, categorias, isSubmitting, onGuardar, onClose }: {
  plantilla: AtributoPlantilla | null;
  atributos: ProductoAtributo[];
  categorias: CatalogoItem[];
  isSubmitting: boolean;
  onGuardar: (data: CreateAtributoPlantillaDto) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [icono, setIcono] = useState(plantilla?.icono ?? '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState(plantilla?.categoriaId ?? '');
  // El ORDEN de esta lista es el orden en que se piden los campos, asi que se
  // guarda la seleccion como array y no como set.
  const [elegidos, setElegidos] = useState<string[]>(
    plantilla ? [...plantilla.atributos].sort((a, b) => a.orden - b.orden).map(pa => pa.atributoId) : [],
  );
  const [requeridos, setRequeridos] = useState<Record<string, boolean>>(
    plantilla
      ? Object.fromEntries(plantilla.atributos.map(pa => [pa.atributoId, pa.requeridoOverride ?? pa.atributo.requerido]))
      : {},
  );
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');

  const alternar = (id: string) =>
    setElegidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const visibles = atributos.filter(a =>
    !busca.trim() || a.nombre.toLowerCase().includes(busca.trim().toLowerCase()));

  const guardar = () => {
    if (!nombre.trim()) { setError('Ponele un nombre a la plantilla'); return; }
    if (!elegidos.length) { setError('Elegí al menos un atributo'); return; }
    onGuardar({
      nombre: nombre.trim(),
      ...(descripcion.trim() && { descripcion: descripcion.trim() }),
      ...(icono.trim() && { icono: icono.trim() }),
      ...(categoriaId && { categoriaId }),
      atributos: elegidos.map((atributoId, i) => ({
        atributoId,
        orden: i,
        ...(requeridos[atributoId] !== undefined && { requeridoOverride: requeridos[atributoId] }),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={plantilla ? 'Editar plantilla' : 'Nueva plantilla'}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 font-sans shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-gray-900">{plantilla ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
        <p className="mt-1 text-[11px] text-gray-500">
          Una plantilla agrupa los campos que se piden juntos: &quot;Procesador&quot; trae fabricante, familia y modelo.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input className={INPUT_STD} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Procesador" />
          </div>
          <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
            <div>
              <label className={LABEL}>Icono</label>
              <input className={`${INPUT_STD} text-center`} value={icono} onChange={e => setIcono(e.target.value)} placeholder="🧠" maxLength={2} />
            </div>
            <div>
              <label className={LABEL}>Categoría</label>
              <select className={INPUT_STD} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Descripción</label>
            <textarea className={`${TEXTAREA_STD} min-h-[52px]`} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Para qué sirve esta plantilla" />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between">
            <label className={LABEL}>Atributos de la plantilla *</label>
            <span className="text-[10px] text-gray-400">{elegidos.length} elegidos · el orden es el de selección</span>
          </div>
          <input className={`${INPUT_STD} mb-2`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar atributo…" />
          <div className="max-h-64 overflow-y-auto rounded-[6px] ring-1 ring-[#cfe0f5]">
            {visibles.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-gray-400">No hay atributos que coincidan.</p>
            ) : visibles.map((a, i) => {
              const puesto = elegidos.indexOf(a.id);
              const elegido = puesto >= 0;
              return (
                <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 ${i % 2 === 0 ? 'bg-zinc-50' : 'bg-white'} ${i > 0 ? 'border-t border-[#e6eef8]' : ''}`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={elegido} onChange={() => alternar(a.id)} className="accent-[#004A94]" />
                    {elegido && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#004A94] text-[9px] font-medium text-white">
                        {puesto + 1}
                      </span>
                    )}
                    <span className="truncate text-[11px] text-gray-700">{a.nombre}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{a.tipo}</span>
                  </label>
                  {elegido && (
                    <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-gray-500">
                      <input
                        type="checkbox"
                        checked={requeridos[a.id] ?? a.requerido ?? false}
                        onChange={e => setRequeridos(prev => ({ ...prev, [a.id]: e.target.checked }))}
                        className="accent-[#004A94]"
                      />
                      requerido
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando…' : plantilla ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlantillasAtributosPage() {
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageProducts;
  const { atributos } = useAtributos();

  const [plantillas, setPlantillas] = useState<AtributoPlantilla[]>([]);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'sistema' | 'personalizadas'>('todas');
  const [dialogo, setDialogo] = useState<{ abierta: true; plantilla: AtributoPlantilla | null } | null>(null);
  const [aEliminar, setAEliminar] = useState<AtributoPlantilla | null>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      setPlantillas(await varianteService.getPlantillas());
      setError(null);
    } catch {
      setError('No se pudieron cargar las plantillas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { catalogoService.getCategorias().then(setCategorias).catch(() => {}); }, []);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return plantillas.filter(p => {
      if (filtro === 'sistema' && !p.esPredefinida) return false;
      if (filtro === 'personalizadas' && p.esPredefinida) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || (p.descripcion ?? '').toLowerCase().includes(q);
    });
  }, [plantillas, busca, filtro]);

  const guardar = async (data: CreateAtributoPlantillaDto) => {
    if (!dialogo) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (dialogo.plantilla) await varianteService.updatePlantilla(dialogo.plantilla.id, data);
      else await varianteService.createPlantilla(data);
      setDialogo(null);
      await cargar();
    } catch {
      setError(dialogo.plantilla ? 'No se pudo actualizar la plantilla.' : 'No se pudo crear la plantilla.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await varianteService.deletePlantilla(aEliminar.id);
      setAEliminar(null);
      await cargar();
    } catch {
      setError('No se pudo eliminar la plantilla.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FILTROS = [
    ['todas', 'Todas'],
    ['sistema', 'Sistema'],
    ['personalizadas', 'Personalizadas'],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plantillas de Atributos</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando…' : `${visibles.length} de ${plantillas.length} plantillas`}
          </p>
        </div>
        {puedeGestionar && (
          <button
            onClick={() => setDialogo({ abierta: true, plantilla: null })}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[#004A94] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#003570]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva plantilla
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className={`${INPUT_STD} ml-0 w-full max-w-xs`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar plantilla…" />
        <div className="flex gap-1">
          {FILTROS.map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`h-[30px] rounded-[6px] px-3 text-xs transition-colors ${filtro === valor
                ? 'bg-[#eaf2fd] font-medium text-[#004A94] ring-1 ring-[#004A94]'
                : 'bg-zinc-100 text-gray-500 ring-1 ring-blue-400 hover:text-[#004A94]'}`}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] bg-red-50 p-3 ring-1 ring-red-400 shadow-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : visibles.length === 0 ? (
        <div className={`${CARD} py-16 text-center`}>
          <p className="text-sm font-medium text-gray-700">
            {plantillas.length === 0 ? 'Todavía no hay plantillas' : 'Ninguna plantilla coincide con el filtro'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400">
            Una plantilla agrupa los campos que se piden juntos al cargar un producto.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map(p => (
            <PlantillaCard
              key={p.id}
              plantilla={p}
              categorias={categorias}
              puedeGestionar={puedeGestionar}
              onEditar={() => setDialogo({ abierta: true, plantilla: p })}
              onEliminar={() => setAEliminar(p)}
            />
          ))}
        </div>
      )}

      {dialogo && (
        <PlantillaDialog
          key={dialogo.plantilla?.id ?? 'nueva'}
          plantilla={dialogo.plantilla}
          atributos={atributos}
          categorias={categorias}
          isSubmitting={isSubmitting}
          onGuardar={guardar}
          onClose={() => setDialogo(null)}
        />
      )}

      {aEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAEliminar(null)}>
          <div role="dialog" aria-modal="true" aria-label="Eliminar plantilla"
            className="w-full max-w-sm rounded-2xl bg-white p-6 font-sans shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900">Eliminar plantilla</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Seguro que querés eliminar <span className="font-medium text-gray-900">{aEliminar.nombre}</span>?
              Los productos que ya la usaron conservan sus valores.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setAEliminar(null)} disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={eliminar} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
