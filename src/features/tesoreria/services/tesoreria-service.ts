import { apiClient } from '@/core/api/client';
import type {
  TesoreriaResumen,
  TesoreriaMovimientosResponse,
  TesoreriaMovimiento,
  TesoreriaFiltros,
  AjusteTesoreriaDto,
} from '@/core/types/tesoreria';

const BASE = '/caja/tesoreria';

export async function getResumen(sedeId: string): Promise<TesoreriaResumen> {
  const res = await apiClient.get<TesoreriaResumen>(`${BASE}/${sedeId}`);
  return res.data;
}

export async function getMovimientos(sedeId: string, filtros: TesoreriaFiltros = {}): Promise<TesoreriaMovimientosResponse> {
  const q = new URLSearchParams();
  if (filtros.tipo) q.set('tipo', filtros.tipo);
  if (filtros.metodoPago) q.set('metodoPago', filtros.metodoPago);
  if (filtros.categoria) q.set('categoria', filtros.categoria);
  if (filtros.fechaDesde) q.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) q.set('fechaHasta', filtros.fechaHasta);
  if (filtros.q) q.set('q', filtros.q);
  q.set('page', String(filtros.page ?? 1));
  q.set('pageSize', String(filtros.pageSize ?? 50));
  const res = await apiClient.get<TesoreriaMovimientosResponse>(`${BASE}/${sedeId}/movimientos?${q.toString()}`);
  return res.data;
}

export async function crearAjuste(sedeId: string, data: AjusteTesoreriaDto): Promise<TesoreriaMovimiento> {
  const res = await apiClient.post<TesoreriaMovimiento>(`${BASE}/${sedeId}/ajuste`, data);
  return res.data;
}
