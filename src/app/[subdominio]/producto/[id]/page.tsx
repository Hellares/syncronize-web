import { Metadata } from 'next';
import { getProductoDetalle, getPreguntasProducto, getOpinionesProducto, getEmpresaBySubdominio } from '@/lib/api';
import { ProductoDetalle, Pregunta, Opinion, PaginatedResponse, Empresa } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ImageGallery } from '@/components/tienda/ImageGallery';
import { DEFAULT_COLORS, lighten, alpha, darken, TiendaColors } from '@/lib/colors';

interface Props {
  params: Promise<{ subdominio: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const producto = await getProductoDetalle(id) as ProductoDetalle;
    return {
      title: `${producto.nombre} | Syncronize`,
      description: producto.descripcion || producto.nombre,
      openGraph: {
        title: producto.nombre,
        description: producto.descripcion || producto.nombre,
        images: producto.imagenes?.[0]?.url ? [producto.imagenes[0].url] : [],
      },
    };
  } catch {
    return { title: 'Producto no encontrado' };
  }
}

export default async function ProductoPage({ params }: Props) {
  const { subdominio, id } = await params;

  let producto: ProductoDetalle;
  let empresa: Empresa | null = null;

  try {
    producto = await getProductoDetalle(id) as ProductoDetalle;
  } catch {
    notFound();
  }

  try {
    empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
  } catch { /* usar defaults */ }

  const banner = empresa?.personalizaciones?.[0];
  const wc = banner?.webConfig;
  const colors: TiendaColors = {
    primario: banner?.colorPrimario || DEFAULT_COLORS.primario,
    secundario: banner?.colorSecundario || DEFAULT_COLORS.secundario,
    acento: banner?.colorAcento || DEFAULT_COLORS.acento,
    bannerColor: banner?.bannerColor || DEFAULT_COLORS.bannerColor,
    fondo1: wc?.colorFondo1 || DEFAULT_COLORS.fondo1,
    fondo2: wc?.colorFondo2 || DEFAULT_COLORS.fondo2,
  };

  let preguntasData: PaginatedResponse<Pregunta> = { data: [], total: 0, page: 1, limit: 5, totalPages: 0 };
  let opinionesData: PaginatedResponse<Opinion> & { resumen?: { promedio: number; total: number; distribucion: Record<string, number> } } = { data: [], total: 0, page: 1, limit: 5, totalPages: 0 };

  try {
    preguntasData = await getPreguntasProducto(id, 1, 5) as PaginatedResponse<Pregunta>;
  } catch { /* ignorar */ }

  try {
    opinionesData = await getOpinionesProducto(id, 1, 5) as PaginatedResponse<Opinion> & { resumen: { promedio: number; total: number; distribucion: Record<string, number> } };
  } catch { /* ignorar */ }

  const precioFinal = producto.enOferta && producto.precioOferta ? producto.precioOferta : producto.precio;
  const tieneDescuento = producto.enOferta && producto.precioOferta && producto.precio;
  const descuentoPct = tieneDescuento && producto.precio! > 0
    ? Math.round((1 - producto.precioOferta! / producto.precio!) * 100) : 0;

  const resumenOpiniones = opinionesData.resumen;
  const coordenadas = producto.sede?.coordenadas;
  const coordLng = coordenadas?.lng ?? coordenadas?.lon;

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: `linear-gradient(135deg, ${lighten(colors.fondo1, 0.75)} 0%, ${lighten(colors.fondo2, 0.8)} 30%, ${lighten(colors.fondo1, 0.85)} 60%, ${lighten(colors.fondo2, 0.75)} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Blobs */}
      <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="blob blob-1" style={{ background: colors.fondo1 }} />
        <div className="blob blob-2" style={{ background: colors.fondo2 }} />
        <div className="blob blob-3" style={{ background: colors.primario }} />
      </div>

      {/* Header */}
      <header className="relative z-10" style={{ background: `linear-gradient(to right, ${colors.primario}, ${lighten(colors.primario, 0.15)}, ${colors.secundario})` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href={`/${subdominio}`} className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Volver a la tienda</span>
          </Link>
          {empresa?.logo && (
            <Link href={`/${subdominio}`}>
              <img src={empresa.logo} alt={empresa.nombre} className="h-9 max-w-[160px] object-contain logo-shimmer" />
            </Link>
          )}
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href={`/${subdominio}`} className="hover:underline">{empresa?.nombre || 'Tienda'}</Link>
          <span>/</span>
          {producto.categoria && (
            <>
              <span>{producto.categoria}</span>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{producto.nombre}</span>
        </div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-8 flex-1">
        {/* Product card principal */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Galería */}
            <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <ImageGallery imagenes={producto.imagenes} nombre={producto.nombre} colors={colors} />
            </div>

            {/* Info */}
            <div className="p-4 md:p-6 flex flex-col">
              {producto.categoria && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full w-fit mb-2" style={{ backgroundColor: lighten(colors.primario, 0.88), color: colors.primario }}>
                  {producto.categoria}
                </span>
              )}

              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{producto.nombre}</h1>

              {/* Rating */}
              {resumenOpiniones && resumenOpiniones.total > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className={`w-4 h-4 ${i <= resumenOpiniones.promedio ? 'text-amber-400' : 'text-gray-200'}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{resumenOpiniones.promedio} ({resumenOpiniones.total})</span>
                </div>
              )}

              {/* Precio */}
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: lighten(colors.primario, 0.95) }}>
                {tieneDescuento && (
                  <p className="text-sm text-gray-400 line-through">S/ {producto.precio!.toFixed(2)}</p>
                )}
                {precioFinal != null ? (
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-extrabold ${tieneDescuento ? 'text-green-600' : 'text-gray-900'}`}>
                      S/ {precioFinal.toFixed(2)}
                    </span>
                    {tieneDescuento && descuentoPct > 0 && (
                      <span className="text-sm font-bold text-white px-2.5 py-1 rounded-lg bg-green-500">
                        -{descuentoPct}%
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xl font-semibold" style={{ color: colors.primario }}>Consultar precio</span>
                )}
                {precioFinal && precioFinal > 50 && (
                  <p className="text-xs text-gray-500 mt-1">
                    en <span className="text-green-600 font-semibold">6x S/ {(precioFinal / 6).toFixed(2)}</span> sin interes
                  </p>
                )}
              </div>

              {/* Stock */}
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${producto.hayStock ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${producto.hayStock ? 'text-green-600' : 'text-red-600'}`}>
                  {producto.hayStock ? 'Stock disponible' : 'Sin stock'}
                </span>
              </div>

              {/* Marca */}
              {producto.marca && (
                <p className="mt-2 text-sm text-gray-500">
                  Marca: <span className="font-medium text-gray-700">{producto.marca}</span>
                </p>
              )}

              {/* Botones de acción */}
              <div className="mt-auto pt-5 space-y-2.5">
                {producto.empresa.telefono && (
                  <a
                    href={`https://wa.me/${producto.empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}?text=${encodeURIComponent(
                      `Hola ${producto.empresa.nombre}, me interesa el producto:\n\n*${producto.nombre}*\nPrecio: ${precioFinal ? `S/ ${precioFinal.toFixed(2)}` : 'consultar'}\n\nVi este producto en Syncronize.`
                    )}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md shadow-green-500/20"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    </svg>
                    Consultar por WhatsApp
                  </a>
                )}
                {coordenadas?.lat && coordLng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${coordenadas.lat},${coordLng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border-2 font-medium py-2.5 px-6 rounded-xl transition-colors"
                    style={{ borderColor: colors.primario, color: colors.primario }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Como llegar
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Descripcion */}
        {producto.descripcion && (
          <div className="mt-5 bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ backgroundColor: colors.primario }} />
              Descripcion
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{producto.descripcion}</p>
          </div>
        )}

        {/* Atributos */}
        {producto.atributos.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ backgroundColor: colors.primario }} />
              Caracteristicas
            </h2>
            <div className="divide-y divide-gray-50">
              {producto.atributos.map((attr, i) => (
                <div key={i} className={`flex py-3 px-3 rounded-lg ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                  <span className="w-1/3 text-sm text-gray-400">{attr.nombre}</span>
                  <span className="text-sm font-medium text-gray-700">{attr.valor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opiniones */}
        {resumenOpiniones && resumenOpiniones.total > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ backgroundColor: colors.primario }} />
              Opiniones ({resumenOpiniones.total})
            </h2>
            <div className="flex items-center gap-6 mb-5 p-4 rounded-xl bg-gray-50">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-gray-900">{resumenOpiniones.promedio}</p>
                <div className="flex mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className={`w-4 h-4 ${i <= resumenOpiniones.promedio ? 'text-amber-400' : 'text-gray-200'}`}
                      fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = resumenOpiniones.distribucion?.[String(star)] || 0;
                  const pct = resumenOpiniones.total > 0 ? (count / resumenOpiniones.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-500">{star}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-gray-400 text-right text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {opinionesData.data.map((op) => (
                <div key={op.id} className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: colors.primario }}>
                      {op.nombreUsuario?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{op.nombreUsuario}</span>
                        {op.verificada && (
                          <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Verificada</span>
                        )}
                      </div>
                      <div className="flex mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <svg key={i} className={`w-3 h-3 ${i <= op.calificacion ? 'text-amber-400' : 'text-gray-200'}`}
                            fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  {op.comentario && <p className="text-sm text-gray-600 mt-2 pl-10">{op.comentario}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preguntas */}
        {preguntasData.data.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ backgroundColor: colors.primario }} />
              Preguntas y respuestas ({preguntasData.total})
            </h2>
            <div className="space-y-4">
              {preguntasData.data.map((p) => (
                <div key={p.id}>
                  <div className="flex gap-2">
                    <span className="text-gray-400 mt-0.5 text-sm">Q:</span>
                    <div>
                      <p className="text-sm text-gray-800">{p.pregunta}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.nombreUsuario}</p>
                    </div>
                  </div>
                  {p.respuesta && (
                    <div className="ml-5 mt-2 rounded-xl p-3" style={{ backgroundColor: lighten(colors.primario, 0.92) }}>
                      <p className="text-sm text-gray-700">{p.respuesta}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendedor */}
        <div className="mt-4 bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full" style={{ backgroundColor: colors.primario }} />
            Vendedor
          </h2>
          <div className="flex items-center gap-3">
            {producto.empresa.logo ? (
              <img src={producto.empresa.logo} alt="" className="h-12 max-w-[120px] object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: colors.primario }}>
                {producto.empresa.nombre[0]}
              </div>
            )}
            <div>
              <Link href={`/${subdominio}`} className="font-semibold hover:underline" style={{ color: colors.primario }}>
                {producto.empresa.nombre}
              </Link>
              {producto.empresa.ubicacion && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {producto.empresa.ubicacion}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-900 text-slate-400 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Powered by <a href="https://syncronize.com" className="text-blue-400 hover:text-blue-300 font-medium">Syncronize</a></p>
        </div>
      </footer>
    </div>
  );
}
