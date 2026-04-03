import type { TipoMovimientoStock } from '@/core/types/stock';

export interface MovementTypeInfo {
  value: TipoMovimientoStock;
  label: string;
  category: string;
  color: string;
  isEntry: boolean;
}

export const MOVEMENT_TYPES: MovementTypeInfo[] = [
  // Ajustes
  { value: 'AJUSTE_ENTRADA', label: 'Ajuste Entrada', category: 'Ajustes', color: 'bg-blue-100 text-blue-700', isEntry: true },
  { value: 'AJUSTE_SALIDA', label: 'Ajuste Salida', category: 'Ajustes', color: 'bg-blue-100 text-blue-700', isEntry: false },
  { value: 'AJUSTE_MERMA', label: 'Merma', category: 'Ajustes', color: 'bg-orange-100 text-orange-700', isEntry: false },
  { value: 'AJUSTE_REPARACION', label: 'Reparación', category: 'Ajustes', color: 'bg-cyan-100 text-cyan-700', isEntry: false },
  { value: 'AJUSTE_PERDIDA', label: 'Pérdida', category: 'Ajustes', color: 'bg-red-100 text-red-700', isEntry: false },
  { value: 'AJUSTE_ENCONTRADO', label: 'Encontrado', category: 'Ajustes', color: 'bg-green-100 text-green-700', isEntry: true },
  { value: 'SALIDA_BAJA', label: 'Baja', category: 'Ajustes', color: 'bg-red-100 text-red-700', isEntry: false },
  // Compras
  { value: 'ENTRADA_COMPRA', label: 'Entrada Compra', category: 'Compras', color: 'bg-green-100 text-green-700', isEntry: true },
  { value: 'SALIDA_DEVOLUCION_PROVEEDOR', label: 'Devolución Proveedor', category: 'Compras', color: 'bg-amber-100 text-amber-700', isEntry: false },
  { value: 'AJUSTE_ENTRADA_COMPRA', label: 'Ajuste Compra', category: 'Compras', color: 'bg-green-100 text-green-700', isEntry: true },
  // Ventas
  { value: 'SALIDA_VENTA', label: 'Salida Venta', category: 'Ventas', color: 'bg-purple-100 text-purple-700', isEntry: false },
  { value: 'ENTRADA_DEVOLUCION_CLIENTE', label: 'Devolución Cliente', category: 'Ventas', color: 'bg-amber-100 text-amber-700', isEntry: true },
  { value: 'AJUSTE_SALIDA_VENTA', label: 'Ajuste Venta', category: 'Ventas', color: 'bg-purple-100 text-purple-700', isEntry: false },
  // Reservas
  { value: 'RESERVA_VENTA', label: 'Reserva Venta', category: 'Reservas', color: 'bg-indigo-100 text-indigo-700', isEntry: false },
  { value: 'LIBERAR_RESERVA_VENTA', label: 'Liberar Reserva Venta', category: 'Reservas', color: 'bg-indigo-100 text-indigo-700', isEntry: true },
  { value: 'RESERVA_COMBO', label: 'Reserva Combo', category: 'Reservas', color: 'bg-indigo-100 text-indigo-700', isEntry: false },
  { value: 'LIBERAR_RESERVA_COMBO', label: 'Liberar Reserva Combo', category: 'Reservas', color: 'bg-indigo-100 text-indigo-700', isEntry: true },
  // Transferencias
  { value: 'ENTRADA_TRANSFERENCIA', label: 'Entrada Transferencia', category: 'Transferencias', color: 'bg-teal-100 text-teal-700', isEntry: true },
  { value: 'SALIDA_TRANSFERENCIA', label: 'Salida Transferencia', category: 'Transferencias', color: 'bg-teal-100 text-teal-700', isEntry: false },
  // Garantía
  { value: 'ENTRADA_GARANTIA', label: 'Entrada Garantía', category: 'Garantía', color: 'bg-yellow-100 text-yellow-700', isEntry: true },
  { value: 'SALIDA_GARANTIA', label: 'Salida Garantía', category: 'Garantía', color: 'bg-yellow-100 text-yellow-700', isEntry: false },
  { value: 'RETORNO_GARANTIA', label: 'Retorno Garantía', category: 'Garantía', color: 'bg-yellow-100 text-yellow-700', isEntry: true },
  // Otros
  { value: 'ENTRADA_AJUSTE', label: 'Entrada (Legacy)', category: 'Otros', color: 'bg-gray-100 text-gray-600', isEntry: true },
  { value: 'SALIDA_AJUSTE', label: 'Salida (Legacy)', category: 'Otros', color: 'bg-gray-100 text-gray-600', isEntry: false },
  { value: 'ENTRADA_DEVOLUCION', label: 'Devolución (Legacy)', category: 'Otros', color: 'bg-gray-100 text-gray-600', isEntry: true },
  { value: 'SALIDA_MERMA', label: 'Merma (Legacy)', category: 'Otros', color: 'bg-gray-100 text-gray-600', isEntry: false },
  { value: 'SALIDA_ROBO', label: 'Robo', category: 'Otros', color: 'bg-red-100 text-red-700', isEntry: false },
  { value: 'SALIDA_DONACION', label: 'Donación', category: 'Otros', color: 'bg-pink-100 text-pink-700', isEntry: false },
];

// Types suitable for manual adjustments (exclude system-generated ones)
export const ADJUSTMENT_TYPES = MOVEMENT_TYPES.filter(t =>
  ['Ajustes', 'Compras', 'Garantía'].includes(t.category) ||
  t.value === 'SALIDA_DONACION'
);

export function getMovementTypeInfo(tipo: TipoMovimientoStock): MovementTypeInfo {
  return MOVEMENT_TYPES.find(t => t.value === tipo) ?? {
    value: tipo, label: tipo, category: 'Otro', color: 'bg-gray-100 text-gray-600', isEntry: false,
  };
}

export function getGroupedAdjustmentTypes(): Record<string, MovementTypeInfo[]> {
  const grouped: Record<string, MovementTypeInfo[]> = {};
  for (const t of ADJUSTMENT_TYPES) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }
  return grouped;
}
