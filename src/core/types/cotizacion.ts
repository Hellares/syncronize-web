// --- Cotizacion Types ---

export type EstadoCotizacion = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA' | 'CONVERTIDA';

export interface CotizacionDetalle {
  id: string;
  cotizacionId: string;
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoAfectacion: string;
  porcentajeIGV: number;
  igv: number;
  icbper: number;
  subtotal: number;
  total: number;
  orden: number;
  producto?: { id: string; nombre: string; codigoEmpresa?: string; sku?: string };
  variante?: { id: string; nombre: string; sku?: string };
  servicio?: { id: string; nombre: string };
}

export interface Cotizacion {
  id: string;
  empresaId: string;
  sedeId: string;
  clienteId?: string;
  vendedorId: string;
  codigo: string;
  nombre?: string;
  nombreCliente: string;
  documentoCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  moneda: string;
  tipoCambio?: number;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  estado: EstadoCotizacion;
  observaciones?: string;
  condiciones?: string;
  ventaId?: string;
  creadoEn: string;
  actualizadoEn: string;
  detalles?: CotizacionDetalle[];
  sede?: { id: string; nombre: string };
  vendedor?: { id: string; persona?: { nombres: string; apellidos: string } };
  cliente?: { id: string; persona?: { nombres: string; apellidos: string } };
}

export interface CotizacionFiltros {
  page: number;
  limit: number;
  sedeId?: string;
  estado?: EstadoCotizacion;
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: string;
  search?: string;
}

export interface CreateCotizacionDetalleDto {
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeIGV?: number;
  tipoAfectacion?: string;
  icbper?: number;
}

export interface CreateCotizacionDto {
  sedeId: string;
  vendedorId: string;
  clienteId?: string;
  nombre?: string;
  nombreCliente: string;
  documentoCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  moneda?: string;
  tipoCambio?: number;
  observaciones?: string;
  condiciones?: string;
  fechaVencimiento?: string;
  detalles: CreateCotizacionDetalleDto[];
}

export interface UpdateCotizacionDto extends Partial<CreateCotizacionDto> {}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Estado colors/labels
export const ESTADO_COTIZACION_CONFIG: Record<EstadoCotizacion, { label: string; color: string; bg: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100' },
  PENDIENTE: { label: 'Pendiente', color: 'text-orange-600', bg: 'bg-orange-100' },
  APROBADA: { label: 'Aprobada', color: 'text-green-600', bg: 'bg-green-100' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-600', bg: 'bg-red-100' },
  VENCIDA: { label: 'Vencida', color: 'text-gray-500', bg: 'bg-gray-200' },
  CONVERTIDA: { label: 'Convertida', color: 'text-blue-600', bg: 'bg-blue-100' },
};
