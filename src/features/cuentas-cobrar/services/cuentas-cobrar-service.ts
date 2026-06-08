import { apiClient } from '@/core/api/client';
import type {
  CuentaPorCobrar,
  ResumenCuentasCobrar,
  ConfiguracionMora,
  CuentasCobrarFiltros,
} from '@/core/types/cuentas-cobrar';

const BASE = '/cuentas-por-cobrar';

export async function getCuentas(filtros: CuentasCobrarFiltros = {}): Promise<CuentaPorCobrar[]> {
  const q = new URLSearchParams();
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.clienteId) q.set('clienteId', filtros.clienteId);
  if (filtros.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros.search) q.set('search', filtros.search);
  const query = q.toString();
  const res = await apiClient.get(`${BASE}${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getResumen(): Promise<ResumenCuentasCobrar> {
  const res = await apiClient.get<ResumenCuentasCobrar>(`${BASE}/resumen`);
  return res.data;
}

export async function getDetalle(ventaId: string): Promise<CuentaPorCobrar & Record<string, unknown>> {
  const res = await apiClient.get(`${BASE}/${ventaId}`);
  return res.data;
}

export async function getConfiguracionMora(): Promise<ConfiguracionMora> {
  const res = await apiClient.get<ConfiguracionMora>(`${BASE}/configuracion-mora`);
  return res.data;
}

export async function updateConfiguracionMora(data: Partial<ConfiguracionMora>): Promise<ConfiguracionMora> {
  const res = await apiClient.patch<ConfiguracionMora>(`${BASE}/configuracion-mora`, data);
  return res.data;
}
