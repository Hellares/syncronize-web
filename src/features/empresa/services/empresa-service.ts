import { apiClient } from '@/core/api/client';
import type { EmpresaContext } from '@/core/types/empresa';

export async function getEmpresaContext(empresaId: string): Promise<EmpresaContext> {
  const res = await apiClient.get<EmpresaContext>(`/empresas/${empresaId}/context`);
  return res.data;
}

export async function getUserEmpresas(): Promise<{ id: string; nombre: string; subdominio: string; logo?: string }[]> {
  const res = await apiClient.get('/empresas');
  return res.data;
}
