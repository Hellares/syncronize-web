import { PaginaCompra } from '@/components/tienda/compra/PaginaCompra';
import { MisPedidosVista } from '@/components/tienda/compra/MisPedidosVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis pedidos', robots: { index: false } };

export default async function MisPedidosPage({ params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;
  return (
    <PaginaCompra subdominio={subdominio} titulo="Mis pedidos">
      {({ colors }) => <MisPedidosVista colors={colors} />}
    </PaginaCompra>
  );
}
