/** Convierte hex (#007bff) a {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Mezcla un color con blanco (factor 0-1, donde 1 = blanco puro) */
export function lighten(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/** Oscurece un color (factor 0-1, donde 1 = negro puro) */
export function darken(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `rgb(${dr}, ${dg}, ${db})`;
}

/** Hex a rgba con opacidad */
export function alpha(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export interface TiendaColors {
  primario: string;
  secundario: string;
  acento: string;
  bannerColor: string;
  fondo1: string;
  fondo2: string;
}

export const DEFAULT_COLORS: TiendaColors = {
  primario: '#437EFF',
  secundario: '#06b6d4',
  acento: '#437EFF',
  bannerColor: '#000000',
  fondo1: '#06b6d4',
  fondo2: '#5b8fd4',
};
