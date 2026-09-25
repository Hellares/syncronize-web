'use client';

import { useEffect, useState } from 'react';
import { Sede } from '@/lib/types';
import { TiendaColors, alpha } from '@/lib/colors';

/**
 * Orden fijo de la semana: `horarioAtencion` es jsonb y NO conserva el orden
 * de las claves (salía lunes, jueves, martes…).
 */
const DIAS = [
  { clave: 'lunes', corto: 'Lun' },
  { clave: 'martes', corto: 'Mar' },
  { clave: 'miercoles', corto: 'Mié' },
  { clave: 'jueves', corto: 'Jue' },
  { clave: 'viernes', corto: 'Vie' },
  { clave: 'sabado', corto: 'Sáb' },
  { clave: 'domingo', corto: 'Dom' },
];

type Tramo = { inicio: string; fin: string };

/** `miércoles` y `miercoles` son la misma clave. */
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function horarioOrdenado(horario?: Record<string, Tramo>) {
  if (!horario) return [];
  const porClave = new Map(Object.entries(horario).map(([dia, t]) => [sinTildes(dia), t]));
  return DIAS.map((d) => ({ ...d, tramo: porClave.get(d.clave) ?? null }));
}

/** Día (clave de DIAS) y hora "HH:mm" de ahora en Lima. */
function ahoraEnLima() {
  const partes = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return { dia: sinTildes(valor('weekday')), hora: `${valor('hour')}:${valor('minute')}` };
}

interface Props {
  sede: Sede;
  colors: TiendaColors;
}

export function UbicacionCard({ sede, colors }: Props) {
  const dias = horarioOrdenado(sede.horarioAtencion);
  const lat = sede.coordenadas?.lat;
  const lng = sede.coordenadas?.lng ?? sede.coordenadas?.lon;
  const hayMapa = lat != null && lng != null;
  const comoLlegar = hayMapa ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  // Distrito / provincia / departamento sin repetir (en muchos datos el
  // distrito y la provincia son el mismo nombre).
  const zona = [...new Set([sede.distrito, sede.provincia, sede.departamento].filter(Boolean))].join(', ');

  // "Todos los días" cuando los 7 tienen el mismo horario.
  const todosIguales = dias.length === 7 && dias.every((d) =>
    d.tramo && d.tramo.inicio === dias[0].tramo?.inicio && d.tramo.fin === dias[0].tramo?.fin);

  // Abierto/cerrado depende de la hora: se calcula recién en el navegador
  // para que el HTML del servidor no difiera del primer render del cliente.
  const [ahora, setAhora] = useState<{ dia: string; hora: string } | null>(null);
  useEffect(() => {
    const tick = () => setAhora(ahoraEnLima());
    const primero = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => { clearTimeout(primero); clearInterval(id); };
  }, []);
  const hoy = ahora ? dias.find((d) => d.clave === ahora.dia) : undefined;
  const abierto = !!(ahora && hoy?.tramo && ahora.hora >= hoy.tramo.inicio && ahora.hora < hoy.tramo.fin);

  // Mapa de OpenStreetMap: no necesita API key. Un recuadro de ~600 m.
  const d = 0.004;
  const mapa = hayMapa
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - d},${lat! - d},${lng! + d},${lat! + d}&layer=mapnik&marker=${lat},${lng}`
    : null;

  return (
    // `relative`: sin posición, las manchas de color del fondo (fixed, z-0)
    // se pintaban encima de la tarjeta y la teñían.
    <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden mt-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Título */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 leading-tight">Ubicación</h3>
          <p className="text-[11px] text-gray-400 truncate">{sede.nombre}</p>
        </div>
      </div>

      {/* Mapa: lleva a Google Maps; sin interacción propia para no atrapar el scroll */}
      {mapa && comoLlegar && (
        <a href={comoLlegar} target="_blank" rel="noopener noreferrer" className="block relative h-36 bg-gray-100 overflow-hidden" aria-label="Ver en el mapa">
          {/* Al doble de tamaño y achicado a la mitad: a 224 px de ancho los
              créditos de OpenStreetMap tapaban medio mapa; así quedan chicos
              (y siguen ahí, la licencia los pide). */}
          <iframe
            src={mapa} title={`Mapa de ${sede.nombre}`} loading="lazy"
            className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 border-0 pointer-events-none"
          />
        </a>
      )}

      <div className="p-4 space-y-3">
        {/* Dirección */}
        {(sede.direccion || zona) && (
          <div>
            {sede.direccion && <p className="text-[13px] font-semibold text-gray-800 leading-snug">{sede.direccion}</p>}
            {zona && <p className="text-xs text-gray-500 mt-0.5">{zona}</p>}
            {sede.referencia && <p className="text-xs text-gray-500 mt-1">Ref.: {sede.referencia}</p>}
            {sede.stand && <p className="text-xs text-gray-500 mt-0.5">Stand: {sede.stand}</p>}
          </div>
        )}

        {comoLlegar && (
          <a
            href={comoLlegar} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.primario }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Cómo llegar
          </a>
        )}

        {/* Horario */}
        {dias.some((x) => x.tramo) && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Horario
              </p>
              {ahora && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${abierto ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {abierto ? '● Abierto ahora' : '● Cerrado'}
                </span>
              )}
            </div>

            {todosIguales ? (
              <p className="text-xs text-gray-600">
                Todos los días <span className="font-semibold text-gray-800">{dias[0].tramo!.inicio} – {dias[0].tramo!.fin}</span>
              </p>
            ) : (
              <div className="space-y-0.5">
                {dias.map((dia) => {
                  const esHoy = ahora?.dia === dia.clave;
                  return (
                    <div
                      key={dia.clave}
                      className={`flex justify-between text-xs px-2 py-1 rounded-md ${esHoy ? 'font-semibold' : 'text-gray-500'}`}
                      style={esHoy ? { backgroundColor: alpha(colors.primario, 0.08), color: colors.primario } : undefined}
                    >
                      <span>{dia.corto}</span>
                      <span>{dia.tramo ? `${dia.tramo.inicio} – ${dia.tramo.fin}` : 'Cerrado'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
