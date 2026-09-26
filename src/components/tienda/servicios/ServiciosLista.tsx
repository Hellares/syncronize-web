'use client';

import { useMemo, useState } from 'react';
import { TiendaColors, alpha } from '@/lib/colors';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { ServicioTienda, categoriaServicio, duracionServicio, precioServicio } from '@/lib/servicios-web';
import { IconoServicio } from '../ServiciosCard';

interface Props {
  servicios: ServicioTienda[];
  colors: TiendaColors;
  telefono?: string;
  empresaNombre: string;
}

/** Tarjetas de servicios con filtro por categoría (solo si hay más de una). */
export function ServiciosLista({ servicios, colors, telefono, empresaNombre }: Props) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const categorias = useMemo(
    () => [...new Set(servicios.map(categoriaServicio).filter((c): c is string => !!c))],
    [servicios],
  );
  const visibles = categoria ? servicios.filter((s) => categoriaServicio(s) === categoria) : servicios;

  return (
    <div className="flex flex-col gap-5">
      {categorias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[null, ...categorias].map((c) => {
            const activa = c === categoria;
            return (
              <button
                key={c ?? 'todos'}
                type="button"
                onClick={() => setCategoria(c)}
                className="flex-shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors"
                style={activa ? { backgroundColor: colors.primario, color: '#fff' } : { backgroundColor: '#fff', color: '#3a4a63' }}
                aria-pressed={activa}
              >
                {c ?? 'Todos'}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-start">
        {visibles.map((s) => {
          const { etiqueta, precio, antes } = precioServicio(s);
          const duracion = duracionServicio(s);
          const whatsapp = enlaceChatWhatsapp(telefono, `Hola ${empresaNombre}, quisiera solicitar el servicio:\n\n*${s.nombre}*`);
          return (
            <article key={s.id} className="bg-white rounded-xl px-4 py-3.5 md:px-6 md:py-3.5 flex flex-col gap-3 shadow-[0_2px_12px_rgba(15,26,46,0.06)]">
              {/* Ícono y título en la misma fila. Amazon Ember solo trae 400/500/700:
                  `font-bold`/`extrabold` caen en la Bold y se ven pesados. */}
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 md:w-12 md:h-12 rounded-[10px] md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
                  <IconoServicio className="w-5 h-5 md:w-6 md:h-6" />
                </span>
                <h3 className="flex-1 min-w-0 text-[13px] md:text-[15px] font-medium text-gray-900 leading-snug">{s.nombre}</h3>
                {s.destacado && (
                  <span className="flex-shrink-0 text-[10px] md:text-[11px] font-medium tracking-wide uppercase text-amber-800 bg-amber-100 px-2 py-1 rounded-md">Más pedido</span>
                )}
              </div>
              {s.descripcion && <p className="text-[13px] md:text-sm leading-relaxed text-gray-500 line-clamp-3">{s.descripcion}</p>}

              {(duracion || s.requiereReserva) && (
                <div className="flex flex-wrap gap-3.5 text-[13px] text-gray-600">
                  {duracion && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                      {duracion}
                    </span>
                  )}
                  {s.requiereReserva && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
                      Con cita
                    </span>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] md:text-xs text-gray-500">{etiqueta}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-lg md:text-xl font-medium text-gray-900 tabular-nums">{precio}</span>
                    {antes && <span className="text-xs text-gray-400 line-through tabular-nums">{antes}</span>}
                  </span>
                </div>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-lg text-white text-sm font-medium flex items-center hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: colors.primario }}
                  >
                    Solicitar
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
