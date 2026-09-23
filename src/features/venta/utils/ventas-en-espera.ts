/**
 * Carrito de la venta rápida guardado en el navegador.
 *
 * Dos cosas distintas, las dos en localStorage:
 *  - El carrito EN CURSO, que se guarda en cada cambio. Salir de la pantalla a
 *    consultar algo desmontaba la página y el carrito se perdía entero.
 *  - Las ventas EN ESPERA: el cliente fue a buscar más cosas y hay fila, así
 *    que la venta se aparca con una etiqueta y se atiende al siguiente.
 *
 * 🔑 NO son ventas en BORRADOR del backend: crear un borrador gasta un número
 * de venta, y cada espera abandonada dejaría un hueco en la numeración y una
 * venta fantasma en el listado. Esto vive solo en este navegador.
 *
 * Por empresa + usuario + sede: otro cajero en la misma PC no ve lo tuyo, y
 * cambiar de sede no te trae un carrito con precios de otra.
 *
 * Todo acceso va en try/catch: en una ventana privada o con el almacenamiento
 * bloqueado, la venta rápida tiene que seguir andando, solo que sin memoria.
 */
import type { PrecioModoCosto, VentaItem } from '@/core/types/venta';

export interface ClienteDeOrden {
  clienteId?: string;
  clienteEmpresaId?: string;
  nombre: string;
  documento: string;
}

/** Lo que hace falta para reconstruir una venta a medias. */
export interface CarritoGuardado {
  items: VentaItem[];
  ordenCliente: ClienteDeOrden | null;
  modoCosto: PrecioModoCosto | null;
  /** epoch ms */
  guardadoEn: number;
}

export interface VentaEnEspera extends CarritoGuardado {
  id: string;
  etiqueta: string;
}

/** Una espera olvidada no vive para siempre: al día siguiente los precios y el stock ya son otros. */
const VIGENCIA_MS = 24 * 60 * 60 * 1000;
/** Más que esto es una fila que nadie va a retomar. */
export const MAX_EN_ESPERA = 10;
const VERSION = 1;

export interface AlcanceCarrito { empresaId: string; usuarioId: string; sedeId: string }

function clave(a: AlcanceCarrito, que: 'actual' | 'espera'): string {
  return `venta-rapida:v${VERSION}:${a.empresaId}:${a.usuarioId}:${a.sedeId}:${que}`;
}

function leer<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function escribir(k: string, v: unknown): void {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch { /* sin almacenamiento: la venta sigue, sin memoria */ }
}

const vigente = (c: CarritoGuardado) =>
  Array.isArray(c?.items) && Date.now() - (c.guardadoEn ?? 0) < VIGENCIA_MS;

export function leerCarritoActual(a: AlcanceCarrito): CarritoGuardado | null {
  const c = leer<CarritoGuardado>(clave(a, 'actual'));
  return c && vigente(c) && c.items.length > 0 ? c : null;
}

/** Con el carrito vacío se BORRA: no queda nada que recuperar. */
export function guardarCarritoActual(a: AlcanceCarrito, c: Omit<CarritoGuardado, 'guardadoEn'>): void {
  escribir(clave(a, 'actual'), c.items.length ? { ...c, guardadoEn: Date.now() } : null);
}

/** Las más nuevas primero. Las vencidas se purgan al leer. */
export function leerEnEspera(a: AlcanceCarrito): VentaEnEspera[] {
  const lista = leer<VentaEnEspera[]>(clave(a, 'espera'));
  if (!Array.isArray(lista)) return [];
  const vivas = lista.filter(vigente);
  if (vivas.length !== lista.length) escribir(clave(a, 'espera'), vivas.length ? vivas : null);
  return vivas.sort((x, y) => y.guardadoEn - x.guardadoEn);
}

export function guardarEnEspera(a: AlcanceCarrito, lista: VentaEnEspera[]): void {
  escribir(clave(a, 'espera'), lista.length ? lista : null);
}

/** "hace 3 min" · "hace 2 h" */
export function haceCuanto(epochMs: number): string {
  const min = Math.floor((Date.now() - epochMs) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}
