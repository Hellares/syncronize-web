'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSesionTienda } from './SesionTienda';
import { soles } from '@/lib/tienda-compra';
import { volarAlCarrito } from './volar-al-carrito';

export interface VarianteCompra {
  id: string;
  nombre: string;
  atributos: { nombre: string; valor: string; clave?: string | null }[];
  imagenes?: { url: string; thumbnail: string | null }[];
  precio: number | null;
  precioOferta: number | null;
  enOferta: boolean;
  hayStock: boolean;
  stockActual: number;
}

interface Props {
  productoId: string;
  /** Para mostrarlo en el carrito del navegador (sin sesión). */
  nombre: string;
  precio: number | null;
  imagenUrl: string | null;
  hayStock: boolean;
  stockActual: number;
  variantes: VarianteCompra[];
  colorPrimario: string;
}

/**
 * Cantidad + "Agregar al carrito" / "Comprar ahora" del detalle. Con
 * variantes se elige atributo por atributo (Tamaño, Color…): una opción que
 * con lo ya elegido no tiene stock queda deshabilitada, y recién con todos
 * los atributos elegidos queda una variante concreta para comprar.
 */
/**
 * Clave del atributo "Diseño": una foto = un diseño con su propio stock. Sus
 * valores (D1, D2…) no le dicen nada al comprador, así que se elige por FOTO y
 * solo se muestran los diseños que quedan: uno agotado desaparece.
 */
const CLAVE_DISENO = 'diseno';

export function ComprarPanel({ productoId, nombre, precio, imagenUrl, hayStock, stockActual, variantes, colorPrimario }: Props) {
  const { agregar, subdominio } = useSesionTienda();
  const router = useRouter();
  const [eleccion, setEleccion] = useState<Record<string, string>>({});
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState<'agregar' | 'comprar' | null>(null);

  const conVariantes = variantes.length > 0;

  // Atributos en el orden de la primera variante, con sus valores sin repetir.
  const atributos = useMemo(() => {
    const orden: string[] = [];
    const valores = new Map<string, string[]>();
    for (const v of variantes) {
      for (const a of v.atributos) {
        if (!valores.has(a.nombre)) { valores.set(a.nombre, []); orden.push(a.nombre); }
        const lista = valores.get(a.nombre)!;
        if (!lista.includes(a.valor)) lista.push(a.valor);
      }
    }
    return orden.map((nombre) => ({
      nombre,
      valores: valores.get(nombre)!,
      esDiseno: variantes.some((v) => v.atributos.some((a) => a.nombre === nombre && a.clave === CLAVE_DISENO)),
    }));
  }, [variantes]);

  const valorDe = (v: VarianteCompra, nombre: string) => v.atributos.find((a) => a.nombre === nombre)?.valor;

  /** ¿Hay alguna variante con stock que cumpla lo elegido + (nombre = valor)? */
  const posible = (nombre: string, valor: string) =>
    variantes.some((v) =>
      v.hayStock &&
      valorDe(v, nombre) === valor &&
      Object.entries(eleccion).every(([n, val]) => n === nombre || valorDe(v, n) === val));

  const variante = conVariantes && atributos.every((a) => eleccion[a.nombre])
    ? variantes.find((v) => atributos.every((a) => valorDe(v, a.nombre) === eleccion[a.nombre])) ?? null
    : null;

  const maximo = conVariantes ? (variante?.stockActual ?? 1) : stockActual;
  const disponible = conVariantes ? !!variante?.hayStock : hayStock;
  const faltaElegir = conVariantes && !variante;

  /** La foto de la variante que quedaría eligiendo ese diseño con lo ya elegido. */
  const fotoDe = (nombre: string, valor: string) => {
    const v = variantes.find((x) =>
      valorDe(x, nombre) === valor &&
      Object.entries(eleccion).every(([n, val]) => n === nombre || valorDe(x, n) === val));
    const im = v?.imagenes?.[0];
    return im ? (im.thumbnail ?? im.url) : null;
  };

  const precioVariante = variante
    ? (variante.enOferta && variante.precioOferta ? variante.precioOferta : variante.precio)
    : null;

  const elegir = (nombre: string, valor: string) => {
    setEleccion((prev) => {
      const nuevo = { ...prev, [nombre]: prev[nombre] === valor ? '' : valor };
      // Lo elegido antes que ya no combina con esto se suelta.
      for (const a of atributos) {
        if (a.nombre === nombre || !nuevo[a.nombre]) continue;
        const sigue = variantes.some((v) =>
          v.hayStock && Object.entries(nuevo).every(([n, val]) => !val || valorDe(v, n) === val));
        if (!sigue) nuevo[a.nombre] = '';
      }
      return Object.fromEntries(Object.entries(nuevo).filter(([, v]) => v));
    });
    setCantidad(1);
  };

  const ejecutar = async (modo: 'agregar' | 'comprar') => {
    if (faltaElegir || !disponible || enviando) return;
    setEnviando(modo);
    const ok = await agregar(productoId, variante?.id ?? null, cantidad, {
      nombre,
      varianteNombre: variante?.nombre ?? null,
      precio: (variante ? precioVariante : precio) ?? 0,
      imagenUrl: variante?.imagenes?.[0]?.url ?? imagenUrl,
      stockMax: maximo,
    });
    setEnviando(null);
    if (ok && modo === 'agregar') volarAlCarrito(document.querySelector<HTMLElement>('[data-producto-foto]'));
    if (ok && modo === 'comprar') router.push(`/${subdominio}/carrito`);
  };

  if (!conVariantes && !hayStock) return null;

  return (
    <div className="mt-4 space-y-3">
      {atributos.map((a) => (
        <div key={a.nombre}>
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            {a.nombre}{eleccion[a.nombre] && <span className="text-gray-900">: {eleccion[a.nombre]}</span>}
          </p>
          {a.esDiseno ? (
            <div className="flex flex-wrap gap-2">
              {a.valores.filter((val) => posible(a.nombre, val) || eleccion[a.nombre] === val).map((val) => {
                const activo = eleccion[a.nombre] === val;
                const foto = fotoDe(a.nombre, val);
                return (
                  <button
                    key={val}
                    type="button"
                    title={val}
                    onClick={() => elegir(a.nombre, val)}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border-2 bg-gray-50 transition-colors"
                    style={{ borderColor: activo ? colorPrimario : '#e5e7eb' }}
                  >
                    {foto
                      ? <img src={foto} alt={val} className="h-full w-full object-cover" />
                      : <span className="text-xs font-medium text-gray-600">{val}</span>}
                  </button>
                );
              })}
            </div>
          ) : (
          <div className="flex flex-wrap gap-1.5">
            {a.valores.map((val) => {
              const activo = eleccion[a.nombre] === val;
              const ok = posible(a.nombre, val);
              return (
                <button
                  key={val}
                  type="button"
                  disabled={!ok && !activo}
                  onClick={() => elegir(a.nombre, val)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    activo ? 'text-white' : ok ? 'bg-white text-gray-700 border-gray-200 hover:border-gray-400' : 'bg-gray-50 text-gray-300 border-gray-100 line-through cursor-not-allowed'
                  }`}
                  style={activo ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : undefined}
                >
                  {val}
                </button>
              );
            })}
          </div>
          )}
        </div>
      ))}

      {variante && (
        <p className="text-sm text-gray-600">
          {precioVariante != null && <span className="font-medium text-gray-900">{soles(precioVariante)}</span>}
          {' · '}{variante.hayStock ? `${variante.stockActual} disponible${variante.stockActual === 1 ? '' : 's'}` : 'Sin stock'}
        </p>
      )}

      {/* Una sola fila de botones a su ancho; en pantallas angostas bajan de línea */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center h-11 rounded-xl border border-gray-300">
          <button type="button" aria-label="Menos" className="w-10 h-11 text-lg text-gray-700 disabled:opacity-30"
            disabled={cantidad <= 1} onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
          <span className="w-8 text-center text-sm font-bold text-gray-900">{cantidad}</span>
          <button type="button" aria-label="Más" className="w-10 h-11 text-lg text-gray-700 disabled:opacity-30"
            disabled={cantidad >= maximo || faltaElegir} onClick={() => setCantidad((c) => Math.min(maximo, c + 1))}>+</button>
        </div>
        <button
          type="button"
          onClick={() => void ejecutar('agregar')}
          disabled={faltaElegir || !disponible || !!enviando}
          className="h-11 px-5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: colorPrimario }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
            <path d="M2 3h3l2.6 12.2a1 1 0 001 .8h9.5a1 1 0 001-.8L21 7H6" />
          </svg>
          {enviando === 'agregar' ? 'Agregando…' : 'Agregar al carrito'}
        </button>
        <button
          type="button"
          onClick={() => void ejecutar('comprar')}
          disabled={faltaElegir || !disponible || !!enviando}
          className="h-11 px-5 rounded-xl border-2 bg-white text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: colorPrimario, color: colorPrimario }}
        >
          {enviando === 'comprar' ? 'Un momento…' : faltaElegir ? `Falta elegir: ${atributos.find((a) => !eleccion[a.nombre])?.nombre}` : 'Comprar ahora'}
        </button>
      </div>
    </div>
  );
}
