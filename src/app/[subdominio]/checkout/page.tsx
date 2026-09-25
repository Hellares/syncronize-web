import { PaginaCompra } from '@/components/tienda/compra/PaginaCompra';
import { CheckoutVista } from '@/components/tienda/compra/CheckoutVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finalizar compra', robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;
  return (
    <PaginaCompra subdominio={subdominio} titulo="Finalizar compra">
      {({ empresa, colors }) => <CheckoutVista empresaId={empresa.id} colors={colors} />}
    </PaginaCompra>
  );
}
