'use client';

import { useState, useEffect } from 'react';
import type { PrecioNivel, CreatePrecioNivelDto, TipoPrecioNivel } from '@/core/types/precio';
import { UnidadPresentacion } from '@/core/utils/unidad-presentacion';

interface Props {
  isOpen: boolean;
  nivel?: PrecioNivel | null;
  isSubmitting: boolean;
  /**
   * Unidad en la que se teclea. El nivel se GUARDA en unidad de venta: para un
   * granel en gramos, un "desde 3 kg" tiene que viajar como 3000 y su precio
   * como S/0.008. Sin esto el formulario cargaria mayoreo a los 3 GRAMOS.
   */
  presentacion?: UnidadPresentacion;
  /** Precio de venta del producto en la sede, en UNIDAD DE VENTA. */
  precioBase?: number | null;
  /** Costo del producto en la sede, en UNIDAD DE VENTA. */
  precioCosto?: number | null;
  /** Los niveles que el producto ya tiene, para ver el escalonado. */
  nivelesExistentes?: PrecioNivel[];
  onSave: (data: CreatePrecioNivelDto) => void;
  onClose: () => void;
}

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const CAJA = 'rounded-[6px] ring-1 shadow-md transition-all duration-300';

const money = (n: number) => `S/ ${n.toFixed(2)}`;

export default function PrecioNivelFormDialog({
  isOpen, nivel, isSubmitting, presentacion, precioBase, precioCosto, nivelesExistentes = [], onSave, onClose,
}: Props) {
  const u = presentacion ?? UnidadPresentacion.ninguna();
  const simbolo = u.simboloVisible ?? '';
  // 🔴 Primitivo y no el objeto: `presentacion` se construye en el llamador y
  // es una instancia nueva por render, asi que como dependencia del efecto
  // reiniciaria los campos en cada tecla.
  const factor = u.activa ? u.factor : 1;
  const [nombre, setNombre] = useState('');
  const [cantidadMinima, setCantidadMinima] = useState('');
  const [cantidadMaxima, setCantidadMaxima] = useState('');
  const [tieneMaxima, setTieneMaxima] = useState(false);
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecioNivel>('PRECIO_FIJO');
  const [precio, setPrecio] = useState('');
  const [porcentajeDesc, setPorcentajeDesc] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Los precios del producto se guardan por unidad de VENTA y acá se teclea y
  // se lee en la de PRESENTACION: para mostrarlos hay que multiplicar, que es
  // la inversa de lo que hace `precioAUnidadDeVenta` al guardar.
  const baseVista = precioBase != null ? Number(precioBase) * factor : null;
  const costoVista = precioCosto != null ? Number(precioCosto) * factor : null;

  /**
   * El nivel mas alto que ya existe. Un nivel nuevo tiene que arrancar DONDE
   * TERMINA ese: si el anterior cubre 3-6, este empieza en 7.
   */
  const ultimoNivel = (() => {
    const otrosNiveles = nivelesExistentes.filter(n => n.id !== nivel?.id);
    if (!otrosNiveles.length) return null;
    return otrosNiveles.reduce((a, b) => (b.cantidadMinima > a.cantidadMinima ? b : a));
  })();

  // 🔴 En granel no se sugiere numero: el siguiente entero es UN GRAMO mas y
  // "6.001 kg" no es una sugerencia, es ruido. Se avisa el tope y listo.
  const minSugerido =
    ultimoNivel?.cantidadMaxima != null && !u.activa ? ultimoNivel.cantidadMaxima + 1 : null;

  useEffect(() => {
    if (isOpen) {
      if (nivel) {
        setNombre(nivel.nombre);
        setCantidadMinima(String(factor > 1 ? nivel.cantidadMinima / factor : nivel.cantidadMinima));
        setCantidadMaxima(
          nivel.cantidadMaxima == null
            ? ''
            : String(factor > 1 ? nivel.cantidadMaxima / factor : nivel.cantidadMaxima),
        );
        setTieneMaxima(nivel.cantidadMaxima != null);
        setTipoPrecio(nivel.tipoPrecio);
        setPrecio(
          nivel.precio == null
            ? ''
            : factor > 1 ? (Number(nivel.precio) * factor).toFixed(2) : String(nivel.precio),
        );
        setPorcentajeDesc(nivel.porcentajeDesc != null ? String(nivel.porcentajeDesc) : '');
        setDescripcion(nivel.descripcion || '');
      } else {
        setNombre('');
        setCantidadMinima(minSugerido != null ? String(minSugerido) : '');
        setCantidadMaxima(''); setTieneMaxima(false);
        setTipoPrecio('PRECIO_FIJO'); setPrecio(''); setPorcentajeDesc(''); setDescripcion('');
      }
      setErrors({});
    }
  }, [isOpen, nivel, factor, minSugerido]);

  /**
   * A cuánto queda la unidad con lo tecleado. Con precio fijo es el precio; con
   * porcentaje sale del precio de venta, asi que sin precio de venta no hay
   * nada que calcular.
   */
  const precioFinal = (() => {
    if (tipoPrecio === 'PRECIO_FIJO') {
      const p = parseFloat(precio);
      return p > 0 ? p : null;
    }
    const pct = parseFloat(porcentajeDesc);
    if (baseVista == null || isNaN(pct)) return null;
    return baseVista * (1 - pct / 100);
  })();

  const ahorroPct =
    precioFinal != null && baseVista != null && baseVista > 0
      ? ((baseVista - precioFinal) / baseVista) * 100
      : null;
  const perdida =
    precioFinal != null && costoVista != null && precioFinal < costoVista ? costoVista - precioFinal : null;

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'Requerido';
    // 🔴 Lo tecleado esta en presentacion; lo que se guarda va en unidad de
    // venta y es un entero. "1.5 kg" son 1500 g; "0.0005 kg" no llega a 1 g.
    const minVenta = u.activa
      ? Math.round(u.cantidadAUnidadDeVenta(parseFloat(cantidadMinima)))
      : parseInt(cantidadMinima);
    const maxVenta = !tieneMaxima || !cantidadMaxima ? undefined
      : u.activa ? Math.round(u.cantidadAUnidadDeVenta(parseFloat(cantidadMaxima))) : parseInt(cantidadMaxima);
    if (!cantidadMinima || isNaN(minVenta) || minVenta < 1) {
      errs.cantidadMinima = simbolo ? `Muy chica para ${simbolo}` : 'Debe ser >= 1';
    }
    if (maxVenta != null && (isNaN(maxVenta) || maxVenta <= minVenta)) {
      errs.cantidadMaxima = 'Debe ser mayor a la mínima';
    }
    if (tipoPrecio === 'PRECIO_FIJO') {
      const p = parseFloat(precio);
      if (!precio || p <= 0) errs.precio = 'Requerido';
      // Un nivel por volumen que no baja el precio no es un nivel.
      else if (baseVista != null && baseVista > 0 && p >= baseVista) {
        errs.precio = `Debe ser menor al precio de venta (${money(baseVista)})`;
      }
    }
    if (tipoPrecio === 'PORCENTAJE_DESCUENTO') {
      const pct = parseFloat(porcentajeDesc);
      if (!porcentajeDesc || pct <= 0) errs.porcentajeDesc = 'Requerido';
      else if (pct > 100) errs.porcentajeDesc = 'Entre 0 y 100';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    onSave({
      nombre: nombre.trim(),
      cantidadMinima: minVenta,
      ...(maxVenta != null && { cantidadMaxima: maxVenta }),
      tipoPrecio,
      ...(tipoPrecio === 'PRECIO_FIJO' && { precio: u.precioAUnidadDeVenta(parseFloat(precio)) }),
      ...(tipoPrecio === 'PORCENTAJE_DESCUENTO' && { porcentajeDesc: parseFloat(porcentajeDesc) }),
      ...(descripcion && { descripcion }),
    });
  };

  if (!isOpen) return null;

  const otros = nivelesExistentes.filter(n => n.id !== nivel?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={nivel ? 'Editar nivel de precio' : 'Nuevo nivel de precio'}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 font-sans shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-gray-900">{nivel ? 'Editar nivel de precio' : 'Nuevo nivel de precio'}</h3>
        <p className="mt-1 text-[11px] text-gray-500">
          Un nivel cobra más barato a partir de cierta cantidad{simbolo ? ` (en ${simbolo})` : ''}.
        </p>

        {/* Contra qué se compara: el precio y el costo del producto en la sede.
            Sin esto se teclea a ciegas y no se sabe si el nivel deja ganancia. */}
        {(baseVista != null || costoVista != null) && (
          <div className={`${CAJA} mt-4 flex gap-4 bg-[#eaf2fd] ring-[#cfe0f5] px-3 py-2`}>
            {baseVista != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#7ea6d8]">Precio venta</p>
                <p className="text-[13px] font-medium text-[#004A94]">{money(baseVista)}{simbolo && <span className="text-[10px] text-[#7ea6d8]"> /{simbolo}</span>}</p>
              </div>
            )}
            {costoVista != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#7ea6d8]">Precio costo</p>
                <p className="text-[13px] font-medium text-[#004A94]">{money(costoVista)}{simbolo && <span className="text-[10px] text-[#7ea6d8]"> /{simbolo}</span>}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input className={INPUT_STD} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Precio por Mayor" />
            {errors.nombre && <p className="mt-1 text-[11px] text-red-500">{errors.nombre}</p>}
          </div>

          {/* Los niveles que ya existen, para no pisar un tramo ni dejar un
              hueco entre dos. */}
          {otros.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-600">Niveles que ya tiene</p>
              <div className="space-y-1">
                {otros.map(n => (
                  <div key={n.id} className="flex items-center justify-between rounded-[6px] bg-zinc-50 px-2.5 py-1.5 text-[11px] ring-1 ring-[#cfe0f5]">
                    <span className="truncate text-gray-700">
                      {n.nombre}
                      <span className="ml-1 text-gray-400">
                        {u.cantidadTexto(n.cantidadMinima)}
                        {n.cantidadMaxima ? `-${u.cantidadTexto(n.cantidadMaxima)}` : '+'}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium text-[#004A94]">
                      {n.tipoPrecio === 'PRECIO_FIJO' && n.precio != null
                        ? money(Number(n.precio) * factor)
                        : n.porcentajeDesc != null ? `−${n.porcentajeDesc}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Cantidad mín *{simbolo && ` (${simbolo})`}</label>
              <input className={INPUT_STD} type="number" min="0" step={u.activa ? 'any' : '1'} value={cantidadMinima} onChange={e => setCantidadMinima(e.target.value)} placeholder="1" />
              {errors.cantidadMinima && <p className="mt-1 text-[11px] text-red-500">{errors.cantidadMinima}</p>}
              {!errors.cantidadMinima && !nivel && ultimoNivel && (
                <p className="mt-1 text-[10px] text-gray-400">
                  {ultimoNivel.cantidadMaxima != null
                    ? `"${ultimoNivel.nombre}" llega hasta ${u.cantidadTexto(ultimoNivel.cantidadMaxima)}${u.activa ? '' : `, así que este arranca en ${u.cantidadTexto(ultimoNivel.cantidadMaxima + 1)}`}.`
                    : `"${ultimoNivel.nombre}" no tiene tope (${u.cantidadTexto(ultimoNivel.cantidadMinima)}+): ponele un máximo antes de agregar otro.`}
                </p>
              )}
            </div>
            <div>
              {/* La máxima es opcional y por defecto NO existe: un nivel sin
                  tope es lo normal ("desde 12 en adelante"). */}
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={tieneMaxima}
                  onChange={e => { setTieneMaxima(e.target.checked); if (!e.target.checked) setCantidadMaxima(''); }}
                  className="accent-[#004A94]"
                />
                Cantidad máx{simbolo && ` (${simbolo})`}
              </label>
              <input
                className={`${INPUT_STD} ${tieneMaxima ? '' : 'cursor-not-allowed opacity-50'}`}
                type="number" min="0" step={u.activa ? 'any' : '1'} disabled={!tieneMaxima}
                value={cantidadMaxima} onChange={e => setCantidadMaxima(e.target.value)}
                placeholder={tieneMaxima ? '0' : 'Sin límite'}
              />
              {errors.cantidadMaxima && <p className="mt-1 text-[11px] text-red-500">{errors.cantidadMaxima}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL}>Tipo de precio</label>
            <div className="flex gap-2">
              {([['PRECIO_FIJO', 'Precio fijo'], ['PORCENTAJE_DESCUENTO', '% Descuento']] as const).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipoPrecio(valor)}
                  className={`h-[30px] flex-1 rounded-[6px] text-xs transition-colors ${tipoPrecio === valor
                    ? 'bg-[#eaf2fd] font-medium text-[#004A94] ring-1 ring-[#004A94]'
                    : 'bg-zinc-100 text-gray-500 ring-1 ring-blue-400 hover:text-[#004A94]'}`}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>

          {tipoPrecio === 'PRECIO_FIJO' ? (
            <div>
              <label className={LABEL}>Precio *{simbolo && ` (por ${simbolo})`}</label>
              <input className={INPUT_STD} type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" />
              {errors.precio && <p className="mt-1 text-[11px] text-red-500">{errors.precio}</p>}
            </div>
          ) : (
            <div>
              <label className={LABEL}>Descuento % *</label>
              <input className={INPUT_STD} type="number" step="0.1" min="0" max="100" value={porcentajeDesc} onChange={e => setPorcentajeDesc(e.target.value)} placeholder="10" />
              {errors.porcentajeDesc && <p className="mt-1 text-[11px] text-red-500">{errors.porcentajeDesc}</p>}
            </div>
          )}

          {/* A cuánto queda la unidad, y el aviso si eso está por debajo del
              costo: es la pregunta que se hace quien carga el nivel. */}
          {precioFinal != null && (
            <div className={`${CAJA} ${perdida != null ? 'bg-red-50 ring-red-400' : 'bg-zinc-100 ring-blue-400'} px-3 py-2`}>
              <p className="text-xs text-gray-700">
                Precio final <span className="font-medium text-[#004A94]">{money(precioFinal)}</span>
                {simbolo && <span className="text-[10px] text-gray-400"> /{simbolo}</span>}
                {ahorroPct != null && ahorroPct > 0 && (
                  <span className="ml-1 text-[11px] text-green-600">(−{ahorroPct.toFixed(1)}%)</span>
                )}
              </p>
              {perdida != null && (
                <p className="mt-1 text-[11px] font-medium text-red-700">
                  Pérdida de {money(perdida)} por {simbolo || 'unidad'} — está por debajo del costo.
                </p>
              )}
            </div>
          )}

          <div>
            <label className={LABEL}>Descripción</label>
            <input className={INPUT_STD} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>

        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando…' : nivel ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
