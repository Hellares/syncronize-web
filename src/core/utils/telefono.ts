/**
 * Normalización de teléfonos para WhatsApp. Es el puerto de
 * `core/utils/telefono_helper.dart` del app: las dos puntas mandan al MISMO
 * backend, así que el número tiene que salir igual desde las dos.
 */

/** Prefijo de Perú. Único mercado hoy; el día que haya otro sale de la config. */
export const CODIGO_PAIS_PERU = '51';

export function soloDigitos(valor?: string | null): string {
  return (valor ?? '').replace(/\D/g, '');
}

/**
 * ¿Un número TIPEADO A MANO puede ser un celular?
 *
 * 🔴 [telefonoParaWhatsapp] es a propósito permisivo —devuelve lo que tenga
 * dígitos, para no inventarle un prefijo a un número guardado raro—, y eso lo
 * vuelve inútil como validación: `123` pasa. Cuando alguien lo está escribiendo
 * hay que ser estricto, porque el error se corrige ahí mismo: un celular
 * peruano son 9 dígitos, con código de país 11, y E.164 topea en 15.
 */
export function esCelularEscrito(telefono?: string | null): boolean {
  const d = soloDigitos(telefono);
  return d.length >= 9 && d.length <= 15;
}

/**
 * El número listo para `wa.me`, o null si no hay con qué armarlo.
 *
 * - con `+`, el número YA trae código de país y se respeta tal cual;
 * - un celular peruano (9 dígitos empezando en 9) recibe el `51`;
 * - cualquier otra cosa se devuelve como está: es mejor que WhatsApp diga
 *   "número no válido" a que le inventemos un prefijo y termine escribiéndole
 *   a un desconocido.
 */
export function telefonoParaWhatsapp(telefono?: string | null): string | null {
  if (telefono == null) return null;
  const teniaMas = telefono.trimStart().startsWith('+');
  const digitos = soloDigitos(telefono);
  if (!digitos) return null;
  if (teniaMas) return digitos;
  if (digitos.length === 9 && digitos.startsWith('9')) {
    return `${CODIGO_PAIS_PERU}${digitos}`;
  }
  return digitos;
}

/**
 * El enlace que abre el chat con el texto puesto.
 *
 * 🔴 `wa.me` acepta EXACTAMENTE dos cosas: el número y el texto. No lleva
 * archivos —ni imágenes ni PDF— y dónde queda el cursor lo decide WhatsApp.
 * Por eso el mensaje se termina de redactar antes, y el adjunto viaja por otro
 * camino.
 */
export function enlaceWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
