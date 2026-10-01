'use client';

import { useState } from 'react';

interface Atributo { nombre: string; valor: string }

interface Props {
  nombre: string;
  descripcion?: string | null;
  atributos: Atributo[];
  /** Los mismos atributos agrupados por sección; vacío = lista plana. */
  secciones?: { nombre: string; atributos: Atributo[] }[];
  colorPrimario: string;
}

type Pestana = 'descripcion' | 'caracteristicas';

/** Descripción y características del producto en una sola ficha con pestañas. */
export function FichaProducto({ nombre, descripcion, atributos, secciones, colorPrimario }: Props) {
  const pestanas: { id: Pestana; titulo: string }[] = [];
  if (descripcion) pestanas.push({ id: 'descripcion', titulo: 'Descripción' });
  if (atributos.length > 0) pestanas.push({ id: 'caracteristicas', titulo: 'Características' });

  const [elegida, setElegida] = useState<Pestana | null>(null);
  if (pestanas.length === 0) return null;
  const activa = pestanas.some((p) => p.id === elegida) ? elegida : pestanas[0].id;

  const filas = (lista: Atributo[]) => (
    <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
      {lista.map((attr, i) => (
        <div key={`${attr.nombre}-${i}`} className={`flex gap-4 py-2.5 px-4 ${i % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
          <span className="w-1/3 shrink-0 text-sm text-gray-500">{attr.nombre}</span>
          <span className="text-sm font-medium text-gray-800">{attr.valor}</span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="mt-5">
      <div role="tablist" className="flex gap-1 px-3">
        {pestanas.map((p) => {
          const on = p.id === activa;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setElegida(p.id)}
              className={`relative -mb-px h-11 px-5 rounded-t-xl border border-b-0 text-sm font-medium transition-colors ${
                on ? 'bg-white border-gray-200' : 'bg-gray-100 border-transparent text-gray-600 hover:text-gray-900'
              }`}
              style={on ? { color: colorPrimario, boxShadow: `inset 0 3px 0 ${colorPrimario}` } : undefined}
            >
              {p.titulo}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="bg-white rounded-2xl shadow-md border border-gray-200 p-5 md:p-7">
        {activa === 'descripcion' ? (
          <div className="max-w-4xl">
            <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3">{nombre}</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{descripcion}</p>
          </div>
        ) : secciones?.length ? (
          <div className="max-w-4xl space-y-5">
            {secciones.map((seccion) => (
              <div key={seccion.nombre}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">{seccion.nombre}</p>
                {filas(seccion.atributos)}
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl">{filas(atributos)}</div>
        )}
      </div>
    </section>
  );
}
