import { mkt } from './tienda-compra';
import type { EstadoCuentaCliente } from '@/core/types/cuentas-cobrar';

/**
 * "Mis compras": las ventas del comprador en esta tienda (web y tienda física),
 * pagadas y a crédito (`marketplace/empresas/:subdominio/mis-compras`, vía el BFF).
 */

export type EstadoCompra = 'PAGADA' | 'CREDITO' | 'VENCIDA' | 'PENDIENTE';

export interface ProximoPago {
  numero: number;
  saldo: number;
  fechaVencimiento: string;
}

export interface CompraResumen {
  id: string;
  codigo: string;
  fecha: string;
  esCredito: boolean;
  numeroCuotas: number | null;
  estado: EstadoCompra;
  total: number;
  pagado: number;
  saldo: number;
  mora: number;
  proximoPago: ProximoPago | null;
  cantidadItems: number;
  fotos: string[];
  /** La compra es de un cliente empresa (RUC) donde el comprador es contacto. */
  empresaCliente: string | null;
  clienteEmpresaId: string | null;
}

export interface ResumenCompras {
  deuda: number;
  comprasConDeuda: number;
  mora: number;
  totalComprado: number;
  totalPagado: number;
  cantidad: number;
  proximoPago: (ProximoPago & { codigo: string; ventaId: string; numeroCuotas: number | null }) | null;
}

export interface CompraDetalle extends Omit<CompraResumen, 'fotos' | 'cantidadItems'> {
  sede: string | null;
  interes: number;
  descuento: number;
  comprobante: { tipo: string; numero: string; pdfUrl: string | null } | null;
  items: { descripcion: string; cantidad: number; precioUnitario: number; descuento: number; subtotal: number; imagen: string | null }[];
  cuotas: { numero: number; monto: number; pagado: number; saldo: number; mora: number; fechaVencimiento: string; estado: 'PAGADA' | 'VENCIDA' | 'PARCIAL' | 'PENDIENTE' }[];
  pagos: { monto: number; metodo: string; fecha: string; cuota: number | null }[];
}

const base = (sub: string) => `/empresas/${encodeURIComponent(sub)}/mis-compras`;

export const misCompras = {
  listar: (sub: string) => mkt<{ resumen: ResumenCompras; data: CompraResumen[] }>(base(sub)),
  detalle: (sub: string, id: string) => mkt<CompraDetalle>(`${base(sub)}/${id}`),
  /** Estado de cuenta (crédito) personal (sin empresa) o de UNA empresa: nunca mezclados. */
  estadoCuenta: (sub: string, clienteEmpresaId: string | null) =>
    mkt<{
      empresa: { nombre: string; ruc: string | null };
      estadoCuenta: EstadoCuentaCliente;
      detalles: Record<string, { descripcion: string; cantidad: number; precioUnitario: number; total: number }[]>;
    }>(`${base(sub)}/estado-cuenta${clienteEmpresaId ? `?empresa=${encodeURIComponent(clienteEmpresaId)}` : ''}`),
};

/**
 * Baja el PDF del estado de cuenta: el MISMO documento que el panel manda
 * desde Cuentas por cobrar (pendientes con sus productos + los abonos).
 */
export async function descargarEstadoCuenta(sub: string, clienteEmpresaId: string | null) {
  const [{ descargarEstadoCuentaCliente }, r] = await Promise.all([
    import('@/features/cuentas-cobrar/components/estado-cuenta-cliente-pdf'),
    misCompras.estadoCuenta(sub, clienteEmpresaId),
  ]);
  await descargarEstadoCuentaCliente(
    r.estadoCuenta,
    r.empresa.nombre,
    r.empresa.ruc ?? undefined,
    r.detalles as unknown as Parameters<typeof descargarEstadoCuentaCliente>[3],
    { incluirPendientes: true, incluirHistorial: true, incluirAbonos: true, incluirDetalle: true },
  );
}

/** Colores de estado: los mismos tonos que las etiquetas de Mis servicios. */
export const ESTADO_COMPRA: Record<EstadoCompra, { texto: string; fondo: string; color: string }> = {
  PAGADA: { texto: 'Pagada', fondo: '#e7f7ee', color: '#146c3a' },
  CREDITO: { texto: 'A crédito', fondo: '#fff1d6', color: '#9a4b00' },
  VENCIDA: { texto: 'Vencida', fondo: '#fdecec', color: '#b42318' },
  PENDIENTE: { texto: 'Pago pendiente', fondo: '#eef2f8', color: '#3a4a63' },
};

export const METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito', MIXTO: 'Mixto',
};

/** Fecha con hora, en Lima: "12 sep 2026, 14:32". */
export const fechaHora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      })
    : '';

/**
 * El día de un vencimiento (en Lima). Un vencimiento es un día, no una hora:
 * se paga "hasta el 05 oct", así que acá va sin hora a propósito.
 */
export const diaVence = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' }) : '';
