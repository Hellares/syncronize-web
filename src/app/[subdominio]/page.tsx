import { Metadata } from 'next';
import { getEmpresaBySubdominio, getProductosByEmpresa, getServiciosByEmpresa, getOpinionesProducto } from '@/lib/api';
import { Empresa, Producto, PaginatedResponse } from '@/lib/types';
import { TiendaContent } from '@/components/tienda/TiendaContent';
import { FloatingButtons } from '@/components/tienda/FloatingButtons';
import { ScrollReveal } from '@/components/tienda/ScrollReveal';
import { notFound } from 'next/navigation';
import { DEFAULT_COLORS, lighten, alpha, TiendaColors } from '@/lib/colors';

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

  // Servicios (opcional)
  let servicios: any[] = [];
  try {
    const sData = await getServiciosByEmpresa(subdominio) as any;
    servicios = sData?.data || [];
  } catch { /* ignorar */ }

  // Opiniones destacadas (del primer producto con opiniones)
  let opiniones: any[] = [];
  try {
    const productosConOpiniones = productosData.data.filter((p: any) => p.totalOpiniones > 0);
    if (productosConOpiniones.length > 0) {
      const opData = await getOpinionesProducto(productosConOpiniones[0].id, 1, 3) as any;
      opiniones = opData?.data || [];
    }
  } catch { /* ignorar */ }

  const banner = empresa.personalizaciones?.[0];
  const wc = banner?.webConfig;
  const colors: TiendaColors = {
    primario: banner?.colorPrimario || DEFAULT_COLORS.primario,
    secundario: banner?.colorSecundario || DEFAULT_COLORS.secundario,
    acento: banner?.colorAcento || DEFAULT_COLORS.acento,
    bannerColor: banner?.bannerColor || DEFAULT_COLORS.bannerColor,
    fondo1: wc?.colorFondo1 || DEFAULT_COLORS.fondo1,
    fondo2: wc?.colorFondo2 || DEFAULT_COLORS.fondo2,
  };
  const totalProductos = empresa._count?.productos || 0;
  const totalServicios = empresa._count?.servicios || 0;
  const sedePrincipal = empresa.sedes?.find((s) => s.esPrincipal) || empresa.sedes?.[0];
  const productos = productosData.data as Producto[];
  const ofertas = productos.filter((p: Producto) => p.enOferta);
  const categorias = [...new Set(productos.map((p: Producto) => p.categoria).filter(Boolean))] as string[];

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${lighten(colors.fondo1, 0.75)} 0%, ${lighten(colors.fondo2, 0.8)} 30%, ${lighten(colors.fondo1, 0.85)} 60%, ${lighten(colors.fondo2, 0.75)} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Blobs flotantes */}
      <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="blob blob-1" style={{ background: colors.fondo1 }} />
        <div className="blob blob-2" style={{ background: colors.fondo2 }} />
        <div className="blob blob-3" style={{ background: colors.primario }} />
        <div className="blob blob-4" style={{ background: colors.fondo1 }} />
      </div>

      {/* Content interactivo (incluye header) */}
      <TiendaContent
        empresa={empresa}
        subdominio={subdominio}
        productos={productos}
        totalProductos={totalProductos}
        totalServicios={totalServicios}
        categorias={categorias}
        ofertas={ofertas}
        bannerUrl={banner?.bannerPrincipalUrl}
        bannerTexto={banner?.bannerPrincipalTexto}
        banners={banner?.banners as Array<{ url: string; texto?: string; link?: string; orden?: number }> | undefined}
        sedePrincipal={sedePrincipal}
        colors={colors}
      />

      {/* Servicios */}
      {servicios.length > 0 && (
        <ScrollReveal>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🔧 Nuestros servicios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {servicios.slice(0, 6).map((servicio: any) => (
                <div key={servicio.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900">{servicio.nombre}</h3>
                  {servicio.descripcion && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{servicio.descripcion}</p>
                  )}
                  {servicio.precio && (
                    <p className="text-sm font-bold text-blue-600 mt-2">S/ {Number(servicio.precio).toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* Testimonios / Opiniones destacadas */}
      {opiniones.length > 0 && (
        <ScrollReveal delay={100}>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              💬 Lo que dicen nuestros clientes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {opiniones.map((op: any) => (
                <div key={op.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className={`w-4 h-4 ${i <= op.calificacion ? 'text-amber-400' : 'text-gray-200'}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {op.comentario && (
                    <p className="text-sm text-gray-600 italic line-clamp-3">&ldquo;{op.comentario}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                      {op.nombreUsuario?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{op.nombreUsuario}</p>
                      {op.verificada && (
                        <p className="text-[9px] text-green-600">✓ Compra verificada</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* Sobre nosotros */}
      {empresa.descripcion && (
        <ScrollReveal delay={200}>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {empresa.logo && <img src={empresa.logo} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm" />}
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Sobre {empresa.nombre}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{empresa.descripcion}</p>
                  {(empresa.facebook || empresa.instagram || empresa.twitter) && (
                    <div className="flex gap-3 mt-4">
                      {empresa.facebook && <a href={empresa.facebook} target="_blank" className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors text-sm font-bold">f</a>}
                      {empresa.instagram && <a href={empresa.instagram} target="_blank" className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 hover:bg-pink-100 transition-colors text-sm">📷</a>}
                      {empresa.twitter && <a href={empresa.twitter} target="_blank" className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors text-sm">𝕏</a>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
                    <p className="text-xl font-bold text-blue-600">{totalProductos}</p>
                    <p className="text-[10px] text-blue-500">Productos</p>
                  </div>
                  {totalServicios > 0 && (
                    <div className="text-center px-4 py-2 bg-purple-50 rounded-xl">
                      <p className="text-xl font-bold text-purple-600">{totalServicios}</p>
                      <p className="text-[10px] text-purple-500">Servicios</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {empresa.logo && <img src={empresa.logo} alt="" className="h-14 max-w-[220px] object-contain opacity-90" />}
                {!empresa.logo && <span className="text-white font-bold">{empresa.nombre}</span>}
              </div>
              {empresa.descripcion && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{empresa.descripcion}</p>}
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Navegacion</h4>
              <nav className="space-y-2">
                <p className="text-xs hover:text-white cursor-pointer transition-colors">🏠 Inicio</p>
                <p className="text-xs hover:text-white cursor-pointer transition-colors">📦 Productos</p>
                {totalServicios > 0 && <p className="text-xs hover:text-white cursor-pointer transition-colors">🔧 Servicios</p>}
                <p className="text-xs hover:text-white cursor-pointer transition-colors">📍 Ubicacion</p>
              </nav>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Contacto</h4>
              <div className="space-y-2">
                {empresa.telefono && <p className="text-xs">📞 {empresa.telefono}</p>}
                {empresa.email && <p className="text-xs">✉️ {empresa.email}</p>}
                {sedePrincipal?.direccion && <p className="text-xs">📍 {sedePrincipal.direccion}</p>}
                {empresa.telefono && (
                  <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}`} target="_blank"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors">💬 WhatsApp</a>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Siguenos</h4>
              <div className="flex gap-2 mb-4">
                {empresa.facebook && <a href={empresa.facebook} target="_blank" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors text-xs font-bold">f</a>}
                {empresa.instagram && <a href={empresa.instagram} target="_blank" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-400 hover:bg-slate-700 transition-colors text-xs">📷</a>}
                {empresa.twitter && <a href={empresa.twitter} target="_blank" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors text-xs">𝕏</a>}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500">✅ Compra segura</p>
                <p className="text-[10px] text-slate-500">✅ Envio a todo el pais</p>
                <p className="text-[10px] text-slate-500">✅ Productos originales</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs">&copy; {new Date().getFullYear()} {empresa.nombre}. Todos los derechos reservados.</p>
            <p className="text-xs">Powered by <a href="https://syncronize.com" className="text-blue-400 hover:text-blue-300 font-medium">Syncronize</a></p>
          </div>
        </div>
      </footer>

      {/* Floating buttons */}
      <FloatingButtons telefono={empresa.telefono} empresaNombre={empresa.nombre} />
    </div>
  );
}
