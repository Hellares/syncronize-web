import { apiClient } from '@/core/api/client';
import { COMBO_ENDPOINTS } from '@/core/api/endpoints';
import type {
  ComponenteCombo,
  ComboCompleto,
  ComboListItem,
  ComboPrecioSede,
  ComboConfigHistorial,
  CreateComponenteComboDto,
  UpdateComponenteComboDto,
  CreateComboDto,
  UpdateComboPricingDto,
  UpdateComboOfertaDto,
} from '@/core/types/combo';

// --- Lista y creación (F3) ---

export async function getCombos(sedeId: string): Promise<ComboListItem[]> {
  const res = await apiClient.get<ComboListItem[]>(`${COMBO_ENDPOINTS.LIST}?sedeId=${sedeId}`);
  return res.data;
}

export async function createCombo(data: CreateComboDto): Promise<{ id: string } & ComboCompleto> {
  const res = await apiClient.post(`${COMBO_ENDPOINTS.CREATE}`, data);
  return res.data;
}

// --- Pricing y oferta (F3, requieren sedeId en query) ---

export async function updatePricing(comboId: string, sedeId: string, data: UpdateComboPricingDto): Promise<ComboCompleto> {
  const res = await apiClient.put<ComboCompleto>(`${COMBO_ENDPOINTS.PRICING(comboId)}?sedeId=${sedeId}`, data);
  return res.data;
}

export async function updateOferta(comboId: string, sedeId: string, data: UpdateComboOfertaDto): Promise<ComboCompleto> {
  const res = await apiClient.put<ComboCompleto>(`${COMBO_ENDPOINTS.OFERTA(comboId)}?sedeId=${sedeId}`, data);
  return res.data;
}

export async function desactivarOferta(comboId: string, sedeId: string): Promise<ComboCompleto> {
  const res = await apiClient.delete<ComboCompleto>(`${COMBO_ENDPOINTS.OFERTA(comboId)}?sedeId=${sedeId}`);
  return res.data;
}

export async function getPreciosPorSede(comboId: string): Promise<ComboPrecioSede[]> {
  const res = await apiClient.get<ComboPrecioSede[]>(COMBO_ENDPOINTS.PRECIOS_POR_SEDE(comboId));
  return res.data;
}

// --- Historial de configuración (F3) ---

export async function getHistorialCombo(
  comboId: string,
  filtros?: { tipoCambio?: string; desde?: string; hasta?: string }
): Promise<ComboConfigHistorial[]> {
  const params = new URLSearchParams();
  if (filtros?.tipoCambio) params.set('tipoCambio', filtros.tipoCambio);
  if (filtros?.desde) params.set('desde', filtros.desde);
  if (filtros?.hasta) params.set('hasta', filtros.hasta);
  const q = params.toString();
  const res = await apiClient.get<ComboConfigHistorial[]>(`${COMBO_ENDPOINTS.HISTORIAL_PRECIOS(comboId)}${q ? `?${q}` : ''}`);
  return res.data;
}

// --- Reservas de stock (F3) ---

export async function getReservacion(comboId: string, sedeId: string): Promise<{ cantidad: number }> {
  const res = await apiClient.get(`${COMBO_ENDPOINTS.RESERVACION(comboId)}?sedeId=${sedeId}`);
  return res.data ?? { cantidad: 0 };
}

export async function reservarStock(comboId: string, sedeId: string, cantidad: number): Promise<{ cantidad: number }> {
  const res = await apiClient.post(`${COMBO_ENDPOINTS.RESERVAR_STOCK(comboId)}?sedeId=${sedeId}`, { cantidad });
  return res.data;
}

export async function liberarReserva(comboId: string, sedeId: string): Promise<void> {
  await apiClient.delete(`${COMBO_ENDPOINTS.RESERVAR_STOCK(comboId)}?sedeId=${sedeId}`);
}

// --- Batch delete componentes (F3) ---

export async function deleteComponentesBatch(componenteIds: string[]): Promise<void> {
  await apiClient.delete(COMBO_ENDPOINTS.COMPONENTES_BATCH_DELETE, { data: { componenteIds } });
}

export async function getComboCompleto(comboId: string, sedeId: string): Promise<ComboCompleto> {
  const res = await apiClient.get<ComboCompleto>(`${COMBO_ENDPOINTS.COMBO_COMPLETO(comboId)}?sedeId=${sedeId}`);
  return res.data;
}

export async function getComponentes(comboId: string, sedeId: string): Promise<ComponenteCombo[]> {
  const res = await apiClient.get<ComponenteCombo[]>(`${COMBO_ENDPOINTS.COMPONENTES(comboId)}?sedeId=${sedeId}`);
  return res.data;
}

// OJO: sedeId va como QUERY param — el backend tiene forbidNonWhitelisted y rechaza sedeId en el body (400)
export async function addComponente(comboId: string, sedeId: string, data: CreateComponenteComboDto): Promise<ComponenteCombo> {
  const res = await apiClient.post<ComponenteCombo>(`${COMBO_ENDPOINTS.COMPONENTES(comboId)}?sedeId=${sedeId}`, data);
  return res.data;
}

export async function addComponentesBatch(comboId: string, sedeId: string, componentes: CreateComponenteComboDto[]): Promise<ComponenteCombo[]> {
  const res = await apiClient.post<ComponenteCombo[]>(`${COMBO_ENDPOINTS.COMPONENTES_BATCH(comboId)}?sedeId=${sedeId}`, { componentes });
  return res.data;
}

export async function updateComponente(componenteId: string, sedeId: string, data: UpdateComponenteComboDto): Promise<ComponenteCombo> {
  const res = await apiClient.put<ComponenteCombo>(`${COMBO_ENDPOINTS.COMPONENTE(componenteId)}?sedeId=${sedeId}`, data);
  return res.data;
}

export async function deleteComponente(componenteId: string): Promise<void> {
  await apiClient.delete(COMBO_ENDPOINTS.COMPONENTE(componenteId));
}

export async function getStockDisponible(comboId: string, sedeId: string): Promise<{ stockDisponible: number }> {
  const res = await apiClient.get<{ stockDisponible: number }>(`${COMBO_ENDPOINTS.STOCK_DISPONIBLE(comboId)}?sedeId=${sedeId}`);
  return res.data;
}
