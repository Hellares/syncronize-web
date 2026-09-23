/**
 * La compra NUEVA que se está cargando, guardada en el navegador.
 *
 * Misma idea que el carrito de la venta rápida (`ventas-en-espera.ts`): el
 * formulario vivía solo en memoria, así que ir a otra pantalla a consultar algo
 * —un precio, un producto, el proveedor— perdía una factura de 30 líneas a
 * medio tipear. Cada cambio se guarda y al volver se recupera.
 *
 * Solo para la compra NUEVA: editar un BORRADOR ya tiene su copia en el
 * servidor, y mezclar las dos daría dos verdades distintas.
 *
 * Por empresa + usuario, no por sede: la sede es un campo más del formulario.
 * Todo acceso va en try/catch: sin almacenamiento el formulario anda igual.
 */
import type { GastoForm, LineaForm } from '@/features/compras/utils/linea-guardada';

export interface CompraEnCurso {
  proveedorId: string;
  sedeId: string;
  moneda: string;
  tipoCambio: string;
  terminosPago: string;
  fecha: string;
  tipoDoc: string;
  serie: string;
  numero: string;
  diasCredito: string;
  observaciones: string;
  precioIncluyeIgv: boolean;
  lineas: LineaForm[];
  gastos: GastoForm[];
  /** epoch ms */
  guardadoEn: number;
}

/**
 * Tres días y no uno como la venta: una factura larga se empieza hoy y se
 * termina mañana, y lo tecleado sale del papel, no de precios que cambian.
 */
const VIGENCIA_MS = 3 * 24 * 60 * 60 * 1000;
const VERSION = 1;

export interface AlcanceCompra { empresaId: string; usuarioId: string }

const clave = (a: AlcanceCompra) => `compra-nueva:v${VERSION}:${a.empresaId}:${a.usuarioId}`;

/** Algo que valga la pena recuperar: la sede y la fecha solas son los defaults. */
export function tieneContenido(c: Omit<CompraEnCurso, 'guardadoEn'>): boolean {
  return c.lineas.length > 0 || c.gastos.length > 0 || !!c.proveedorId
    || !!c.serie.trim() || !!c.numero.trim() || !!c.observaciones.trim();
}

export function leerCompraEnCurso(a: AlcanceCompra): CompraEnCurso | null {
  try {
    const raw = localStorage.getItem(clave(a));
    if (!raw) return null;
    const c = JSON.parse(raw) as CompraEnCurso;
    if (!Array.isArray(c?.lineas) || Date.now() - (c.guardadoEn ?? 0) >= VIGENCIA_MS) {
      localStorage.removeItem(clave(a));
      return null;
    }
    return tieneContenido(c) ? c : null;
  } catch {
    return null;
  }
}

/** Sin contenido se BORRA: no queda nada que recuperar. */
export function guardarCompraEnCurso(a: AlcanceCompra, c: Omit<CompraEnCurso, 'guardadoEn'>): void {
  try {
    if (tieneContenido(c)) localStorage.setItem(clave(a), JSON.stringify({ ...c, guardadoEn: Date.now() }));
    else localStorage.removeItem(clave(a));
  } catch { /* sin almacenamiento: el formulario sigue, sin memoria */ }
}

export function borrarCompraEnCurso(a: AlcanceCompra): void {
  try { localStorage.removeItem(clave(a)); } catch { /* nada que hacer */ }
}
