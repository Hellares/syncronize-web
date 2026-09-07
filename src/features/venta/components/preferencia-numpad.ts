/**
 * Si el teclado numérico del cobro queda abierto o no.
 *
 * Es una preferencia del DISPOSITIVO, no del usuario ni de la empresa: la
 * misma pantalla la usa la PC del mostrador —con teclado físico, donde un
 * numpad en pantalla estorba— y una tablet, donde es la única forma cómoda de
 * tipear. Por eso vive en el navegador y arranca CERRADA: en la PC nadie tiene
 * que apagarlo, y en la tablet se prende una vez y queda.
 *
 * 🔴 Se lee con `useSyncExternalStore` y no con un `useEffect` que hace
 * `setState`: en el server no hay `localStorage`, así que el HTML del server
 * sale con el valor por defecto y el navegador lo reemplaza al hidratar, sin
 * desajuste y sin el render en cascada que la regla del compilador de React
 * marca como error. Mismo patrón que `preferencias-tabla.ts`.
 */

const CLAVE = 'syncronize.cobro.numpad';

/**
 * El valor vivo de la sesión.
 *
 * Se guarda acá además de en `localStorage` por dos motivos: `useSyncExternalStore`
 * exige que dos lecturas seguidas devuelvan lo MISMO --si no, React vuelve a
 * renderizar para siempre-- y en una ventana privada `localStorage` tira
 * excepción: sin esto el botón no haría nada.
 */
let valor: boolean | null = null;
const oyentes = new Set<() => void>();

export function numpadAbierto(): boolean {
  if (valor !== null) return valor;
  try {
    valor = localStorage.getItem(CLAVE) === '1';
  } catch {
    valor = false;
  }
  return valor;
}

/** En el server no hay nada guardado: siempre cerrado. */
export function numpadDelServer(): boolean {
  return false;
}

export function suscribirNumpad(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
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

export function guardarNumpad(abierto: boolean): void {
  valor = abierto;
  try {
    localStorage.setItem(CLAVE, abierto ? '1' : '0');
  } catch {
    // Que no se pueda recordar no es motivo para romper nada: en esta sesión
    // queda aplicado igual.
  }
  oyentes.forEach((f) => f());
}
