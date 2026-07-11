import { apiClient } from '@/core/api/client';
import type {
  ConsolidadoTesoreria,
  EstadoCuentaBanco,
  AjusteBancoItem,
  CrearBancoDto,
  CuentaRecaudacion,
  BancoEmpresa,
} from '@/core/types/tesoreria-bancos';

// ── Consolidado (bóveda + bancos + desglose digital) ──
export async function getConsolidado(): Promise<ConsolidadoTesoreria> {
  const res = await apiClient.get('/caja/tesoreria-consolidado');
  return res.data;
}

// ── Cuentas bancarias (empresa-banco) ──
export async function listarBancos(): Promise<BancoEmpresa[]> {
  const res = await apiClient.get('/empresa-banco');
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function crearBanco(dto: CrearBancoDto): Promise<BancoEmpresa> {
  const res = await apiClient.post('/empresa-banco', dto);
  return res.data;
}

export async function actualizarBanco(id: string, dto: Partial<CrearBancoDto>): Promise<BancoEmpresa> {
  const res = await apiClient.patch(`/empresa-banco/${id}`, dto);
  return res.data;
}

export async function marcarPrincipal(id: string): Promise<unknown> {
  const res = await apiClient.post(`/empresa-banco/${id}/principal`, {});
  return res.data;
}

export async function eliminarBanco(id: string): Promise<void> {
  await apiClient.delete(`/empresa-banco/${id}`);
}

/** Mueve el digital histórico acumulado en tesorería a los bancos según el mapeo de recaudación (idempotente) */
export async function migrarDigitalHistorico(): Promise<{ totalMovido?: number;[key: string]: unknown }> {
  const res = await apiClient.post('/caja/tesoreria/migrar-digital-historico', {});
  return res.data;
}

export async function getEstadoCuentaBanco(id: string, fechaDesde?: string, fechaHasta?: string): Promise<EstadoCuentaBanco> {
  const q = new URLSearchParams();
  if (fechaDesde) q.set('fechaDesde', fechaDesde);
  if (fechaHasta) q.set('fechaHasta', fechaHasta);
  const query = q.toString();
  const res = await apiClient.get(`/empresa-banco/${id}/estado-cuenta${query ? `?${query}` : ''}`);
  return res.data;
}

/** Conciliar: fija el saldo real del extracto (registra el delta como ajuste). */
export async function conciliarBanco(id: string, saldo: number): Promise<unknown> {
  const res = await apiClient.patch(`/empresa-banco/${id}/saldo`, { saldo });
  return res.data;
}

export async function ajustarBanco(id: string, tipo: 'INGRESO' | 'EGRESO', monto: number, motivo: string): Promise<unknown> {
  const res = await apiClient.post(`/empresa-banco/${id}/ajuste`, { tipo, monto, motivo });
  return res.data;
}

export async function getAjustesBanco(id: string): Promise<AjusteBancoItem[]> {
  const res = await apiClient.get(`/empresa-banco/${id}/ajustes`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// ── Cuentas de recaudación (método → banco) ──
export async function getCuentasRecaudacion(): Promise<CuentaRecaudacion[]> {
  const res = await apiClient.get('/cuentas-recaudacion');
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function setCuentaRecaudacion(metodoPago: string, bancoId: string): Promise<unknown> {
  const res = await apiClient.put(`/cuentas-recaudacion/${metodoPago}`, { bancoId });
  return res.data;
}

export async function removeCuentaRecaudacion(metodoPago: string): Promise<unknown> {
  const res = await apiClient.delete(`/cuentas-recaudacion/${metodoPago}`);
  return res.data;
}
