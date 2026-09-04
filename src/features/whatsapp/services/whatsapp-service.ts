import { apiClient } from '@/core/api/client';

/**
 * WhatsApp de la empresa (Evolution API).
 *
 * Los tres endpoints piden `MANAGE_ORDERS`, no permiso de administrador: quien
 * atiende al cliente necesita poder escribirle sin ser admin.
 */

export interface EstadoWhatsapp {
  conectado: boolean;
  numero?: string | null;
}

/**
 * ⚠️ NO consulta a Evolution: responde con el estado que dejó el webhook
 * `CONNECTION_UPDATE`. Si la instancia se cayó igual, el envío falla y hay que
 * caer al plan B.
 */
export async function getEstado(empresaId: string): Promise<EstadoWhatsapp> {
  const res = await apiClient.get<EstadoWhatsapp>(`/empresas/${empresaId}/whatsapp/estado`);
  return res.data;
}

export async function enviarMensaje(
  empresaId: string,
  numero: string,
  mensaje: string,
): Promise<{ enviado: boolean }> {
  const res = await apiClient.post(`/empresas/${empresaId}/whatsapp/enviar`, {
    numero,
    mensaje,
  });
  return res.data;
}

/**
 * Manda una imagen con su texto de pie al cliente.
 *
 * Mismo criterio que el documento: `base64` SIN el prefijo `data:` y no se
 * guarda. El `mimetype` importa —la ficha de un producto sale en PNG— aunque el
 * backend le ponga siempre `imagen.jpg` de nombre: WhatsApp muestra la imagen
 * en el chat, no como archivo.
 */
export async function enviarImagen(
  empresaId: string,
  args: { numero: string; base64: string; caption?: string; mimetype?: string },
): Promise<{ enviado: boolean }> {
  const res = await apiClient.post(`/empresas/${empresaId}/whatsapp/enviar-imagen`, {
    ...args,
    mimetype: args.mimetype ?? 'image/png',
  });
  return res.data;
}

/**
 * Manda un PDF al cliente.
 *
 * 🔴 El documento NO se guarda: viaja en base64 y va directo al proveedor. Y
 * `base64` va SIN el prefijo `data:` — con el prefijo, el proveedor recibe un
 * archivo corrupto y no avisa.
 */
export async function enviarDocumento(
  empresaId: string,
  args: { numero: string; base64: string; nombreArchivo: string; caption?: string },
): Promise<{ enviado: boolean }> {
  const res = await apiClient.post(`/empresas/${empresaId}/whatsapp/enviar-documento`, {
    ...args,
    mimetype: 'application/pdf',
  });
  return res.data;
}
