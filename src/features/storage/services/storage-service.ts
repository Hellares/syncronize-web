import { apiClient } from '@/core/api/client';

export interface ArchivoResponse {
  id: string;
  empresaId: string;
  nombreOriginal: string;
  url: string;
  urlThumbnail?: string;
  tipoArchivo: string;
  mimeType: string;
  extension: string;
  entidadTipo?: string;
  entidadId?: string;
  categoria?: string;
  tamanoBytes: number;
  ancho?: number;
  alto?: number;
  orden?: number;
  creadoEn: string;
}

export type EntidadTipo = 'PRODUCTO' | 'PRODUCTO_VARIANTE' | 'SERVICIO' | 'SERVICIO_COMPONENTE' | 'ORDEN_SERVICIO' | 'EMPRESA';
export type CategoriaArchivo = 'PRINCIPAL' | 'GALERIA' | 'THUMBNAIL' | 'EVIDENCIA' | 'FIRMA';

export async function uploadFile(params: {
  file: File;
  empresaId: string;
  entidadTipo?: EntidadTipo;
  entidadId?: string;
  categoria?: CategoriaArchivo;
  orden?: number;
  onProgress?: (progress: number) => void;
}): Promise<ArchivoResponse> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('empresaId', params.empresaId);
  if (params.entidadTipo) formData.append('entidadTipo', params.entidadTipo);
  if (params.entidadId) formData.append('entidadId', params.entidadId);
  if (params.categoria) formData.append('categoria', params.categoria);
  if (params.orden != null) formData.append('orden', String(params.orden));

  // Evidencia de componentes: endpoint dedicado con permiso MANAGE_ORDERS
  // (técnicos suben fotos sin MANAGE_SETTINGS). Paridad con Flutter.
  const endpoint = params.entidadTipo === 'SERVICIO_COMPONENTE'
    ? '/storage/upload-componente-imagen'
    : '/storage/upload';

  const res = await apiClient.post<ArchivoResponse>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (params.onProgress && e.total) {
        params.onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
}

export async function deleteFile(archivoId: string, empresaId: string, entidadTipo?: EntidadTipo): Promise<void> {
  const path = entidadTipo === 'SERVICIO_COMPONENTE'
    ? `/storage/componente-imagen/${archivoId}`
    : `/storage/${archivoId}`;
  await apiClient.delete(`${path}?empresaId=${empresaId}`);
}

export async function getFilesByEntity(
  entidadTipo: EntidadTipo,
  entidadId: string,
  empresaId: string
): Promise<ArchivoResponse[]> {
  const res = await apiClient.get<ArchivoResponse[]>(
    `/storage/entidad/${entidadTipo}/${entidadId}?empresaId=${empresaId}`
  );
  return res.data;
}
