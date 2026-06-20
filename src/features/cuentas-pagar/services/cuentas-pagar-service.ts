import { apiClient } from '@/core/api/client';
import type {
  CuentaPorPagar,
  ResumenCxP,
  DeudaProveedor,
  CuentaPagarDetalle,
  RegistrarPagoDto,
} from '@/core/types/cuentas-pagar';

const BASE = '/cuentas-por-pagar';

export async function listarCxP(filtros: { estado?: string; proveedorId?: string } = {}): Promise<CuentaPorPagar[]> {
  const q = new URLSearchParams();
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.proveedorId) q.set('proveedorId', filtros.proveedorId);
  const query = q.toString();
  const res = await apiClient.get(`${BASE}${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getResumenCxP(): Promise<ResumenCxP> {
  const res = await apiClient.get<ResumenCxP>(`${BASE}/resumen`);
  return res.data;
}

export async function getPorProveedor(): Promise<DeudaProveedor[]> {
  const res = await apiClient.get(`${BASE}/por-proveedor`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getDetalleCxP(compraId: string): Promise<CuentaPagarDetalle> {
  const res = await apiClient.get(`${BASE}/${compraId}/detalle`);
  return res.data;
}

export async function registrarPago(compraId: string, dto: RegistrarPagoDto): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${compraId}/pago`, dto);
  return res.data;
}

export async function anularPagoCxP(pagoId: string, motivo?: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/pagos/${pagoId}/anular`, motivo ? { motivo } : {});
  return res.data;
}
