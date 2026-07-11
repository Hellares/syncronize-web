import { apiClient } from '@/core/api/client';
import type {
  Caja,
  MovimientoCaja,
  ResumenCaja,
  ArqueoCaja,
  AbrirCajaDto,
  CrearMovimientoCajaDto,
  CerrarCajaDto,
  AnularMovimientoCajaDto,
  TipoArqueoCaja,
  ConteoMetodoPagoDto,
  CierreCaja,
  CajaMonitorData,
  CajaAuditoria,
  CategoriaGasto,
  TipoMovimientoCaja,
} from '@/core/types/caja';

const BASE = '/caja';

/** Categorías de gasto personalizadas (para GASTO_OPERATIVO / OTRO_EGRESO / OTRO_INGRESO) */
export async function getCategoriasGasto(tipo?: TipoMovimientoCaja): Promise<CategoriaGasto[]> {
  const res = await apiClient.get<CategoriaGasto[]>(`/categorias-gasto${tipo ? `?tipo=${tipo}` : ''}`);
  return res.data;
}

// --- Apertura / caja activa ---

export async function abrirCaja(data: AbrirCajaDto): Promise<Caja> {
  const res = await apiClient.post<Caja>(`${BASE}/abrir`, data);
  return res.data;
}

/** Caja activa del usuario en sesión (null si no tiene) */
export async function getCajaActiva(): Promise<Caja | null> {
  const res = await apiClient.get(`${BASE}/activa`);
  return res.data ?? null;
}

// --- Movimientos ---

export async function getMovimientos(cajaId: string, params?: { limit?: number; offset?: number }): Promise<MovimientoCaja[]> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const query = q.toString();
  const res = await apiClient.get(`${BASE}/${cajaId}/movimientos${query ? `?${query}` : ''}`);
  // Puede venir array directo o paginado
  return Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.movimientos ?? [];
}

export async function crearMovimiento(cajaId: string, data: CrearMovimientoCajaDto): Promise<MovimientoCaja> {
  const res = await apiClient.post<MovimientoCaja>(`${BASE}/${cajaId}/movimiento`, data);
  return res.data;
}

export async function anularMovimiento(cajaId: string, movimientoId: string, data: AnularMovimientoCajaDto): Promise<MovimientoCaja> {
  const res = await apiClient.post<MovimientoCaja>(`${BASE}/${cajaId}/movimiento/${movimientoId}/anular`, data);
  return res.data;
}

// --- Resumen / auditoría ---

export async function getResumen(cajaId: string): Promise<ResumenCaja> {
  const res = await apiClient.get<ResumenCaja>(`${BASE}/${cajaId}/resumen`);
  return res.data;
}

export async function getAuditoria(cajaId: string): Promise<CajaAuditoria> {
  const res = await apiClient.get<CajaAuditoria>(`${BASE}/${cajaId}/auditoria`);
  return res.data;
}

// --- Cierre y arqueos ---

export async function cerrarCaja(cajaId: string, data: CerrarCajaDto): Promise<{ caja: Caja; cierre: CierreCaja }> {
  const res = await apiClient.post(`${BASE}/${cajaId}/cerrar`, data);
  return res.data;
}

/** Arqueo intermedio con la caja ABIERTA (RUTINARIO / SORPRESIVO / RELEVO) */
export async function crearArqueo(cajaId: string, data: {
  tipo: TipoArqueoCaja;
  conteos: ConteoMetodoPagoDto[];
  observaciones?: string;
  autorizadoPorId?: string;
  turnoEntregadoAId?: string;
  desgloseEfectivo?: Record<string, number>;
}): Promise<ArqueoCaja> {
  const res = await apiClient.post<ArqueoCaja>(`${BASE}/${cajaId}/arqueo`, data);
  return res.data;
}

export async function getArqueos(cajaId: string): Promise<ArqueoCaja[]> {
  const res = await apiClient.get(`${BASE}/${cajaId}/arqueos`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// --- Historial / monitor / detalle ---

export async function getHistorial(params?: { sedeId?: string; fechaDesde?: string; fechaHasta?: string; limit?: number; offset?: number }): Promise<Caja[]> {
  const q = new URLSearchParams();
  if (params?.sedeId) q.set('sedeId', params.sedeId);
  if (params?.fechaDesde) q.set('fechaDesde', params.fechaDesde);
  if (params?.fechaHasta) q.set('fechaHasta', params.fechaHasta);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const query = q.toString();
  const res = await apiClient.get(`${BASE}/historial${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.cajas ?? [];
}

/** Cajas abiertas de todos los cajeros (admin) */
export async function getMonitor(sedeId?: string): Promise<CajaMonitorData> {
  const params = sedeId ? `?sedeId=${sedeId}` : '';
  const res = await apiClient.get<CajaMonitorData>(`${BASE}/monitor${params}`);
  return res.data;
}

export async function getCaja(cajaId: string): Promise<Caja> {
  const res = await apiClient.get<Caja>(`${BASE}/${cajaId}`);
  return res.data;
}

// --- Configuración ---

export async function getConfiguracion(): Promise<Record<string, unknown>> {
  const res = await apiClient.get(`${BASE}/configuracion`);
  return res.data;
}

export async function updateConfiguracion(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await apiClient.patch(`${BASE}/configuracion`, data);
  return res.data;
}
