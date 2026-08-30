/**
 * Achica una imagen antes de subirla, respetando su proporción.
 *
 * El logo termina embebido en cada PDF: subir la foto original de 4 MB engorda
 * todos los documentos y no se ve mejor, porque en la hoja entra en ~28 mm de
 * ancho. El app hace lo mismo al elegir el logo (800×400, calidad 85).
 *
 * Ante cualquier problema devuelve el archivo ORIGINAL en vez de fallar: es
 * preferible subir una imagen pesada que dejar al usuario sin poder subirla.
 */
export async function reducirImagen(
  file: File,
  maxAncho: number,
  maxAlto: number,
  calidad = 0.85,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Un SVG no se rasteriza: pierde lo que lo hace útil (escala sin bordes).
  if (file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(maxAncho / bitmap.width, maxAlto / bitmap.height, 1);
    // Ya entra: no se toca. Recomprimir una imagen chica solo la degrada.
    if (escala === 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // PNG conserva la transparencia, que en un logo suele ser el punto.
    const tipo = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, tipo, calidad),
    );
    if (!blob) return file;

    const nombre = file.name.replace(/\.[^.]+$/, '') + (tipo === 'image/png' ? '.png' : '.jpg');
    return new File([blob], nombre, { type: tipo });
  } catch {
    return file;
  }
}
