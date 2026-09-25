'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ItemCarrito, soles } from '@/lib/tienda-compra';
import { TiendaColors } from '@/lib/colors';
import { useSesionTienda } from './SesionTienda';

/** Bloque "tienes que ingresar" de las páginas de compra. */
export function PedirIngreso({ texto, colors }: { texto: string; colors: TiendaColors }) {
  const { pedirIngreso } = useSesionTienda();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <p className="text-gray-600 mb-4">{texto}</p>
      <button
        type="button"
        onClick={() => pedirIngreso()}
        className="px-6 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90"
        style={{ backgroundColor: colors.primario }}
      >
        Ingresar
      </button>
    </div>
  );
}

export function Cargando() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );
}

export function CarritoVista({ colors }: { colors: TiendaColors }) {
  const { subdominio, usuario, grupo, carritoCargado, cambiarCantidad, pedirIngreso } = useSesionTienda();
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Sin sesión se ve el carrito del navegador: el DNI se pide recién al continuar.
  if (usuario === undefined || !carritoCargado) return <Cargando />;

  const items = grupo?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-gray-600 mb-4">Tu carrito está vacío.</p>
        <Link href={`/${subdominio}`} className="text-sm font-medium underline underline-offset-2" style={{ color: colors.primario }}>
          Ver productos
        </Link>
      </div>
    );
  }

  const cambiar = async (item: ItemCarrito, cantidad: number) => {
    setOcupado(item.id);
    try {
      await cambiarCantidad(item, cantidad);
    } finally {
      setOcupado(null);
    }
  };

  const continuar = (e: React.MouseEvent) => {
    if (usuario) return; // el Link lleva al checkout
    e.preventDefault();
    pedirIngreso(() => router.push(`/${subdominio}/checkout`));
  };

  const noDisponibles = items.filter((i) => !i.disponible);
  const total = grupo?.subtotal ?? 0;

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-5 items-start">
      <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {items.map((item) => {
          const rebajado = item.precioNormal > item.precioUnitario + 0.005;
          return (
            <li key={item.id} className={`p-4 flex gap-3 ${ocupado === item.id ? 'opacity-50' : ''}`}>
              <div className="w-16 h-16 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
                {item.imagenUrl && <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.productoNombre}</p>
                {item.varianteNombre && <p className="text-xs text-gray-500 mt-0.5">{item.varianteNombre}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  {soles(item.precioUnitario)} c/u
                  {rebajado && <span className="ml-1.5 line-through text-gray-400">{soles(item.precioNormal)}</span>}
                  {item.nivelAplicado && <span className="ml-1.5 text-emerald-600">{item.nivelAplicado}</span>}
                </p>
                {!item.disponible && (
                  <p className="text-xs text-red-600 mt-1">
                    {item.stockDisponible > 0 ? `Solo quedan ${item.stockDisponible}` : 'Ya no hay stock'}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button type="button" aria-label="Menos" className="w-8 h-8 text-gray-600 disabled:opacity-30"
                      disabled={!!ocupado || item.cantidad <= 1} onClick={() => void cambiar(item, item.cantidad - 1)}>−</button>
                    <span className="w-8 text-center text-sm">{item.cantidad}</span>
                    <button type="button" aria-label="Más" className="w-8 h-8 text-gray-600 disabled:opacity-30"
                      disabled={!!ocupado || item.cantidad >= item.stockDisponible} onClick={() => void cambiar(item, item.cantidad + 1)}>+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{soles(item.subtotal)}</span>
                    <button type="button" onClick={() => void cambiar(item, 0)} disabled={!!ocupado}
                      className="text-xs text-gray-400 hover:text-red-600" aria-label={`Quitar ${item.productoNombre}`}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 md:sticky md:top-24">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Productos ({items.reduce((n, i) => n + i.cantidad, 0)})</span>
          <span>{soles(total)}</span>
        </div>
        <p className="text-xs text-gray-400">El envío se coordina en el siguiente paso.</p>
        <div className="flex justify-between text-base font-medium text-gray-900 pt-3 border-t border-gray-100">
          <span>Total</span>
          <span>{soles(total)}</span>
        </div>
        {noDisponibles.length > 0 && (
          <p className="text-xs text-red-600">Ajusta los productos marcados en rojo para continuar.</p>
        )}
        <Link
          href={`/${subdominio}/checkout`}
          onClick={continuar}
          aria-disabled={noDisponibles.length > 0}
          className={`block w-full py-3 rounded-lg text-center text-white text-sm font-medium hover:opacity-90 ${noDisponibles.length > 0 ? 'pointer-events-none opacity-40' : ''}`}
          style={{ backgroundColor: colors.primario }}
        >
          Continuar compra
        </Link>
        {!usuario && (
          <p className="text-xs text-gray-400 text-center">Para continuar te pediremos tu DNI.</p>
        )}
      </aside>
    </div>
  );
}
