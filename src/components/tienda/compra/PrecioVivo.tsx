'use client';

import type { ReactNode } from 'react';
import { soles } from '@/lib/tienda-compra';
import { useSeleccionVariante } from './seleccion-variante';

/**
 * El precio del detalle. Mientras el cliente elige variante muestra el de lo
 * elegido: "desde S/ 75.00" hasta que la variante queda completa y, ahí, el
 * exacto (con el de lista tachado si está en oferta). Sin selección, lo que
 * armó la página en el servidor (`children`).
 */
export function PrecioVivo({ children }: { children: ReactNode }) {
  const s = useSeleccionVariante()?.seleccion;
  if (!s || s.precio == null) return <>{children}</>;
  const enOferta = s.precioAntes != null && s.precioAntes > s.precio;
  const pct = enOferta ? Math.round((1 - s.precio / s.precioAntes!) * 100) : 0;
  return (
    <>
      {enOferta && <p className="text-sm text-gray-400 line-through">{soles(s.precioAntes!)}</p>}
      <div className="flex items-baseline gap-2 flex-wrap">
        {s.desde && <span className="text-sm font-semibold text-gray-500">desde</span>}
        <span className={`text-3xl font-extrabold ${enOferta ? 'text-green-600' : 'text-gray-900'}`}>
          {soles(s.precio)}
        </span>
        {pct > 0 && (
          <span className="self-center text-sm font-bold text-white px-2.5 py-1 rounded-lg bg-green-500">-{pct}%</span>
        )}
      </div>
    </>
  );
}
