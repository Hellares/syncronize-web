import { apiClient } from '@/core/api/client';
import type { CrearYCobrarVentaDto, Venta, VentaFiltros, VentaEnvio, VentaEnvioDto, ClienteResueltoDni, ClienteResueltoRuc, MetodoPagoVenta } from '@/core/types/venta';

/** Aplana relaciones anidadas a los campos planos que usa la UI
 *  (paridad VentaModel.fromJson de Flutter: comprobante.codigoGenerado, sede.nombre, etc.) */
function normalizeVenta(raw: Record<string, unknown>): Venta {
  const v = { ...raw } as Venta;
  const c = raw.comprobante as Record<string, unknown> | null | undefined;
  if (c && typeof c === 'object') {
    v.comprobanteId = (c.id as string) ?? v.comprobanteId;
    v.tipoComprobante = (c.tipoComprobante as string) ?? v.tipoComprobante;
    v.codigoComprobante = (c.codigoGenerado as string) ?? v.codigoComprobante;
    v.comprobanteSunatStatus = (c.sunatStatus as string) ?? v.comprobanteSunatStatus;
    v.comprobanteSunatHash = (c.sunatHash as string) ?? null;
    v.comprobanteSunatXmlUrl = (c.sunatXmlUrl as string) ?? null;
    v.comprobanteSunatPdfUrl = (c.sunatPdfUrl as string) ?? null;
    v.comprobanteEnlaceProveedor = (c.enlaceProveedor as string) ?? null;
    v.comprobanteErrorProveedor = (c.errorProveedor as string) ?? null;
    v.comprobanteAnulado = (c.anulado as boolean) ?? false;
    (v as Record<string, unknown>).comprobanteCadenaQR = (c.cadenaQR as string) ?? null;
    // Montos fiscales del comprobante (Decimal llega como string — parser tolerante)
    const num = (x: unknown) => (x == null ? null : Number(x));
    v.comprobanteGravada = num(c.gravada);
    v.comprobanteExonerada = num(c.exonerada);
    v.comprobanteInafecta = num(c.inafecta);
    v.comprobanteGratuitas = num(c.gratuitas);
    v.comprobanteIgv = num(c.igv);
    v.comprobanteIcbper = num(c.icbper);
  }
  const sede = raw.sede as { nombre?: string } | undefined;
  if (sede?.nombre && !v.sedeNombre) v.sedeNombre = sede.nombre;
  const vendedor = raw.vendedor as { persona?: { nombres?: string; apellidos?: string }; aliasTicket?: string } | undefined;
  if (vendedor) {
    if (!v.vendedorNombre && vendedor.persona) v.vendedorNombre = `${vendedor.persona.nombres ?? ''} ${vendedor.persona.apellidos ?? ''}`.trim();
    if (!v.vendedorAlias && vendedor.aliasTicket?.trim()) v.vendedorAlias = vendedor.aliasTicket.trim();
  }
  const cajero = raw.cajero as { persona?: { nombres?: string; apellidos?: string } } | undefined;
  if (cajero?.persona && !v.cajeroNombre) v.cajeroNombre = `${cajero.persona.nombres ?? ''} ${cajero.persona.apellidos ?? ''}`.trim();
  const cot = raw.cotizacion as { codigo?: string } | undefined;
  if (cot?.codigo && !v.cotizacionCodigo) v.cotizacionCodigo = cot.codigo;
  return v;
}

/** POS: crea y cobra la venta en una sola operación (requiere caja abierta).
 *  409 con divergencias[] si los precios difieren del recálculo server (re-sync y reintentar). */
export async function crearYCobrar(data: CrearYCobrarVentaDto): Promise<Venta> {
  const res = await apiClient.post('/ventas/cobrar', data);
  return normalizeVenta(res.data);
}

export async function getVenta(id: string): Promise<Venta> {
  const res = await apiClient.get(`/ventas/${id}`);
  return normalizeVenta(res.data);
}

// --- Gestión de ventas (V3) ---

/** Listado (array plano, server filtra por rol: VENDEDOR→sus ventas, CAJERO→las que cobró) */
export async function getVentas(filtros?: VentaFiltros): Promise<Venta[]> {
  const q = new URLSearchParams();
  if (filtros?.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros?.estado) q.set('estado', filtros.estado);
  if (filtros?.fechaDesde) q.set('fechaDesde', filtros.fechaDesde);
  if (filtros?.fechaHasta) q.set('fechaHasta', filtros.fechaHasta);
  if (filtros?.clienteId) q.set('clienteId', filtros.clienteId);
  if (filtros?.search) q.set('search', filtros.search);
  if (filtros?.canalVenta) q.set('canalVenta', filtros.canalVenta);
  if (filtros?.tipoEntrega) q.set('tipoEntrega', filtros.tipoEntrega);
  if (filtros?.entregaBusqueda) q.set('entregaBusqueda', filtros.entregaBusqueda);
  if (filtros?.rucEmisor) q.set('rucEmisor', filtros.rucEmisor);
  const query = q.toString();
  const res = await apiClient.get(`/ventas${query ? `?${query}` : ''}`);
  const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return list.map(normalizeVenta);
}

/**
 * Solo el RESUMEN del período (montos, ticket, utilidad, margen).
 *
 * Es el endpoint chico: el dashboard consolidado arma 17 secciones y no hace
 * falta pagarlas para mostrar tres cifras del mes.
 */
export async function getAnalyticsResumen(params: import('@/core/types/venta-analytics').AnalyticsQuery = {}): Promise<import('@/core/types/venta-analytics').AnalyticsResumen> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const query = q.toString();
  const res = await apiClient.get(`/ventas/analytics/resumen${query ? `?${query}` : ''}`);
  return res.data;
}

/** Dashboard consolidado de estadísticas de ventas: 17 secciones en 1 request */
export async function getAnalyticsDashboard(params: import('@/core/types/venta-analytics').AnalyticsQuery = {}): Promise<import('@/core/types/venta-analytics').VentaAnalyticsDashboard> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const query = q.toString();
  const res = await apiClient.get(`/ventas/analytics/dashboard${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getResumenVentas(sedeId?: string): Promise<Record<string, unknown>> {
  const res = await apiClient.get(`/ventas/resumen${sedeId ? `?sedeId=${sedeId}` : ''}`);
  return res.data;
}

/** Búsqueda exacta por código de venta o comprobante */
export async function buscarVentaPorCodigo(codigo: string): Promise<Venta | null> {
  const res = await apiClient.get(`/ventas/buscar?codigo=${encodeURIComponent(codigo)}`);
  return res.data ? normalizeVenta(res.data) : null;
}

export async function anularVenta(id: string, data: { autorizadoPorId: string; motivo: string }): Promise<Venta> {
  const res = await apiClient.post<Venta>(`/ventas/${id}/anular`, data);
  return res.data;
}

/** Pago de venta a crédito (cuotaVentaId opcional para cuota específica) */
export async function procesarPago(id: string, data: { metodoPago: MetodoPagoVenta; monto: number; referencia?: string; cuotaVentaId?: string }): Promise<Venta> {
  const res = await apiClient.post<Venta>(`/ventas/${id}/pago`, data);
  return res.data;
}

/** Reintento manual de comprobante electrónico */
export async function generarComprobante(id: string, data: { tipoComprobante: 'BOLETA' | 'FACTURA'; tipoDocumentoCliente?: string }): Promise<Record<string, unknown>> {
  const res = await apiClient.post(`/ventas/${id}/generar-comprobante`, data);
  return res.data;
}

// --- Envío (rótulo de agencia) ---

/** Upsert de datos de envío (marca conEnvio=true) */
export async function upsertEnvio(ventaId: string, data: VentaEnvioDto): Promise<Venta> {
  const res = await apiClient.put(`/ventas/${ventaId}/envio`, data);
  return normalizeVenta(res.data);
}

/** Marca el rótulo como impreso (chip IMPRESO) */
export async function marcarRotuloImpreso(ventaId: string): Promise<void> {
  await apiClient.patch(`/ventas/${ventaId}/envio/rotulo-impreso`);
}

/** Último envío del cliente para prefill ("lo último que tocaste gana") */
export async function getUltimoEnvioCliente(clienteId: string): Promise<VentaEnvio | null> {
  const res = await apiClient.get(`/ventas/envio/ultimo?clienteId=${clienteId}`);
  return res.data ?? null;
}

/** Reenvío manual del comprobante a SUNAT (PENDIENTE / ERROR_COMUNICACION) */
export async function reenviarComprobanteSunat(comprobanteId: string): Promise<void> {
  await apiClient.post(`/sunat/comprobantes/${comprobanteId}/enviar`);
}

/** Cadena cotización → venta → comprobante → devoluciones */
export async function getFlujoDocumentos(id: string): Promise<Record<string, unknown>> {
  const res = await apiClient.get(`/ventas/${id}/flujo-documentos`);
  return res.data;
}

/** Precio calculado por cantidad (niveles server-side) — producto */
export async function calcularPrecioProducto(productoId: string, cantidad: number, sedeId: string): Promise<{ precioUnitario: number; nivelAplicado?: unknown }> {
  const res = await apiClient.get(`/productos/${productoId}/calcular-precio?cantidad=${cantidad}&sedeId=${sedeId}`);
  return res.data;
}

export async function calcularPrecioVariante(varianteId: string, cantidad: number, sedeId: string): Promise<{ precioUnitario: number; nivelAplicado?: unknown }> {
  const res = await apiClient.get(`/productos/variantes/${varianteId}/calcular-precio?cantidad=${cantidad}&sedeId=${sedeId}`);
  return res.data;
}

// --- Cliente unificado (RENIEC/SUNAT, paridad Flutter) ---

export async function buscarClientePorDni(dni: string): Promise<ClienteResueltoDni> {
  const res = await apiClient.get<ClienteResueltoDni>(`/clientes/por-dni/${dni}`);
  return res.data;
}

export async function buscarClientePorRuc(ruc: string): Promise<ClienteResueltoRuc> {
  const res = await apiClient.get<ClienteResueltoRuc>(`/clientes/por-ruc/${ruc}`);
  return res.data;
}

/** Cliente genérico "CLIENTES VARIOS" (doc 00000000). No válido para FACTURA ni crédito */
export async function obtenerClienteGenerico(): Promise<ClienteResueltoDni> {
  const res = await apiClient.get<ClienteResueltoDni>('/clientes/generico');
  return res.data;
}
