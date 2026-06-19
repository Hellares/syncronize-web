import { apiClient } from '@/core/api/client';

export interface IntegracionYapeConfig {
  configurado: boolean;
  habilitado: boolean;
  apiBaseUrl: string | null;
  accountId: string | null;
  accountApiKeyMask: string | null;
  webhookSecretMask: string | null;
  webhookUrl: string;
  actualizadoEn: string | null;
}

export interface UpdateIntegracionYapeDto {
  apiBaseUrl?: string;
  accountId?: string;
  accountApiKey?: string;
  webhookSecret?: string;
  habilitado?: boolean;
}

export interface ProbarConexionResponse {
  ok: boolean;
  mensaje: string;
}

export async function getIntegracionYape(empresaId: string): Promise<IntegracionYapeConfig> {
  const res = await apiClient.get<IntegracionYapeConfig>(`/empresas/${empresaId}/integracion-yape`);
  return res.data;
}

export async function updateIntegracionYape(
  empresaId: string,
  data: UpdateIntegracionYapeDto,
): Promise<IntegracionYapeConfig> {
  const res = await apiClient.put<IntegracionYapeConfig>(`/empresas/${empresaId}/integracion-yape`, data);
  return res.data;
}

export async function probarIntegracionYape(empresaId: string): Promise<ProbarConexionResponse> {
  const res = await apiClient.post<ProbarConexionResponse>(`/empresas/${empresaId}/integracion-yape/probar`);
  return res.data;
}
