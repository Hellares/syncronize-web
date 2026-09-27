import { MarcoPortal } from '@/components/tienda/servicios/portal/MarcoPortal';
import { MisServiciosVista } from '@/components/tienda/servicios/portal/MisServiciosVista';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis servicios', robots: { index: false } };

export default async function MisServiciosPage({ params }: { params: Promise<{ subdominio: string }> }) {
  const { subdominio } = await params;
  return (
    <MarcoPortal subdominio={subdominio} volver={{ href: `/${subdominio}/servicios`, texto: 'Servicios' }}>
      {({ empresa, colors }) => <MisServiciosVista colors={colors} empresaNombre={empresa.nombre} />}
    </MarcoPortal>
  );
}
