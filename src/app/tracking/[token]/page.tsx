import type { Metadata } from 'next';
import TrackingClient from './TrackingClient';

export const metadata: Metadata = {
  title: 'Seguimiento de tu pedido',
  description: 'Sigue tu delivery en tiempo real',
};

/**
 * Página PÚBLICA de seguimiento del delivery local (sin login): el cliente
 * recibe el link por WhatsApp. Timeline de estados + mapa en vivo del
 * repartidor mientras va EN_CAMINO.
 */
export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TrackingClient token={token} />;
}
