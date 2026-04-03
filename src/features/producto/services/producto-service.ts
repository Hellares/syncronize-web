import { apiClient } from '@/core/api/client';
import type {
  Producto,
  ProductoFiltros,
  PaginatedResponse,
  CreateProductoDto,
  UpdateProductoDto,
} from '@/core/types/producto';

function buildQueryParams(filtros: ProductoFiltros): string {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('limit', String(filtros.limit));
  if (filtros.search) params.set('search', filtros.search);
  if (filtros.empresaCategoriaId) params.set('empresaCategoriaId', filtros.empresaCategoriaId);
  if (filtros.empresaMarcaId) params.set('empresaMarcaId', filtros.empresaMarcaId);
  if (filtros.sedeId) params.set('sedeId', filtros.sedeId);
  if (filtros.visibleMarketplace !== undefined) params.set('visibleMarketplace', String(filtros.visibleMarketplace));
  if (filtros.destacado !== undefined) params.set('destacado', String(filtros.destacado));
  if (filtros.stockBajo !== undefined) params.set('stockBajo', String(filtros.stockBajo));
  if (filtros.soloProductos) params.set('soloProductos', 'true');
  if (filtros.soloCombos) params.set('soloCombos', 'true');
  if (filtros.orden) params.set('orden', filtros.orden);
  return params.toString();
}

export async function getProductos(filtros: ProductoFiltros): Promise<PaginatedResponse<Producto>> {
  const query = buildQueryParams(filtros);
  const res = await apiClient.get<PaginatedResponse<Producto>>(`/productos?${query}`);
  return res.data;
}

export async function getProducto(id: string): Promise<Producto> {
  const res = await apiClient.get<Producto>(`/productos/${id}`);
  return res.data;
}

export async function createProducto(data: CreateProductoDto): Promise<Producto> {
  const res = await apiClient.post<Producto>('/productos', data);
  return res.data;
}

export async function updateProducto(id: string, data: UpdateProductoDto): Promise<Producto> {
  const res = await apiClient.put<Producto>(`/productos/${id}`, data);
  return res.data;
}

export async function deleteProducto(id: string): Promise<void> {
  await apiClient.delete(`/productos/${id}`);
}

export async function downloadBulkTemplate(): Promise<Blob> {
  const res = await apiClient.get('/productos/bulk-upload/template', { responseType: 'blob' });
  return res.data;
}

export async function uploadBulkFile(file: File, sedesIds?: string[]): Promise<{
  totalFilas: number; creados: number; errores: number;
  detalleErrores: Array<{ fila: number; columna: string; valor?: string; mensaje: string }>;
  productosCreados: Array<{ id: string; nombre: string; codigoEmpresa: string }>;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (sedesIds?.length) formData.append('sedesIds', JSON.stringify(sedesIds));
  const res = await apiClient.post('/productos/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateStock(
  id: string,
  sedeId: string,
  cantidad: number,
  operacion: 'agregar' | 'quitar'
): Promise<{ stock: number; stockTotal: number }> {
  const res = await apiClient.patch(`/productos/${id}/stock`, { sedeId, cantidad, operacion });
  return res.data;
}
