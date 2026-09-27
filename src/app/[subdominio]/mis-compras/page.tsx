import { MarcoPortal } from '@/components/tienda/servicios/portal/MarcoPortal';
import { MisComprasVista } from '@/components/tienda/compras/MisComprasVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis compras', robots: { index: false } };

export default async function MisComprasPage({ params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;
  return (
    <MarcoPortal subdominio={subdominio} volver={{ href: `/${subdominio}`, texto: 'Volver a la tienda' }}>
      {({ empresa, colors }) => <MisComprasVista colors={colors} empresaNombre={empresa.nombre} />}
    </MarcoPortal>
  );
}
