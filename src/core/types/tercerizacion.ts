// Tercerización B2B — alineado con backend src/tercerizacion y Flutter (tercerizacion.dart).
import type { EstadoTercerizacion } from './orden-servicio';

export type { EstadoTercerizacion };
export { ESTADO_TERCERIZACION_CONFIG } from './orden-servicio';

export interface EmpresaResumen {
  id: string;
  nombre: string;
  logo?: string | null;
  rubro?: string | null;
  telefono?: string | null;
  email?: string | null;
  ruc?: string | null;
  direccionFiscal?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}

export interface OrdenResumen {
  id: string;
  codigo: string;
  tipoEquipo?: string | null;
  marcaEquipo?: string | null;
  numeroSerie?: string | null;
  estado?: string | null;
  tipoServicio?: string | null;
  prioridad?: string | null;
  descripcionProblema?: string | null;
  costoTotal?: number | null;
}

/** Componente denormalizado dentro de componentesData. */
export interface TercerizacionComponente {
  componente?: { nombre?: string; codigo?: string } | null;
  tipoAccion?: string;
  descripcionAccion?: string;
  observaciones?: string;
  [key: string]: unknown;
}

/** Dato adicional denormalizado: { etiqueta, valor, tipo? }. */
export interface DatoAdicional {
  etiqueta: string;
  valor: unknown;
  tipo?: string;
}

export type TipoNotaTercerizacion = 'NOTA' | 'REQUERIMIENTO' | 'CAMBIO_ESTADO' | 'SISTEMA';

export interface TercerizacionNota {
  id: string;
  empresaAutorId: string;
  usuarioId?: string | null;
  tipo: TipoNotaTercerizacion;
  contenido: string;
  creadoEn: string;
}

export interface Tercerizacion {
  id: string;
  empresaOrigenId: string;
  ordenOrigenId: string;
  empresaDestinoId: string;
  ordenDestinoId?: string | null;
  estado: EstadoTercerizacion;
  datosEquipo?: Record<string, unknown> | null;
  descripcionProblema?: string | null;
  sintomas?: unknown;
  componentesData?: unknown;
  datosAdicionales?: DatoAdicional[] | null;
  precioB2B?: number | null;
  metodoPagoB2B?: string | null;
  pagadoB2B?: boolean;
  fechaPagoB2B?: string | null;
  notasOrigen?: string | null;
  notasDestino?: string | null;
  motivoRechazo?: string | null;
  fechaSolicitud: string;
  fechaRespuesta?: string | null;
  fechaCompletado?: string | null;
  creadoEn?: string;
  // Relaciones
  empresaOrigen?: EmpresaResumen | null;
  empresaDestino?: EmpresaResumen | null;
  ordenOrigen?: OrdenResumen | null;
  ordenDestino?: OrdenResumen | null;
}

export interface TercerizacionesListResponse {
  data: Tercerizacion[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type TipoTercerizacion = 'enviadas' | 'recibidas';

// ── DTOs ──
export interface ResponderTercerizacionDto {
  aceptar: boolean;
  motivoRechazo?: string;
  notasDestino?: string;
}
export interface CompletarTercerizacionDto {
  precioB2B: number;
  metodoPagoB2B?: string;
  notasDestino?: string;
}
export interface AgregarNotaDto {
  contenido: string;
  tipo?: 'NOTA' | 'REQUERIMIENTO';
}

export const METODOS_PAGO_B2B = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'] as const;

/** Color del badge según tipo de nota de bitácora. */
export const NOTA_TIPO_CONFIG: Record<TipoNotaTercerizacion, { label: string; text: string; bg: string }> = {
  NOTA: { label: 'NOTA', text: 'text-teal-700', bg: 'bg-teal-50' },
  REQUERIMIENTO: { label: 'REQUERIMIENTO', text: 'text-orange-700', bg: 'bg-orange-50' },
  CAMBIO_ESTADO: { label: 'ESTADO', text: 'text-blue-700', bg: 'bg-blue-50' },
  SISTEMA: { label: 'SISTEMA', text: 'text-gray-600', bg: 'bg-gray-100' },
};
