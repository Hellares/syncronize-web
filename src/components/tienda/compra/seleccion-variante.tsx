'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Lo que el selector de variantes (`ComprarPanel`) le cuenta al resto del
 * detalle mientras el cliente elige: qué fotos mostrar en la galería y qué
 * precio. La galería y el precio los arma la página en el servidor; sin esto
 * quedaban fijos en los del producto aunque se eligiera ALIANZA D5.
 */
export interface FotoSeleccion {
  url: string;
  thumbnail: string | null;
}

export interface SeleccionVariante {
  /** Fotos para la galería (null = las del producto). */
  fotos: FotoSeleccion[] | null;
  /** La que va en grande (url). */
  fotoActiva: string | null;
  /** Precio a mostrar (null = el del producto). */
  precio: number | null;
  /** Precio de lista tachado cuando la variante está en oferta. */
  precioAntes: number | null;
  /** "desde": todavía no hay una variante concreta y los precios varían. */
  desde: boolean;
  /** Etiqueta sobre la foto ("ALIANZA · D5"). */
  etiqueta: string | null;
}

export const SELECCION_VACIA: SeleccionVariante = {
  fotos: null, fotoActiva: null, precio: null, precioAntes: null, desde: false, etiqueta: null,
};

const Ctx = createContext<{
  seleccion: SeleccionVariante;
  setSeleccion: (s: SeleccionVariante) => void;
} | null>(null);

export function SeleccionVarianteProvider({ children }: { children: ReactNode }) {
  const [seleccion, setSeleccion] = useState<SeleccionVariante>(SELECCION_VACIA);
  const valor = useMemo(() => ({ seleccion, setSeleccion }), [seleccion]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Null fuera del provider: los componentes siguen funcionando solos. */
export function useSeleccionVariante() {
  return useContext(Ctx);
}
