'use client';

import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import ImageUploader from '../ImageUploader';
import * as varianteService from '../../services/variante-service';
import type { SepararPorDisenoResultado } from '../../services/variante-service';
import type { ProductoVariante } from '@/core/types/producto';

/** La clave del atributo que marca a una variante como UN diseño. */
export const CLAVE_ATRIBUTO_DISENO = 'diseno';

export function esDiseno(v: ProductoVariante): boolean {
  return v.atributosValores.some((a) => a.atributo.clave === CLAVE_ATRIBUTO_DISENO);
}

interface Foto {
  id: string;
  url: string;
  urlThumbnail?: string;
}

interface Props {
  variante: ProductoVariante;
  empresaId: string;
  /** Sede propuesta (la elegida en la lista de variantes). */
  sedeId: string;
  onClose: () => void;
  /** Se llama si se separó (o si se subieron fotos), para recargar la lista. */
  onChanged: () => void;
}

/**
 * Separar una variante por diseño: una foto = un diseño = una variante con su
 * propio stock.
 *
 * El caso que lo pidió: "KITTY" tiene 10 edredones con 8 estampados distintos.
 * Se suben las 8 fotos acá mismo (casi ninguna variante las tenía), se dice
 * cuántos hay de cada una, y el backend crea "… / KITTY / D1" … "D8" con su
 * foto, su precio y sus unidades — con el lote de compra de cada una.
 */
export default function SepararPorDisenoDialog({ variante, empresaId, sedeId: sedeInicial, onClose, onChanged }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [stocks, setStocks] = useState(variante.stocksPorSede ?? []);
  const [sedeId, setSedeId] = useState(sedeInicial);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hubocambios, setHuboCambios] = useState(false);
  const [resultado, setResultado] = useState<SepararPorDisenoResultado | null>(null);

  // Se recarga al abrir: la fila de la lista puede no traer la galería
  // completa, y separar con media galería dejaría diseños afuera.
  useEffect(() => {
    let cancelado = false;
    varianteService.getVariante(variante.id)
      .then((v) => {
        if (cancelado) return;
        const fs = (v.archivos ?? []).map((a) => ({ id: a.id, url: a.url, urlThumbnail: a.urlThumbnail }));
        setFotos(fs);
        setCantidades(Object.fromEntries(fs.map((f) => [f.id, 1])));
        if (v.stocksPorSede?.length) {
          setStocks(v.stocksPorSede);
          if (!v.stocksPorSede.some((s) => s.sedeId === sedeInicial)) {
            setSedeId(v.stocksPorSede[0].sedeId);
          }
        }
      })
      .catch(() => { if (!cancelado) setError('No se pudo cargar la variante'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [variante.id, sedeInicial]);

  const stockSede = stocks.find((s) => s.sedeId === sedeId);
  const disponible = stockSede?.cantidad ?? 0;
  const asignadas = useMemo(
    () => fotos.reduce((acc, f) => acc + (cantidades[f.id] ?? 0), 0),
    [fotos, cantidades],
  );
  const disenos = fotos.filter((f) => (cantidades[f.id] ?? 0) > 0);
  const excede = asignadas > disponible;

  /** Fotos subidas o quitadas en el uploader: las nuevas arrancan en 1. */
  const recibirFotos = (lista: Foto[]) => {
    setHuboCambios(true);
    setFotos(lista.map((f) => ({ id: f.id, url: f.url, urlThumbnail: f.urlThumbnail })));
    setCantidades((prev) => Object.fromEntries(lista.map((f) => [f.id, prev[f.id] ?? 1])));
  };

  const cerrar = () => {
    if (hubocambios || resultado) onChanged();
    onClose();
  };

  const separar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await varianteService.separarPorDiseno(variante.id, {
        sedeId,
        disenos: disenos.map((f) => ({ archivoId: f.id, cantidad: cantidades[f.id] })),
      });
      setResultado(r);
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
      setError(typeof msg === 'string' ? msg : 'No se pudo separar la variante');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={cerrar}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">Separar por diseño</h3>
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-semibold text-[#004A94]">{variante.nombre}</span>
          {' · '}cada foto es un diseño con su propio stock.
        </p>

        {resultado ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-green-700">
              Listo: {resultado.disenos.length} diseño{resultado.disenos.length === 1 ? '' : 's'} creado{resultado.disenos.length === 1 ? '' : 's'}.
            </p>
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100 text-xs">
              {resultado.disenos.map((d) => (
                <li key={d.id} className="flex justify-between px-3 py-2">
                  <span className="text-gray-700">{d.nombre}</span>
                  <span className="font-semibold text-[#004A94]">{d.cantidad} und.</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              {resultado.origenDesactivada
                ? 'La variante original quedó sin stock y se desactivó.'
                : `En la variante original quedan ${resultado.stockRestante} und. sin diseño asignado.`}
            </p>
          </div>
        ) : cargando ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
          </div>
        ) : (
          <>
            {stocks.length > 1 && (
              <label className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                Sede
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="h-[30px] rounded-[6px] bg-zinc-100 px-2 text-xs text-[#004A94] ring-1 ring-blue-400 outline-none"
                >
                  {stocks.map((s) => (
                    <option key={s.sedeId} value={s.sedeId}>{s.sedeNombre} ({s.cantidad} und.)</option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">1. Fotos (una por diseño)</p>
              <ImageUploader
                empresaId={empresaId}
                varianteId={variante.id}
                nombreProducto={variante.nombre}
                initialImages={fotos}
                maxImages={50}
                onChange={recibirFotos}
              />
            </div>

            {fotos.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  2. ¿Cuántas unidades hay de cada diseño?
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {fotos.map((f) => (
                    <div key={f.id} className="rounded-lg border border-gray-100 p-2">
                      <img src={f.urlThumbnail ?? f.url} alt="" className="aspect-square w-full rounded-md object-cover" />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={cantidades[f.id] ?? 0}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          setCantidades((prev) => ({ ...prev, [f.id]: n }));
                        }}
                        className="mt-2 h-[30px] w-full rounded-[6px] bg-zinc-100 px-2 text-center text-sm font-semibold text-[#004A94] ring-1 ring-blue-400 outline-none"
                      />
                    </div>
                  ))}
                </div>
                <p className={`mt-3 text-xs ${excede ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                  Asignadas {asignadas} de {disponible} und. en stock
                  {!excede && asignadas < disponible && ` · ${disponible - asignadas} quedan en la variante original`}
                  {excede && ' · asignaste más de las que hay'}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Con 0 la foto no se separa y queda en la original. Cada diseño se llama como la
                  variante más D1, D2… (siguiendo la numeración de la colección) y copia su precio y costo.
                </p>
              </div>
            )}
          </>
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={cerrar}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button
              onClick={separar}
              disabled={enviando || cargando || disenos.length === 0 || excede}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
            >
              {enviando ? 'Separando…' : `Separar en ${disenos.length} diseño${disenos.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
