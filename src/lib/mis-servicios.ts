import { mkt } from './tienda-compra';

/**
 * "Mis servicios": las órdenes de servicio del comprador en esta tienda
 * (`marketplace/empresas/:subdominio/mis-servicios`, vía el BFF con su sesión).
 */

export type EstadoOrden =
  | 'RECIBIDO' | 'EN_DIAGNOSTICO' | 'ESPERANDO_APROBACION' | 'EN_REPARACION' | 'PENDIENTE_PIEZAS'
  | 'REPARADO' | 'LISTO_ENTREGA' | 'ENTREGADO' | 'CANCELADO' | 'FINALIZADO' | 'TERCERIZADO';

export interface OrdenResumen {
  id: string;
  codigo: string;
  estado: EstadoOrden;
  equipo: string;
  servicio: string | null;
  fechaPrometida: string | null;
  fechaEntrega: string | null;
  creadoEn: string;
  total: number;
  saldo: number;
  tieneComprobante: boolean;
}

export interface OrdenDetalle extends OrdenResumen {
  tipoEquipo: string | null;
  marcaModelo: string | null;
  numeroSerie: string | null;
  sede: string | null;
  tecnico: string | null;
  descripcionProblema: string | null;
  diagnostico: string | null;
  accesorios: string[];
  items: { nombre: string; monto: number }[];
  costoServicio: number | null;
  descuento: number;
  adelanto: number;
  historial: { estado: EstadoOrden; nota: string | null; fecha: string }[];
  adelantos: { monto: number; fecha: string }[];
}

export interface MensajeOrden {
  id: string;
  contenido: string;
  esCliente: boolean;
  creadoEn: string;
  usuario?: { persona?: { nombres?: string | null } | null } | null;
}

const base = (sub: string) => `/empresas/${encodeURIComponent(sub)}/mis-servicios`;

export const misServicios = {
  listar: (sub: string) => mkt<{ data: OrdenResumen[] }>(base(sub)),
  detalle: (sub: string, id: string) => mkt<OrdenDetalle>(`${base(sub)}/${id}`),
  mensajes: (sub: string, id: string) => mkt<MensajeOrden[]>(`${base(sub)}/${id}/mensajes`),
  enviar: (sub: string, id: string, contenido: string) =>
    mkt<MensajeOrden>(`${base(sub)}/${id}/mensajes`, { method: 'POST', body: JSON.stringify({ contenido }) }),
  aprobar: (sub: string, id: string) => mkt<OrdenDetalle>(`${base(sub)}/${id}/aprobar`, { method: 'POST' }),
};

/** Los 6 pasos que ve el cliente; varios estados caen en el mismo paso. */
export const PASOS = ['Recibido', 'Diagnóstico', 'Aprobación', 'Reparación', 'Listo', 'Entregado'] as const;

export function pasoDe(estado: EstadoOrden): number {
  switch (estado) {
    case 'RECIBIDO': return 0;
    case 'EN_DIAGNOSTICO': return 1;
    case 'ESPERANDO_APROBACION': return 2;
    case 'EN_REPARACION': case 'PENDIENTE_PIEZAS': case 'TERCERIZADO': return 3;
    case 'REPARADO': case 'LISTO_ENTREGA': return 4;
    case 'ENTREGADO': case 'FINALIZADO': return 5;
    default: return 0;
  }
}

/** Terminada para el cliente: entregada, cancelada, o cobrada y ya retirada. */
export function estaTerminada(o: Pick<OrdenResumen, 'estado' | 'fechaEntrega'>): boolean {
  return o.estado === 'ENTREGADO' || o.estado === 'CANCELADO' || (o.estado === 'FINALIZADO' && !!o.fechaEntrega);
}

export const ETIQUETA: Record<EstadoOrden, { texto: string; fondo: string; color: string }> = {
  RECIBIDO: { texto: 'Recibido', fondo: '#eef2f8', color: '#3a4a63' },
  EN_DIAGNOSTICO: { texto: 'En diagnóstico', fondo: '#e6efff', color: '#1f4bb0' },
  ESPERANDO_APROBACION: { texto: 'Espera tu aprobación', fondo: '#fff1d6', color: '#9a4b00' },
  EN_REPARACION: { texto: 'En reparación', fondo: '#e6efff', color: '#1f4bb0' },
  PENDIENTE_PIEZAS: { texto: 'Esperando repuestos', fondo: '#fff1d6', color: '#9a4b00' },
  TERCERIZADO: { texto: 'En reparación', fondo: '#e6efff', color: '#1f4bb0' },
  REPARADO: { texto: 'Reparado', fondo: '#e7f7ee', color: '#146c3a' },
  LISTO_ENTREGA: { texto: 'Listo para recoger', fondo: '#e7f7ee', color: '#146c3a' },
  FINALIZADO: { texto: 'Pagado, listo para recoger', fondo: '#e7f7ee', color: '#146c3a' },
  ENTREGADO: { texto: 'Entregado', fondo: '#eef2f8', color: '#3a4a63' },
  CANCELADO: { texto: 'Cancelado', fondo: '#fdecec', color: '#b42318' },
};

export function etiquetaOrden(o: Pick<OrdenResumen, 'estado' | 'fechaEntrega'>) {
  if (o.estado === 'FINALIZADO' && o.fechaEntrega) return ETIQUETA.ENTREGADO;
  return ETIQUETA[o.estado] ?? ETIQUETA.RECIBIDO;
}

/** Fecha de calendario en Lima (el backend guarda instantes UTC). */
export const fechaCorta = (iso: string | null | undefined, conAnio = false) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', ...(conAnio && { year: 'numeric' }), timeZone: 'America/Lima' }) : '';

export const horaCorta = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
