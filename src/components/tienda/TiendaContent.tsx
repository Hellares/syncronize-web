'use client';

import { useState } from 'react';
import { Empresa, Producto, Sede } from '@/lib/types';
import { SearchHero } from './SearchHero';
import { ProductosGrid } from './ProductosGrid';
import { OfertasCarousel } from './OfertasCarousel';

interface Props {
  empresa: Empresa;
  subdominio: string;
  productos: Producto[];
  totalProductos: number;
  categorias: string[];
  ofertas: Producto[];
  bannerUrl?: string;
  bannerTexto?: string;
  banners?: Array<{ url: string; texto?: string; link?: string; orden?: number }>;
  sedePrincipal?: Sede;
  totalServicios: number;
}

export function TiendaContent({
  empresa, subdominio, productos, totalProductos, categorias, ofertas,
  bannerUrl, bannerTexto, banners, sedePrincipal, totalServicios,
}: Props) {
  const [heroSearch, setHeroSearch] = useState('');

  return (
    <>
      {/* Hero con buscador */}
      <SearchHero
        empresa={empresa}
        bannerUrl={bannerUrl}
        bannerTexto={bannerTexto}
        banners={banners}
        totalProductos={totalProductos}
        onSearch={(q) => setHeroSearch(q)}
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
          <div className={`bg-white shadow-md border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow cursor-pointer group ${mobile ? 'flex-shrink-0 w-[65px] p-1.5 rounded-md shadow-none border-0' : 'p-4 rounded-xl'}`}>
            <div className={`${badge.color} ${mobile ? 'w-8 h-8 flex rounded-md' : 'w-16 h-16 hidden md:flex rounded-full'} items-center justify-center mb-1 md:mb-2 overflow-hidden`}>
              {badge.image && <img src={badge.image} alt={badge.title} className={`${mobile ? 'w-8 h-8' : 'w-16 h-16'} object-contain`} />}
            </div>
            <p className={`font-bold text-gray-800 ${mobile ? 'text-[8px] leading-tight' : 'text-[11px] mb-1'}`}>{badge.title}</p>
            <p className="text-[9px] text-gray-400 leading-tight mb-2 line-clamp-2 hidden md:block">{badge.desc}</p>
            <span className="text-[9px] text-blue-500 font-semibold group-hover:text-blue-700 transition-colors hidden md:block">{badge.link}</span>
          </div>
        );

        return (
          <section className="max-w-[960px] mx-auto px-0 md:px-6 -mt-10 md:-mt-10 relative z-10">
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
            <OfertasCarousel ofertas={ofertas} subdominio={subdominio} />
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

      {/* Main content */}
      <main id="productos-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex gap-6">
          {/* Sidebar */}
          {categorias.length > 1 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 overflow-hidden sticky top-16 shadow-sm">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 font-semibold text-sm">Categorias</div>
                <nav className="divide-y divide-gray-50">
                  {categorias.map((cat) => (
                    <button key={cat} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">{cat}</button>
                  ))}
                </nav>
              </div>

              {sedePrincipal && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 mt-4 p-4 shadow-sm">
                  <h3 className="font-semibold text-sm mb-2 text-gray-800">📍 Ubicacion</h3>
                  {sedePrincipal.direccion && <p className="text-xs text-gray-500">{sedePrincipal.direccion}</p>}
                  {sedePrincipal.stand && <p className="text-xs text-gray-500">Stand: {sedePrincipal.stand}</p>}
                  <p className="text-xs text-gray-500">{[sedePrincipal.distrito, sedePrincipal.provincia].filter(Boolean).join(', ')}</p>
                  {sedePrincipal.coordenadas?.lat && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${sedePrincipal.coordenadas.lat},${sedePrincipal.coordenadas.lng ?? sedePrincipal.coordenadas.lon}`}
                      target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">🗺️ Como llegar</a>
                  )}
                  {sedePrincipal.horarioAtencion && (
                    <div className="mt-3 border-t pt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">🕐 Horario</p>
                      {Object.entries(sedePrincipal.horarioAtencion).map(([dia, h]) => (
                        <div key={dia} className="flex text-[11px] text-gray-500">
                          <span className="w-14 capitalize">{dia}</span>
                          <span>{h.inicio} - {h.fin}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {empresa.telefono && (
                <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`} target="_blank"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors shadow-md shadow-green-500/20">
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
              totalProductos={totalProductos}
              categorias={categorias}
              initialSearch={heroSearch}
            />
          </div>
        </div>
      </main>
    </>
  );
}
