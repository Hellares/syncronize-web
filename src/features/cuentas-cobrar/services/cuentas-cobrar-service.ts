import { apiClient } from '@/core/api/client';
import type {
  CuentaPorCobrar,
  ResumenCuentasCobrar,
  ConfiguracionMora,
  CuentasCobrarFiltros,
  RegistrarAbonoDto,
  DeudaCliente,
} from '@/core/types/cuentas-cobrar';

const BASE = '/cuentas-por-cobrar';

/** Registra un abono (endpoint canónico CxC): imputa en cascada mora → interés → principal.
 *  `fuente` decide a dónde ENTRA el dinero (TESORERIA/CAJA/BANCO). */
export async function registrarAbono(ventaId: string, dto: RegistrarAbonoDto): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${ventaId}/abono`, dto);
  return res.data;
}

/** Anula un abono: revierte el ingreso (caja/banco) y recomputa cuotas */
export async function anularAbono(pagoId: string, motivo?: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/pagos/${pagoId}/anular`, motivo ? { motivo } : {});
  return res.data;
}

/** Deuda agrupada por cliente */
export async function getPorCliente(): Promise<DeudaCliente[]> {
  const res = await apiClient.get(`${BASE}/por-cliente`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Estado de cuenta del cliente (ventas crédito + abonos + saldo) */
export async function getEstadoCuentaCliente(params: { clienteId?: string; clienteEmpresaId?: string }): Promise<Record<string, unknown>> {
  const q = new URLSearchParams();
  if (params.clienteId) q.set('clienteId', params.clienteId);
  if (params.clienteEmpresaId) q.set('clienteEmpresaId', params.clienteEmpresaId);
  const res = await apiClient.get(`${BASE}/estado-cuenta-cliente?${q.toString()}`);
  return res.data;
}

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
