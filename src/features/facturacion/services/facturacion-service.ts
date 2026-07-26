import { apiClient } from '@/core/api/client';
import type {
  ConfiguracionFacturacion,
  UpdateConfiguracionFacturacionDto,
  ProbarConexionDto,
  ProbarConexionResponse,
  Emisor,
  ComprobanteItem,
  ListarComprobantesParams,
  ListarComprobantesResponse,
  EnviarPendientesResponse,
  ConsultarPendientesResponse,
  MotivoNota,
  TipoNota,
  CrearNotaDto,
  ComunicacionBaja,
  CrearComunicacionBajaDto,
  ResumenDiario,
  CrearResumenDiarioDto,
  SincronizacionPreview,
  AplicarSincronizacionDto,
  ResultadoSincronizacion,
  ReporteCorrelativos,
} from '@/core/types/facturacion';

const BASE = '/sunat';

// ── Configuración ──

export async function getConfiguracion(sedeId?: string): Promise<ConfiguracionFacturacion> {
  const q = sedeId ? `?sedeId=${sedeId}` : '';
  const res = await apiClient.get<ConfiguracionFacturacion>(`${BASE}/configuracion${q}`);
  return res.data;
}

export async function updateConfiguracion(data: UpdateConfiguracionFacturacionDto): Promise<ConfiguracionFacturacion> {
  const res = await apiClient.put<ConfiguracionFacturacion>(`${BASE}/configuracion`, data);
  return res.data;
}

export async function probarConexion(data: ProbarConexionDto): Promise<ProbarConexionResponse> {
  const res = await apiClient.post<ProbarConexionResponse>(`${BASE}/configuracion/probar`, data);
  return res.data;
}

export async function getEmisores(): Promise<Emisor[]> {
  const res = await apiClient.get(`${BASE}/emisores`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// ── Monitor de comprobantes ──

export async function listarComprobantes(params: ListarComprobantesParams = {}): Promise<ListarComprobantesResponse> {
  const q = new URLSearchParams();
  if (params.tipo) q.set('tipo', params.tipo);
  if (params.sunatStatus) q.set('sunatStatus', params.sunatStatus);
  if (params.rucEmisor) q.set('rucEmisor', params.rucEmisor);
  if (params.fechaDesde) q.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) q.set('fechaHasta', params.fechaHasta);
  if (params.busqueda) q.set('busqueda', params.busqueda);
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 20));
  const res = await apiClient.get<ListarComprobantesResponse>(`${BASE}/comprobantes?${q.toString()}`);
  return res.data;
}

/** Reenvía un comprobante PENDIENTE/ERROR_COMUNICACION al proveedor. */
export async function reenviarComprobante(id: string): Promise<ComprobanteItem> {
  const res = await apiClient.post<ComprobanteItem>(`${BASE}/comprobantes/${id}/enviar`, {});
  return res.data;
}

/** Reenvía en lote todos los pendientes. */
export async function enviarPendientes(): Promise<EnviarPendientesResponse> {
  const res = await apiClient.post<EnviarPendientesResponse>(`${BASE}/comprobantes/enviar-pendientes`, {});
  return res.data;
}

/** Consulta masiva del estado SUNAT de los PROCESANDO (batch-status). */
export async function consultarPendientes(): Promise<ConsultarPendientesResponse> {
  const res = await apiClient.post<ConsultarPendientesResponse>(`${BASE}/comprobantes/consultar-pendientes`, {});
  return res.data;
}

/** Consulta el estado de un comprobante individual. */
export async function consultarComprobante(id: string): Promise<unknown> {
  const res = await apiClient.get(`${BASE}/comprobantes/${id}/consultar`);
  return res.data;
}

/** Anulación directa (método legacy — para facturas usar CDB y para boletas RC). */
export async function anularComprobante(id: string, motivo: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/comprobantes/${id}/anular`, { motivo });
  return res.data;
}

// ── Notas de crédito / débito ──

export async function getMotivosNota(tipo: TipoNota): Promise<MotivoNota[]> {
  const res = await apiClient.get(`${BASE}/catalogos/motivos-nota?tipo=${tipo}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function crearNotaCredito(comprobanteOrigenId: string, data: CrearNotaDto): Promise<ComprobanteItem> {
  const res = await apiClient.post<ComprobanteItem>(`${BASE}/comprobantes/${comprobanteOrigenId}/nota-credito`, data);
  return res.data;
}

export async function crearNotaDebito(comprobanteOrigenId: string, data: CrearNotaDto): Promise<ComprobanteItem> {
  const res = await apiClient.post<ComprobanteItem>(`${BASE}/comprobantes/${comprobanteOrigenId}/nota-debito`, data);
  return res.data;
}

// ── Anulación SUNAT: Comunicaciones de Baja (facturas, FC, FD) ──

export async function crearComunicacionBaja(data: CrearComunicacionBajaDto): Promise<ComunicacionBaja> {
  const res = await apiClient.post<ComunicacionBaja>(`${BASE}/comunicaciones-baja`, data);
  return res.data;
}

export async function enviarComunicacionBaja(id: string): Promise<ComunicacionBaja> {
  const res = await apiClient.post<ComunicacionBaja>(`${BASE}/comunicaciones-baja/${id}/enviar`, {});
  return res.data;
}

export async function consultarComunicacionBaja(id: string): Promise<ComunicacionBaja> {
  const res = await apiClient.post<ComunicacionBaja>(`${BASE}/comunicaciones-baja/${id}/consultar`, {});
  return res.data;
}

export async function listarComunicacionesBaja(params: { estadoSunat?: string; page?: number; limit?: number } = {}): Promise<{ data: ComunicacionBaja[]; total: number; totalPages: number }> {
  const q = new URLSearchParams();
  if (params.estadoSunat) q.set('estadoSunat', params.estadoSunat);
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 20));
  const res = await apiClient.get(`${BASE}/comunicaciones-baja?${q.toString()}`);
  return res.data;
}

// ── Anulación SUNAT: Resúmenes Diarios (boletas, BC, BD) ──

export async function crearResumenDiario(data: CrearResumenDiarioDto): Promise<ResumenDiario> {
  const res = await apiClient.post<ResumenDiario>(`${BASE}/resumenes-diarios`, data);
  return res.data;
}

export async function enviarResumenDiario(id: string): Promise<ResumenDiario> {
  const res = await apiClient.post<ResumenDiario>(`${BASE}/resumenes-diarios/${id}/enviar`, {});
  return res.data;
}

export async function consultarResumenDiario(id: string): Promise<ResumenDiario> {
  const res = await apiClient.post<ResumenDiario>(`${BASE}/resumenes-diarios/${id}/consultar`, {});
  return res.data;
}

// ── Sincronización de series ──

export async function previewSincronizacionSeries(sedeId: string): Promise<SincronizacionPreview> {
  const res = await apiClient.get<SincronizacionPreview>(`${BASE}/series/preview?sedeId=${sedeId}`);
  return res.data;
}

export async function aplicarSincronizacionSeries(data: AplicarSincronizacionDto): Promise<ResultadoSincronizacion> {
  const res = await apiClient.post<ResultadoSincronizacion>(`${BASE}/series/sincronizar`, data);
  return res.data;
}

// ── Reporte de correlativos ──

export async function getReporteCorrelativos(params: { sedeId?: string; fechaDesde?: string; fechaHasta?: string } = {}): Promise<ReporteCorrelativos> {
  const q = new URLSearchParams();
  if (params.sedeId) q.set('sedeId', params.sedeId);
  if (params.fechaDesde) q.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) q.set('fechaHasta', params.fechaHasta);
  const query = q.toString();
  const res = await apiClient.get<ReporteCorrelativos>(`${BASE}/reporte-correlativos${query ? `?${query}` : ''}`);
  return res.data;
}
