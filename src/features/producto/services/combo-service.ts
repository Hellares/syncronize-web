import { apiClient } from '@/core/api/client';
import { COMBO_ENDPOINTS } from '@/core/api/endpoints';
import type { ComponenteCombo, ComboCompleto, CreateComponenteComboDto, UpdateComponenteComboDto } from '@/core/types/combo';

export async function getComboCompleto(comboId: string, sedeId: string): Promise<ComboCompleto> {
  const res = await apiClient.get<ComboCompleto>(`${COMBO_ENDPOINTS.COMBO_COMPLETO(comboId)}?sedeId=${sedeId}`);
  return res.data;
}

export async function getComponentes(comboId: string, sedeId: string): Promise<ComponenteCombo[]> {
  const res = await apiClient.get<ComponenteCombo[]>(`${COMBO_ENDPOINTS.COMPONENTES(comboId)}?sedeId=${sedeId}`);
  return res.data;
}

export async function addComponente(comboId: string, data: CreateComponenteComboDto & { sedeId: string }): Promise<ComponenteCombo> {
  const res = await apiClient.post<ComponenteCombo>(COMBO_ENDPOINTS.COMPONENTES(comboId), data);
  return res.data;
}

export async function addComponentesBatch(comboId: string, data: { componentes: CreateComponenteComboDto[]; sedeId: string }): Promise<ComponenteCombo[]> {
  const res = await apiClient.post<ComponenteCombo[]>(COMBO_ENDPOINTS.COMPONENTES_BATCH(comboId), data);
  return res.data;
}

export async function updateComponente(componenteId: string, data: UpdateComponenteComboDto): Promise<ComponenteCombo> {
  const res = await apiClient.put<ComponenteCombo>(COMBO_ENDPOINTS.COMPONENTE(componenteId), data);
  return res.data;
}

export async function deleteComponente(componenteId: string): Promise<void> {
  await apiClient.delete(COMBO_ENDPOINTS.COMPONENTE(componenteId));
}

export async function getStockDisponible(comboId: string, sedeId: string): Promise<{ stockDisponible: number }> {
  const res = await apiClient.get<{ stockDisponible: number }>(`${COMBO_ENDPOINTS.STOCK_DISPONIBLE(comboId)}?sedeId=${sedeId}`);
  return res.data;
}
