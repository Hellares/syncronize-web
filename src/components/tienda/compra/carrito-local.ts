/**
 * Carrito del visitante SIN sesión: vive en el navegador (una lista por
 * tienda) para no pedir el DNI al primer "Agregar". Al ingresar se sube al
 * carrito del servidor, que recién ahí valida precio y stock (ver
 * `SesionTiendaProvider`). Los precios de acá son solo para mostrar.
 */

export interface InfoProductoLocal {
  nombre: string;
  varianteNombre?: string | null;
  precio: number;
  imagenUrl?: string | null;
  /** Desconocido desde la tarjeta del listado: lo valida el servidor al subir. */
  stockMax?: number;
}

export interface ItemLocal extends InfoProductoLocal {
  productoId: string;
  varianteId: string | null;
  cantidad: number;
}

const clave = (subdominio: string) => `tienda_carrito_${subdominio}`;

export function leerCarritoLocal(subdominio: string): ItemLocal[] {
  try {
    const crudo = localStorage.getItem(clave(subdominio));
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function guardarCarritoLocal(subdominio: string, items: ItemLocal[]) {
  try {
    if (items.length) localStorage.setItem(clave(subdominio), JSON.stringify(items));
    else localStorage.removeItem(clave(subdominio));
  } catch {
    // Sin almacenamiento (modo privado): el carrito vive solo en memoria.
  }
}

export const idLocal = (productoId: string, varianteId: string | null) => `local:${productoId}:${varianteId ?? ''}`;
