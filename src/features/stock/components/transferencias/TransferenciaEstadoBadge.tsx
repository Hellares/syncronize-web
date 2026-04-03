import type { EstadoTransferencia } from '@/core/types/stock';

const COLORS: Record<EstadoTransferencia, string> = {
  BORRADOR: 'bg-gray-100 text-gray-600',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  EN_TRANSITO: 'bg-purple-100 text-purple-700',
  RECIBIDA: 'bg-green-100 text-green-700',
  RECHAZADA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-200 text-gray-500',
};

const LABELS: Record<EstadoTransferencia, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  EN_TRANSITO: 'En Tránsito',
  RECIBIDA: 'Recibida',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function TransferenciaEstadoBadge({ estado }: { estado: EstadoTransferencia }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${COLORS[estado]}`}>
      {LABELS[estado]}
    </span>
  );
}
