'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  aplicarPlantilla,
  etiquetaCombinacion,
  listarPlantillas,
  mensajeDeError,
  type ResultadoAplicar,
  type VariantePlantilla,
} from '../../services/variante-plantilla-service';

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const PASO = 'mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500';

interface Props {
  productoId: string;
  productoNombre: string;
  /** Abre la gestión de plantillas (para crear la primera). */
  onGestionarPlantillas: () => void;
  onClose: () => void;
  /** Se crearon variantes: recargar la lista. */
  onChanged: () => void;
}

/**
 * Nueva colección desde una plantilla: "Edredones" + "DINOSAURIO" → las
 * combinaciones de la plantilla con esa colección, en 0 y con sus precios.
 * Después siguen "Agregar diseños" (las fotos) y la compra (las unidades).
 * Paridad con `NuevaColeccionPlantillaPage` del app.
 */
export default function NuevaColeccionPlantillaDialog({
  productoId, productoNombre, onGestionarPlantillas, onClose, onChanged,
}: Props) {
  const [plantillas, setPlantillas] = useState<VariantePlantilla[]>([]);
  const [plantilla, setPlantilla] = useState<VariantePlantilla | null>(null);
  const [nombre, setNombre] = useState('');
  /** Por combinación: si va, y su precio y costo (sugeridos, editables). */
  const [elegidas, setElegidas] = useState<Record<string, boolean>>({});
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [costos, setCostos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAplicar | null>(null);

  const elegir = useCallback((p: VariantePlantilla | null) => {
    setPlantilla(p);
    const el: Record<string, boolean> = {};
    const pr: Record<string, string> = {};
    const co: Record<string, string> = {};
    for (const c of p?.combinaciones ?? []) {
      if (!c.id) continue;
      el[c.id] = true;
      pr[c.id] = c.precio != null ? c.precio.toFixed(2) : '';
      co[c.id] = c.precioCosto != null ? c.precioCosto.toFixed(2) : '';
    }
    setElegidas(el);
    setPrecios(pr);
    setCostos(co);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarPlantillas();
      setPlantillas(lista);
      // Con una sola, ya elegida: es el caso de JAYLI con "Edredones".
      elegir(lista.length === 1 ? lista[0] : null);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las plantillas'));
    } finally {
      setCargando(false);
    }
  }, [elegir]);

  useEffect(() => { void cargar(); }, [cargar]);

  const num = (s: string | undefined) => {
    const n = parseFloat((s ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const aCrear = (plantilla?.combinaciones ?? []).filter((c) => c.id && elegidas[c.id]);
  const valor = nombre.trim().toUpperCase();

  const crear = async () => {
    if (!plantilla || !valor || !aCrear.length) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await aplicarPlantilla(plantilla.id, {
        productoId,
        valorColeccion: valor,
        combinaciones: aCrear.map((c) => ({
          combinacionId: c.id as string,
          precio: num(precios[c.id as string]),
          precioCosto: num(costos[c.id as string]),
        })),
      });
      setResultado(r);
      if (r.creadas.length) onChanged();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo crear la colección'));
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = () => { if (!enviando) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Nueva colección</h3>
            <p className="truncate text-xs font-semibold text-[#004A94]">{productoNombre}</p>
          </div>
          <button
            type="button"
            onClick={onGestionarPlantillas}
            disabled={enviando}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Plantillas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {resultado ? (
            <div>
              <p className={`text-sm font-semibold ${resultado.creadas.length ? 'text-green-700' : 'text-amber-700'}`}>
                {resultado.creadas.length
                  ? `${resultado.creadas.length} variante${resultado.creadas.length === 1 ? '' : 's'} de ${valor}`
                  : 'No se creó ninguna'}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-gray-700">
                {resultado.creadas.map((c) => <li key={c.id}>{c.nombre}</li>)}
              </ul>
              {resultado.omitidas.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-amber-700">Ya existían (no se duplicaron):</p>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-gray-500">
                    {resultado.omitidas.map((o) => <li key={o}>{o}</li>)}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-[11px] text-gray-500">
                Nacen en 0: las unidades entran con la compra. Las fotos, con &quot;Diseños&quot; en la fila de la colección.
              </p>
            </div>
          ) : cargando ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
            </div>
          ) : plantillas.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-bold text-gray-800">Todavía no hay plantillas de variantes</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                Creá una desde una colección que ya tengas (por ejemplo CRISTAL) o desde cero, y después
                la usás para cada colección nueva.
              </p>
              <button
                type="button"
                onClick={onGestionarPlantillas}
                className="mt-4 rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]"
              >
                + Crear plantilla
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className={PASO}>1. Plantilla</p>
                <div className="flex flex-wrap gap-1.5">
                  {plantillas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={enviando}
                      onClick={() => elegir(p)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                        plantilla?.id === p.id
                          ? 'bg-[#004A94] text-white'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-blue-50'
                      }`}
                    >
                      {p.nombre} ({p.combinaciones.length})
                    </button>
                  ))}
                </div>
              </div>

              {plantilla && (
                <>
                  <div>
                    <p className={PASO}>2. Nombre de la colección nueva</p>
                    <label className={LABEL}>{plantilla.atributoColeccion.nombre}</label>
                    <input
                      autoFocus
                      className={`${INPUT_STD} uppercase`}
                      placeholder="Ej. DINOSAURIO"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>

                  <div>
                    <p className={PASO}>3. Combinaciones ({plantilla.combinaciones.length})</p>
                    <div className="space-y-2">
                      {plantilla.combinaciones.map((c) => {
                        const id = c.id as string;
                        const va = !!elegidas[id];
                        return (
                          <div
                            key={id}
                            className={`rounded-[8px] border bg-white px-3 py-2 ${va ? 'border-[#004A94]' : 'border-gray-200'}`}
                          >
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={va}
                                disabled={enviando}
                                onChange={(e) => setElegidas((x) => ({ ...x, [id]: e.target.checked }))}
                                className="h-4 w-4 accent-[#004A94]"
                              />
                              <span className="flex-1 text-xs font-semibold text-gray-800">{etiquetaCombinacion(c)}</span>
                              {c.niveles.length > 0 && (
                                <span title="Trae su precio por mayor" className="text-[10px] font-semibold text-emerald-700">
                                  por mayor
                                </span>
                              )}
                            </label>
                            {va && (
                              <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                <div>
                                  <label className={LABEL}>Precio de venta</label>
                                  <input
                                    className={`${INPUT_STD} text-right`}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={precios[id] ?? ''}
                                    onChange={(e) => setPrecios((x) => ({ ...x, [id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                                  />
                                </div>
                                <div>
                                  <label className={LABEL}>Costo</label>
                                  <input
                                    className={`${INPUT_STD} text-right`}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={costos[id] ?? ''}
                                    onChange={(e) => setCostos((x) => ({ ...x, [id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
          {resultado ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]"
            >
              Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={cerrar}
                disabled={enviando}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              {plantilla && (
                <button
                  type="button"
                  onClick={crear}
                  disabled={enviando || !valor || aCrear.length === 0}
                  className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
                >
                  {enviando
                    ? 'Creando…'
                    : !valor
                      ? 'Escribí el nombre de la colección'
                      : `Crear ${aCrear.length} variante${aCrear.length === 1 ? '' : 's'} de ${valor}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
