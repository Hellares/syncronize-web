/**
 * Compra en la tienda pública, del lado del navegador: todo pasa por
 * `/api/tienda-web/*` (ver `lib/tienda-sesion.ts`), nunca directo al backend.
 */

export interface UsuarioComprador {
  nombres: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  email?: string | null;
}

export type EstadoDni = 'NUEVO' | 'ACTIVA' | 'POR_ACTIVAR' | 'SIN_CONTACTO';

export interface RespuestaEstadoDni {
  estado: EstadoDni;
  nombres?: string;
  apellidos?: string;
  celularEnmascarado?: string;
}

export interface ItemCarrito {
  id: string;
  productoId: string;
  varianteId: string | null;
  empresaId: string;
  cantidad: number;
  productoNombre: string;
  varianteNombre: string | null;
  precioUnitario: number;
  precioNormal: number;
  nivelAplicado?: string | null;
  subtotal: number;
  imagenUrl: string | null;
  stockDisponible: number;
  disponible: boolean;
  empresa: { id: string; nombre: string; logo: string | null; subdominio: string };
}

export interface GrupoCarrito {
  empresa: ItemCarrito['empresa'];
  items: ItemCarrito[];
  subtotal: number;
}

export interface Carrito {
  empresas: GrupoCarrito[];
  totalItems: number;
  totalCantidad: number;
  total: number;
}

export interface OpcionesEnvio {
  empresaId: string;
  empresaNombre: string;
  envio: { disponible: boolean; gratisDesde: number | null; mensajeLocal: string; mensajeNacional: string };
  retiroTienda: { disponible: boolean; sedes: { id: string; nombre: string; direccion?: string | null; distrito?: string | null }[] };
  contraentrega: { disponible: boolean; mensaje: string };
}

export type EstadoPedido =
  | 'PENDIENTE_PAGO' | 'PAGO_ENVIADO' | 'PAGO_VALIDADO' | 'EN_PREPARACION'
  | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO' | 'PAGO_RECHAZADO';

export interface DetallePedido {
  id: string;
  /** Nombre del producto (con la variante) tal como quedó al comprar. */
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
  imagenUrl?: string | null;
}

export interface Pedido {
  id: string;
  codigo: string;
  estado: EstadoPedido;
  total: number | string;
  subtotal: number | string;
  costoEnvio: number | string;
  metodoPago: 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'CONTRAENTREGA' | null;
  tipoEntrega: 'ENVIO_DOMICILIO' | 'RETIRO_TIENDA';
  direccionEnvio?: string | null;
  distritoEnvio?: string | null;
  provinciaEnvio?: string | null;
  modalidadEnvio?: 'DELIVERY_LOCAL' | 'AGENCIA' | null;
  agenciaEnvio?: string | null;
  agenciaDireccionEnvio?: string | null;
  motivoRechazo?: string | null;
  comprobantePagoUrl?: string | null;
  creadoEn: string;
  empresa: { id: string; nombre: string; logo: string | null; subdominio: string };
  detalles: DetallePedido[];
  yapeAutomaticoDisponible?: boolean;
}

export type CobroYape =
  | { habilitado: true; payAmount: number; chargeId: string; total: number; celular: string | null; qrYapeUrl: string | null; qrPlinUrl: string | null }
  | { habilitado: false; total: number; qrYapeUrl: string | null; qrPlinUrl: string | null };

/** El backend serializa los Decimal como string. */
export const num = (v: number | string | null | undefined) => Number(v ?? 0);
export const soles = (v: number | string | null | undefined) => `S/ ${num(v).toFixed(2)}`;

export class ErrorApi extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) {
    super(message);
  }
}

/** Nest manda `message` como string o como lista (validaciones). */
function mensajeDe(data: Record<string, unknown>, porDefecto: string): string {
  const m = data?.message;
  if (Array.isArray(m)) return String(m[0] ?? porDefecto);
  return typeof m === 'string' && m ? m : porDefecto;
}

export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/tienda-web${ruta}`, {
    ...init,
    headers: init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(mensajeDe(data, 'No se pudo completar la operación'), res.status, data);
  return data as T;
}

/** Atajo para las rutas del marketplace (`/api/tienda-web/m/marketplace/...`). */
export const mkt = <T,>(ruta: string, init?: RequestInit) => api<T>(`/m/marketplace${ruta}`, init);

export const ETIQUETA_ESTADO: Record<EstadoPedido, { texto: string; clase: string }> = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', clase: 'bg-amber-50 text-amber-700' },
  PAGO_ENVIADO: { texto: 'Pago en revisión', clase: 'bg-blue-50 text-blue-700' },
  PAGO_VALIDADO: { texto: 'Pago confirmado', clase: 'bg-emerald-50 text-emerald-700' },
  EN_PREPARACION: { texto: 'En preparación', clase: 'bg-indigo-50 text-indigo-700' },
  ENVIADO: { texto: 'Enviado', clase: 'bg-sky-50 text-sky-700' },
  ENTREGADO: { texto: 'Entregado', clase: 'bg-gray-100 text-gray-700' },
  CANCELADO: { texto: 'Cancelado', clase: 'bg-red-50 text-red-600' },
  PAGO_RECHAZADO: { texto: 'Pago rechazado', clase: 'bg-red-50 text-red-600' },
};
