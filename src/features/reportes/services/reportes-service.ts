import { apiClient } from '@/core/api/client';
import type {
  AnalyticsFiltros,
  ResumenVentas,
  VentaPeriodo,
  TopProducto,
  TopCliente,
  ResumenFinanciero,
  PuntoGraficoDiario,
} from '@/core/types/reportes';

// ── Ventas analytics (/ventas/analytics/*) ──

function analyticsQuery(f: AnalyticsFiltros): string {
  const q = new URLSearchParams();
  if (f.sedeId) q.set('sedeId', f.sedeId);
  if (f.fechaInicio) q.set('fechaInicio', f.fechaInicio);
  if (f.fechaFin) q.set('fechaFin', f.fechaFin);
  if (f.periodo) q.set('periodo', f.periodo);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getResumenVentas(f: AnalyticsFiltros = {}): Promise<ResumenVentas> {
  const res = await apiClient.get<ResumenVentas>(`/ventas/analytics/resumen${analyticsQuery(f)}`);
  return res.data;
}

export async function getVentasPorPeriodo(f: AnalyticsFiltros = {}): Promise<VentaPeriodo[]> {
  const res = await apiClient.get(`/ventas/analytics/ventas-periodo${analyticsQuery(f)}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getTopProductos(f: AnalyticsFiltros = {}): Promise<TopProducto[]> {
  const res = await apiClient.get(`/ventas/analytics/top-productos${analyticsQuery(f)}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getTopClientes(f: AnalyticsFiltros = {}): Promise<TopCliente[]> {
  const res = await apiClient.get(`/ventas/analytics/top-clientes${analyticsQuery(f)}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// ── Resumen financiero (/resumen-financiero) ──

export async function getResumenFinanciero(params: { fechaDesde?: string; fechaHasta?: string } = {}): Promise<ResumenFinanciero> {
  const q = new URLSearchParams();
  if (params.fechaDesde) q.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) q.set('fechaHasta', params.fechaHasta);
  const query = q.toString();
  const res = await apiClient.get<ResumenFinanciero>(`/resumen-financiero${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getGraficoDiario(params: { fechaDesde?: string; fechaHasta?: string } = {}): Promise<PuntoGraficoDiario[]> {
  const q = new URLSearchParams();
  if (params.fechaDesde) q.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) q.set('fechaHasta', params.fechaHasta);
  const query = q.toString();
  const res = await apiClient.get(`/resumen-financiero/grafico-diario${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// ── Exports Excel (/reportes-financieros/export/*) ──

async function descargarExcel(url: string, nombre: string): Promise<void> {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export function exportLibroContable(mes: number, anio: number): Promise<void> {
  return descargarExcel(`/reportes-financieros/export/libro-contable?mes=${mes}&anio=${anio}`, `libro_contable_${String(mes).padStart(2, '0')}_${anio}.xlsx`);
}

export function exportCuentasCobrar(): Promise<void> {
  return descargarExcel('/reportes-financieros/export/cuentas-cobrar', `cuentas_por_cobrar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportCuentasPagar(): Promise<void> {
  return descargarExcel('/reportes-financieros/export/cuentas-pagar', `cuentas_por_pagar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
