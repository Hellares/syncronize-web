import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmpresaBySubdominio } from '@/lib/api';
import type { Empresa } from '@/lib/types';
import { coloresTienda, logoTienda } from '@/lib/tienda';
import { TiendaColors, lighten } from '@/lib/colors';
import { BotonCarrito } from '../../compra/CarritoYCuenta';

/**
 * Marco del portal "Mis servicios": la cabecera de la página de Servicios
 * (volver, logo y carrito) y el fondo de la tienda. El contenido (portada
 * incluida) lo pone la vista, que depende de la sesión del comprador.
 */
export async function MarcoPortal({
  subdominio,
  volver,
  children,
}: {
  subdominio: string;
  volver: { href: string; texto: string };
  children: (ctx: { empresa: Empresa; colors: TiendaColors; logo?: string }) => React.ReactNode;
}) {
  let empresa: Empresa;
  try {
    empresa = (await getEmpresaBySubdominio(subdominio)) as Empresa;
  } catch {
    notFound();
  }
  const colors = coloresTienda(empresa);
  const logo = logoTienda(empresa);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-clip"
      style={{ background: `linear-gradient(135deg, ${lighten(colors.fondo1, 0.8)} 0%, ${lighten(colors.fondo2, 0.85)} 50%, ${lighten(colors.fondo1, 0.85)} 100%)` }}
    >
      <header className="relative z-10" style={{ background: `linear-gradient(to right, ${colors.primario}, ${lighten(colors.primario, 0.15)}, ${colors.secundario})` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href={volver.href} className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">{volver.texto}</span>
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
      <div className="relative z-10 h-px w-full bg-white/60" aria-hidden="true" />
      {children({ empresa, colors, logo })}
    </div>
  );
}
