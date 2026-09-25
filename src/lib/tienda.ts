import { DEFAULT_COLORS, TiendaColors } from './colors';
import type { Empresa } from './types';

/**
 * El logo de la tienda web: el propio de la web (`webConfig.logoUrl`, se sube
 * en Personalización del app) y, si no hay, el de la empresa. Son distintos a
 * propósito: el de la empresa es el de los tickets.
 */
export function logoTienda(empresa?: Pick<Empresa, 'logo' | 'personalizaciones'> | null): string | undefined {
  return empresa?.personalizaciones?.[0]?.webConfig?.logoUrl || empresa?.logo || undefined;
}

/**
 * El link a la ficha del local en Google Maps (`webConfig.googleMapsUrl`, se
 * carga en Personalización del app), o null. Con coordenadas Google solo pone
 * un pin sin nombre; la ficha muestra el negocio y su "Cómo llegar".
 *
 * Solo se aceptan links de Google Maps: el valor lo escribe la empresa y va
 * directo a un `href` público.
 */
export function linkGoogleMaps(empresa?: Pick<Empresa, 'personalizaciones'> | null): string | null {
  const url = empresa?.personalizaciones?.[0]?.webConfig?.googleMapsUrl?.trim();
  if (!url) return null;
  // google.com / google.com.pe / google.pe… y nada más: `[a-z.]+` dejaba pasar
  // `google.com.evil.com/maps`.
  const dominio = String.raw`google\.(com|com\.[a-z]{2}|[a-z]{2})`;
  const esGoogleMaps = new RegExp(
    String.raw`^https://((www\.)?${dominio}/maps|maps\.${dominio}/|maps\.app\.goo\.gl/|goo\.gl/maps/)`, 'i');
  return esGoogleMaps.test(url) ? url : null;
}

/** Los colores de la tienda (personalización de la empresa o los de fábrica). */
export function coloresTienda(empresa?: Pick<Empresa, 'personalizaciones'> | null): TiendaColors {
  const banner = empresa?.personalizaciones?.[0];
  const wc = banner?.webConfig;
  return {
    primario: banner?.colorPrimario || DEFAULT_COLORS.primario,
    secundario: banner?.colorSecundario || DEFAULT_COLORS.secundario,
    acento: banner?.colorAcento || DEFAULT_COLORS.acento,
    bannerColor: banner?.bannerColor || DEFAULT_COLORS.bannerColor,
    fondo1: wc?.colorFondo1 || DEFAULT_COLORS.fondo1,
    fondo2: wc?.colorFondo2 || DEFAULT_COLORS.fondo2,
  };
}
