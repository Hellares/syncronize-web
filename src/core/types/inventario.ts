// --- Inventario Físico (workflow de conteo, F5) ---

export type TipoInventario = 'COMPLETO' | 'PARCIAL' | 'CICLICO' | 'SORPRESA' | 'TEMPORAL';

export type EstadoInventario =
  | 'PLANIFICADO' | 'EN_PROCESO' | 'CONTEO_COMPLETO'
  | 'EN_REVISION' | 'APROBADO' | 'AJUSTADO' | 'CANCELADO' | 'RECHAZADO';

export interface InventarioItem {
  id: string;
  productoStockId?: string;
  /** Desnormalizados por el backend para histórico (InventarioItem.nombreProducto/codigoProducto) */
  nombreProducto?: string;
  codigoProducto?: string | null;
  productoId?: string | null;
  varianteId?: string | null;
  productoNombre?: string;
  varianteNombre?: string | null;
  codigoEmpresa?: string;
  sku?: string;
  ubicacion?: string | null;
  cantidadSistema: number;
  cantidadContada?: number | null;
  diferencia?: number | null;
  estadoConteo?: string; // PENDIENTE | CONTADO | ...
  ubicacionFisica?: string | null;
  observaciones?: string | null;
  contadoPorNombre?: string | null;
  fechaConteo?: string | null;
  producto?: { id: string; nombre: string; codigoEmpresa?: string };
  variante?: { id: string; nombre: string };
}

export interface Inventario {
  id: string;
  codigo?: string;
  nombre: string;
  descripcion?: string | null;
  tipoInventario: TipoInventario;
  estado: EstadoInventario;
  sedeId: string;
  sede?: { id: string; nombre: string };
  fechaPlanificada?: string;
  fechaInicio?: string | null;
  fechaFinConteo?: string | null;
  fechaAprobacion?: string | null;
  totalItems?: number;
  itemsContados?: number;
  itemsConDiferencia?: number;
  observaciones?: string | null;
  creadoEn?: string;
  items?: InventarioItem[];
}

export interface CrearInventarioDto {
  nombre: string;
  descripcion?: string;
  tipoInventario: TipoInventario;
  sedeId: string;
  fechaPlanificada: string;
  incluirTodosProductos?: boolean;
  permitirAjusteAutomatico?: boolean;
  observaciones?: string;
}

export interface RegistrarConteoDto {
  cantidadContada: number;
  ubicacionFisica?: string;
  observaciones?: string;
}

export const ESTADO_INVENTARIO_LABEL: Record<EstadoInventario, string> = {
  PLANIFICADO: 'Planificado',
  EN_PROCESO: 'En proceso',
  CONTEO_COMPLETO: 'Conteo completo',
  EN_REVISION: 'En revisión',
  APROBADO: 'Aprobado',
  AJUSTADO: 'Ajustado',
  CANCELADO: 'Cancelado',
  RECHAZADO: 'Rechazado',
};

export const ESTADO_INVENTARIO_COLOR: Record<EstadoInventario, string> = {
  PLANIFICADO: 'bg-gray-100 text-gray-600',
  EN_PROCESO: 'bg-blue-100 text-blue-700',
  CONTEO_COMPLETO: 'bg-amber-100 text-amber-700',
  EN_REVISION: 'bg-amber-100 text-amber-700',
  APROBADO: 'bg-green-100 text-green-700',
  AJUSTADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
  RECHAZADO: 'bg-red-100 text-red-700',
};
