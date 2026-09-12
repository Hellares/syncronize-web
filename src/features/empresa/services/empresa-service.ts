import { apiClient } from '@/core/api/client';
import type { ConfiguracionEmpresa, EmpresaContext } from '@/core/types/empresa';

export async function getEmpresaContext(empresaId: string): Promise<EmpresaContext> {
  const res = await apiClient.get<EmpresaContext>(`/empresas/${empresaId}/context`);
  return res.data;
}

/**
 * Configuración fiscal/operativa de la empresa. Hoy la web solo la consume
 * para saber con qué costo abre el interruptor de "vender a costo", así que se
 * pide bajo demanda en vez de sumarla al contexto que carga en cada pantalla.
 */
export async function getConfiguracionEmpresa(empresaId: string): Promise<ConfiguracionEmpresa> {
  const res = await apiClient.get<ConfiguracionEmpresa>(`/empresas/${empresaId}/configuracion`);
  return res.data;
}

export async function getUserEmpresas(): Promise<{ id: string; nombre: string; subdominio: string; logo?: string }[]> {
  const res = await apiClient.get('/empresas');
  return res.data;
}
