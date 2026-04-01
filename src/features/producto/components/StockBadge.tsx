interface Props {
  cantidad: number;
  stockMinimo?: number;
}

export default function StockBadge({ cantidad, stockMinimo }: Props) {
  const isLow = stockMinimo != null && cantidad > 0 && cantidad <= stockMinimo;
  const isCritical = cantidad <= 0;

  const color = isCritical
    ? 'bg-red-100 text-red-700'
    : isLow
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {cantidad}
    </span>
  );
}
