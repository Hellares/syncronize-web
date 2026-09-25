import { PaginaCompra } from '@/components/tienda/compra/PaginaCompra';
import { PedidoVista } from '@/components/tienda/compra/PedidoVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu pedido', robots: { index: false } };

export default async function PedidoPage({ params }: { params: Promise<{ subdominio: string; id: string }> }) {
  const { subdominio, id } = await params;
  return (
    <PaginaCompra subdominio={subdominio} titulo="Tu pedido">
      {({ colors }) => <PedidoVista pedidoId={id} colors={colors} />}
    </PaginaCompra>
  );
}
