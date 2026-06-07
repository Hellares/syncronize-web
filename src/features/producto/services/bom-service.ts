import { apiClient } from '@/core/api/client';
import type {
  ComponenteBOM,
  CalcularCostoBOMResponse,
  CrearComponenteBOMDto,
  ActualizarComponenteBOMDto,
  CopiarRecetaDto,
  FabricarDto,
  FabricarResponse,
  LoteProduccion,
  LotesProduccionResponse,
  DetalleFabricacion,
  TrazabilidadProducto,
} from '@/core/types/bom';

const BASE = (productoId: string) => `/productos/${productoId}/componentes`;

// --- Receta / componentes ---

export async function getComponentes(productoId: string, sedeId?: string | null, varianteId?: string | null): Promise<ComponenteBOM[]> {
  const params = new URLSearchParams();
  if (sedeId) params.set('sedeId', sedeId);
  if (varianteId) params.set('varianteId', varianteId);
  const q = params.toString();
  const res = await apiClient.get<ComponenteBOM[]>(`${BASE(productoId)}${q ? `?${q}` : ''}`);
  return res.data;
}

export async function calcularCosto(productoId: string, sedeId: string, varianteId?: string | null): Promise<CalcularCostoBOMResponse> {
  const params = new URLSearchParams({ sedeId });
  if (varianteId) params.set('varianteId', varianteId);
  const res = await apiClient.get<CalcularCostoBOMResponse>(`${BASE(productoId)}/calcular-costo?${params.toString()}`);
  return res.data;
}

export async function crearComponente(productoId: string, data: CrearComponenteBOMDto): Promise<ComponenteBOM> {
  const res = await apiClient.post<ComponenteBOM>(BASE(productoId), data);
  return res.data;
}

export async function actualizarComponente(productoId: string, componenteRowId: string, data: ActualizarComponenteBOMDto): Promise<{ id: string }> {
  const res = await apiClient.patch(`${BASE(productoId)}/${componenteRowId}`, data);
  return res.data;
}

export async function eliminarComponente(productoId: string, componenteRowId: string): Promise<void> {
  await apiClient.delete(`${BASE(productoId)}/${componenteRowId}`);
}

export async function copiarRecetaAVariante(productoId: string, data: CopiarRecetaDto): Promise<{ varianteId: string; copiados: number }> {
  const res = await apiClient.post(`${BASE(productoId)}/copiar-a-variante`, data);
  return res.data;
}

// --- Fabricación ---

export async function fabricar(productoId: string, data: FabricarDto): Promise<FabricarResponse> {
  const res = await apiClient.post<FabricarResponse>(`${BASE(productoId)}/fabricar`, data);
  return res.data;
}

export async function getFabricaciones(productoId: string, opts?: { sedeId?: string; varianteId?: string; limit?: number }): Promise<LoteProduccion[]> {
  const params = new URLSearchParams();
  if (opts?.sedeId) params.set('sedeId', opts.sedeId);
  if (opts?.varianteId) params.set('varianteId', opts.varianteId);
  params.set('limit', String(opts?.limit ?? 50));
  const res = await apiClient.get<LoteProduccion[]>(`${BASE(productoId)}/fabricaciones?${params.toString()}`);
  return res.data;
}

export async function getDetalleFabricacion(productoId: string, numeroDocumento: string): Promise<DetalleFabricacion> {
  const res = await apiClient.get<DetalleFabricacion>(`${BASE(productoId)}/fabricaciones/${numeroDocumento}`);
  return res.data;
}

// --- Producción global ---

export async function getLotesProduccion(opts?: { sedeId?: string; search?: string; desde?: string; hasta?: string; limit?: number; offset?: number }): Promise<LotesProduccionResponse> {
  const params = new URLSearchParams();
  if (opts?.sedeId) params.set('sedeId', opts.sedeId);
  if (opts?.search) params.set('search', opts.search);
  if (opts?.desde) params.set('desde', opts.desde);
  if (opts?.hasta) params.set('hasta', opts.hasta);
  params.set('limit', String(opts?.limit ?? 30));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const res = await apiClient.get<LotesProduccionResponse>(`/produccion/lotes?${params.toString()}`);
  return res.data;
}

// --- Trazabilidad / Ficha 360 ---

export async function getTrazabilidad(productoId: string, varianteId?: string | null): Promise<TrazabilidadProducto> {
  const params = varianteId ? `?varianteId=${varianteId}` : '';
  const res = await apiClient.get<TrazabilidadProducto>(`/productos/${productoId}/trazabilidad${params}`);
  return res.data;
}
