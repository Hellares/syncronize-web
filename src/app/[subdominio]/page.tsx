import { Metadata } from 'next';
import { getEmpresaBySubdominio, getProductosByEmpresa } from '@/lib/api';
import { Empresa, Producto, PaginatedResponse, Sede } from '@/lib/types';
import { ProductosGrid } from '@/components/tienda/ProductosGrid';
import { TiendaHeader } from '@/components/tienda/TiendaHeader';
import { OfertasCarousel } from '@/components/tienda/OfertasCarousel';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Props {
  params: Promise<{ subdominio: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdominio } = await params;
  try {
    const empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
    return {
      title: `${empresa.nombre} | Syncronize`,
      description: empresa.descripcion || `Tienda de ${empresa.nombre}`,
      openGraph: { title: empresa.nombre, description: empresa.descripcion || '', images: empresa.logo ? [empresa.logo] : [] },
    };
  } catch {
    return { title: 'Tienda no encontrada' };
  }
}

export default async function TiendaPage({ params }: Props) {
  const { subdominio } = await params;

  let empresa: Empresa;
  let productosData: PaginatedResponse<Producto>;

  try {
    empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
    productosData = await getProductosByEmpresa(subdominio, { limit: 40 }) as PaginatedResponse<Producto>;
  } catch {
    notFound();
  }

  const banner = empresa.personalizaciones?.[0];
  const totalProductos = empresa._count?.productos || 0;
  const sedePrincipal = empresa.sedes?.find((s) => s.esPrincipal) || empresa.sedes?.[0];
  const productos = productosData.data as Producto[];
  const ofertas = productos.filter((p: Producto) => p.enOferta);
  const categorias = [...new Set(productos.map((p: Producto) => p.categoria).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 text-gray-300 text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>Bienvenido a <strong className="text-white">{empresa.nombre}</strong></span>
          <div className="flex items-center gap-4">
            {empresa.telefono && (
              <a href={`tel:${empresa.telefono}`} className="hover:text-white transition-colors flex items-center gap-1">
                📞 {empresa.telefono}
              </a>
            )}
            {empresa.email && (
              <a href={`mailto:${empresa.email}`} className="hover:text-white transition-colors hidden sm:block">
                ✉️ {empresa.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <TiendaHeader empresa={empresa} subdominio={subdominio} categorias={categorias} />

      {/* Banner Hero */}
      {banner?.bannerPrincipalUrl && (
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden bg-gradient-to-r from-slate-900 to-blue-900">
          <img src={banner.bannerPrincipalUrl} alt={banner.bannerPrincipalTexto || ''} className="w-full h-full object-cover" />
          {banner.bannerPrincipalTexto && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
              <div className="max-w-7xl mx-auto px-6 w-full">
                <h2 className="text-white text-2xl sm:text-4xl font-bold max-w-md leading-tight">
                  {banner.bannerPrincipalTexto}
                </h2>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sin banner: hero con gradiente */}
      {!banner?.bannerPrincipalUrl && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-6">
            {empresa.logo ? (
              <img src={empresa.logo} alt={empresa.nombre} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white object-cover shadow-lg ring-2 ring-white/20" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-2 ring-white/20">
                {empresa.nombre[0]}
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{empresa.nombre}</h1>
              {empresa.descripcion && (
                <p className="text-blue-100/70 mt-2 max-w-xl text-sm sm:text-base">{empresa.descripcion}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ofertas de la semana */}
      {ofertas.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🔥 Ofertas de la semana
            </h2>
          </div>
          <OfertasCarousel ofertas={ofertas} subdominio={subdominio} />
        </section>
      )}

      {/* Main content: sidebar categorías + productos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex gap-6">
          {/* Sidebar categorías (desktop) */}
          {categorias.length > 1 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-16">
                <div className="bg-gray-900 text-white px-4 py-3 font-semibold text-sm">
                  Categorias
                </div>
                <nav className="divide-y divide-gray-50">
                  {categorias.map((cat) => (
                    <button key={cat} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      {cat}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Info sede */}
              {sedePrincipal && (
                <div className="bg-white rounded-xl border border-gray-100 mt-4 p-4">
                  <h3 className="font-semibold text-sm mb-2 text-gray-800">📍 Ubicacion</h3>
                  {sedePrincipal.direccion && <p className="text-xs text-gray-500">{sedePrincipal.direccion}</p>}
                  {sedePrincipal.stand && <p className="text-xs text-gray-500">Stand: {sedePrincipal.stand}</p>}
                  <p className="text-xs text-gray-500">
                    {[sedePrincipal.distrito, sedePrincipal.provincia].filter(Boolean).join(', ')}
                  </p>
                  {sedePrincipal.coordenadas?.lat && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${sedePrincipal.coordenadas.lat},${sedePrincipal.coordenadas.lng ?? sedePrincipal.coordenadas.lon}`}
                      target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                      🗺️ Como llegar
                    </a>
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

              {/* WhatsApp */}
              {empresa.telefono && (
                <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`}
                  target="_blank"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors shadow-md shadow-green-500/20">
                  💬 WhatsApp
                </a>
              )}
            </aside>
          )}

          {/* Grid de productos */}
          <div className="flex-1 min-w-0">
            <ProductosGrid
              subdominio={subdominio}
              productosIniciales={productos}
              totalProductos={totalProductos}
              categorias={categorias}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Logo + descripción */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                {empresa.logo && <img src={empresa.logo} alt="" className="w-8 h-8 rounded-lg object-cover opacity-70" />}
                <span className="text-white font-semibold text-sm">{empresa.nombre}</span>
              </div>
              {empresa.descripcion && <p className="text-xs text-slate-500 leading-relaxed">{empresa.descripcion}</p>}
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">Contacto</h4>
              {empresa.telefono && <p className="text-xs mb-1">📞 {empresa.telefono}</p>}
              {empresa.email && <p className="text-xs mb-1">✉️ {empresa.email}</p>}
              {sedePrincipal?.direccion && <p className="text-xs">📍 {sedePrincipal.direccion}</p>}
            </div>

            {/* Redes */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">Redes sociales</h4>
              <div className="flex gap-3">
                {empresa.facebook && <a href={empresa.facebook} target="_blank" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">Facebook</a>}
                {empresa.instagram && <a href={empresa.instagram} target="_blank" className="text-slate-500 hover:text-pink-400 transition-colors text-sm">Instagram</a>}
                {empresa.twitter && <a href={empresa.twitter} target="_blank" className="text-slate-500 hover:text-sky-400 transition-colors text-sm">Twitter</a>}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs">&copy; {new Date().getFullYear()} {empresa.nombre}. Todos los derechos reservados.</p>
            <p className="text-xs">
              Powered by <a href="https://syncronize.com" className="text-blue-400 hover:text-blue-300 font-medium">Syncronize</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
