'use client';

import { useState } from 'react';
import { CategoriaTienda, Empresa, Producto, Sede } from '@/lib/types';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { TiendaColors, alpha } from '@/lib/colors';
import { TiendaHeader } from './TiendaHeader';
import { SearchHero, slidesDeBanners } from './SearchHero';
import { ProductosGrid } from './ProductosGrid';
import { OfertasCarousel } from './OfertasCarousel';
import { VideosSection } from './VideosSection';
import { UbicacionCard } from './UbicacionCard';
import { linkGoogleMaps } from '@/lib/tienda';

interface Props {
  empresa: Empresa;
  subdominio: string;
  productos: Producto[];
  totalProductos: number;
  totalPaginas: number;
  categorias: CategoriaTienda[];
  ofertas: Producto[];
  bannerUrl?: string;
  bannerTexto?: string;
  banners?: Array<{ url: string; texto?: string; link?: string; orden?: number }>;
  sedePrincipal?: Sede;
  totalServicios: number;
  hayServicios: boolean;
  colors: TiendaColors;
  webVideos?: Array<{ url: string; titulo?: string }>;
}

export function TiendaContent({
  empresa, subdominio, productos, totalProductos, totalPaginas, categorias, ofertas,
  bannerUrl, bannerTexto, banners, sedePrincipal, totalServicios, hayServicios, colors, webVideos,
}: Props) {
  const [heroSearch, setHeroSearch] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const whatsapp = enlaceChatWhatsapp(empresa.telefono);
  const hayBanners = slidesDeBanners(banners, bannerUrl, bannerTexto).length > 0;

  // Desde el header o la barra lateral la grilla puede estar lejos: se baja a ella.
  const elegirCategoria = (id: string | null) => {
    setCategoriaActiva(id);
    document.getElementById('productos-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Header */}
      <TiendaHeader
        empresa={empresa}
        subdominio={subdominio}
        categorias={categorias}
        categoriaActiva={categoriaActiva}
        onCategoria={elegirCategoria}
        hayServicios={hayServicios}
        sedePrincipal={sedePrincipal}
        onSearch={(q) => setHeroSearch(q)}
        busqueda={heroSearch}
        colors={colors}
      />

      {/* Hero con buscador */}
      <SearchHero
        empresa={empresa}
        bannerUrl={bannerUrl}
        bannerTexto={bannerTexto}
        banners={banners}
        totalProductos={totalProductos}
        onSearch={(q) => setHeroSearch(q)}
        colors={colors}
      />

      {/* Badges de confianza - superpuestas sobre el banner */}
      {(() => {
        const badges = [
          { image: '/envio.png', title: 'Envio nacional', desc: 'A todo el pais', link: 'Ver cobertura', color: 'bg-blue-50' },
          { image: '/mapa.png', title: 'Ubicanos', desc: 'Consulta costos y tiempos de entrega', link: 'Ver ubicacion', color: 'bg-green-50' },
          { image: '/oferta.png', title: 'Ofertas', desc: 'Descubre productos con precios bajos', link: 'Ver ofertas', color: 'bg-amber-50' },
          { image: '/vendidos.png', title: 'Mas vendidos', desc: 'Explora los productos que son tendencia', link: 'Ver productos', color: 'bg-orange-50' },
          { image: '/fono.jpg', title: 'Atencion directa', desc: 'Respuesta rapida por WhatsApp', link: 'Contactanos', color: 'bg-cyan-50' },
        ];

        const BadgeCard = ({ badge, mobile }: { badge: typeof badges[0]; mobile?: boolean }) => (
          // Semitransparentes, más sólidas abajo (donde va el texto) y casi
          // transparentes arriba, para que no tapen el banner.
          <div className={`bg-gradient-to-t from-white/75 via-white/35 to-white/5 backdrop-blur-[2px] shadow-md flex flex-col items-center text-center hover:from-white/90 hover:via-white/55 hover:to-white/25 hover:shadow-lg transition-all cursor-pointer group ${mobile ? 'flex-shrink-0 w-[65px] p-1.5 rounded-[3px] shadow-none border-0' : 'p-4 rounded-md'}`}>
            <div className={`${badge.color} ${mobile ? 'w-8 h-8 flex rounded-[3px]' : 'w-16 h-16 hidden md:flex rounded-full'} items-center justify-center mb-1 md:mb-2 overflow-hidden`}>
              {badge.image && <img src={badge.image} alt={badge.title} className={`${mobile ? 'w-8 h-8' : 'w-16 h-16'} object-contain`} />}
            </div>
            <p className={`font-bold text-gray-800 ${mobile ? 'text-[8px] leading-tight' : 'text-[11px] mb-1'}`}>{badge.title}</p>
            <p className="text-[9px] text-gray-600 leading-tight mb-2 line-clamp-2 hidden md:block">{badge.desc}</p>
            <span className="text-[9px] text-blue-500 font-semibold group-hover:text-blue-700 transition-colors hidden md:block">{badge.link}</span>
          </div>
        );

        return (
          // Con banners las tarjetas se montan sobre su difuminado; sin banners,
          // sobre la franja de color (como siempre).
          <section className={`max-w-[960px] mx-auto px-0 md:px-6 relative z-10 ${hayBanners ? '-mt-14 md:-mt-[120px]' : '-mt-10'}`}>
            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-5 gap-[22px]">
              {badges.map((badge) => (
                <BadgeCard key={badge.title} badge={badge} />
              ))}
            </div>

            {/* Mobile: auto-scroll infinito */}
            <div className="md:hidden overflow-hidden mt-[15px] relative">
              <div className="flex gap-[13px] animate-badges-scroll">
                {[...badges, ...badges].map((badge, i) => (
                  <BadgeCard key={`${badge.title}-${i}`} badge={badge} mobile />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', maskImage: 'linear-gradient(to bottom, transparent, black)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)' }} />
            </div>
          </section>
        );
      })()}

      {/* Ofertas */}
      {ofertas.length > 0 && (
        <section className="max-w-7xl mx-auto px-0 md:px-6 mt-8">
          <div className="flex items-center justify-between mb-3 px-2 md:px-0">
            <h2 className="text-sm md:text-lg font-bold text-gray-900 flex items-center gap-1.5">🔥 Ofertas de la semana</h2>
          </div>
          {/* Desktop: carousel original */}
          <div className="hidden md:block">
            <OfertasCarousel ofertas={ofertas} subdominio={subdominio} colors={colors} />
          </div>
          {/* Mobile: auto-scroll infinito */}
          <div className="md:hidden overflow-hidden">
            <div className="flex gap-3 animate-ofertas-scroll">
              {[...ofertas, ...ofertas].map((producto, i) => {
                const descuentoPct = producto.precio && producto.precioOferta && producto.precio > 0
                  ? Math.round((1 - producto.precioOferta / producto.precio) * 100)
                  : 0;
                return (
                  <a key={`${producto.id}-${i}`} href={`/${subdominio}/producto/${producto.id}`} className="flex-shrink-0 w-[108px]">
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      <div className="relative aspect-square bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                        {producto.imagen ? (
                          <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>
                        )}
                        {descuentoPct > 0 && (
                          <span className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-bold px-1 py-0.5 rounded">
                            -{descuentoPct}%
                          </span>
                        )}
                      </div>
                      <div className="p-1">
                        <h3 className="text-[8px] text-gray-600 line-clamp-1 font-medium">{producto.nombre}</h3>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-[10px] font-extrabold text-green-600">S/ {producto.precioOferta?.toFixed(2)}</span>
                          {producto.precio && (
                            <span className="text-[7px] text-gray-400 line-through">S/ {producto.precio.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Videos */}
      {webVideos && webVideos.length > 0 && (
        <VideosSection videos={webVideos} colors={colors} />
      )}

      {/* Main content */}
      <main id="productos-section" className="max-w-7xl mx-auto px-2 md:px-6 py-6 md:py-8 flex-1 w-full">
        <div className="flex gap-6">
          {/* Sidebar */}
          {categorias.length > 1 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-medium text-gray-900 leading-tight">Categorías</h3>
                    <p className="text-[11px] text-gray-400">{categorias.length} categorías</p>
                  </div>
                </div>
                <nav className="p-2 space-y-0.5">
                  {[{ id: null as string | null, nombre: 'Todas', total: totalProductos }, ...categorias].map((cat) => {
                    const activa = cat.id === categoriaActiva;
                    return (
                      <button
                        key={cat.id ?? 'todas'}
                        onClick={() => elegirCategoria(activa ? null : cat.id)}
                        className={`relative w-full flex items-center justify-between gap-2 text-left pl-4 pr-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${activa ? '' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        style={activa ? { color: colors.primario, backgroundColor: alpha(colors.primario, 0.08) } : undefined}
                      >
                        {/* Marca de la activa */}
                        {activa && (
                          <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: colors.primario }} />
                        )}
                        <span className="truncate">{cat.nombre}</span>
                        <span
                          className="min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] font-medium text-center"
                          style={activa
                            ? { backgroundColor: colors.primario, color: '#fff' }
                            : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        >
                          {cat.total}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {sedePrincipal && <UbicacionCard sede={sedePrincipal} colors={colors} googleMapsUrl={linkGoogleMaps(empresa)} />}

              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors shadow-md shadow-green-500/20">
                  💬 WhatsApp
                </a>
              )}
            </aside>
          )}

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <ProductosGrid
              subdominio={subdominio}
              productosIniciales={productos}
              totalInicial={totalProductos}
              totalPagesInicial={totalPaginas}
              categorias={categorias}
              categoriaActiva={categoriaActiva}
              onCategoriaChange={setCategoriaActiva}
              initialSearch={heroSearch}
              onLimpiarBusqueda={() => setHeroSearch('')}
              colors={colors}
            />
          </div>
        </div>
      </main>
    </>
  );
}
