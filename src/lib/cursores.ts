/**
 * Cursores de la tienda web. La empresa elige uno en el app (Personalización)
 * y queda en `webConfig.cursor = { tipo, color, borde }`; `color` null = el
 * color principal de la tienda y `borde` null = blanco. Los mismos dibujos están en el app
 * (`cursores_tienda.dart`) para la vista previa: si se cambia uno, cambiar los
 * dos.
 */

export type TipoCursor =
  | 'normal' | 'flecha' | 'punto' | 'anillo' | 'mira'
  | 'corazon' | 'estrella' | 'carrito' | 'patita' | 'craneo';

export interface CursorConfig {
  tipo?: TipoCursor | string;
  color?: string | null;
  /** Color del borde; null = blanco. */
  borde?: string | null;
}

// Íconos en un lienzo de 32×32.
const P = {
  flecha: 'M5 3 L5 25 L11 19 L15.5 28.5 L19.5 26.5 L15 17 L23 17 Z',
  mano: 'M10 12.5V6.8C10 5.5 11 4.5 12.2 4.5s2.2 1 2.2 2.3v5.6l1-.1c.9 0 1.6.2 2.2.6l.8.5c.6-.4 1.3-.5 2-.4l.9.3c.7-.3 1.5-.3 2.2 0 1 .4 1.6 1.4 1.6 2.5v5.2c0 4-3 7-7 7h-2.4c-2 0-3.8-.9-5-2.5l-5-6.5c-.7-.9-.5-2.2.4-2.9.9-.6 2.1-.5 2.8.3L10 18.4z',
  corazon: 'M16 27.5l-1.8-1.6C7.8 20.1 3.6 16.3 3.6 11.6 3.6 7.8 6.6 4.8 10.4 4.8c2.2 0 4.2 1 5.6 2.6 1.4-1.6 3.4-2.6 5.6-2.6 3.8 0 6.8 3 6.8 6.8 0 4.7-4.2 8.5-10.6 14.3z',
  estrella: 'M16 23.1l7.6 4.6-2-8.7 6.7-5.8-8.9-.8L16 4.3l-3.4 8.1-8.9.8 6.7 5.8-2 8.7z',
  carrito: 'M10 23.5a2.3 2.3 0 100 4.6 2.3 2.3 0 000-4.6zM3 4.5v2.6h2.6l4.6 9.7-1.7 3.1c-.2.4-.3.8-.3 1.2 0 1.4 1.1 2.6 2.6 2.6h15.3v-2.6H11.2a.3.3 0 01-.3-.3v-.2l1.2-2.1h9.5c1 0 1.8-.5 2.3-1.3l4.6-8.3a1.3 1.3 0 00-1.1-1.9H8.7L7.5 4.5zm20.4 19a2.3 2.3 0 100 4.6 2.3 2.3 0 000-4.6z',
  patita: 'M7.2 12.4a3 3 0 110 6 3 3 0 010-6zm5.2-6.2a3 3 0 110 6 3 3 0 010-6zm7.2 0a3 3 0 110 6 3 3 0 010-6zm5.2 6.2a3 3 0 110 6 3 3 0 010-6zM22.8 20c-1.1-1.3-2-2.4-3.1-3.7-.6-.7-1.3-1.4-2.2-1.7-.7-.2-2.3-.2-3 0-.9.3-1.6 1-2.2 1.7-1.1 1.3-2 2.4-3.1 3.7-1.6 1.6-3.7 3.5-3.3 6 .4 1.3 1.3 2.6 2.9 2.9.9.2 3.9-.5 7-.5h.2c3.1 0 6.1.7 7 .5 1.6-.3 2.6-1.6 2.9-2.9.4-2.5-1.6-4.4-3.1-6z',
  // Ojos, nariz y dientes son huecos (fill-rule evenodd).
  craneo: 'M16 3C9 3 5 8 5 14c0 4 2 6.5 4.5 7.5v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-4c2.5-1 4.5-3.5 4.5-7.5 0-6-4-11-11-11zM8.5 14.5a3 3 0 106 0 3 3 0 10-6 0zm9 0a3 3 0 106 0 3 3 0 10-6 0zM16 18l-1.5 2.7h3zM13.1 23.6h1.5v3.9h-1.5zm4.3 0h1.5v3.9h-1.5z',
};

// Punta de los temáticos: un triángulo cuyo vértice de arriba es donde se hace
// clic. Su tercer vértice (7.5, 5.7) queda antes de cualquier ícono.
const PUNTA = 'M2 2 L2 12 L7.5 5.7 Z';

const svg = (inner: string) => 'url("data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${inner}</svg>`) + '")';

// `b` es el borde: blanco por defecto; negro si el cursor es claro.
const forma = (d: string, c: string, b: string) =>
  `<path d="${d}" fill="${c}" stroke="${b}" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke"/>`;

// `corrido`: el carrito empieza (manija) en la esquina de la punta; se corre
// dentro de su lienzo para que no la toque.
const conPunta = (d: string, c: string, b: string, grande: boolean, huecos = false, corrido = false) => {
  const s = grande ? 0.92 : 0.86;
  const t = grande ? 2.5 : 4.4; // pegado a la punta; 32 - 32 * s
  return `<g transform="translate(${t} ${t}) scale(${s})${corrido ? ' translate(2.5 2)' : ''}"><path d="${d}" fill="${c}"${huecos ? ' fill-rule="evenodd"' : ''} stroke="${b}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/></g>`
    + `<path d="${PUNTA}" fill="${c}" stroke="${b}" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke"/>`;
};

const tematico = (d: string, c: string, b: string, huecos = false, corrido = false): [string, string] => [
  `${svg(conPunta(d, c, b, false, huecos, corrido))} 2 2, auto`,
  `${svg(conPunta(d, c, b, true, huecos, corrido))} 2 2, pointer`,
];

const mira = (c: string, b: string): [string, string] => {
  const cruz = (g: string) => `<g stroke="${b}" stroke-width="4" stroke-linecap="round">${g}</g><g stroke="${c}" stroke-width="2" stroke-linecap="round">${g}</g>`;
  const lineas = '<path d="M16 3v8M16 21v8M3 16h8M21 16h8"/>';
  const centro = `<circle cx="16" cy="16" r="1.6" fill="${c}"/>`;
  return [
    `${svg(cruz(lineas) + centro)} 16 16, crosshair`,
    `${svg(cruz(lineas + '<circle cx="16" cy="16" r="7" fill="none"/>') + centro)} 16 16, pointer`,
  ];
};

/**
 * El valor CSS `cursor` normal y el "de clic" (sobre botones, links y
 * productos). null: cursor del sistema ("normal") o el anillo, que no es una
 * imagen sino dos elementos que dibuja `CursorTienda`.
 */
export function cursorCss(tipo: string | undefined, color: string, borde = '#ffffff'): [string, string] | null {
  const b = borde;
  switch (tipo) {
    case 'flecha': return [`${svg(forma(P.flecha, color, b))} 5 3, auto`, `${svg(forma(P.mano, color, b))} 12 5, pointer`];
    case 'punto': return [
      `${svg(`<circle cx="16" cy="16" r="5.5" fill="${color}" stroke="${b}" stroke-width="2"/>`)} 16 16, auto`,
      `${svg(`<circle cx="16" cy="16" r="11" fill="none" stroke="${b}" stroke-width="4"/><circle cx="16" cy="16" r="11" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2"/><circle cx="16" cy="16" r="3.5" fill="${color}" stroke="${b}" stroke-width="1"/>`)} 16 16, pointer`,
    ];
    case 'mira': return mira(color, b);
    case 'corazon': return tematico(P.corazon, color, b);
    case 'estrella': return tematico(P.estrella, color, b);
    case 'carrito': return tematico(P.carrito, color, b, false, true);
    case 'patita': return tematico(P.patita, color, b);
    case 'craneo': return tematico(P.craneo, color, b, true);
    default: return null;
  }
}

/** El color va dentro de un SVG y de un `<style>`: solo un hex válido. */
export function colorCursor(config: CursorConfig | undefined, primario: string): string {
  return hexValido(config?.color) ?? primario;
}

/** El borde del cursor: blanco salvo que la empresa elija otro. */
export function bordeCursor(config: CursorConfig | undefined): string {
  return hexValido(config?.borde) ?? '#ffffff';
}

function hexValido(c?: string | null): string | null {
  const v = c?.trim();
  return v && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}
