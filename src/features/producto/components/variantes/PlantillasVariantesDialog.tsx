'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductoAtributo, ProductoVariante } from '@/core/types/producto';
import { CLAVE_ATRIBUTO_DISENO } from './SepararPorDisenoDialog';
import {
  eliminarPlantilla,
  guardarPlantilla,
  listarPlantillas,
  mensajeDeError,
  plantillaDesdeColeccion,
  type NivelPlantilla,
  type VariantePlantilla,
} from '../../services/variante-plantilla-service';

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const PASO = 'mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500';
const BTN_PRIMARIO = 'rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50';
const BTN_SECUNDARIO = 'rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';

/** El que parece la colección: clave `dise_o` (JAYLI) o "Colección". */
const pareceColeccion = (clave: string | null | undefined, nombre: string) =>
  clave === 'dise_o' || clave === 'coleccion' || nombre.toLowerCase().includes('colec');

interface Props {
  productoId: string;
  productoNombre: string;
  /** Las variantes del producto: de ahí sale "desde una colección". */
  variantes: ProductoVariante[];
  /** Los atributos de la empresa, para el editor. */
  atributos: ProductoAtributo[];
  onClose: () => void;
}

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'desdeColeccion' }
  | { tipo: 'editor'; plantilla: VariantePlantilla | null };

/**
 * Las plantillas de VARIANTES de la empresa ("Edredones", "Peluches"):
 * crearlas desde una colección de este producto o desde cero, editarlas y
 * eliminarlas. Paridad con `PlantillasVariantesPage` + el editor del app.
 */
export default function PlantillasVariantesDialog({
  productoId, productoNombre, variantes, atributos, onClose,
}: Props) {
  const [plantillas, setPlantillas] = useState<VariantePlantilla[]>([]);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<VariantePlantilla | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPlantillas(await listarPlantillas());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las plantillas'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const volver = (texto?: string) => {
    setVista({ tipo: 'lista' });
    setAviso(texto ?? null);
    void cargar();
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    setOcupado(true);
    try {
      await eliminarPlantilla(borrar.id);
      setBorrar(null);
      void cargar();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo eliminar'));
    } finally {
      setOcupado(false);
    }
  };

  const titulo = vista.tipo === 'lista'
    ? 'Plantillas de variantes'
    : vista.tipo === 'desdeColeccion'
      ? 'Plantilla desde una colección'
      : vista.plantilla ? 'Editar plantilla' : 'Nueva plantilla';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!ocupado) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{titulo}</h3>
            <p className="truncate text-xs text-gray-500">{productoNombre}</p>
          </div>
          {vista.tipo !== 'lista' && (
            <button type="button" onClick={() => setVista({ tipo: 'lista' })} className="text-xs text-gray-500 hover:text-gray-800">
              ← Volver
            </button>
          )}
        </div>

        {vista.tipo === 'lista' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {aviso && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{aviso}</p>}
              {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
              {cargando ? (
                <div className="flex justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
                </div>
              ) : plantillas.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-500">
                  Sin plantillas todavía. Creá una desde una colección de este producto (la más rápida) o desde cero.
                </p>
              ) : (
                <div className="space-y-2">
                  {plantillas.map((p) => {
                    // Sin la colección: ya se dice aparte (en la plantilla
                    // marca su lugar en el nombre).
                    const otros = p.atributos.filter((a) => a.id !== p.atributoColeccion.id).map((a) => a.nombre).join(' · ');
                    return (
                      <div key={p.id} className="flex items-center gap-2 rounded-[8px] border border-gray-200 px-3 py-2.5 hover:bg-blue-50/30">
                        <button type="button" onClick={() => setVista({ tipo: 'editor', plantilla: p })} className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-bold text-gray-900">{p.nombre}</p>
                          <p className="text-[11px] text-gray-500">
                            {p.combinaciones.length} combinaciones · colección: {p.atributoColeccion.nombre}
                          </p>
                          {otros && <p className="text-[11px] text-gray-400">{otros}</p>}
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setBorrar(p)}
                          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-3">
              <button type="button" onClick={onClose} className={BTN_SECUNDARIO}>Cerrar</button>
              <button
                type="button"
                onClick={() => setVista({ tipo: 'editor', plantilla: null })}
                className="rounded-lg border border-[#437EFF] px-4 py-2 text-sm font-medium text-[#437EFF] hover:bg-[#437EFF]/5"
              >
                Desde cero
              </button>
              <button
                type="button"
                disabled={!variantes.length}
                onClick={() => setVista({ tipo: 'desdeColeccion' })}
                className={BTN_PRIMARIO}
                title="Copia sus combinaciones y precios (ej. CRISTAL)"
              >
                Desde una colección
              </button>
            </div>
          </>
        )}

        {vista.tipo === 'desdeColeccion' && (
          <DesdeColeccion
            productoId={productoId}
            productoNombre={productoNombre}
            variantes={variantes}
            onListo={(p) => volver(`Plantilla "${p.nombre}" creada con ${p.combinaciones.length} combinaciones`)}
          />
        )}

        {vista.tipo === 'editor' && (
          <Editor
            atributos={atributos}
            plantilla={vista.plantilla}
            onListo={() => volver(vista.plantilla ? 'Plantilla guardada' : 'Plantilla creada')}
          />
        )}
      </div>

      {borrar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={(e) => { e.stopPropagation(); setBorrar(null); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Eliminar plantilla</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar <strong>{borrar.nombre}</strong>? Las variantes ya creadas con ella no cambian.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setBorrar(null)} disabled={ocupado} className={BTN_SECUNDARIO}>Cancelar</button>
              <button onClick={confirmarBorrado} disabled={ocupado} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {ocupado ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Guardar como plantilla" una colección de este producto (ej. CRISTAL). */
function DesdeColeccion({
  productoId, productoNombre, variantes, onListo,
}: {
  productoId: string;
  productoNombre: string;
  variantes: ProductoVariante[];
  onListo: (p: VariantePlantilla) => void;
}) {
  // Atributos que tienen las variantes activas (sin el Diseño), con sus valores.
  const porId = useMemo(() => {
    const m = new Map<string, { nombre: string; clave: string; valores: Set<string> }>();
    for (const v of variantes.filter((x) => x.isActive)) {
      for (const a of v.atributosValores) {
        if (a.atributo.clave === CLAVE_ATRIBUTO_DISENO) continue;
        const actual = m.get(a.atributoId) ?? { nombre: a.atributo.nombre, clave: a.atributo.clave, valores: new Set<string>() };
        if (a.valor?.trim()) actual.valores.add(a.valor.trim());
        m.set(a.atributoId, actual);
      }
    }
    return m;
  }, [variantes]);

  const [atributoId, setAtributoId] = useState(() =>
    [...porId.entries()].find(([, a]) => pareceColeccion(a.clave, a.nombre))?.[0] ?? [...porId.keys()][0] ?? '');
  const [valor, setValor] = useState('');
  const [nombre, setNombre] = useState(productoNombre);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valores = [...(porId.get(atributoId)?.valores ?? [])].sort((a, b) => a.localeCompare(b, 'es'));

  const crear = async () => {
    if (!valor || !nombre.trim()) {
      setError('Elegí la colección modelo y el nombre de la plantilla.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onListo(await plantillaDesdeColeccion({
        nombre: nombre.trim(), productoId, atributoColeccionId: atributoId, valorColeccion: valor,
      }));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo crear la plantilla'));
      setEnviando(false);
    }
  };

  if (!porId.size) {
    return (
      <p className="px-6 py-8 text-center text-xs text-red-600">
        Las variantes de este producto no tienen atributos para copiar.
      </p>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        <p className="text-[11px] text-gray-500">
          Copia las combinaciones de esa colección con sus precios, en el orden de su nombre.
        </p>
        <div>
          <label className={LABEL}>¿Cuál atributo es la colección?</label>
          <select className={INPUT_STD} value={atributoId} onChange={(e) => { setAtributoId(e.target.value); setValor(''); }}>
            {[...porId.entries()].map(([id, a]) => <option key={id} value={id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Colección modelo</label>
          <select className={INPUT_STD} value={valor} onChange={(e) => setValor(e.target.value)}>
            <option value="">Elegí una (ej. CRISTAL)</option>
            {valores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Nombre de la plantilla</label>
          <input className={INPUT_STD} placeholder="Ej. Edredones" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
        <button type="button" onClick={crear} disabled={enviando} className={BTN_PRIMARIO}>
          {enviando ? 'Creando…' : 'Crear plantilla'}
        </button>
      </div>
    </>
  );
}

/** Una combinación en edición. */
interface Fila {
  key: number;
  /** atributoId → valor (texto libre o el elegido en la lista). */
  valores: Record<string, string>;
  precio: string;
  costo: string;
  /** Los precios por mayor que traía: se conservan al guardar. */
  niveles: NivelPlantilla[];
}

let siguienteKey = 1;

/**
 * Crear o editar una plantilla desde cero (la de peluches): el nombre, cuál
 * atributo es la colección, qué atributos llevan las combinaciones y cada
 * combinación con sus precios sugeridos.
 */
function Editor({
  atributos, plantilla, onListo,
}: {
  atributos: ProductoAtributo[];
  plantilla: VariantePlantilla | null;
  onListo: () => void;
}) {
  /** Activos y sin el Diseño (los diseños salen de las fotos, no de acá). */
  const disponibles = useMemo(
    () => atributos
      .filter((a) => a.isActive && a.clave !== CLAVE_ATRIBUTO_DISENO)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [atributos],
  );
  const atributo = (id: string) => disponibles.find((a) => a.id === id);

  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [coleccionId, setColeccionId] = useState<string>(
    plantilla?.atributoColeccion.id
      ?? disponibles.find((a) => pareceColeccion(a.clave, a.nombre))?.id
      ?? '',
  );
  /**
   * El orden del NOMBRE que traía la plantilla (puede incluir la colección en
   * su lugar: "2 PLAZAS / TELA / 3 PZS / HOMBRE / CRISTAL"). Al guardar se
   * respeta; lo agregado entra antes de la colección.
   */
  const ordenOriginal = useMemo(() => plantilla?.atributos.map((a) => a.id) ?? [], [plantilla]);
  const [atributoIds, setAtributoIds] = useState<string[]>(
    () => ordenOriginal.filter((id) => id !== plantilla?.atributoColeccion.id),
  );
  const [filas, setFilas] = useState<Fila[]>(() =>
    plantilla
      ? plantilla.combinaciones.map((c) => ({
        key: siguienteKey++,
        valores: Object.fromEntries(c.valores.map((v) => [v.atributoId, v.valor])),
        precio: c.precio != null ? c.precio.toFixed(2) : '',
        costo: c.precioCosto != null ? c.precioCosto.toFixed(2) : '',
        niveles: c.niveles ?? [],
      }))
      : [{ key: siguienteKey++, valores: {}, precio: '', costo: '', niveles: [] }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidatos = disponibles.filter((a) => a.id !== coleccionId);
  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const parchar = (key: number, patch: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  /** El orden con que se nombran las variantes: el que traía (con la
   *  colección en su lugar) y lo nuevo antes de la colección; sin orden
   *  previo, los elegidos y la colección al final. */
  const ordenNombre = (coleccion: string) => {
    const elegidos = new Set([...atributoIds, coleccion]);
    const orden = ordenOriginal.filter((id) => elegidos.has(id));
    if (!orden.includes(coleccion)) orden.push(coleccion);
    const nuevos = atributoIds.filter((id) => !orden.includes(id));
    orden.splice(orden.indexOf(coleccion), 0, ...nuevos);
    return orden;
  };

  const guardar = async () => {
    let falta: string | null = null;
    if (!nombre.trim()) falta = 'Poné un nombre a la plantilla.';
    else if (!coleccionId) falta = 'Elegí cuál atributo es la colección.';
    else if (!atributoIds.length) falta = 'Elegí al menos un atributo para las combinaciones.';
    else if (!filas.length) falta = 'Agregá al menos una combinación.';
    else if (filas.some((f) => atributoIds.some((id) => !(f.valores[id] ?? '').trim()))) {
      falta = 'Hay combinaciones con atributos sin valor.';
    }
    if (falta) {
      setError(falta);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await guardarPlantilla({
        nombre: nombre.trim(),
        atributoColeccionId: coleccionId,
        atributoIds: ordenNombre(coleccionId),
        combinaciones: filas.map((f) => ({
          valores: atributoIds.map((id) => ({ atributoId: id, valor: (f.valores[id] ?? '').trim() })),
          precio: num(f.precio),
          precioCosto: num(f.costo),
          niveles: f.niveles,
        })),
      }, plantilla?.id);
      onListo();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo guardar la plantilla'));
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Nombre de la plantilla</label>
            <input className={INPUT_STD} placeholder="Ej. Peluches" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>¿Cuál atributo es la colección?</label>
            <select
              className={INPUT_STD}
              value={coleccionId}
              disabled={guardando}
              onChange={(e) => {
                setColeccionId(e.target.value);
                setAtributoIds((ids) => ids.filter((id) => id !== e.target.value));
              }}
            >
              <option value="">El que cambia en cada colección nueva</option>
              {disponibles.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className={PASO}>Atributos de las combinaciones</p>
          <div className="flex flex-wrap gap-1.5">
            {candidatos.map((a) => {
              const sel = atributoIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={guardando}
                  onClick={() => setAtributoIds((ids) => {
                    if (ids.includes(a.id)) return ids.filter((x) => x !== a.id);
                    // En el orden de los atributos: es el del nombre.
                    return [...ids, a.id].sort((x, y) => (atributo(x)?.orden ?? 0) - (atributo(y)?.orden ?? 0));
                  })}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    sel ? 'bg-[#004A94] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-blue-50'
                  }`}
                >
                  {sel ? '✓ ' : ''}{a.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {atributoIds.length > 0 && (
          <div>
            <p className={PASO}>Combinaciones ({filas.length})</p>
            <div className="space-y-2">
              {filas.map((f, i) => (
                <div key={f.key} className="rounded-[8px] border border-gray-200 bg-white px-3 py-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#004A94]">Combinación {i + 1}</span>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => setFilas((fs) => fs.filter((x) => x.key !== f.key))}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {atributoIds.map((id) => {
                      const a = atributo(id);
                      const opciones = a?.valores ?? [];
                      const v = f.valores[id] ?? '';
                      return (
                        <div key={id}>
                          <label className={LABEL}>{a?.nombre ?? 'Atributo'}</label>
                          {/* Lista cerrada → desplegable; texto libre → campo. */}
                          {opciones.length ? (
                            <select
                              className={INPUT_STD}
                              value={opciones.includes(v) ? v : ''}
                              onChange={(e) => parchar(f.key, { valores: { ...f.valores, [id]: e.target.value } })}
                            >
                              <option value="">Elegí…</option>
                              {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              className={INPUT_STD}
                              value={v}
                              onChange={(e) => parchar(f.key, { valores: { ...f.valores, [id]: e.target.value } })}
                            />
                          )}
                        </div>
                      );
                    })}
                    <div>
                      <label className={LABEL}>Precio de venta</label>
                      <input
                        className={`${INPUT_STD} text-right`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={f.precio}
                        onChange={(e) => parchar(f.key, { precio: e.target.value.replace(/[^\d.,]/g, '') })}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Costo</label>
                      <input
                        className={`${INPUT_STD} text-right`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={f.costo}
                        onChange={(e) => parchar(f.key, { costo: e.target.value.replace(/[^\d.,]/g, '') })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setFilas((fs) => [...fs, { key: siguienteKey++, valores: {}, precio: '', costo: '', niveles: [] }])}
              className="mt-2 text-xs font-semibold text-[#437EFF] hover:underline"
            >
              + Agregar combinación
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
        <button type="button" onClick={guardar} disabled={guardando} className={BTN_PRIMARIO}>
          {guardando ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </div>
    </>
  );
}
