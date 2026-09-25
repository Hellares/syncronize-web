/**
 * Empresas que muestran su tienda pública en un dominio propio en vez de
 * `syncronize.net.pe/<subdominio>`. El middleware lee este mapa: una visita a
 * `jayliland.net.pe/producto/x` se sirve como `/jayli/producto/x`, con el
 * dominio propio en la barra del navegador.
 *
 * Para sumar un dominio, además de esta línea:
 *   1. DNS del dominio (A de la raíz y de `www`) → IP del VPS.
 *   2. Proxy host en Nginx Proxy Manager → `syncronize-web:3020`, con SSL.
 *   3. Recién cuando el dominio abre bien con https, `redirigirDesdeSyncronize`
 *      en true: manda `syncronize.net.pe/<subdominio>` al dominio propio. Con
 *      el dominio caído, prenderlo deja a la tienda sin ninguna URL que ande.
 */
export interface DominioPropio {
  subdominio: string;
  redirigirDesdeSyncronize: boolean;
}

export const DOMINIOS_PROPIOS: Record<string, DominioPropio> = {
  // 25-09: DNS + SSL andando → syncronize.net.pe/jayli manda acá.
  'jayliland.net.pe': { subdominio: 'jayli', redirigirDesdeSyncronize: true },
  // COMPANY COMPUTER (Carranza). 25-09: DNS + SSL andando.
  'companycomputer.net.pe': { subdominio: 'companycomputer', redirigirDesdeSyncronize: true },
};

/** Hosts de prod desde los que se redirige al dominio propio (beta no: se prueba ahí). */
export const HOSTS_SYNCRONIZE_PROD = ['syncronize.net.pe', 'www.syncronize.net.pe'];

/** El dominio propio de un subdominio, si lo tiene y ya se redirige. */
export function dominioQueRedirige(subdominio: string): string | null {
  const entrada = Object.entries(DOMINIOS_PROPIOS)
    .find(([, d]) => d.subdominio === subdominio && d.redirigirDesdeSyncronize);
  return entrada?.[0] ?? null;
}
