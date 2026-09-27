import { MarcoPortal } from '@/components/tienda/servicios/portal/MarcoPortal';
import { MiServicioDetalle } from '@/components/tienda/servicios/portal/MiServicioDetalle';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi servicio', robots: { index: false } };

export default async function MiServicioPage({ params }: { params: Promise<{ subdominio: string; id: string }> }) {
  const { subdominio, id } = await params;
  return (
    <MarcoPortal subdominio={subdominio} volver={{ href: `/${subdominio}/mis-servicios`, texto: 'Mis servicios' }}>
      {({ empresa, colors }) => (
        <MiServicioDetalle id={id} colors={colors} empresaNombre={empresa.nombre} telefono={empresa.telefono} />
      )}
    </MarcoPortal>
  );
}
