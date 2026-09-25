import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmpresaBySubdominio } from '@/lib/api';
import { Empresa } from '@/lib/types';
import { coloresTienda, logoTienda } from '@/lib/tienda';
import { TiendaColors } from '@/lib/colors';
import { BotonCarrito, BotonCuenta } from './CarritoYCuenta';

/**
 * Marco de las páginas de compra (carrito, checkout, pedido, mis pedidos):
 * cabecera blanca con el logo de la tienda, cuenta y carrito, y el contenido
 * centrado. Liviana a propósito: se está comprando, no navegando el catálogo.
 */
export async function PaginaCompra({
  subdominio,
  titulo,
  children,
}: {
  subdominio: string;
  titulo: string;
  children: (ctx: { empresa: Empresa; colors: TiendaColors }) => React.ReactNode;
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/${subdominio}`} className="flex items-center gap-2 min-w-0 mr-auto" aria-label="Volver a la tienda">
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {logo
              ? <img src={logo} alt={empresa.nombre} className="h-10 max-w-[180px] object-contain" />
              : <span className="font-medium text-gray-900 truncate">{empresa.nombre}</span>}
          </Link>
          <BotonCuenta conTexto />
          <BotonCarrito />
        </div>
        <div className="h-1" style={{ backgroundColor: colors.primario }} />
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-5">{titulo}</h1>
        {children({ empresa, colors })}
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        {empresa.nombre}
      </footer>
    </div>
  );
}
