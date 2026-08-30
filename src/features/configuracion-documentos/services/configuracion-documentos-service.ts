import { apiClient } from '@/core/api/client';
import type {
  ConfiguracionDocumentos,
  ConfiguracionCompleta,
  PlantillaDocumento,
  TipoDocumento,
  FormatoPapel,
  UpdateConfiguracionDto,
  UpdatePlantillaDto,
} from '@/core/types/configuracion-documentos';

const BASE = '/configuracion-documentos';

/** La marca (logo, colores, textos de pie). La crea si la empresa no la tenía. */
export async function getConfiguracion(): Promise<ConfiguracionDocumentos> {
  const res = await apiClient.get<ConfiguracionDocumentos>(BASE);
  return res.data;
}

export async function updateConfiguracion(
  data: UpdateConfiguracionDto,
): Promise<ConfiguracionDocumentos> {
  const res = await apiClient.put<ConfiguracionDocumentos>(BASE, data);
  return res.data;
}

export async function getPlantilla(
  tipo: TipoDocumento,
): Promise<PlantillaDocumento> {
  const res = await apiClient.get<PlantillaDocumento>(`${BASE}/plantillas/${tipo}`);
  return res.data;
}

export async function updatePlantilla(
  tipo: TipoDocumento,
  data: UpdatePlantillaDto,
): Promise<PlantillaDocumento> {
  const res = await apiClient.put<PlantillaDocumento>(
    `${BASE}/plantillas/${tipo}`,
    data,
  );
  return res.data;
}

/**
 * Marca + plantilla + datos fiscales de la sede, en una sola llamada.
 *
 * Es lo que hay que pedir ANTES de generar un PDF: acá el backend ya resolvió
 * de dónde sale cada dato (los fiscales salen de Empresa y la sede emisora los
 * pisa), así que el generador no tiene que saberlo.
 */
export async function getConfiguracionCompleta(
  tipo: TipoDocumento,
  opciones?: { formato?: FormatoPapel; sedeId?: string },
): Promise<ConfiguracionCompleta> {
  const res = await apiClient.get<ConfiguracionCompleta>(`${BASE}/completa/${tipo}`, {
    params: {
      formato: opciones?.formato ?? 'A4',
      ...(opciones?.sedeId ? { sedeId: opciones.sedeId } : {}),
    },
  });
  return res.data;
}
