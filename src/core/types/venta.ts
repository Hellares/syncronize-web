// --- Venta Rápida / POS (V2) — contratos del backend /ventas/* ---

import type { MetodoPagoVenta } from './caja';
export type { MetodoPagoVenta };

export type CanalVenta = 'POS' | 'COTIZACION' | 'ONLINE' | 'WHATSAPP_IA';
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
  /** Multi-RUC legacy: sede emisora si difiere de la operativa */
  sedeFacturacionId?: string;
  /** Multi-RUC: EmisorFacturacion (RUC socio) con el que se emite */
  emisorId?: string;
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

export type EstadoVenta = 'BORRADOR' | 'CONFIRMADA' | 'PAGADA_PARCIAL' | 'PAGADA_COMPLETA' | 'ANULADA';

// --- Envío (rótulo de agencia, VentaEnvio 1:1) ---

/** Datos de envío de la venta (upsert PUT /ventas/:id/envio) */
export interface VentaEnvio {
  destinatarioNombre: string;
  destinatarioDni?: string | null;
  destinatarioCelular?: string | null;
  agenciaNombre?: string | null;
  destinoDepartamento?: string | null;
  destinoProvincia?: string | null;
  agenciaDireccion?: string | null;
  /** Fecha de impresión del rótulo (chip IMPRESO) */
  rotuloImpresoEn?: string | null;
}

export type VentaEnvioDto = Omit<VentaEnvio, 'rotuloImpresoEn'>;

// --- Delivery local (repartidor, DeliveryLocal 1:1) ---

export type EstadoDeliveryLocal = 'SOLICITADO' | 'TOMADO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO' | string;

/** Listado trae {estado, direccion, distrito}; el detalle el registro completo. */
export interface VentaDeliveryLocal {
  id?: string;
  estado: EstadoDeliveryLocal;
  direccion?: string | null;
  distrito?: string | null;
  referencia?: string | null;
  destinatarioNombre?: string | null;
  destinatarioCelular?: string | null;
  coordenadas?: { lat?: number; lon?: number } | null;
  costoDelivery?: number | string | null;
  repartidorId?: string | null;
  entregadoEn?: string | null;
  esInterno?: boolean;
  encargadoInterno?: string | null;
}

export const ESTADO_DELIVERY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SOLICITADO: { label: 'Solicitado', color: 'text-orange-700', bg: 'bg-orange-100' },
  TOMADO: { label: 'Tomado', color: 'text-orange-700', bg: 'bg-orange-100' },
  EN_CAMINO: { label: 'En camino', color: 'text-orange-700', bg: 'bg-orange-100' },
  ENTREGADO: { label: 'Entregado', color: 'text-green-700', bg: 'bg-green-100' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
};

/** Delivery vigente (excluye cancelado) — criterio de los chips y filtros. */
export function tieneDeliveryActivo(v: { deliveryLocal?: VentaDeliveryLocal | null }): boolean {
  return !!v.deliveryLocal && v.deliveryLocal.estado !== 'CANCELADO';
}

export const ESTADO_VENTA_CONFIG: Record<EstadoVenta, { label: string; color: string; bg: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100' },
  CONFIRMADA: { label: 'Confirmada', color: 'text-blue-700', bg: 'bg-blue-100' },
  PAGADA_PARCIAL: { label: 'Pago parcial', color: 'text-amber-700', bg: 'bg-amber-100' },
  PAGADA_COMPLETA: { label: 'Pagada', color: 'text-green-700', bg: 'bg-green-100' },
  ANULADA: { label: 'Anulada', color: 'text-red-700', bg: 'bg-red-100' },
};

/** Tipo de entrega — mismo criterio que el backend: DELIVERY manda si no está
 *  cancelado, luego ENVIO; sin ninguno el canal decide FISICA (POS/COTIZACION)
 *  o RECOJO en tienda (ONLINE/WHATSAPP_IA). */
export type TipoEntregaFiltro = 'ENVIO' | 'DELIVERY' | 'RECOJO' | 'FISICA';

/** GET /ventas — filtros (rol VENDEDOR/CAJERO se filtra server-side automáticamente) */
export interface VentaFiltros {
  sedeId?: string;
  estado?: EstadoVenta;
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: string;
  search?: string;
  /** Canal: POS (mostrador) / ONLINE (marketplace) / COTIZACION */
  canalVenta?: CanalVenta;
  tipoEntrega?: TipoEntregaFiltro;
  /** Busca dentro de la entrega: agencia/destino del envío o dirección/distrito del delivery */
  entregaBusqueda?: string;
  /** Multi-RUC: RUC del emisor del comprobante; 'SIN_COMPROBANTE' = ventas Ticket */
  rucEmisor?: string;
}

export interface PagoVenta {
  id: string;
  metodoPago: MetodoPagoVenta;
  monto: number;
  referencia?: string | null;
  banco?: string | null;
  creadoEn?: string;
  [key: string]: unknown;
}

export interface VentaDetalle {
  id: string;
  productoId?: string | null;
  varianteId?: string | null;
  comboId?: string | null;
  servicioId?: string | null;
  ordenServicioId?: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  subtotal?: number;
  igv?: number;
  icbper?: number;
  total?: number;
  origenComboId?: string | null;
  origenComboNombre?: string | null;
  nivelAplicadoSnapshot?: string | null;
  [key: string]: unknown;
}

/** Línea gratuita (regalo/bonificación catálogo 07: 15/21/31): subtotal 0 con precio de lista como referencial */
export function esLineaGratuita(d: VentaDetalle): boolean {
  return Number(d.subtotal ?? 0) === 0 && Number(d.descuento ?? 0) > 0;
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
  numeroCuotas?: number;
  plazoCredito?: number;
  tipoComprobante?: string;
  comprobanteId?: string | null;
  /** Serie-número del comprobante (null = aún TICKET, se puede generar) */
  codigoComprobante?: string | null;
  comprobanteSunatStatus?: 'PENDIENTE' | 'PROCESANDO' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR_COMUNICACION' | string | null;
  comprobanteSunatHash?: string | null;
  comprobanteSunatXmlUrl?: string | null;
  comprobanteSunatPdfUrl?: string | null;
  comprobanteEnlaceProveedor?: string | null;
  comprobanteErrorProveedor?: string | null;
  comprobanteAnulado?: boolean;
  // Montos fiscales del comprobante (desglose SUNAT en el detalle)
  comprobanteGravada?: number | null;
  comprobanteExonerada?: number | null;
  comprobanteInafecta?: number | null;
  /** Σ valores referenciales de líneas gratuitas — informativo, NO suma al total */
  comprobanteGratuitas?: number | null;
  comprobanteIgv?: number | null;
  comprobanteIcbper?: number | null;
  // Envío (rótulo de agencia)
  conEnvio?: boolean;
  envio?: VentaEnvio | null;
  // Delivery local (listado: liviano {estado,direccion,distrito}; detalle: completo)
  deliveryLocal?: VentaDeliveryLocal | null;
  creadoEn?: string;
  fechaVenta?: string;
  fechaVencimientoPago?: string | null;
  detalles?: VentaDetalle[];
  pagos?: PagoVenta[];
  cuotas?: Array<{ id: string; numero?: number; monto: number; estado?: string; fechaVencimiento?: string; mora?: number; diasVencido?: number; [key: string]: unknown }>;
  sedeNombre?: string;
  vendedorNombre?: string;
  vendedorAlias?: string | null;
  cajeroNombre?: string | null;
  cotizacionCodigo?: string | null;
  ordenesServicio?: Array<{ codigo: string;[key: string]: unknown }>;
  observaciones?: string | null;
  sede?: { id: string; nombre: string };
  vendedor?: { id: string; persona?: { nombres?: string; apellidos?: string }; alias?: string | null };
  anulado?: boolean;
  motivoAnulacion?: string | null;
  comprobante?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/** Estados desde los que se puede anular (paridad venta.dart puedeAnular) */
export function puedeAnularVenta(v: Venta): boolean {
  return ['CONFIRMADA', 'PAGADA_PARCIAL', 'PAGADA_COMPLETA'].includes(v.estado ?? '');
}

/** Registrar pago: CONFIRMADA o PAGADA_PARCIAL */
export function puedePagarVenta(v: Venta): boolean {
  return ['CONFIRMADA', 'PAGADA_PARCIAL'].includes(v.estado ?? '');
}

export function saldoPendienteVenta(v: Venta): number {
  const total = Number(v.total ?? 0);
  const pagado = (v.pagos ?? []).reduce((a, p) => a + Number(p.monto ?? 0), 0);
  return Math.max(0, total - pagado);
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

/**
 * Llave del GRUPO DE MAYOREO al que pertenece un nivel.
 *
 * 🔴 ESPEJO de `PrecioNivelService.claveGrupoMayoreo` (backend) y de
 * `VentaDetalleInput.claveGrupoMayoreo` (app). Los strings no tienen que
 * coincidir entre los tres —cada uno agrupa en su casa— pero sí tienen que
 * AGRUPAR IGUAL: si la web junta variantes que el backend separa, el precio
 * que se manda no es el que el servidor calcula y la venta rebota con 409
 * PRECIO_DESACTUALIZADO.
 *
 * El `nombre` del nivel NO entra: "Por Mayor" y "Mayorista" al mismo precio son
 * el mismo trato. El `productoId` sí, porque el mayoreo combinado se acumula
 * DENTRO de un producto.
 */
export function claveGrupoMayoreo(productoId: string, nivel: NivelPrecio): string {
  const valor = nivel.tipoPrecio === 'PRECIO_FIJO'
    ? (nivel.precio != null ? Number(nivel.precio).toFixed(6) : 'sin-precio')
    : (nivel.porcentajeDesc != null ? Number(nivel.porcentajeDesc).toFixed(2) : 'sin-pct');
  return [
    productoId,
    nivel.cantidadMinima,
    nivel.cantidadMaxima ?? 'inf',
    nivel.tipoPrecio,
    valor,
  ].join('|');
}

/** Lo mínimo que necesita una línea para entrar al mayoreo combinado. */
export interface LineaAgrupable {
  productoId?: string;
  varianteId?: string;
  cantidad: number;
  niveles: NivelPrecio[];
  origenComboId?: string;
}

/**
 * MAYOREO COMBINADO: unidades que junta cada grupo en TODO el carrito.
 *
 * Quien se lleva 3 edredones de tres diseños distintos que comparten el mismo
 * "Por Mayor ≥ 3" tiene que pagar por mayor los tres: el cliente ve tres
 * edredones, no tres líneas de uno.
 *
 * Cuenta LÍNEAS y no variantes distintas (la misma variante en dos líneas de 1
 * también suma 2) y deja afuera los componentes de combo, que tienen su propio
 * deal de precio. Una línea en liquidación SÍ acumula aunque nunca reciba
 * nivel: son unidades que el cliente se lleva.
 */
export function cantidadesGrupoMayoreo(items: LineaAgrupable[]): Map<string, number> {
  const totales = new Map<string, number>();
  const acumulan = items.filter(i => i.varianteId && i.productoId && !i.origenComboId);
  // Una sola línea no combina con nadie.
  if (acumulan.length < 2) return totales;
  for (const item of acumulan) {
    for (const nivel of item.niveles ?? []) {
      if (nivel.isActive === false) continue;
      const clave = claveGrupoMayoreo(item.productoId as string, nivel);
      totales.set(clave, (totales.get(clave) ?? 0) + item.cantidad);
    }
  }
  return totales;
}

/** Contexto de mayoreo combinado para elegir el nivel de una línea. */
export interface CtxGrupoMayoreo {
  cantidadesGrupo?: Map<string, number>;
  /**
   * Solo las líneas de VARIANTE combinan, igual que en el backend (que scopea
   * el grupo por `variante.productoId`). Pasarle el productoId a una línea de
   * producto suelto la haría enganchar con un grupo que el servidor no arma.
   */
  productoId?: string | null;
}

/**
 * Nivel más ESPECÍFICO aplicable (mayor cantidadMinima) — paridad venta_rapida_cubit.
 *
 * Con [ctx] cada nivel se mide contra las unidades de SU grupo cuando el
 * carrito acumuló más que esta línea; sin él manda la cantidad de la línea.
 */
export function nivelAplicable(
  niveles: NivelPrecio[],
  cantidad: number,
  ctx?: CtxGrupoMayoreo,
): NivelPrecio | null {
  // El `max` garantiza que el mayoreo combinado nunca EMPEORE un precio: una
  // línea de 10 unidades se sigue midiendo por sus 10 aunque el grupo sume menos.
  const efectiva = (n: NivelPrecio): number => {
    if (!ctx?.cantidadesGrupo || !ctx.productoId) return cantidad;
    const delGrupo = ctx.cantidadesGrupo.get(claveGrupoMayoreo(ctx.productoId, n));
    return delGrupo != null && delGrupo > cantidad ? delGrupo : cantidad;
  };
  return niveles
    .filter(n => n.isActive !== false)
    .filter(n => {
      const c = Math.floor(efectiva(n));
      return c >= n.cantidadMinima && (n.cantidadMaxima == null || c <= n.cantidadMaxima);
    })
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
  /**
   * Nombre del producto y de la variante POR SEPARADO (contexto local, no viaja
   * al backend: eso es `descripcion`).
   *
   * El carrito muestra el valor que DISTINGUE la línea —el último eje de la
   * variante— y baja el resto a un breadcrumb. Con mayoreo combinado el caso
   * normal son tres líneas del mismo producto que se diferencian solo en ese
   * eje, y partir la `descripcion` armada a mano es frágil.
   */
  productoNombre?: string;
  varianteNombre?: string;
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
  // Cobro de orden de servicio: línea pura (precio = costo neto, cantidad 1, sin descuento).
  // El backend aplica el adelanto como pago y cobra hoy total − adelanto.
  ordenServicioId?: string;
  esOrdenServicio?: boolean;
  adelantoOrden?: number; // adelanto ya pagado de la orden (para calcular el saldo a cobrar hoy)
  // Contexto local (NO viaja al backend)
  niveles: NivelPrecio[];
  nivelAplicado?: string | null;
  enLiquidacion: boolean;
  precioCosto?: number | null;
  stockDisponible?: number | null;
}

/** Recalcula precioUnitario por niveles para la cantidad (liquidación gana e ignora niveles) */
export function recalcularPorNiveles(
  item: VentaItem,
  cantidad: number,
  cantidadesGrupo?: Map<string, number>,
): VentaItem {
  if (item.enLiquidacion) {
    return { ...item, cantidad, precioUnitario: item.precioBase, nivelAplicado: null };
  }
  const nivel = nivelAplicable(item.niveles, cantidad, {
    cantidadesGrupo,
    productoId: item.varianteId ? item.productoId : null,
  });
  const precio = precioConNivel(item.precioBase, nivel);
  return {
    ...item,
    cantidad,
    precioUnitario: precio,
    nivelAplicado: precio < item.precioBase ? nivel?.nombre ?? null : null,
  };
}

/**
 * Reprecia el carrito ENTERO de una, aplicando mayoreo combinado.
 *
 * 🔴 Este es el punto de entrada: con mayoreo combinado el precio de una línea
 * depende de las OTRAS, así que repreciar solo la que se tocó deja a las demás
 * con el precio viejo — y una línea sin repreciar no es un detalle cosmético,
 * es una venta que el backend rebota con 409. Cada vez que se agrega, quita o
 * cambia la cantidad de un ítem hay que pasar la lista COMPLETA por acá.
 */
export function recalcularNivelesEnLote(items: VentaItem[]): VentaItem[] {
  const grupos = cantidadesGrupoMayoreo(items);
  return items.map(it => (
    // Componentes de combo: el precio lo fija el prorrateo del combo. Espejo
    // de `ignorarNiveles` del backend.
    it.origenComboId ? it : recalcularPorNiveles(it, it.cantidad, grupos)
  ));
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
