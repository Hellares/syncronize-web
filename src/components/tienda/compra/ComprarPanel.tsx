'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSesionTienda } from './SesionTienda';
import { soles } from '@/lib/tienda-compra';
import { volarAlCarrito } from './volar-al-carrito';

export interface VarianteCompra {
  id: string;
  nombre: string;
  atributos: { nombre: string; valor: string }[];
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
    return orden.map((nombre) => ({ nombre, valores: valores.get(nombre)! }));
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
      imagenUrl,
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
        </div>
      ))}

      {variante && (
        <p className="text-sm text-gray-600">
          {precioVariante != null && <span className="font-medium text-gray-900">{soles(precioVariante)}</span>}
          {' · '}{variante.hayStock ? `${variante.stockActual} disponible${variante.stockActual === 1 ? '' : 's'}` : 'Sin stock'}
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-gray-200">
          <button type="button" aria-label="Menos" className="w-9 h-10 text-lg text-gray-600 disabled:opacity-30"
            disabled={cantidad <= 1} onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
          <span className="w-8 text-center text-sm font-medium text-gray-900">{cantidad}</span>
          <button type="button" aria-label="Más" className="w-9 h-10 text-lg text-gray-600 disabled:opacity-30"
            disabled={cantidad >= maximo || faltaElegir} onClick={() => setCantidad((c) => Math.min(maximo, c + 1))}>+</button>
        </div>
        <button
          type="button"
          onClick={() => void ejecutar('agregar')}
          disabled={faltaElegir || !disponible || !!enviando}
          className="flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: colorPrimario, color: colorPrimario }}
        >
          {enviando === 'agregar' ? 'Agregando…' : 'Agregar al carrito'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void ejecutar('comprar')}
        disabled={faltaElegir || !disponible || !!enviando}
        className="w-full h-11 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: colorPrimario }}
      >
        {enviando === 'comprar' ? 'Un momento…' : faltaElegir ? `Falta elegir: ${atributos.find((a) => !eleccion[a.nombre])?.nombre}` : 'Comprar ahora'}
      </button>
    </div>
  );
}
