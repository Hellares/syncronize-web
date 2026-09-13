/**
 * Tokens de las tarjetas de cifra y los bloques.
 *
 * 🔴 Viven acá y no dentro de una página porque los usan el Dashboard y Mi
 * caja: con la tabla duplicada, el día que se ajuste un tono quedarían dos
 * paletas distintas en pantallas que el usuario lee como una sola.
 */
/**
 * Tonos de las tarjetas de cifras: degradado suave del blanco al tono, para
 * que cada tarjeta diga de qué habla antes de leerla.
 *
 * SIN borde. En cuentas por cobrar estas tarjetas llevan `ring-1` del color
 * porque ahí no hay sombra y 🔴 un `border-gray-200` no se ve sobre el #f5f7fa
 * del dashboard. Acá el canto lo dibujan la sombra y el blanco del arranque
 * del degradado contra el gris del fondo, así que el ring sobraba: con la
 * cifra ya teñida, marco y número decían lo mismo dos veces.
 *
 * La elevación es `shadow-lg` en reposo y `shadow-xl` al hover. Lo que se lee
 * como altura es el DESPLAZAMIENTO y el desenfoque de la sombra, no su
 * opacidad: para levantarlas más hay que subir de escalón, no oscurecerlas.
 *
 * `from-30%` retrasa el arranque: la tarjeta se queda BLANCA hasta el 30% de
 * la diagonal y el degradado ocurre en el 70% restante. Sin esa parada el
 * blanco vive solo en la esquina (0%) y a un cuarto de camino ya hay mezcla,
 * así que el tono terminaba invadiendo la zona donde va la cifra.
 *
 * `cifra` es el tono OSCURO de cada color, no el vivo: sobre blanco, el 600 de
 * naranja se queda en 3.6:1 de contraste y la cifra es el dato que se lee de
 * lejos. Viaja como custom property `--tono-cifra` para que `Cifra` no tenga
 * que repetir el tono en cada llamada y no puedan desincronizarse.
 */
export const TONOS = {
  neutro:  { fondo: 'from-white from-30% to-gray-200',    chip: 'bg-gray-100 text-gray-500',       cifra: '#111827' },
  azul:    { fondo: 'from-white from-30% to-blue-200',    chip: 'bg-blue-100 text-[#004A94]',      cifra: '#004A94' },
  naranja: { fondo: 'from-white from-30% to-orange-200',  chip: 'bg-orange-100 text-orange-700',   cifra: '#c2410c' },
  fucsia:  { fondo: 'from-white from-30% to-fuchsia-200', chip: 'bg-fuchsia-100 text-fuchsia-700', cifra: '#a21caf' },
  verde:   { fondo: 'from-white from-30% to-green-200',   chip: 'bg-green-100 text-green-700',     cifra: '#15803d' },
} as const;

/**
 * La carcasa de una tarjeta de cifra. El degradado sirve para una tarjeta de
 * ~120px: en un bloque alto se estira sobre demasiada superficie y la esquina
 * inferior derecha llega saturada justo donde hay listas y texto.
 */
export const TARJETA_CIFRA = 'rounded-xl bg-gradient-to-br p-4 shadow-lg transition-shadow hover:shadow-xl';

/**
 * Los bloques grandes (Este mes, Ventas por día, Necesita atención, Lo más
 * vendido, Cómo te pagaron hoy) van en blanco con borde gris.
 *
 * El borde es #d1e5ff: el mismo azul del fondo de "Este mes" (#e8f2ff) pero al
 * DOBLE de distancia del blanco (23 y 13 puntos de rojo y verde, ×2). Los
 * bloques lo llevan como línea y esa tarjeta como relleno, así que la pantalla
 * se lee como un conjunto sin teñirlos a todos.
 *
 * 🔴 Que el borde vaya MÁS FUERTE que el relleno no es una inconsistencia: un
 * trazo de 1px necesita bastante más contraste que un área grande para leerse
 * igual. Con el #e8f2ff exacto del relleno, el borde desaparecía contra el
 * #f5f7fa del fondo.
 *
 * 🔴 Se probó darles el degradado azul de las tarjetas de cifras (06-09) y no
 * funciona: son mucho más altos, así que el degradado se estira sobre mucha
 * más superficie y la esquina inferior derecha llega saturada justo donde hay
 * listas y texto. El degradado sirve para una tarjeta de ~120px, no para un
 * bloque de 300.
 */
export const BLOQUE_STD = 'rounded-xl border border-[#d1e5ff] bg-white';

/**
 * Título de bloque. 🔴 `font-medium` (500) y no `font-semibold`: Amazon Ember
 * mapea 600-1000 a la MISMA cara Bold, así que entre 600 y 700 no cambia un
 * píxel. A 13px la Bold se empasta; la Medium respira y el azul de marca hace
 * el trabajo de jerarquía que antes hacía el peso.
 */
export const TITULO_BLOQUE = 'text-[13px] font-medium text-[#004A94]';

export type Tono = keyof typeof TONOS;
