/**
 * Cómo quiere ver la lista de productos el que la está mirando: tabla o
 * tarjetas, qué tan apretadas las filas y qué columnas le interesan.
 *
 * Es una preferencia de la PERSONA, no del catálogo, así que vive en el
 * navegador y no en el backend: la misma empresa vista desde la computadora del
 * mostrador y desde la del depósito quiere cosas distintas.
 *
 * 🔴 Se lee con `useSyncExternalStore` y no con un `useEffect` que hace
 * `setState`: en el server no hay `localStorage`, así que el HTML del server
 * sale con los valores por defecto y el navegador lo reemplaza apenas hidrata,
 * sin desajuste y sin el render en cascada que la regla del compilador de React
 * marca como error.
 */

export type Vista = 'tabla' | 'tarjetas';
export type Densidad = 'compacta' | 'media' | 'comoda';

export interface Columnas {
  codigo: boolean;
  categoria: boolean;
  marca: boolean;
}

export interface Preferencias {
  vista: Vista;
  densidad: Densidad;
  columnas: Columnas;
}

export const COLUMNAS_POR_DEFECTO: Columnas = { codigo: true, categoria: true, marca: true };

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  vista: 'tabla',
  densidad: 'media',
  columnas: COLUMNAS_POR_DEFECTO,
};

const CLAVE = 'syncronize.productos.tabla';

/**
 * Lo guardado, campo por campo: un JSON de una versión anterior --o de otra
 * pantalla-- no tiene por qué dejar la tabla en un estado imposible.
 */
function parsear(crudo: string | null): Preferencias {
  if (!crudo) return PREFERENCIAS_POR_DEFECTO;
  try {
    const g = JSON.parse(crudo) as Partial<Preferencias>;
    return {
      vista: g.vista === 'tarjetas' ? 'tarjetas' : 'tabla',
      densidad: g.densidad === 'compacta' || g.densidad === 'comoda' ? g.densidad : 'media',
      columnas: { ...COLUMNAS_POR_DEFECTO, ...(g.columnas ?? {}) },
    };
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

/**
 * El valor vivo de la sesión.
 *
 * Se guarda acá además de en `localStorage` por dos motivos: `useSyncExternalStore`
 * exige que dos lecturas seguidas devuelvan el MISMO objeto --si no, React
 * vuelve a renderizar para siempre--, y en una ventana privada `localStorage`
 * tira excepción: sin esto los controles no harían nada.
 */
let valor: Preferencias | null = null;
const oyentes = new Set<() => void>();

export function preferenciasActuales(): Preferencias {
  if (valor) return valor;
  try {
    valor = parsear(localStorage.getItem(CLAVE));
  } catch {
    valor = PREFERENCIAS_POR_DEFECTO;
  }
  return valor;
}

/** En el server no hay nada guardado: siempre los valores por defecto. */
export function preferenciasDelServer(): Preferencias {
  return PREFERENCIAS_POR_DEFECTO;
}

export function suscribirPreferencias(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  // Otra pestaña de la misma sesión: se relee en la próxima lectura.
  const alOtraPestana = (e: StorageEvent) => {
    if (e.key !== null && e.key !== CLAVE) return;
    valor = null;
    alCambiar();
  };
  window.addEventListener('storage', alOtraPestana);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener('storage', alOtraPestana);
  };
}

export function guardarPreferencias(siguiente: Preferencias): void {
  valor = siguiente;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(siguiente));
  } catch {
    // Que no se pueda recordar la preferencia no es motivo para romper nada:
    // en esta sesión igual queda aplicada.
  }
  oyentes.forEach((f) => f());
}
