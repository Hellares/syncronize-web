import type { EstadoCuenta } from '@/core/types/cuentas-cobrar';

export interface TonoEstado {
  ring: string;
  fondo: string;
  titulo: string;
}

/**
 * El color con el que se pinta un bloque según el estado de la cuenta.
 *
 * Lo comparten el desplegable de cuentas por cobrar y el del estado de cuenta
 * del cliente: desplegar una vencida se tiene que sentir distinto de desplegar
 * una pagada, sin tener que volver a leer la pill.
 *
 * 🔴 Ring de color y no `border-gray-200`: el gris no se ve sobre el fondo
 * #f5f7fa del dashboard, el mismo motivo por el que las tablas usan ring azul.
 */
export const TONO: Record<EstadoCuenta, TonoEstado> = {
  PENDIENTE: { ring: 'ring-amber-400', fondo: 'from-white to-amber-100', titulo: 'text-amber-700' },
  VENCIDA: { ring: 'ring-red-400', fondo: 'from-white to-red-100', titulo: 'text-red-700' },
  PAGADA: { ring: 'ring-green-400', fondo: 'from-white to-green-100', titulo: 'text-green-700' },
};

export function tonoDe(estado?: EstadoCuenta | null): TonoEstado {
  return (estado && TONO[estado]) || TONO.PENDIENTE;
}
