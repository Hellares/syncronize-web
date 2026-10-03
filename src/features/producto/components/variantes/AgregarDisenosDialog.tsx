'use client';

import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import ImageUploader from '../ImageUploader';
import * as varianteService from '../../services/variante-service';
import type { ColeccionDiseno } from '../../services/variante-service';

interface Foto {
  id: string;
  url: string;
  urlThumbnail?: string;
}

interface Props {
  /** Cualquier variante de la colección (un diseño o la base). */
  varianteId: string;
  titulo: string;
  empresaId: string;
  /** Sede propuesta (la elegida en la lista de variantes). */
  sedeId: string;
  onClose: () => void;
  /** Se llama si se crearon diseños (o se subieron fotos), para recargar. */
  onChanged: () => void;
}

/**
 * Agregar diseños NUEVOS a una colección que ya tiene: a CRISTAL (D1–D3) le
 * llegan dos estampados más y se crean D4 y D5 con su foto. Paridad con el app.
 *
 * Las unidades no salen de ninguna variante. Por defecto se crean en 0 y
 * entran con la COMPRA (proveedor, factura, costo real); la otra opción es
 * ingresarlas ya con su costo (entrada de inventario en el kardex, con lote).
 *
 * Las fotos se suben a la variante base de la colección (la original, que
 * suele quedar desactivada al separarla): si se cancela quedan ahí, sin
 * ensuciar ningún diseño.
 */
export default function AgregarDisenosDialog({ varianteId, titulo, empresaId, sedeId: sedeInicial, onClose, onChanged }: Props) {
  const [coleccion, setColeccion] = useState<ColeccionDiseno | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [sedeId, setSedeId] = useState(sedeInicial);
  const [ingresarAhora, setIngresarAhora] = useState(false);
  const [costo, setCosto] = useState('');
  // Precio de venta: arranca con el de la colección; un diseño exclusivo puede
  // venderse más caro.
  const [precio, setPrecio] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [huboCambios, setHuboCambios] = useState(false);
  const [resultado, setResultado] = useState<{ id: string; nombre: string; cantidad: number }[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    varianteService.getColeccionDiseno(varianteId)
      .then((c) => {
        if (cancelado) return;
        setColeccion(c);
        const fs = c.base.archivos.map((a) => ({ id: a.id, url: a.url, urlThumbnail: a.urlThumbnail ?? undefined }));
        setFotos(fs);
        // Con la base desactivada, sus fotos son justamente los diseños por
        // crear: arrancan elegidas. Si sigue activa, son las suyas: a mano.
        setElegidas(new Set(c.base.isActive ? [] : fs.map((f) => f.id)));
        setCantidades(Object.fromEntries(fs.map((f) => [f.id, 1])));
        const sede = c.sedes.some((s) => s.sedeId === sedeInicial) ? sedeInicial : (c.sedes[0]?.sedeId ?? sedeInicial);
        setSedeId(sede);
        sugerir(c, sede);
      })
      .catch((e) => {
        if (cancelado) return;
        const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
        setError(typeof msg === 'string' ? msg : 'No se pudo cargar la colección');
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [varianteId, sedeInicial]);

  /** Costo y precio de venta de la colección en la sede: lo sugerido. */
  const sugerir = (c: ColeccionDiseno, sede: string) => {
    const s = c.sedes.find((x) => x.sedeId === sede);
    setCosto(s?.precioCosto != null && s.precioCosto > 0 ? s.precioCosto.toFixed(2) : '');
    setPrecio(s?.precioVenta != null && s.precioVenta > 0 ? s.precioVenta.toFixed(2) : '');
  };

  /** Fotos subidas o quitadas en el uploader: las nuevas arrancan elegidas. */
  const recibirFotos = (lista: Foto[]) => {
    setHuboCambios(true);
    const antes = new Set(fotos.map((f) => f.id));
    setElegidas((sel) => {
      const nuevo = new Set([...sel].filter((id) => lista.some((f) => f.id === id)));
      for (const f of lista) if (!antes.has(f.id)) nuevo.add(f.id);
      return nuevo;
    });
    setFotos(lista.map((f) => ({ id: f.id, url: f.url, urlThumbnail: f.urlThumbnail })));
    setCantidades((prev) => Object.fromEntries(lista.map((f) => [f.id, prev[f.id] ?? 1])));
  };

  const disenos = fotos.filter((f) => elegidas.has(f.id));
  const costoNum = Number(costo.replace(',', '.'));
  const costoValido = costo.trim() !== '' && Number.isFinite(costoNum) && costoNum >= 0;
  const precioNum = Number(precio.replace(',', '.'));
  const precioValido = precio.trim() !== '' && Number.isFinite(precioNum) && precioNum >= 0;

  const rango = (() => {
    const sig = coleccion?.siguienteDiseno ?? 'D1';
    const n0 = Number(sig.replace(/^\D+/, '')) || 1;
    const pref = sig.replace(/\d+$/, '');
    return disenos.length <= 1 ? `${pref}${n0}` : `${pref}${n0}–${pref}${n0 + disenos.length - 1}`;
  })();

  const cerrar = () => {
    if (huboCambios || resultado) onChanged();
    onClose();
  };

  const crear = async () => {
    if (!coleccion) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await varianteService.agregarDisenos(coleccion.base.id, {
        sedeId,
        disenos: disenos.map((f) => ({
          archivoId: f.id,
          cantidad: ingresarAhora ? (cantidades[f.id] ?? 1) : 0,
          ...(ingresarAhora && costoValido ? { costoUnitario: costoNum } : {}),
          ...(ingresarAhora && precioValido ? { precioVenta: precioNum } : {}),
        })),
      });
      setResultado(r.disenos);
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.message : undefined;
      setError(typeof msg === 'string' ? msg : 'No se pudieron crear los diseños');
    } finally {
      setEnviando(false);
    }
  };

  const opcion = (valor: boolean, tituloOp: string, detalle: string) => (
    <button
      type="button"
      onClick={() => setIngresarAhora(valor)}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
        ingresarAhora === valor ? 'border-[#004A94] bg-blue-50/60' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span className={`mt-0.5 inline-block h-3.5 w-3.5 rounded-full border-2 ${ingresarAhora === valor ? 'border-[#004A94] bg-[#004A94]' : 'border-gray-300'}`} />
      <span>
        <span className="block text-xs font-semibold text-gray-800">{tituloOp}</span>
        <span className="block text-[11px] text-gray-500">{detalle}</span>
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">Agregar diseños</h3>
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-semibold text-[#004A94]">{titulo}</span>
          {coleccion && ` · el siguiente es ${coleccion.siguienteDiseno}; copian el precio y los precios por mayor de la colección.`}
        </p>

        {resultado ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-green-700">
              Listo: {resultado.length} diseño{resultado.length === 1 ? '' : 's'} nuevo{resultado.length === 1 ? '' : 's'}.
            </p>
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100 text-xs">
              {resultado.map((d) => (
                <li key={d.id} className="flex justify-between px-3 py-2">
                  <span className="text-gray-700">{d.nombre}</span>
                  <span className="font-semibold text-[#004A94]">{d.cantidad} und.</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              {ingresarAhora
                ? 'Las unidades entraron como ingreso de inventario.'
                : 'Quedaron en 0: las unidades entran al registrar la compra.'}
            </p>
          </div>
        ) : cargando ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
          </div>
        ) : coleccion ? (
          <>
            {coleccion.sedes.length > 1 && (
              <label className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                Sede
                <select
                  value={sedeId}
                  onChange={(e) => {
                    setSedeId(e.target.value);
                    sugerir(coleccion, e.target.value);
                  }}
                  className="h-[30px] rounded-[6px] bg-zinc-100 px-2 text-xs text-[#004A94] ring-1 ring-blue-400 outline-none"
                >
                  {coleccion.sedes.map((s) => (
                    <option key={s.sedeId} value={s.sedeId}>{s.sedeNombre}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">1. Fotos de los diseños nuevos</p>
              <ImageUploader
                empresaId={empresaId}
                varianteId={coleccion.base.id}
                nombreProducto={coleccion.base.nombre}
                initialImages={fotos}
                maxImages={50}
                onChange={recibirFotos}
              />
            </div>

            {fotos.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Elegí cuáles son diseños nuevos
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {fotos.map((f) => {
                    const sel = elegidas.has(f.id);
                    return (
                      <div key={f.id} className={`rounded-lg border p-1.5 ${sel ? 'border-[#004A94]' : 'border-gray-100'}`}>
                        <button
                          type="button"
                          aria-pressed={sel}
                          onClick={() => setElegidas((prev) => {
                            const n = new Set(prev);
                            if (n.has(f.id)) n.delete(f.id); else n.add(f.id);
                            return n;
                          })}
                          className="relative block w-full"
                        >
                          <img src={f.urlThumbnail ?? f.url} alt="" className={`aspect-square w-full rounded-md object-cover ${sel ? '' : 'opacity-50'}`} />
                          <span className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white ${sel ? 'bg-[#004A94]' : 'bg-gray-300'}`}>✓</span>
                        </button>
                        {ingresarAhora && sel && (
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={cantidades[f.id] ?? 1}
                            aria-label="Unidades"
                            onChange={(e) => {
                              const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                              setCantidades((prev) => ({ ...prev, [f.id]: n }));
                            }}
                            className="mt-1.5 h-[28px] w-full rounded-[6px] bg-zinc-100 px-2 text-center text-sm font-semibold text-[#004A94] ring-1 ring-blue-400 outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-500">2. ¿Cómo entran las unidades?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {opcion(false, 'Crear en 0', 'Las unidades entran al registrar la compra.')}
                  {opcion(true, 'Ingresar stock ahora', 'Entrada de inventario con su costo (sin compra).')}
                </div>
                {ingresarAhora && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-3">
                      <label className="block text-xs text-gray-600">
                        Costo unitario (S/)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={costo}
                          onChange={(e) => setCosto(e.target.value.replace(/[^\d.,]/g, ''))}
                          className="mt-1 block h-[30px] w-40 rounded-[6px] bg-zinc-100 px-2 text-xs text-[#004A94] ring-1 ring-blue-400 outline-none"
                        />
                      </label>
                      <label className="block text-xs text-gray-600">
                        Precio de venta (S/)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value.replace(/[^\d.,]/g, ''))}
                          className="mt-1 block h-[30px] w-40 rounded-[6px] bg-zinc-100 px-2 text-xs text-[#004A94] ring-1 ring-blue-400 outline-none"
                        />
                      </label>
                    </div>
                    <span className="mt-1 block text-[11px] text-gray-400">
                      Sugeridos: los de la colección. El precio aplica a los diseños de este ingreso.
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={cerrar}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado && coleccion && (
            <button
              onClick={crear}
              disabled={enviando || cargando || disenos.length === 0 || (ingresarAhora && !costoValido)}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
            >
              {enviando
                ? 'Creando…'
                : disenos.length === 0
                  ? 'Elegí al menos una foto'
                  : `Crear ${disenos.length} diseño${disenos.length === 1 ? '' : 's'} (${rango})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
