import type { Empresa } from './types';

/**
 * El logo de la tienda web: el propio de la web (`webConfig.logoUrl`, se sube
 * en Personalización del app) y, si no hay, el de la empresa. Son distintos a
 * propósito: el de la empresa es el de los tickets.
 */
export function logoTienda(empresa?: Pick<Empresa, 'logo' | 'personalizaciones'> | null): string | undefined {
  return empresa?.personalizaciones?.[0]?.webConfig?.logoUrl || empresa?.logo || undefined;
}
