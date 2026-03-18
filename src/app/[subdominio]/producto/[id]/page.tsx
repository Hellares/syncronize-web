import { Metadata } from 'next';
import { getProductoDetalle, getPreguntasProducto, getOpinionesProducto } from '@/lib/api';
import { ProductoDetalle, Pregunta, Opinion, PaginatedResponse } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ImageGallery } from '@/components/tienda/ImageGallery';

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

  try {
    producto = await getProductoDetalle(id) as ProductoDetalle;
  } catch {
    notFound();
  }

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
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="bg-blue-700 text-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href={`/${subdominio}`} className="flex items-center gap-2 hover:text-blue-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a la tienda
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Galería de imágenes */}
          <div>
            <ImageGallery imagenes={producto.imagenes} nombre={producto.nombre} />
          </div>

          {/* Info del producto */}
          <div>
            {producto.categoria && (
              <p className="text-sm text-gray-500 mb-1">{producto.categoria}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{producto.nombre}</h1>

            {/* Calificación */}
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
                <span className="text-sm text-gray-500">
                  {resumenOpiniones.promedio} ({resumenOpiniones.total} opiniones)
                </span>
              </div>
            )}

            {/* Precio */}
            <div className="mt-4">
              {tieneDescuento && (
                <p className="text-sm text-gray-400 line-through">S/ {producto.precio!.toFixed(2)}</p>
              )}
              {precioFinal != null ? (
                <p className={`text-3xl font-bold ${tieneDescuento ? 'text-green-600' : 'text-gray-900'}`}>
                  S/ {precioFinal.toFixed(2)}
                  {tieneDescuento && descuentoPct > 0 && (
                    <span className="text-sm font-semibold text-green-600 ml-2">{descuentoPct}% OFF</span>
                  )}
                </p>
              ) : (
                <p className="text-xl text-blue-600 font-semibold">Consultar precio</p>
              )}
            </div>

            {/* Stock */}
            <div className="mt-3">
              {producto.hayStock ? (
                <span className="text-sm text-green-600 font-medium">Stock disponible</span>
              ) : (
                <span className="text-sm text-red-600 font-medium">Sin stock</span>
              )}
            </div>

            {/* Marca */}
            {producto.marca && (
              <p className="mt-3 text-sm text-gray-600">
                Marca: <span className="font-medium">{producto.marca}</span>
              </p>
            )}

            {/* WhatsApp */}
            {producto.empresa.telefono && (
              <a
                href={`https://wa.me/${producto.empresa.telefono.replace(/\D/g, '').replace(/^9/, '51')}?text=${encodeURIComponent(
                  `Hola ${producto.empresa.nombre}, me interesa el producto:\n\n*${producto.nombre}*\nPrecio: ${precioFinal ? `S/ ${precioFinal.toFixed(2)}` : 'consultar'}\n\nVi este producto en Syncronize.`
                )}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                Consultar por WhatsApp
              </a>
            )}

            {/* Cómo llegar */}
            {coordenadas?.lat && coordLng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${coordenadas.lat},${coordLng}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-2 border border-green-400 text-green-600 hover:bg-green-50 font-medium py-2.5 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Cómo llegar
              </a>
            )}
          </div>
        </div>

        {/* Descripción */}
        {producto.descripcion && (
          <div className="mt-8 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-3">Descripción</h2>
            <p className="text-gray-700 whitespace-pre-line">{producto.descripcion}</p>
          </div>
        )}

        {/* Atributos */}
        {producto.atributos.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-3">Características</h2>
            <div className="divide-y divide-gray-100">
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
          <div className="mt-4 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Opiniones ({resumenOpiniones.total})</h2>
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{resumenOpiniones.promedio}</p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className={`w-4 h-4 ${i <= resumenOpiniones.promedio ? 'text-amber-400' : 'text-gray-200'}`}
                      fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = resumenOpiniones.distribucion?.[String(star)] || 0;
                  const pct = resumenOpiniones.total > 0 ? (count / resumenOpiniones.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3">{star}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-gray-400 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="divide-y">
              {opinionesData.data.map((op) => (
                <div key={op.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className={`w-3.5 h-3.5 ${i <= op.calificacion ? 'text-amber-400' : 'text-gray-200'}`}
                          fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">{op.nombreUsuario}</span>
                    {op.verificada && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">Compra verificada</span>
                    )}
                  </div>
                  {op.comentario && <p className="text-sm text-gray-700 mt-1">{op.comentario}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preguntas */}
        {preguntasData.data.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Preguntas y respuestas ({preguntasData.total})</h2>
            <div className="space-y-4">
              {preguntasData.data.map((p) => (
                <div key={p.id}>
                  <div className="flex gap-2">
                    <span className="text-gray-400 mt-0.5">💬</span>
                    <div>
                      <p className="text-sm">{p.pregunta}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.nombreUsuario}</p>
                    </div>
                  </div>
                  {p.respuesta && (
                    <div className="ml-6 mt-2 bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{p.respuesta}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendedor */}
        <div className="mt-4 bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Información del vendedor</h2>
          <div className="flex items-center gap-3">
            {producto.empresa.logo ? (
              <img src={producto.empresa.logo} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {producto.empresa.nombre[0]}
              </div>
            )}
            <div>
              <Link href={`/${subdominio}`} className="text-blue-600 hover:underline font-medium">
                {producto.empresa.nombre}
              </Link>
              {producto.empresa.ubicacion && (
                <p className="text-sm text-gray-500">{producto.empresa.ubicacion}</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Powered by <a href="https://syncronize.com" className="text-blue-400 hover:text-blue-300">Syncronize</a></p>
        </div>
      </footer>
    </div>
  );
}
