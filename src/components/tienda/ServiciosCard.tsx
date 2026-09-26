import Link from 'next/link';
import { TiendaColors, alpha } from '@/lib/colors';
import type { ServicioTienda } from '@/lib/servicios-web';

export const IconoServicio = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
  </svg>
);

interface Props {
  subdominio: string;
  servicios: ServicioTienda[];
  total: number;
  colors: TiendaColors;
}

/** Barra lateral (computadora), debajo de Categorías. Sin servicios no se dibuja. */
export function ServiciosCard({ subdominio, servicios, total, colors }: Props) {
  if (servicios.length === 0) return null;
  return (
    <Link
      href={`/${subdominio}/servicios`}
      className="group mt-4 block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: colors.primario }}>
          <IconoServicio className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-gray-900 leading-tight">Servicios</h3>
          <p className="text-[11px] text-gray-400">{total} {total === 1 ? 'servicio' : 'servicios'}</p>
        </div>
      </div>
      <ul className="px-4 pt-2.5 pb-1 space-y-2">
        {servicios.slice(0, 3).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-[13px] text-gray-600">
            <span className="truncate">{s.nombre}</span>
            <span className="text-gray-300" aria-hidden="true">›</span>
          </li>
        ))}
      </ul>
      <span
        className="mx-3 mt-3 mb-3.5 h-10 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors"
        style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}
      >
        Ver todos los servicios
        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

/** Celular (y tablet, sin barra lateral): una fila debajo de las categorías. */
export function ServiciosFila({ subdominio, servicios, total, colors }: Props) {
  if (servicios.length === 0) return null;
  const resumen = servicios.slice(0, 3).map((s) => s.nombre).join(', ') + (total > 3 ? ' y más' : '');
  return (
    <Link
      href={`/${subdominio}/servicios`}
      className="lg:hidden mb-3 flex items-center gap-3 bg-white rounded-xl px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
    >
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: colors.primario }}>
        <IconoServicio className="w-[22px] h-[22px]" />
      </span>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-[15px] font-bold text-gray-900">Servicios</span>
        <span className="text-xs text-gray-500 truncate">{resumen}</span>
      </span>
      <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
        {total}
      </span>
      <svg className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
