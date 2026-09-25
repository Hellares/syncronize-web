import { PaginaCompra } from '@/components/tienda/compra/PaginaCompra';
import { CarritoVista } from '@/components/tienda/compra/CarritoVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu carrito', robots: { index: false } };

export default async function CarritoPage({ params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;
  return (
    <PaginaCompra subdominio={subdominio} titulo="Tu carrito">
      {({ colors }) => <CarritoVista colors={colors} />}
    </PaginaCompra>
  );
}
