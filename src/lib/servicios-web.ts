/**
 * Servicios de la tienda web. Los servicios salen de
 * `GET /marketplace/empresas/:subdominio/servicios` (solo los visibles en el
 * marketplace); lo demás de la página (fotos de trabajos, videos de consejos,
 * galería) lo carga la empresa en el app, en `webConfig.serviciosWeb`.
 */

/** Tal como llega del backend: los Decimal vienen como string. */
export interface ServicioTienda {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | string | null;
  precioPorHora?: number | string | null;
  duracionMinutos?: number | null;
  duracionHoras?: number | string | null;
  requiereReserva?: boolean;
  destacado?: boolean;
  enOferta?: boolean;
  precioOferta?: number | string | null;
  empresaCategoria?: {
    nombreLocal?: string | null;
    nombrePersonalizado?: string | null;
    categoriaMaestra?: { nombre?: string | null } | null;
  } | null;
}

export interface ServiciosWebConfig {
  titulo?: string | null;
  descripcion?: string | null;
  fotoTaller?: string | null;
  trabajos?: Array<{ url: string; titulo?: string; tipo?: string }>;
  consejos?: Array<{ url: string; titulo?: string }>;
  galeria?: Array<{ url: string }>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/** Lo que muestra la tarjeta: etiqueta chica arriba y el precio. */
export function precioServicio(s: ServicioTienda): { etiqueta: string; precio: string; antes?: string } {
  const precio = num(s.precio);
  const oferta = s.enOferta ? num(s.precioOferta) : null;
  if (oferta && precio && oferta < precio) return { etiqueta: 'Oferta', precio: soles(oferta), antes: soles(precio) };
  if (precio) return { etiqueta: 'Precio', precio: soles(precio) };
  const porHora = num(s.precioPorHora);
  if (porHora) return { etiqueta: 'Por hora', precio: soles(porHora) };
  return { etiqueta: 'Precio', precio: 'Cotizar' };
}

export function duracionServicio(s: ServicioTienda): string | null {
  const min = s.duracionMinutos ?? null;
  if (min && min > 0) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const horas = num(s.duracionHoras);
  return horas ? `${horas % 1 ? horas.toFixed(1) : horas} h` : null;
}

export function categoriaServicio(s: ServicioTienda): string | null {
  const c = s.empresaCategoria;
  return c?.nombrePersonalizado || c?.nombreLocal || c?.categoriaMaestra?.nombre || null;
}

/** Solo URLs http(s): las escribe la empresa y van a un `src` público. */
export function urlSegura(u?: string | null): string | null {
  const v = u?.trim();
  return v && /^https?:\/\//i.test(v) ? v : null;
}
