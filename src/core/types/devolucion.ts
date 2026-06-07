// Devoluciones de venta (returns/refunds) — paridad Flutter, alineado 1:1 con backend
// (src/devolucion-venta: controller, create DTO, prisma enums, matriz de coherencia del service).

// ── Enums ──

export type EstadoDevolucion = 'PENDIENTE' | 'APROBADA' | 'PROCESADA' | 'RECHAZADA' | 'CANCELADA';

export type MotivoDevolucion =
  | 'DEFECTUOSO'
  | 'DANADO_TRANSPORTE'
  | 'ERROR_ENVIO'
  | 'CAMBIO_OPINION'
  | 'GARANTIA'
  | 'PRODUCTO_VENCIDO'
  | 'NO_CONFORME'
  | 'OTRO';

export type EstadoProductoDevolucion = 'BUENO' | 'DANADO' | 'REPARABLE' | 'VENCIDO' | 'INCOMPLETO';

export type AccionDevolucion =
  | 'REINGRESAR_STOCK'
  | 'MARCAR_DANADO'
  | 'ENVIAR_REPARACION'
  | 'DAR_DE_BAJA'
  | 'DEVOLVER_PROVEEDOR'
  | 'CAMBIO_PRODUCTO';

export type TipoReembolso = 'EFECTIVO' | 'CAMBIO_PRODUCTO';

// ── Labels + estilos ──

export const ESTADO_DEVOLUCION_CONFIG: Record<EstadoDevolucion, { label: string; text: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', text: 'text-amber-700', bg: 'bg-amber-100' },
  APROBADA: { label: 'Aprobada', text: 'text-blue-700', bg: 'bg-blue-100' },
  PROCESADA: { label: 'Procesada', text: 'text-green-700', bg: 'bg-green-100' },
  RECHAZADA: { label: 'Rechazada', text: 'text-red-700', bg: 'bg-red-100' },
  CANCELADA: { label: 'Cancelada', text: 'text-gray-600', bg: 'bg-gray-100' },
};

export const MOTIVO_DEVOLUCION_LABEL: Record<MotivoDevolucion, string> = {
  DEFECTUOSO: 'Defectuoso',
  DANADO_TRANSPORTE: 'Dañado en transporte',
  ERROR_ENVIO: 'Error de envío',
  CAMBIO_OPINION: 'Cambio de opinión',
  GARANTIA: 'Garantía',
  PRODUCTO_VENCIDO: 'Producto vencido',
  NO_CONFORME: 'No conforme',
  OTRO: 'Otro',
};

export const ESTADO_PRODUCTO_LABEL: Record<EstadoProductoDevolucion, string> = {
  BUENO: 'Bueno',
  DANADO: 'Dañado',
  REPARABLE: 'Reparable',
  VENCIDO: 'Vencido',
  INCOMPLETO: 'Incompleto',
};

export const ACCION_DEVOLUCION_LABEL: Record<AccionDevolucion, string> = {
  REINGRESAR_STOCK: 'Reingresar a stock',
  MARCAR_DANADO: 'Marcar dañado',
  ENVIAR_REPARACION: 'Enviar a reparación',
  DAR_DE_BAJA: 'Dar de baja',
  DEVOLVER_PROVEEDOR: 'Devolver al proveedor',
  CAMBIO_PRODUCTO: 'Cambio de producto',
};

export const TIPO_REEMBOLSO_LABEL: Record<TipoReembolso, string> = {
  EFECTIVO: 'Reembolso en efectivo',
  CAMBIO_PRODUCTO: 'Cambio de producto',
};

export const MOTIVOS_DEVOLUCION: MotivoDevolucion[] = [
  'DEFECTUOSO', 'DANADO_TRANSPORTE', 'ERROR_ENVIO', 'CAMBIO_OPINION',
  'GARANTIA', 'PRODUCTO_VENCIDO', 'NO_CONFORME', 'OTRO',
];

export const ESTADOS_PRODUCTO: EstadoProductoDevolucion[] = ['BUENO', 'DANADO', 'REPARABLE', 'VENCIDO', 'INCOMPLETO'];

/**
 * Matriz de coherencia estadoProducto → acciones permitidas (1:1 con el backend).
 * Lo prohibido: reingresar al stock vendible un producto no-BUENO.
 */
export const ACCIONES_PERMITIDAS: Record<EstadoProductoDevolucion, AccionDevolucion[]> = {
  BUENO: ['REINGRESAR_STOCK', 'DEVOLVER_PROVEEDOR', 'DAR_DE_BAJA', 'CAMBIO_PRODUCTO'],
  DANADO: ['MARCAR_DANADO', 'DEVOLVER_PROVEEDOR', 'DAR_DE_BAJA', 'CAMBIO_PRODUCTO'],
  REPARABLE: ['ENVIAR_REPARACION', 'DEVOLVER_PROVEEDOR', 'DAR_DE_BAJA', 'CAMBIO_PRODUCTO'],
  VENCIDO: ['DAR_DE_BAJA', 'DEVOLVER_PROVEEDOR', 'MARCAR_DANADO', 'CAMBIO_PRODUCTO'],
  INCOMPLETO: ['ENVIAR_REPARACION', 'DEVOLVER_PROVEEDOR', 'DAR_DE_BAJA', 'MARCAR_DANADO', 'CAMBIO_PRODUCTO'],
};

// ── Entidades ──

export interface DevolucionItem {
  id: string;
  devolucionId: string;
  productoId?: string | null;
  varianteId?: string | null;
  ventaDetalleId?: string | null;
  cantidad: number;
  motivo: MotivoDevolucion;
  estadoProducto: EstadoProductoDevolucion;
  accion: AccionDevolucion;
  observaciones?: string | null;
  imagenes?: string[];
  productoReemplazoId?: string | null;
  varianteReemplazoId?: string | null;
  precioOriginal?: number | null;
  precioReemplazo?: number | null;
  diferenciaPrecio?: number | null;
  // Denormalizado (detail)
  producto?: { id: string; nombre: string; codigoEmpresa?: string } | null;
  variante?: { id: string; nombre: string; sku?: string } | null;
  productoReemplazo?: { id: string; nombre: string; codigoEmpresa?: string } | null;
  varianteReemplazo?: { id: string; nombre: string; sku?: string } | null;
  [key: string]: unknown;
}

export interface Devolucion {
  id: string;
  codigo: string;
  empresaId: string;
  sedeId: string;
  estado: EstadoDevolucion;
  tipoReembolso: TipoReembolso;
  ventaId?: string | null;
  clienteId?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
  creadoPor?: string;
  aprobadoPor?: string | null;
  procesadoPor?: string | null;
  creadoEn: string;
  aprobadoEn?: string | null;
  procesadoEn?: string | null;
  actualizadoEn?: string;
  esReversionTotal?: boolean;
  pendienteRegistroCaja?: boolean;
  // Denormalizado
  sede?: { id: string; nombre: string } | null;
  venta?: { id: string; codigo: string; nombreCliente?: string | null } | null;
  items?: DevolucionItem[];
  movimientos?: Array<Record<string, unknown>>;
  _count?: { items: number };
  [key: string]: unknown;
}

// ── DTOs ──

export interface CreateDevolucionItemDto {
  productoId?: string;
  varianteId?: string;
  ventaDetalleId?: string;
  cantidad: number;
  motivo: MotivoDevolucion;
  estadoProducto: EstadoProductoDevolucion;
  accion: AccionDevolucion;
  observaciones?: string;
  productoReemplazoId?: string;
  varianteReemplazoId?: string;
}

export interface CreateDevolucionDto {
  ventaId: string;
  sedeId: string;
  motivo?: string;
  observaciones?: string;
  tipoReembolso?: TipoReembolso;
  items: CreateDevolucionItemDto[];
}

export interface DevolucionFiltros {
  sedeId?: string;
  estado?: EstadoDevolucion;
  ventaId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

// ── Transiciones (paridad getters Flutter) ──

export const puedeAprobar = (d: Devolucion) => d.estado === 'PENDIENTE';
export const puedeProcesar = (d: Devolucion) => d.estado === 'APROBADA';
export const puedeRechazar = (d: Devolucion) => d.estado === 'PENDIENTE' || d.estado === 'APROBADA';
export const puedeCancelar = (d: Devolucion) => d.estado === 'PENDIENTE';
