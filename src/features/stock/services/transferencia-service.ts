import { apiClient } from '@/core/api/client';
import { TRANSFERENCIA_ENDPOINTS } from '@/core/api/endpoints';
import type {
  TransferenciaStock,
  CreateTransferenciaDto,
  CreateTransferenciasMultiplesDto,
  TransferenciaFiltros,
  PaginatedResponse,
} from '@/core/types/stock';

function buildTransferenciaParams(filtros: TransferenciaFiltros): string {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('limit', String(filtros.limit));
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  return params.toString();
}

export async function createTransferencia(data: CreateTransferenciaDto): Promise<TransferenciaStock> {
  const res = await apiClient.post<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.CREATE, data);
  return res.data;
}

export async function createTransferenciasMultiples(data: CreateTransferenciasMultiplesDto): Promise<TransferenciaStock[]> {
  const res = await apiClient.post<TransferenciaStock[]>(TRANSFERENCIA_ENDPOINTS.CREATE_MULTIPLES, data);
  return res.data;
}

export async function getTransferencias(filtros: TransferenciaFiltros): Promise<PaginatedResponse<TransferenciaStock>> {
  const query = buildTransferenciaParams(filtros);
  const res = await apiClient.get<PaginatedResponse<TransferenciaStock>>(`${TRANSFERENCIA_ENDPOINTS.LIST}?${query}`);
  return res.data;
}

export async function getTransferencia(id: string): Promise<TransferenciaStock> {
  const res = await apiClient.get<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.DETAIL(id));
  return res.data;
}

export async function aprobarTransferencia(id: string, observaciones?: string): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.APROBAR(id), { observaciones });
  return res.data;
}

export async function enviarTransferencia(id: string): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.ENVIAR(id));
  return res.data;
}

export async function recibirTransferencia(id: string, data?: { cantidadRecibida?: number; ubicacion?: string; observaciones?: string }): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.RECIBIR(id), data);
  return res.data;
}

export async function rechazarTransferencia(id: string, motivo: string): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.RECHAZAR(id), { motivo });
  return res.data;
}

export async function cancelarTransferencia(id: string, motivo: string): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.CANCELAR(id), { motivo });
  return res.data;
}

export async function procesarCompletoTransferencia(id: string, data?: { ubicacion?: string; observaciones?: string }): Promise<TransferenciaStock> {
  const res = await apiClient.put<TransferenciaStock>(TRANSFERENCIA_ENDPOINTS.PROCESAR_COMPLETO(id), data);
  return res.data;
}
