import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmpresaBySubdominio, getServiciosByEmpresa } from '@/lib/api';
import type { Empresa } from '@/lib/types';
import { coloresTienda, logoTienda } from '@/lib/tienda';
import { lighten, alpha } from '@/lib/colors';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { BotonCarrito } from '@/components/tienda/compra/CarritoYCuenta';
import { PaginaDestellos } from '@/components/tienda/PaginaDestellos';
import { VideosSection } from '@/components/tienda/VideosSection';
import { ServiciosLista } from '@/components/tienda/servicios/ServiciosLista';
import { GaleriaSlider } from '@/components/tienda/servicios/GaleriaSlider';
import { ServicioTienda, urlSegura } from '@/lib/servicios-web';

interface Props {
  params: Promise<{ subdominio: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdominio } = await params;
  try {
    const empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
    return { title: `Servicios | ${empresa.nombre}`, description: `Servicios de ${empresa.nombre}` };
  } catch {
    return { title: 'Servicios' };
  }
}

const IconoWhatsapp = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
  </svg>
);

/**
 * La página de servicios de la tienda: los servicios visibles en el
 * marketplace más lo que la empresa carga en el app (`webConfig.serviciosWeb`):
 * foto del taller, trabajos realizados, videos de consejos y galería. Cada
 * bloque sin datos no se dibuja.
 */
export default async function ServiciosPage({ params }: Props) {
  const { subdominio } = await params;
  let empresa: Empresa;
  try {
    empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
  } catch {
    notFound();
  }

  let servicios: ServicioTienda[] = [];
  try {
    const data = await getServiciosByEmpresa(subdominio, 60) as { data?: ServicioTienda[] };
    servicios = data?.data ?? [];
  } catch { /* sin servicios */ }

  const colors = coloresTienda(empresa);
  const logo = logoTienda(empresa);
  const sw = empresa.personalizaciones?.[0]?.webConfig?.serviciosWeb ?? {};
  const fotoTaller = urlSegura(sw.fotoTaller);
  const trabajos = (sw.trabajos ?? []).filter((t) => urlSegura(t?.url));
  const consejos = (sw.consejos ?? []).filter((v) => v?.url);
  const galeria = (sw.galeria ?? []).map((g) => urlSegura(g?.url)).filter((u): u is string => !!u);
  const titulo = sw.titulo?.trim() || 'Nuestros servicios';
  const descripcion = sw.descripcion?.trim() || 'Conoce lo que hacemos, el precio y el tiempo de cada servicio. Cotiza por WhatsApp sin compromiso.';
  const whatsapp = enlaceChatWhatsapp(empresa.telefono, `Hola ${empresa.nombre}, quisiera cotizar un servicio.`);

  const h2 = 'text-[22px] md:text-3xl font-extrabold tracking-tight text-gray-900';

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-clip"
      style={{
        background: `linear-gradient(135deg, ${lighten(colors.fondo1, 0.75)} 0%, ${lighten(colors.fondo2, 0.8)} 30%, ${lighten(colors.fondo1, 0.85)} 60%, ${lighten(colors.fondo2, 0.75)} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="blob blob-1" style={{ background: colors.fondo1 }} />
        <div className="blob blob-2" style={{ background: colors.fondo2 }} />
        <div className="blob blob-3" style={{ background: colors.primario }} />
      </div>
      <PaginaDestellos />

      {/* Cabecera (la del detalle de producto) */}
      <header className="relative z-10" style={{ background: `linear-gradient(to right, ${colors.primario}, ${lighten(colors.primario, 0.15)}, ${colors.secundario})` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href={`/${subdominio}`} className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Volver a la tienda</span>
          </Link>
          <div className="flex items-center gap-4">
            {logo && (
              <Link href={`/${subdominio}`}>
                <img src={logo} alt={empresa.nombre} className="h-9 max-w-[160px] object-contain" />
              </Link>
            )}
            <BotonCarrito claro />
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-16 flex flex-col gap-10 md:gap-16">
        {/* Migas + portada */}
        <section className="flex flex-col gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500" aria-label="Migas">
            <Link href={`/${subdominio}`} className="hover:underline">{empresa.nombre}</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Servicios</span>
          </nav>

          <div className={`relative overflow-hidden rounded-2xl bg-[#0f1a2e] text-white p-6 md:p-14 grid gap-8 md:gap-12 items-center ${fotoTaller ? 'md:grid-cols-2' : ''}`}>
            <div className="absolute inset-0 opacity-100 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.16) 1.3px, transparent 1.6px)', backgroundSize: '28px 28px' }} aria-hidden="true" />
            <div className="relative flex flex-col gap-4 md:gap-5">
              <span className="text-[11px] md:text-xs font-bold tracking-[0.12em] uppercase" style={{ color: lighten(colors.primario, 0.45) }}>{empresa.nombre}</span>
              <h1 className="text-[28px] md:text-5xl font-extrabold leading-[1.1] tracking-tight [text-wrap:balance]">{titulo}</h1>
              <p className="text-[15px] md:text-[17px] leading-relaxed text-slate-300 max-w-[46ch] whitespace-pre-line">{descripcion}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="h-12 px-6 rounded-[10px] bg-green-500 hover:bg-green-600 text-white font-bold text-[15px] inline-flex items-center justify-center gap-2.5 transition-colors">
                    <IconoWhatsapp /> Cotizar por WhatsApp
                  </a>
                )}
                {servicios.length > 0 && (
                  <a href="#lista-servicios" className="h-12 px-5 rounded-[10px] border-[1.5px] border-white/35 hover:border-white/60 text-white font-semibold text-[15px] inline-flex items-center justify-center transition-colors">
                    Ver servicios
                  </a>
                )}
              </div>
            </div>
            {fotoTaller && (
              <img src={fotoTaller} alt="" className="relative w-full h-[220px] md:h-[300px] object-cover rounded-xl" />
            )}
          </div>
        </section>

        {/* Servicios */}
        <section id="lista-servicios" className="flex flex-col gap-5 scroll-mt-6">
          <div className="flex flex-col gap-1.5">
            <h2 className={h2}>Servicios</h2>
            <p className="text-sm md:text-[15px] text-gray-500">Precio, duración y si necesitas cita, antes de traer tu equipo.</p>
          </div>
          {servicios.length > 0 ? (
            <ServiciosLista servicios={servicios} colors={colors} telefono={empresa.telefono} empresaNombre={empresa.nombre} />
          ) : (
            <div className="bg-white rounded-xl p-8 text-center text-sm text-gray-500">
              Esta tienda todavía no publicó sus servicios.{' '}
              <Link href={`/${subdominio}`} className="font-semibold" style={{ color: colors.primario }}>Volver a la tienda</Link>
            </div>
          )}
        </section>

        {/* Trabajos realizados */}
        {trabajos.length > 0 && (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className={h2}>Trabajos realizados</h2>
              <p className="text-sm md:text-[15px] text-gray-500">Algunos equipos que pasaron por nuestras manos.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
              {trabajos.map((t, i) => (
                <figure key={i} className="m-0 bg-white rounded-[10px] md:rounded-xl overflow-hidden flex flex-col">
                  <div className="relative">
                    <img src={urlSegura(t.url)!} alt={t.titulo || ''} loading="lazy" className="w-full h-[120px] md:h-[180px] object-cover bg-gray-100" />
                    {t.tipo && (
                      <span className="absolute left-2 top-2 text-[10px] md:text-[11px] font-bold text-white bg-[#0f1a2e]/75 px-2 py-0.5 rounded-md">{t.tipo}</span>
                    )}
                  </div>
                  {t.titulo && <figcaption className="px-2.5 py-2.5 md:px-4 md:py-3.5 text-xs md:text-sm font-bold leading-snug text-gray-900">{t.titulo}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Consejos en video: la misma galería de videos de la portada */}
        {consejos.length > 0 && (
          <VideosSection
            videos={consejos}
            colors={colors}
            className="-mx-4 sm:mx-0"
            encabezado={
              <div className="flex flex-col gap-1.5 mb-5 px-4 sm:px-0">
                <h2 className={h2}>Consejos para cuidar tus equipos</h2>
                <p className="text-sm md:text-[15px] text-gray-500">Videos cortos para que tus equipos duren más.</p>
              </div>
            }
          />
        )}

        {/* Galería */}
        {galeria.length > 0 && (
          <section className="flex flex-col gap-5">
            <h2 className={h2}>Galería</h2>
            <GaleriaSlider fotos={galeria} colors={colors} />
          </section>
        )}

        {/* Cierre */}
        {whatsapp && (
          <section className="rounded-2xl p-6 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 text-white" style={{ backgroundColor: colors.primario }}>
            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] md:text-[28px] font-extrabold">¿Tu equipo necesita revisión?</h2>
              <p className="text-sm md:text-[15px]" style={{ color: alpha('#ffffff', 0.85) }}>Escríbenos y te respondemos con el precio y el tiempo.</p>
            </div>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 h-12 md:h-[52px] px-6 rounded-[10px] bg-white text-gray-900 font-extrabold text-[15px] inline-flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors">
              <span className="text-green-600"><IconoWhatsapp /></span> Escribir por WhatsApp
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
