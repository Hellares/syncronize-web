/**
 * Lenguaje visual de los diálogos (salió del detalle de orden de servicio,
 * 20-09, y el user lo aprobó ahí).
 *
 * Estaba repetido a mano en tres archivos; vive acá para que no se separen.
 * Son strings de clases completas a propósito: una clase armada en runtime
 * no existe en el CSS compilado.
 */

/**
 * Input estándar de la web (ver `feedback_web_estilo_input_std`): 30px, r6,
 * fondo zinc, ring azul, texto #004A94; al focus SOLO cambia la sombra.
 *
 * 🔴 Los `<select>` usan ESTA misma constante, sin `bg-white` encima: dos
 * `bg-*` en la misma cadena los resuelve el CSS compilado, no el orden del
 * string, así que el blanco no gana por ir después.
 */
export const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/** Textarea: igual pero SIN `h-[30px]`, que lo aplastaría. */
export const INPUT_STD_TA =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200 resize-none';

/** Contenedor con el mismo lenguaje que los inputs; el fondo lo pone cada uso. */
export const CAJA_STD =
  'w-full ring-1 ring-blue-400 rounded-[6px] shadow-md transition-all duration-300';

export const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
export const LABEL_MINI = 'mb-1 block text-[10px] font-medium text-gray-400';

/**
 * Panel del diálogo. `font-sans` explícito para que no lo pise otra familia.
 *
 * Con ALTORRELIEVE en el borde de arriba: una línea celeste por DENTRO (3px)
 * y un degradé corto debajo, como si la luz pegara desde arriba. No es sombra
 * exterior: el panel se lee levantado, no flotando más alto.
 *
 * Es una COLUMNA que NO scrollea: el padding y el scroll van adentro
 * (`DIALOG_HEAD` / `DIALOG_BODY` / `DIALOG_FOOT`). Con el scroll en el panel
 * la barra corría por todo el alto y en pantallas chicas se montaba sobre el
 * borde redondeado y sobre la línea del relieve; `overflow-hidden` la recorta
 * a las esquinas.
 *
 * 🔴 Las cuatro capas van en UNA sola utilidad `shadow-[...]`: `shadow-xl` y
 * un `shadow-[inset_…]` escriben la MISMA variable `--tw-shadow` y no se
 * encadenan — gana la que el CSS ponga última, no la que va después en la
 * cadena. En orden: línea celeste, degradé bajo la línea, y las dos sombras
 * de `shadow-xl`.
 */
export const DIALOG_PANEL_RELIEVE =
  'font-sans flex max-h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-[inset_0_3px_0_0_#8fb8f2,inset_0_9px_11px_-8px_rgb(67_126_255_/_0.38),0_20px_25px_-5px_rgb(0_0_0_/_0.1),0_8px_10px_-6px_rgb(0_0_0_/_0.1)]';

/**
 * El MISMO panel para un diálogo que necesita más ancho, como el de compartir
 * la ficha: el lienzo son 360 px fijos y con `max-w-sm` (384) no entra con el
 * padding.
 *
 * 🔴 La cadena va completa de nuevo, con `max-w-md` en lugar de `max-w-sm`:
 * agregarle `max-w-md` encima a la otra constante NO gana por ir después —
 * entre dos `max-w-*` decide el CSS compilado, no el orden del string.
 */
export const DIALOG_PANEL_RELIEVE_MD =
  'font-sans flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-[inset_0_3px_0_0_#8fb8f2,inset_0_9px_11px_-8px_rgb(67_126_255_/_0.38),0_20px_25px_-5px_rgb(0_0_0_/_0.1),0_8px_10px_-6px_rgb(0_0_0_/_0.1)]';

/** Cabecera fija del diálogo (no scrollea). */
export const DIALOG_HEAD = 'shrink-0 px-5 pt-3 pb-2';

/**
 * Cuerpo: lo ÚNICO que scrollea.
 *
 * 🔴 `min-h-0` es obligatorio: sin eso un hijo de flex column no se encoge,
 * el contenido empuja el panel y el scroll se escapa al contenedor de afuera.
 * `scroll-panel` (en `globals.css`) es la barra fina sobre fondo claro — la
 * `custom-scrollbar` tiene el pulgar blanco y acá no se vería.
 */
export const DIALOG_BODY = 'scroll-panel min-h-0 flex-1 overflow-y-auto px-5 pb-1';

/** Pie fijo: los botones quedan siempre a la vista. */
export const DIALOG_FOOT =
  'shrink-0 flex justify-end gap-2 border-t border-gray-100 px-5 py-3';
