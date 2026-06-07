// --- Venta Rápida / POS (V2) — contratos del backend /ventas/* ---

import type { MetodoPagoVenta } from './caja';
export type { MetodoPagoVenta };

export type CanalVenta = 'POS' | 'COTIZACION' | 'ONLINE';
export type TipoComprobanteVenta = 'TICKET' | 'BOLETA' | 'FACTURA';

/** CreateVentaDetalleDto — el backend RECALCULA precios server-side (recálculo seguro):
 *  envía el precio que ve el cliente y el server responde 409 con divergencias si difiere. */
export interface VentaDetalleDto {
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  comboId?: string;
  /** Cobro de orden de servicio (excluyente con producto/variante/combo, cantidad 1) */
  ordenServicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Descuento por línea (monto) */
  descuento?: number;
  porcentajeIGV?: number;
  precioIncluyeIgv?: boolean;
  tipoAfectacion?: string;
  icbper?: number;
  /** Combos: Flutter los EXPANDE en componentes individuales conservando la referencia */
  origenComboId?: string;
  origenComboNombre?: string;
}

/** Pago individual. YAPE/PLIN requieren referencia; TARJETA/TRANSFERENCIA referencia+banco */
export interface PagoVentaDto {
  metodoPago: MetodoPagoVenta;
  monto: number;
  referencia?: string;
  banco?: string;
  monedaOriginal?: string;
  montoOriginal?: number;
  tipoCambio?: number;
}

/** POST /ventas/cobrar (CrearYCobrarVentaDto) */
export interface CrearYCobrarVentaDto {
  canalVenta?: CanalVenta;
  sedeId: string;
  clienteId?: string;
  clienteEmpresaId?: string;
  vendedorId: string;
  nombreCliente: string;
  documentoCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  moneda?: string;
  tipoCambio?: number;
  observaciones?: string;
  detalles: VentaDetalleDto[];
  // Crédito
  esCredito?: boolean;
  plazoCredito?: number;
  numeroCuotas?: number;
  porcentajeInteres?: number;
  fechaVencimientoPago?: string;
  // Pago
  metodoPago?: MetodoPagoVenta;
  montoRecibido?: number;
  pagos?: PagoVentaDto[];
  /** Ley 28194: el cajero confirmó la advertencia al exceder el límite en efectivo */
  aceptaRiesgoBancarizacion?: boolean;
  // Comprobante
  tipoComprobante?: string;
  tipoDocumentoCliente?: string;
  /** Multi-RUC: sede emisora si difiere de la operativa */
  sedeFacturacionId?: string;
  condicionPago?: string;
  // Descuento global con autorización
  descuentoGlobal?: number;
  descuentoGlobalPorcentaje?: number;
  descuentoAutorizadoPorId?: string;
  /** Requerido si alguna línea tiene margen negativo y NO está en liquidación */
  ventaBajoCostoAutorizadaPorId?: string;
}

/** 409 de recálculo seguro: divergencias precio cliente vs server */
export interface DivergenciaPrecio {
  descripcion: string;
  productoId?: string;
  varianteId?: string;
  comboId?: string;
  cantidad: number;
  precioCliente: number;
  precioServer: number;
  nivelAplicado?: { nombre?: string; cantidadMinima?: number } | null;
}

export interface Venta {
  id: string;
  codigo: string;
  empresaId: string;
  sedeId: string;
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
  vendedorId: string;
  cajeroId?: string | null;
  cotizacionId?: string | null;
  canalVenta?: CanalVenta;
  nombreCliente?: string;
  documentoCliente?: string | null;
  estado?: string;
  subtotal?: number;
  descuento?: number;
  impuestos?: number;
  total?: number;
  montoRecibido?: number;
  montoCambio?: number;
  metodoPago?: MetodoPagoVenta;
  esCredito?: boolean;
  tipoComprobante?: string;
  comprobanteId?: string | null;
  creadoEn?: string;
  [key: string]: unknown;
}

// --- PrecioNivel aplicado en POS (cálculo local, paridad Flutter) ---

export interface NivelPrecio {
  id: string;
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number | null;
  tipoPrecio: 'PRECIO_FIJO' | 'PORCENTAJE_DESCUENTO';
  precio?: number | null;
  porcentajeDesc?: number | null;
  isActive?: boolean;
}

/** Nivel más ESPECÍFICO aplicable (mayor cantidadMinima) — paridad venta_rapida_cubit */
export function nivelAplicable(niveles: NivelPrecio[], cantidad: number): NivelPrecio | null {
  return niveles
    .filter(n => n.isActive !== false)
    .filter(n => cantidad >= n.cantidadMinima && (n.cantidadMaxima == null || cantidad <= n.cantidadMaxima))
    .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0] ?? null;
}

/** Precio final con nivel: fijo o % de descuento sobre base. Solo si BAJA el precio. */
export function precioConNivel(precioBase: number, nivel: NivelPrecio | null): number {
  if (!nivel) return precioBase;
  const precio = nivel.tipoPrecio === 'PRECIO_FIJO'
    ? Number(nivel.precio ?? precioBase)
    : precioBase * (1 - Number(nivel.porcentajeDesc ?? 0) / 100);
  // Regla del proyecto: el nivel solo aplica si reduce el precio
  return precio < precioBase ? precio : precioBase;
}

// --- Item del carrito POS web (estado local, paridad VentaDetalleInput Flutter) ---

export interface VentaItem {
  key: string;
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  cantidad: number;
  /** Precio sin nivel (efectivo: liquidación > oferta > base) */
  precioBase: number;
  /** Precio vigente (con nivel aplicado si corresponde) */
  precioUnitario: number;
  /** Descuento manual por línea (monto) */
  descuento: number;
  porcentajeIGV: number;
  precioIncluyeIgv: boolean;
  tipoAfectacion: string;
  icbper: number;
  // Combo expandido: referencia de trazabilidad (SÍ viaja al backend)
  origenComboId?: string;
  origenComboNombre?: string;
  // Contexto local (NO viaja al backend)
  niveles: NivelPrecio[];
  nivelAplicado?: string | null;
  enLiquidacion: boolean;
  precioCosto?: number | null;
  stockDisponible?: number | null;
}

/** Recalcula precioUnitario por niveles para la cantidad (liquidación gana e ignora niveles) */
export function recalcularPorNiveles(item: VentaItem, cantidad: number): VentaItem {
  if (item.enLiquidacion) {
    return { ...item, cantidad, precioUnitario: item.precioBase, nivelAplicado: null };
  }
  const nivel = nivelAplicable(item.niveles, cantidad);
  const precio = precioConNivel(item.precioBase, nivel);
  return {
    ...item,
    cantidad,
    precioUnitario: precio,
    nivelAplicado: precio < item.precioBase ? nivel?.nombre ?? null : null,
  };
}

/** Totales de línea (misma matemática IGV-incluido del proyecto) */
export function calcularLinea(it: Pick<VentaItem, 'cantidad' | 'precioUnitario' | 'descuento' | 'porcentajeIGV' | 'precioIncluyeIgv' | 'tipoAfectacion' | 'icbper'>) {
  const bruto = it.cantidad * it.precioUnitario - it.descuento;
  const rate = it.tipoAfectacion === '10' ? it.porcentajeIGV / 100 : 0;
  const subtotal = it.precioIncluyeIgv && rate > 0 ? bruto / (1 + rate) : bruto;
  const igv = subtotal * rate;
  const icbperTotal = it.icbper * it.cantidad;
  const total = (it.precioIncluyeIgv ? bruto : subtotal + igv) + icbperTotal;
  return { subtotal, igv, icbperTotal, total };
}

/** Requiere autorización de venta bajo costo (margen negativo, no liquidación) */
export function requiereAutorizacionBajoCosto(items: VentaItem[]): boolean {
  return items.some(it => {
    if (it.enLiquidacion || !it.precioCosto || it.precioCosto <= 0) return false;
    const precioNetoUnit = it.precioUnitario - (it.descuento / Math.max(1, it.cantidad));
    return precioNetoUnit < Number(it.precioCosto);
  });
}

/** Ley 28194 */
export const UMBRAL_BANCARIZACION_PEN = 2000;

// --- Cliente unificado ---

export interface ClienteResueltoDni {
  clienteEmpresaId: string;
  personaId?: string;
  dni: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto: string;
  direccion?: string | null;
  origen?: string;
  [key: string]: unknown;
}

export interface ClienteResueltoRuc {
  clienteEmpresaId: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  direccion?: string | null;
  estadoContribuyente?: string | null;
  condicionContribuyente?: string | null;
  [key: string]: unknown;
}
