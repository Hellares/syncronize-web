/**
 * Búsqueda de texto del lado del cliente.
 *
 * 🔑 **Tiene que dar el mismo resultado que el backend y que el app.** Allá la
 * búsqueda es `Producto.textoBusqueda` (nombre + descripción + códigos + marca
 * + categoría, en minúsculas y sin tildes) partida en palabras, exigiendo que
 * **todas** aparezcan. Ver `backend/src/producto/texto-busqueda.util.ts` y
 * `lib/core/utils/busqueda_texto.dart`.
 *
 * Por qué importa la simetría: las listas ya descargadas se filtran LOCAL y no
 * le preguntan al servidor. Si el filtro local mira menos campos que el
 * backend, esas búsquedas devuelven vacío y el usuario concluye que el
 * producto no existe.
 */

/** Minúsculas y sin tildes. Equivale a `lower(unaccent(...))` de Postgres. */
export function normalizarTexto(texto: string): string {
  return normalizarConservandoPosiciones(texto).replace(/\s+/g, ' ').trim();
}

/**
 * Igual que {@link normalizarTexto} pero **sin colapsar espacios ni recortar**,
 * así cada carácter del resultado corresponde 1:1 con el de entrada.
 *
 * Lo usa el resaltado de coincidencias, que necesita mapear la posición de una
 * palabra encontrada de vuelta al texto ORIGINAL para pintar ese tramo. Con
 * `normalizarTexto` no se puede: un doble espacio corre todos los índices y el
 * resaltado pintaría corrido.
 *
 * 🔴 El NFD parte "ñ" en "n" + tilde combinante; al borrar los diacríticos
 * queda de nuevo 1 carácter, así que la longitud del original se conserva. El
 * NFC final es el que garantiza esa recomposición para lo que no tenga
 * descomposición canónica.
 */
export function normalizarConservandoPosiciones(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC');
}

/** Palabras únicas de la consulta, ya normalizadas. */
export function terminosBusqueda(consulta: string): string[] {
  const normalizada = normalizarTexto(consulta);
  if (!normalizada) return [];
  return [...new Set(normalizada.split(' ').filter(Boolean))];
}

/**
 * ¿El texto contiene **todas** las palabras? El orden no importa, y cada
 * palabra vale como fragmento en cualquier posición — así "mon te 24"
 * encuentra "MONITOR TEROS 24 PULGADAS", igual que en el backend.
 */
export function coincideTodosLosTerminos(texto: string, terminos: string[]): boolean {
  if (terminos.length === 0) return true;
  const heno = normalizarTexto(texto);
  return terminos.every((t) => heno.includes(t));
}
