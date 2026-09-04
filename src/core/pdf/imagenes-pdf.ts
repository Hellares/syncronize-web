/**
 * Fotos listas para meter en un PDF de jsPDF.
 *
 * 🔴 Las fotos de producto se guardan en **webp**. jsPDF 4 las acepta —trae su
 * propio `WebPDecoder` y las re-encodea a JPEG— pero lo hace en JavaScript, y
 * con sesenta fotos eso se siente. Pasándolas por un `canvas` las decodifica el
 * navegador (nativo, rapidísimo) y de paso salen tres cosas gratis:
 *
 * 1. **Se achican**: la foto original pesa megas y en la hoja entra en 4 cm.
 *    Un catálogo que pesa 20 MB no se puede mandar por WhatsApp, que topea en
 *    8 MB de base64.
 * 2. **Quedan en JPEG**, el formato que jsPDF dibuja sin traducir nada.
 * 3. Se conocen las medidas reales, que es lo único que permite encajarlas sin
 *    deformarlas.
 *
 * ✅ El almacenamiento responde `access-control-allow-origin: *`, así que el
 * canvas NO queda *tainted* y `toDataURL` funciona. Si algún día deja de
 * responder eso, esto devuelve null y el catálogo sale con el recuadro "sin
 * foto" en vez de romperse.
 *
 * Emparentado: `cargarLogo` de `cotizacion-pdf.ts`, que hace lo mismo para el
 * logo pero SIN achicarlo —ahí la nitidez importa más que el peso—.
 */

export interface ImagenPdf {
  /** `data:image/jpeg;base64,…`, que es lo único que jsPDF sabe dibujar. */
  dataUrl: string;
  ancho: number;
  alto: number;
}

/**
 * Baja una imagen y la deja lista para el PDF, o null si no se pudo.
 *
 * Nunca lanza: una foto que no llega no puede voltear el catálogo entero.
 */
export async function cargarImagenParaPdf(
  url: string,
  opciones: { maxLado?: number; calidad?: number } = {},
): Promise<ImagenPdf | null> {
  const { maxLado = 700, calidad = 0.82 } = opciones;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const escala = Math.min(maxLado / bitmap.width, maxLado / bitmap.height, 1);
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    // Fondo blanco: un PNG con transparencia pasado a JPEG deja los huecos en
    // NEGRO, y una foto de producto recortada sale con el fondo tapado.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    return { dataUrl: canvas.toDataURL('image/jpeg', calidad), ancho, alto };
  } catch {
    return null;
  }
}

/**
 * Baja varias en tandas y devuelve `url -> imagen`.
 *
 * 🔴 **Sin repetir**: las variantes de un producto suelen compartir la foto del
 * padre, así que noventa variantes con una sola foto son UNA descarga, no
 * noventa. Lo caro no es la cantidad de ítems, es la cantidad de fotos
 * DISTINTAS.
 *
 * De a [tanda] en paralelo: cien descargas simultáneas ahogan la conexión y el
 * catálogo tarda más que haciéndolo por partes.
 */
export async function cargarImagenesParaPdf(
  urls: Iterable<string>,
  opciones: {
    tanda?: number;
    maxLado?: number;
    onProgreso?: (listas: number, total: number) => void;
  } = {},
): Promise<Map<string, ImagenPdf>> {
  const { tanda = 5, maxLado, onProgreso } = opciones;
  const pendientes = [...new Set([...urls].filter(Boolean))];
  const resultado = new Map<string, ImagenPdf>();
  let listas = 0;

  for (let i = 0; i < pendientes.length; i += tanda) {
    const grupo = pendientes.slice(i, i + tanda);
    await Promise.all(
      grupo.map(async (url) => {
        const img = await cargarImagenParaPdf(url, { maxLado });
        if (img) resultado.set(url, img);
        listas++;
        onProgreso?.(listas, pendientes.length);
      }),
    );
  }
  return resultado;
}

/**
 * Encaja una imagen dentro de una caja sin deformarla (`contain`), centrada.
 *
 * 🔴 `contain` y no `cover`: recortar una foto de producto le come el borde,
 * que es justo lo que el cliente quiere ver.
 */
export function encajarEn(
  img: { ancho: number; alto: number },
  caja: { x: number; y: number; w: number; h: number },
) {
  const escala = Math.min(caja.w / img.ancho, caja.h / img.alto);
  const w = img.ancho * escala;
  const h = img.alto * escala;
  return { x: caja.x + (caja.w - w) / 2, y: caja.y + (caja.h - h) / 2, w, h };
}
