import { apiClient } from '@/core/api/client';
import { PRODUCTO_ENDPOINTS } from '@/core/api/endpoints';
import type {
  ProductoVariante,
  ProductoAtributo,
  AtributoValor,
  AtributoPlantilla,
  CreateVarianteDto,
  UpdateVarianteDto,
  GenerarCombinacionesDto,
  SetVarianteAtributosDto,
  CreateProductoAtributoDto,
  UpdateProductoAtributoDto,
} from '@/core/types/producto';

export async function getVariantes(productoId: string): Promise<ProductoVariante[]> {
  const res = await apiClient.get<ProductoVariante[]>(PRODUCTO_ENDPOINTS.VARIANTES(productoId));
  return res.data;
}

export async function getVariante(varianteId: string): Promise<ProductoVariante> {
  const res = await apiClient.get<ProductoVariante>(PRODUCTO_ENDPOINTS.VARIANTE(varianteId));
  return res.data;
}

export async function createVariante(productoId: string, data: CreateVarianteDto): Promise<ProductoVariante> {
  const res = await apiClient.post<ProductoVariante>(PRODUCTO_ENDPOINTS.VARIANTES(productoId), data);
  return res.data;
}

export async function updateVariante(varianteId: string, data: UpdateVarianteDto): Promise<ProductoVariante> {
  const res = await apiClient.put<ProductoVariante>(PRODUCTO_ENDPOINTS.VARIANTE(varianteId), data);
  return res.data;
}

export async function deleteVariante(varianteId: string): Promise<void> {
  await apiClient.delete(PRODUCTO_ENDPOINTS.VARIANTE(varianteId));
}

export async function generarCombinaciones(
  productoId: string,
  data: GenerarCombinacionesDto
): Promise<ProductoVariante[]> {
  const res = await apiClient.post<ProductoVariante[]>(
    PRODUCTO_ENDPOINTS.GENERAR_COMBINACIONES(productoId),
    data
  );
  return res.data;
}

export async function getProductoAtributos(): Promise<ProductoAtributo[]> {
  const res = await apiClient.get<ProductoAtributo[]>(PRODUCTO_ENDPOINTS.PRODUCTO_ATRIBUTOS);
  return res.data;
}

export async function setVarianteAtributos(
  varianteId: string,
  data: SetVarianteAtributosDto
): Promise<void> {
  await apiClient.post(PRODUCTO_ENDPOINTS.VARIANTE_ATRIBUTOS(varianteId), data);
}

export async function getVarianteAtributos(varianteId: string): Promise<AtributoValor[]> {
  const res = await apiClient.get<AtributoValor[]>(PRODUCTO_ENDPOINTS.VARIANTE_ATRIBUTOS(varianteId));
  return res.data;
}

// --- Atributos CRUD ---

export async function createProductoAtributo(data: CreateProductoAtributoDto): Promise<ProductoAtributo> {
  const res = await apiClient.post<ProductoAtributo>(PRODUCTO_ENDPOINTS.PRODUCTO_ATRIBUTOS, data);
  return res.data;
}

export async function updateProductoAtributo(id: string, data: UpdateProductoAtributoDto): Promise<ProductoAtributo> {
  const res = await apiClient.put<ProductoAtributo>(PRODUCTO_ENDPOINTS.PRODUCTO_ATRIBUTO(id), data);
  return res.data;
}

export async function deleteProductoAtributo(id: string): Promise<void> {
  await apiClient.delete(PRODUCTO_ENDPOINTS.PRODUCTO_ATRIBUTO(id));
}

// --- Plantillas de Atributos ---

export async function getPlantillas(): Promise<AtributoPlantilla[]> {
  const res = await apiClient.get<AtributoPlantilla[]>(PRODUCTO_ENDPOINTS.PLANTILLAS);
  return res.data;
}

export async function getPlantilla(id: string): Promise<AtributoPlantilla> {
  const res = await apiClient.get<AtributoPlantilla>(PRODUCTO_ENDPOINTS.PLANTILLA(id));
  return res.data;
}
