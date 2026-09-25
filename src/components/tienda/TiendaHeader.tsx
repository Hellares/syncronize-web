'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CategoriaTienda, Empresa, Sede } from '@/lib/types';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { TiendaColors, lighten } from '@/lib/colors';

interface Props {
  empresa: Empresa;
  subdominio: string;
  categorias: CategoriaTienda[];
  categoriaActiva: string | null;
  /** `null` = "Todos". */
  onCategoria: (id: string | null) => void;
  /** Sin servicios visibles, el enlace "Servicios" no tendría adónde ir. */
  hayServicios: boolean;
  sedePrincipal?: Sede;
  onSearch?: (query: string) => void;
  colors: TiendaColors;
}

/**
 * Cuántas categorías entran sueltas en la barra según el ancho; todas están
 * siempre en el botón "Categorías". Los enlaces Productos/Servicios/Ubicación
 * solo aparecen en xl, donde sobra lugar.
 */
const CATEGORIAS_EN_BARRA = { md: 3, lg: 5, xl: 7 };

const IconoWhatsapp = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.004 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.004 0C5.46 0 .132 5.335.13 11.892c0 2.096.547 4.142 1.588 5.945L.03 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const IconoUbicacion = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconoCorreo = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconoCamion = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zM18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
);

/**
 * El carrito todavía no existe en la tienda web: el ícono queda puesto para
 * cuando se implemente, sin acción y avisando que viene.
 */
const BotonCarrito = () => (
  <button
    type="button"
    aria-label="Carrito (muy pronto)"
    title="Carrito: muy pronto"
    className="relative flex items-center p-1 text-gray-900 cursor-default"
  >
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
    <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
      0
    </span>
  </button>
);

type Red = 'facebook' | 'instagram' | 'tiktok';

const PERFIL: Record<Red, (usuario: string) => string> = {
  facebook: (u) => `https://www.facebook.com/${u}`,
  instagram: (u) => `https://www.instagram.com/${u}`,
  tiktok: (u) => `https://www.tiktok.com/@${u}`,
};

/**
 * El link tal como lo cargó la empresa en el app: puede venir completo, sin
 * `https://` o como `@usuario`. null si está vacío.
 */
function linkDeRed(red: Red, valor?: string | null): string | null {
  const v = valor?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (!v.startsWith('@') && /^[^\s/]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`;
  return PERFIL[red](v.replace(/^@/, ''));
}

/**
 * Las redes que la empresa cargó, en el orden de la imagen de referencia.
 * Salen de `webConfig.redes` (Personalización en el app); Facebook e Instagram
 * caen a las columnas viejas de la empresa si ahí no hay nada.
 */
function redesDe(empresa: Empresa) {
  const redes = empresa.personalizaciones?.[0]?.webConfig?.redes;
  const lista: { nombre: string; url: string | null; icono: React.ReactNode }[] = [
    {
      nombre: 'Facebook', url: linkDeRed('facebook', redes?.facebook || empresa.facebook),
      icono: <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />,
    },
    {
      nombre: 'Instagram', url: linkDeRed('instagram', redes?.instagram || empresa.instagram),
      icono: <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.88 5.88 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.88 5.88 0 002.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 002.13-1.38 5.88 5.88 0 001.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 00-1.38-2.13A5.88 5.88 0 0019.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />,
    },
    {
      nombre: 'TikTok', url: linkDeRed('tiktok', redes?.tiktok),
      icono: <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />,
    },
  ];
  return lista.filter((r): r is { nombre: string; url: string; icono: React.ReactNode } => !!r.url);
}

export function TiendaHeader({
  empresa, subdominio, categorias, categoriaActiva, onCategoria, hayServicios, sedePrincipal, onSearch, colors,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const barraRef = useRef<HTMLDivElement>(null);
  const categoriasRef = useRef<HTMLDivElement>(null);

  const whatsapp = enlaceChatWhatsapp(empresa.telefono);
  const redes = redesDe(empresa);
  // Solo datos reales de la empresa: la franja superior no promete nada que
  // la empresa no haya marcado (los envíos son un switch en Personalización).
  const telefonos = [...new Set([empresa.telefono, sedePrincipal?.telefono].filter(Boolean))] as string[];
  const lugar = [sedePrincipal?.distrito, sedePrincipal?.provincia].filter(Boolean).join(', ');
  const enviosNacionales = empresa.personalizaciones?.[0]?.webConfig?.enviosNacionales === true;

  // Izquierda y centro de la franja: los dos primeros que la empresa tenga.
  const avisos = [
    enviosNacionales && (
      <span key="envios" className="flex items-center gap-1.5 truncate">
        <IconoCamion className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Envíos a todo el Perú</span>
      </span>
    ),
    lugar && (
      <a key="lugar" href="#ubicacion" className="flex items-center gap-1.5 hover:text-white/80 transition-colors truncate">
        <IconoUbicacion className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{lugar}</span>
      </a>
    ),
    empresa.email && (
      <a key="email" href={`mailto:${empresa.email}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors truncate">
        <IconoCorreo className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{empresa.email}</span>
      </a>
    ),
  ].filter(Boolean).slice(0, 2);

  // La barra pegada tapa el comienzo de cada sección al saltar a un ancla:
  // el `scroll-padding` del documento se ajusta a su alto real (cambia entre
  // celular y escritorio, y cuando se abre el menú).
  useEffect(() => {
    const barra = barraRef.current;
    if (!barra) return;
    const html = document.documentElement;
    const ajustar = () => { html.style.scrollPaddingTop = `${barra.offsetHeight + 8}px`; };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(barra);
    return () => { ro.disconnect(); html.style.scrollPaddingTop = ''; };
  }, []);

  // El desplegable de categorías se cierra al tocar afuera.
  useEffect(() => {
    if (!categoriasOpen) return;
    const cerrar = (e: MouseEvent) => {
      if (!categoriasRef.current?.contains(e.target as Node)) setCategoriasOpen(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [categoriasOpen]);

  const buscar = (q: string) => {
    onSearch?.(q);
    document.getElementById('productos-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const elegir = (id: string | null) => {
    setCategoriasOpen(false);
    setMenuOpen(false);
    onCategoria(id);
  };

  const enlaceMovil = 'block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg';

  return (
    <>
      {/* Franja superior: se va con el scroll, no queda pegada */}
      {(avisos.length > 0 || telefonos.length > 0) && (
        <div className="relative z-30 text-white" style={{ backgroundColor: colors.primario }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-center md:justify-between gap-4 text-[12px] md:text-[13px] font-semibold">
            {[0, 1].map((i) => (
              <div key={i} className="hidden md:flex min-w-0">{avisos[i]}</div>
            ))}

            {telefonos.length > 0 ? (
              <a
                href={whatsapp ?? undefined}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white/80 transition-colors whitespace-nowrap"
              >
                <IconoWhatsapp className="w-4 h-4 flex-shrink-0 text-green-300" />
                Atención: {telefonos.join(' - ')}
              </a>
            ) : <span className="hidden md:block" />}
          </div>
        </div>
      )}

      {/* Lo que queda pegado arriba: franja blanca + barra de categorías */}
      <header ref={barraRef} className="sticky top-0 z-30">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 md:py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-2">
            {/* Logo */}
            <Link href={`/${subdominio}`} className="flex items-center flex-shrink-0 mr-auto md:mr-0">
              {empresa.logo ? (
                <img src={empresa.logo} alt={empresa.nombre} className="h-11 md:h-16 max-w-[190px] md:max-w-[260px] object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: colors.primario }}>
                    {empresa.nombre[0]}
                  </div>
                  <span className="font-bold text-sm leading-tight text-gray-900 max-w-[200px] line-clamp-2">{empresa.nombre}</span>
                </div>
              )}
            </Link>

            {/* Carrito + hamburguesa (celular) */}
            <div className="md:hidden">
              <BotonCarrito />
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-1.5 text-gray-700"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>

            {/* Buscador: en el celular baja a su propia fila */}
            <form
              className="order-last md:order-none w-full md:flex-1 md:max-w-2xl flex"
              onSubmit={(e) => { e.preventDefault(); buscar(searchQuery); }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="Buscar productos..."
                className="flex-1 min-w-0 pl-4 md:pl-5 pr-3 py-2.5 md:py-3 rounded-l-lg border border-r-0 border-gray-200 bg-white text-sm text-gray-900 focus:outline-none placeholder:text-gray-500"
                onFocus={(e) => { e.currentTarget.style.borderColor = colors.primario; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="px-5 md:px-8 rounded-r-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: colors.primario }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Redes + contacto + carrito (escritorio): el carrito va siempre.
                `ml-auto` manda el espacio libre ANTES del grupo (lo separa del
                buscador), y el `mr-2` del carrito lo alinea con el final de
                "Ubicación" en la barra de abajo (ese enlace tiene `px-3`). */}
            <div className="hidden md:flex items-center ml-auto flex-shrink-0">
              {redes.length > 0 && (
                <div className="flex items-center gap-4 lg:gap-6">
                  {redes.map((red) => (
                    <a key={red.nombre} href={red.url} target="_blank" rel="noopener noreferrer"
                      aria-label={red.nombre} title={red.nombre}
                      className="text-gray-900 hover:opacity-70 transition-opacity">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">{red.icono}</svg>
                    </a>
                  ))}
                </div>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                  className="ml-6 lg:ml-10 flex items-center gap-2 text-sm text-gray-900 hover:opacity-70 transition-opacity whitespace-nowrap">
                  <IconoWhatsapp className="w-6 h-6 text-green-600" />
                  Contáctanos
                </a>
              )}
              <div className="ml-6 lg:ml-10 mr-2">
                <BotonCarrito />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de categorías (escritorio) */}
        <nav className="hidden md:block" style={{ backgroundColor: colors.primario }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-1">
            {categorias.length > 0 && (
              <div ref={categoriasRef} className="relative flex-shrink-0 mr-4">
                <button
                  onClick={() => setCategoriasOpen(!categoriasOpen)}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-lg text-white text-[14px] font-bold uppercase tracking-wide transition-colors"
                  style={{ backgroundColor: lighten(colors.primario, 0.12) }}
                  aria-expanded={categoriasOpen}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Categorías
                </button>
                {categoriasOpen && (
                  <div className="absolute top-full left-0 mt-2 min-w-[240px] max-h-[70vh] overflow-y-auto rounded-lg bg-white py-1 shadow-2xl border border-gray-100 z-50">
                    {categorias.map((cat) => {
                      const activa = cat.id === categoriaActiva;
                      return (
                        <button key={cat.id}
                          onClick={() => elegir(cat.id)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                          style={activa ? { color: colors.primario, fontWeight: 600 } : { color: '#374151' }}>
                          <span className="truncate">{cat.nombre}</span>
                          <span className="text-xs text-gray-400">{cat.total}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Todos + las primeras categorías sueltas */}
            {categorias.length > 0 && (
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                {[{ id: null as string | null, nombre: 'Todos' }, ...categorias.slice(0, CATEGORIAS_EN_BARRA.xl)].map((cat, i) => {
                  const activa = cat.id === categoriaActiva;
                  // `i` cuenta "Todos" (i = 0), por eso el `>`.
                  const visibilidad = i > CATEGORIAS_EN_BARRA.lg ? 'hidden xl:block'
                    : i > CATEGORIAS_EN_BARRA.md ? 'hidden lg:block' : '';
                  return (
                    <button key={cat.id ?? 'todos'}
                      onClick={() => elegir(cat.id)}
                      title={cat.nombre}
                      className={`${visibilidad} flex-shrink-0 px-3 xl:px-4 py-1.5 rounded-md text-white text-[14px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors hover:bg-white/15 max-w-[170px] truncate`}
                      style={activa ? { backgroundColor: 'rgba(255,255,255,0.22)' } : undefined}>
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="ml-auto hidden xl:flex items-center gap-1 flex-shrink-0">
              <a href="#productos-section" className="px-3 py-1.5 rounded-md text-white/85 hover:text-white hover:bg-white/15 text-[13px] font-semibold whitespace-nowrap transition-colors">Productos</a>
              {hayServicios && (
                <a href="#servicios" className="px-3 py-1.5 rounded-md text-white/85 hover:text-white hover:bg-white/15 text-[13px] font-semibold whitespace-nowrap transition-colors">Servicios</a>
              )}
              <a href="#ubicacion" className="px-3 py-1.5 rounded-md text-white/85 hover:text-white hover:bg-white/15 text-[13px] font-semibold whitespace-nowrap transition-colors">Ubicación</a>
            </div>
          </div>
        </nav>

        {/* Menú del celular */}
        {menuOpen && (
          <div className="md:hidden bg-white border-b shadow-lg max-h-[70vh] overflow-y-auto">
            <nav className="max-w-7xl mx-auto px-4 py-2 space-y-0.5">
              <Link href={`/${subdominio}`} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg">Inicio</Link>

              {categorias.length > 0 && (
                <details className="group">
                  <summary className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer list-none flex items-center justify-between">
                    Categorías
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pl-6 space-y-0.5 mt-0.5">
                    {categorias.map((cat) => (
                      <button key={cat.id} onClick={() => elegir(cat.id)}
                        className="block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50"
                        style={{ color: cat.id === categoriaActiva ? colors.primario : '#6b7280' }}>{cat.nombre}</button>
                    ))}
                  </div>
                </details>
              )}

              <a href="#productos-section" onClick={() => setMenuOpen(false)} className={enlaceMovil}>Productos</a>
              {hayServicios && <a href="#servicios" onClick={() => setMenuOpen(false)} className={enlaceMovil}>Servicios</a>}
              <a href="#ubicacion" onClick={() => setMenuOpen(false)} className={enlaceMovil}>Ubicación</a>

              {redes.length > 0 && (
                <div className="flex items-center gap-4 px-3 py-2">
                  {redes.map((red) => (
                    <a key={red.nombre} href={red.url} target="_blank" rel="noopener noreferrer"
                      aria-label={red.nombre} className="text-gray-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">{red.icono}</svg>
                    </a>
                  ))}
                </div>
              )}

              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg">
                  <IconoWhatsapp className="w-4 h-4" /> Contáctanos
                </a>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
