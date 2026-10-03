import { apiClient } from '@/core/api/client';
import { PRODUCTO_ENDPOINTS } from '@/core/api/endpoints';
import type { ProductoVariante, ProductoAtributo, AtributoValor, AtributoPlantilla, CreateVarianteDto, UpdateVarianteDto, GenerarCombinacionesDto, SetVarianteAtributosDto, CreateProductoAtributoDto, UpdateProductoAtributoDto, CreateAtributoPlantillaDto } from '@/core/types/producto';

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

export async function createPlantilla(data: CreateAtributoPlantillaDto): Promise<AtributoPlantilla> {
  const res = await apiClient.post<AtributoPlantilla>(PRODUCTO_ENDPOINTS.PLANTILLAS, data);
  return res.data;
}

export async function updatePlantilla(id: string, data: CreateAtributoPlantillaDto): Promise<AtributoPlantilla> {
  const res = await apiClient.patch<AtributoPlantilla>(PRODUCTO_ENDPOINTS.PLANTILLA(id), data);
  return res.data;
}

export async function deletePlantilla(id: string): Promise<void> {
  await apiClient.delete(PRODUCTO_ENDPOINTS.PLANTILLA(id));
}

export async function getPlantilla(id: string): Promise<AtributoPlantilla> {
  const res = await apiClient.get<AtributoPlantilla>(PRODUCTO_ENDPOINTS.PLANTILLA(id));
  return res.data;
}

export interface SepararPorDisenoResultado {
  disenos: { id: string; nombre: string; cantidad: number }[];
  stockRestante: number;
  origenDesactivada: boolean;
}

/**
 * Una foto = un diseño: cada foto elegida pasa a ser una variante con las
 * unidades que se le asignan. Lo no asignado queda en la original.
 */
export interface ColeccionDiseno {
  /** La variante de la colección sin diseño: ahí se suben las fotos nuevas. */
  base: { id: string; nombre: string; isActive: boolean; archivos: { id: string; url: string; urlThumbnail?: string | null }[] };
  disenos: { id: string; nombre: string; isActive: boolean; diseno: string | null }[];
  /** Cómo se va a llamar el próximo: "D4". */
  siguienteDiseno: string;
  sedes: { sedeId: string; sedeNombre: string; precioCosto: number | null }[];
}

/** La colección de una variante (cualquiera de sus diseños o la base). */
export async function getColeccionDiseno(varianteId: string): Promise<ColeccionDiseno> {
  const res = await apiClient.get<ColeccionDiseno>(
    `${PRODUCTO_ENDPOINTS.VARIANTE(varianteId)}/coleccion-diseno`,
  );
  return res.data;
}

/**
 * Diseños NUEVOS en una colección (D4, D5…): cada foto de la base pasa a ser
 * un diseño. `cantidad` 0 = se crea sin stock y entra con la compra.
 */
export async function agregarDisenos(
  varianteId: string,
  data: { sedeId: string; disenos: { archivoId: string; cantidad: number; costoUnitario?: number }[] },
): Promise<{ disenos: { id: string; nombre: string; cantidad: number }[] }> {
  const res = await apiClient.post<{ disenos: { id: string; nombre: string; cantidad: number }[] }>(
    `${PRODUCTO_ENDPOINTS.VARIANTE(varianteId)}/agregar-disenos`,
    data,
  );
  return res.data;
}

export async function separarPorDiseno(
  varianteId: string,
  data: { sedeId: string; disenos: { archivoId: string; cantidad: number }[] },
): Promise<SepararPorDisenoResultado> {
  const res = await apiClient.post<SepararPorDisenoResultado>(
    `${PRODUCTO_ENDPOINTS.VARIANTE(varianteId)}/separar-por-diseno`,
    data,
  );
  return res.data;
}
