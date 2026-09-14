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

// Lo que se puede registrar a mano. Espejo de `TIPOS_AJUSTE_MANUAL` del backend
// (`producto-stock/tipos-ajuste-manual.ts`), que rechaza el resto con 400.
//
// 🔴 Antes entraban las categorias Compras y Garantia enteras. El ajuste solo
// mueve `stockActual`: "Entrada Compra" sin compra detras entraba stock SIN
// lote, y Garantia/Reparacion registraban como ajuste lo que en su modulo mueve
// el danado o la garantia. Cada uno tiene su propio flujo.
const TIPOS_AJUSTE: TipoMovimientoStock[] = [
  'AJUSTE_ENTRADA', 'AJUSTE_ENCONTRADO',
  'AJUSTE_SALIDA', 'AJUSTE_MERMA', 'AJUSTE_PERDIDA', 'SALIDA_BAJA', 'SALIDA_DONACION',
];
export const ADJUSTMENT_TYPES = MOVEMENT_TYPES.filter(t => TIPOS_AJUSTE.includes(t.value));

export function getMovementTypeInfo(tipo: TipoMovimientoStock): MovementTypeInfo {
  return MOVEMENT_TYPES.find(t => t.value === tipo) ?? {
    value: tipo, label: tipo, category: 'Otro', color: 'bg-gray-100 text-gray-600', isEntry: false,
  };
}

// Agrupados por lo que le hacen al stock, no por categoria: la lista ya es toda
// de ajustes, y "Donacion" caia sola en un grupo "Otros".
export function getGroupedAdjustmentTypes(): Record<string, MovementTypeInfo[]> {
  const grouped: Record<string, MovementTypeInfo[]> = {};
  for (const t of ADJUSTMENT_TYPES) {
    const grupo = t.isEntry ? 'Entradas' : 'Salidas';
    if (!grouped[grupo]) grouped[grupo] = [];
    grouped[grupo].push(t);
  }
  return grouped;
}
