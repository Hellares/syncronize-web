// Órdenes de servicio — alineado 1:1 con backend src/servicio (orden-servicio).
// Verificado: CreateOrdenServicioDto, TransitionEstadoDto (campo nuevoEstado), enums prisma.

export type EstadoOrdenServicio =
  | 'RECIBIDO' | 'EN_DIAGNOSTICO' | 'ESPERANDO_APROBACION' | 'EN_REPARACION'
  | 'PENDIENTE_PIEZAS' | 'REPARADO' | 'LISTO_ENTREGA' | 'ENTREGADO'
  | 'CANCELADO' | 'FINALIZADO' | 'TERCERIZADO';

export type TipoServicio =
  | 'REPARACION' | 'MANTENIMIENTO' | 'INSTALACION' | 'DIAGNOSTICO' | 'ACTUALIZACION'
  | 'LIMPIEZA' | 'RECUPERACION_DATOS' | 'CONFIGURACION' | 'CONSULTORIA' | 'FORMACION' | 'SOPORTE';

export type PrioridadServicio = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';

export const ESTADO_OS_CONFIG: Record<EstadoOrdenServicio, { label: string; text: string; bg: string }> = {
  RECIBIDO: { label: 'Recibido', text: 'text-gray-700', bg: 'bg-gray-100' },
  EN_DIAGNOSTICO: { label: 'En diagnóstico', text: 'text-blue-700', bg: 'bg-blue-100' },
  ESPERANDO_APROBACION: { label: 'Esperando aprobación', text: 'text-amber-700', bg: 'bg-amber-100' },
  EN_REPARACION: { label: 'En reparación', text: 'text-indigo-700', bg: 'bg-indigo-100' },
  PENDIENTE_PIEZAS: { label: 'Pendiente piezas', text: 'text-orange-700', bg: 'bg-orange-100' },
  REPARADO: { label: 'Reparado', text: 'text-teal-700', bg: 'bg-teal-100' },
  LISTO_ENTREGA: { label: 'Listo para entrega', text: 'text-cyan-700', bg: 'bg-cyan-100' },
  ENTREGADO: { label: 'Entregado', text: 'text-green-700', bg: 'bg-green-100' },
  CANCELADO: { label: 'Cancelado', text: 'text-red-700', bg: 'bg-red-100' },
  FINALIZADO: { label: 'Finalizado', text: 'text-green-800', bg: 'bg-green-50' },
  TERCERIZADO: { label: 'Tercerizado', text: 'text-purple-700', bg: 'bg-purple-100' },
};

export const TIPO_SERVICIO_LABEL: Record<TipoServicio, string> = {
  REPARACION: 'Reparación',
  MANTENIMIENTO: 'Mantenimiento',
  INSTALACION: 'Instalación',
  DIAGNOSTICO: 'Diagnóstico',
  ACTUALIZACION: 'Actualización',
  LIMPIEZA: 'Limpieza',
  RECUPERACION_DATOS: 'Recuperación de datos',
  CONFIGURACION: 'Configuración',
  CONSULTORIA: 'Consultoría',
  FORMACION: 'Formación',
  SOPORTE: 'Soporte',
};

export const PRIORIDAD_LABEL: Record<PrioridadServicio, string> = {
  BAJA: 'Baja', NORMAL: 'Normal', ALTA: 'Alta', URGENTE: 'Urgente', EMERGENCIA: 'Emergencia',
};

export const PRIORIDAD_CONFIG: Record<PrioridadServicio, { text: string; bg: string }> = {
  BAJA: { text: 'text-gray-600', bg: 'bg-gray-100' },
  NORMAL: { text: 'text-blue-600', bg: 'bg-blue-50' },
  ALTA: { text: 'text-amber-700', bg: 'bg-amber-100' },
  URGENTE: { text: 'text-orange-700', bg: 'bg-orange-100' },
  EMERGENCIA: { text: 'text-red-700', bg: 'bg-red-100' },
};

export const TIPOS_SERVICIO: TipoServicio[] = [
  'REPARACION', 'MANTENIMIENTO', 'INSTALACION', 'DIAGNOSTICO', 'ACTUALIZACION',
  'LIMPIEZA', 'RECUPERACION_DATOS', 'CONFIGURACION', 'CONSULTORIA', 'FORMACION', 'SOPORTE',
];
export const PRIORIDADES: PrioridadServicio[] = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'];

/** Transiciones válidas (1:1 con VALID_TRANSITIONS del backend). */
export const TRANSICIONES_VALIDAS: Record<EstadoOrdenServicio, EstadoOrdenServicio[]> = {
  RECIBIDO: ['EN_DIAGNOSTICO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['ESPERANDO_APROBACION', 'EN_REPARACION', 'CANCELADO'],
  ESPERANDO_APROBACION: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['PENDIENTE_PIEZAS', 'REPARADO', 'CANCELADO'],
  PENDIENTE_PIEZAS: ['EN_REPARACION', 'CANCELADO'],
  REPARADO: ['LISTO_ENTREGA'],
  LISTO_ENTREGA: ['ENTREGADO', 'EN_REPARACION', 'CANCELADO'],
  ENTREGADO: ['FINALIZADO', 'EN_DIAGNOSTICO'],
  FINALIZADO: ['EN_DIAGNOSTICO'],
  TERCERIZADO: ['REPARADO', 'RECIBIDO'],
  CANCELADO: [],
};

// ── Entidades ──

export interface OrdenServicioComponente {
  id: string;
  componenteId: string;
  tipoAccion: string;
  estadoComponente?: string;
  descripcionAccion?: string | null;
  costoAccion?: number | null;
  costoRepuestos?: number | null;
  tiempoAccion?: number | null;
  resultadoAccion?: string | null;
  pruebaRealizada?: boolean;
  garantiaMeses?: number | null;
  observaciones?: string | null;
  componente?: { id: string; codigo?: string; marca?: string; modelo?: string; tipoComponente?: { nombre?: string; categoria?: string } } | null;
  [key: string]: unknown;
}

export interface OrdenServicio {
  id: string;
  codigo: string;
  empresaId: string;
  sedeId?: string | null;
  estado: EstadoOrdenServicio;
  estadoDiagnostico?: string | null;
  tipoServicio: TipoServicio;
  prioridad: PrioridadServicio;
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
  contactoClienteEmpresaId?: string | null;
  tecnicoId?: string | null;
  tipoEquipo?: string | null;
  marcaEquipo?: string | null;
  numeroSerie?: string | null;
  modeloEquipoId?: string | null;
  condicionEquipo?: string | null;
  descripcionProblema?: string | null;
  notas?: string | null;
  servicioId?: string | null;
  datosPersonalizados?: Record<string, unknown> | null;
  costoTotal?: number | null;
  adelanto?: number | null;
  descuento?: number | null;
  metodoPagoAdelanto?: string | null;
  fechaEntrega?: string | null;
  numeroReingresos?: number;
  // Cobro: comprobanteId (factura/boleta) o ventaDetalle (ticket vinculado) ⇒ orden ya cobrada.
  comprobanteId?: string | null;
  ventaDetalle?: { id: string } | null;
  origenOrden?: OrigenOrden;
  tercerizacionOrigen?: TercerizacionRef | null;
  tercerizacionDestino?: TercerizacionRef | null;
  creadoEn: string;
  actualizadoEn?: string;
  mensajesNoLeidos?: number;
  // Denormalizado
  cliente?: { id?: string; persona?: { nombres?: string; apellidos?: string; dni?: string; telefono?: string; email?: string } } | null;
  clienteEmpresa?: { id?: string; razonSocial?: string; ruc?: string; numeroDocumento?: string; email?: string; telefono?: string; direccion?: string } | null;
  contactoClienteEmpresa?: { nombre?: string; cargo?: string; telefono?: string; email?: string } | null;
  tecnico?: { id?: string; persona?: { nombres?: string; apellidos?: string } } | null;
  modeloEquipo?: { marca?: string; modelo?: string } | null;
  servicio?: { id?: string; nombre?: string } | null;
  componentes?: OrdenServicioComponente[];
  [key: string]: unknown;
}

export interface HistorialOS {
  id: string;
  estadoAnterior?: EstadoOrdenServicio | null;
  estadoNuevo: EstadoOrdenServicio;
  notas?: string | null;
  comunicarCliente?: boolean;
  creadoPor?: string | null;
  creadoEn: string;
  [key: string]: unknown;
}

export type OrigenOrden = 'CLIENTE_FINAL' | 'B2B_ENVIADO' | 'B2B_RECIBIDO';
export type EstadoTercerizacion = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';

export const ESTADO_TERCERIZACION_CONFIG: Record<EstadoTercerizacion, { label: string; text: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', text: 'text-amber-700', bg: 'bg-amber-100' },
  ACEPTADO: { label: 'Aceptada', text: 'text-blue-700', bg: 'bg-blue-100' },
  RECHAZADO: { label: 'Rechazada', text: 'text-red-700', bg: 'bg-red-100' },
  EN_PROCESO: { label: 'En proceso', text: 'text-indigo-700', bg: 'bg-indigo-100' },
  COMPLETADO: { label: 'Completada', text: 'text-green-700', bg: 'bg-green-100' },
  CANCELADO: { label: 'Cancelada', text: 'text-gray-600', bg: 'bg-gray-100' },
};

export interface EmpresaTercerizacionRef {
  id: string;
  nombre: string;
  logo?: string | null;
  telefono?: string | null;
}

/** Tercerización B2B vinculada a la orden (origen = enviada a otra empresa; destino = recibida de otra empresa). */
export interface TercerizacionRef {
  id: string;
  estado: EstadoTercerizacion;
  precioB2B?: number | null;
  metodoPagoB2B?: string | null;
  notasOrigen?: string | null;
  notasDestino?: string | null;
  motivoRechazo?: string | null;
  fechaSolicitud?: string | null;
  fechaRespuesta?: string | null;
  empresaOrigen?: EmpresaTercerizacionRef | null;
  empresaDestino?: EmpresaTercerizacionRef | null;
}

/** Mensaje del chat orden↔cliente (MENSAJE_SELECT del backend). esCliente=true → lo envió el cliente. */
export interface MensajeServicio {
  id: string;
  contenido: string;
  esCliente: boolean;
  usuarioId?: string | null;
  creadoEn: string;
  leidoEn?: string | null;
  usuario?: { persona?: { nombres?: string; apellidos?: string } | null } | null;
}

// ── DTOs ──

export interface CreateOrdenServicioDto {
  empresaId: string;
  clienteId?: string;
  clienteEmpresaId?: string;
  contactoClienteEmpresaId?: string;
  tecnicoId?: string;
  sedeId?: string;
  tipoServicio: TipoServicio;
  prioridad?: PrioridadServicio;
  descripcionProblema?: string;
  tipoEquipo?: string;
  marcaEquipo?: string;
  numeroSerie?: string;
  modeloEquipoId?: string;
  condicionEquipo?: string;
  notas?: string;
  servicioId?: string;
  datosPersonalizados?: Record<string, unknown>;
  costoTotal?: number;
  adelanto?: number;
  descuento?: number;
  metodoPagoAdelanto?: string;
  incluirAvisoMantenimiento?: boolean;
  fechaAvisoPersonalizado?: string;
}

export interface TransitionEstadoDto {
  nuevoEstado: EstadoOrdenServicio;
  notas?: string;
  comunicarCliente?: boolean;
  motivoReingreso?: string;
  costoTotal?: number;
  adelanto?: number;
  descuento?: number;
  metodoPagoAdelanto?: string;
}

export interface OrdenesFiltros {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EstadoOrdenServicio;
  tipoServicio?: TipoServicio;
  prioridad?: PrioridadServicio;
  clienteId?: string;
  clienteEmpresaId?: string;
  tecnicoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface OrdenesListResponse {
  data: OrdenServicio[];
  total: number;
  page: number;
  limit: number;
  hasNextPage?: boolean;
  totalPages: number;
}

/** Saldo backend = costoTotal − adelanto − descuento (sin componentes). */
export function saldoOrden(o: { costoTotal?: number | null; adelanto?: number | null; descuento?: number | null }): number {
  return Math.max(0, Number(o.costoTotal ?? 0) - Number(o.adelanto ?? 0) - Number(o.descuento ?? 0));
}

/**
 * ¿La orden ya fue cobrada? Señal precisa, alineada con Flutter (estaCobrada):
 * venta vinculada (ticket) o comprobante fiscal emitido. NO se basa en el estado,
 * porque una orden puede finalizarse sin cobrar.
 */
export function estaCobradaOrden(o: { comprobanteId?: string | null; ventaDetalle?: { id: string } | null }): boolean {
  return !!o.ventaDetalle || o.comprobanteId != null;
}

// ── Cálculo de costos (MODELO ADITIVO, factura tipo taller) ──
// El cliente paga los componentes/repuestos (costoAccion=M.O. + costoRepuestos)
// MÁS el costo del servicio: Total = Σ componentes + costoTotal − descuento.
// El backend cobra exactamente eso (orden-servicio.service.ts: facturable).

/** Subtotal de componentes/repuestos = Σ(costoAccion + costoRepuestos). */
export function subtotalComponentesOrden(o: { componentes?: OrdenServicioComponente[] }): number {
  return (o.componentes ?? []).reduce(
    (s, c) => s + Number(c.costoAccion ?? 0) + Number(c.costoRepuestos ?? 0), 0,
  );
}

/** Costo final al cliente = componentes + costo del servicio − descuento. */
export function costoFinalOrden(o: { costoTotal?: number | null; descuento?: number | null; componentes?: OrdenServicioComponente[] }): number | null {
  const comp = subtotalComponentesOrden(o);
  if (o.costoTotal == null && comp === 0) return null;
  return Number(o.costoTotal ?? 0) + comp - Number(o.descuento ?? 0);
}

/** Saldo pendiente = costoFinal − adelanto. 0 si ya está cobrada. Coincide con el cobro del backend. */
export function saldoPendienteOrden(o: OrdenServicio): number | null {
  if (estaCobradaOrden(o)) return 0;
  const cf = costoFinalOrden(o);
  if (cf == null) return null;
  return cf - Number(o.adelanto ?? 0);
}

/** Costo neto = costoTotal − descuento (precio de la línea de venta al cobrar vía VR; el adelanto va aparte). */
export function costoNetoOrden(o: { costoTotal?: number | null; descuento?: number | null }): number {
  return Math.round((Number(o.costoTotal ?? 0) - Number(o.descuento ?? 0)) * 100) / 100;
}

export const ESTADOS_OS_COBRABLES: EstadoOrdenServicio[] = ['REPARADO', 'LISTO_ENTREGA'];

// ── Componentes ──

export type TipoAccionComponente =
  | 'DIAGNOSTICAR' | 'REPARAR' | 'REEMPLAZAR' | 'COMPRAR' | 'LIMPIAR' | 'ACTUALIZAR'
  | 'INSTALAR' | 'DESMONTAR' | 'PROBAR' | 'CALIBRAR';

export const TIPOS_ACCION: TipoAccionComponente[] = [
  'DIAGNOSTICAR', 'REPARAR', 'REEMPLAZAR', 'COMPRAR', 'LIMPIAR', 'ACTUALIZAR', 'INSTALAR', 'DESMONTAR', 'PROBAR', 'CALIBRAR',
];
export const TIPO_ACCION_LABEL: Record<TipoAccionComponente, string> = {
  DIAGNOSTICAR: 'Diagnosticar', REPARAR: 'Reparar', REEMPLAZAR: 'Reemplazar', COMPRAR: 'Comprar (repuesto)', LIMPIAR: 'Limpiar',
  ACTUALIZAR: 'Actualizar', INSTALAR: 'Instalar', DESMONTAR: 'Desmontar', PROBAR: 'Probar', CALIBRAR: 'Calibrar',
};
/** Color del chip de acción (COMPRAR resalta en ámbar, igual que Flutter). */
export const TIPO_ACCION_COLOR: Record<TipoAccionComponente, string> = {
  DIAGNOSTICAR: 'text-teal-600', REPARAR: 'text-teal-600', REEMPLAZAR: 'text-teal-600',
  COMPRAR: 'text-amber-600', LIMPIAR: 'text-teal-600', ACTUALIZAR: 'text-teal-600',
  INSTALAR: 'text-teal-600', DESMONTAR: 'text-teal-600', PROBAR: 'text-teal-600', CALIBRAR: 'text-teal-600',
};

export interface TipoComponente {
  id: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  [key: string]: unknown;
}

/** Body POST /componentes/find-or-create */
export interface FindOrCreateComponenteDto {
  tipoComponenteId: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
}

/** Body POST /ordenes-servicio/:id/componentes */
export interface CreateServicioComponenteDto {
  componenteId: string;
  tipoAccion: TipoAccionComponente;
  descripcionAccion?: string;
  costoAccion?: number;
  tiempoAccion?: number;
  costoRepuestos?: number;
  resultadoAccion?: string;
  pruebaRealizada?: boolean;
  observaciones?: string;
  garantiaMeses?: number;
}

/** Body PATCH /ordenes-servicio/:id/componentes/:componenteId (parcial; null limpia el campo). */
export interface UpdateServicioComponenteDto {
  tipoAccion?: TipoAccionComponente;
  descripcionAccion?: string | null;
  costoAccion?: number | null;
  tiempoAccion?: number | null;
  costoRepuestos?: number | null;
  resultadoAccion?: string | null;
  pruebaRealizada?: boolean;
  observaciones?: string | null;
  garantiaMeses?: number | null;
}

export interface Tecnico {
  id: string;
  nombre: string;
  rol?: string;
}

/** GET /ordenes-servicio/cobrables — payload liviano para cargar al carrito VR. */
export interface OrdenCobrable {
  id: string;
  codigo: string;
  estado: EstadoOrdenServicio;
  tipoServicio: TipoServicio;
  servicioNombre?: string | null;
  tipoEquipo?: string | null;
  marcaEquipo?: string | null;
  numeroSerie?: string | null;
  costoTotal: number;
  adelanto: number;
  descuento: number;
  saldoPendiente: number;
  cliente?: { clienteId: string; nombre: string; numeroDocumento?: string | null; telefono?: string | null; email?: string | null } | null;
  clienteEmpresa?: { clienteEmpresaId: string; razonSocial: string; ruc?: string | null; email?: string | null; direccion?: string | null } | null;
}

export function nombreClienteOrden(o: OrdenServicio): string {
  if (o.clienteEmpresa?.razonSocial) return o.clienteEmpresa.razonSocial;
  const p = o.cliente?.persona;
  if (p) return [p.nombres, p.apellidos].filter(Boolean).join(' ');
  return '—';
}
