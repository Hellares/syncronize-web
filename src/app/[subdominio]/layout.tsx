import { SesionTiendaProvider } from '@/components/tienda/compra/SesionTienda';

/** Toda la tienda (portada, producto, carrito, pedidos) comparte la sesión del comprador. */
export default async function TiendaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdominio: string }>;
}) {
  const { subdominio } = await params;
  return <SesionTiendaProvider subdominio={subdominio}>{children}</SesionTiendaProvider>;
}
