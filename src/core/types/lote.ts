// --- Lotes (contratos de /empresas/:empresaId/lotes) ---

/**
 * ACTIVO y VENCIDO están FÍSICAMENTE en el depósito: cuentan para el stock y
 * el consumo FEFO los puede tomar. Que un VENCIDO se pueda vender lo decide la
 * política del producto, no el estado del lote — para sacarlo del inventario
 * hay que darlo de baja.
 */
export type EstadoLote = 'ACTIVO' | 'AGOTADO' | 'VENCIDO' | 'BLOQUEADO';

export const ESTADOS_PRESENTES: EstadoLote[] = ['ACTIVO', 'VENCIDO'];

export interface Lote {
  id: string;
  codigo: string;
  numeroLote?: string | null;
  estado: EstadoLote;
  precioCosto: number | string;
  moneda?: string;
  cantidadInicial: number;
  cantidadActual: number;
  fechaIngreso: string;
  fechaVencimiento?: string | null;
  nombreProveedor?: string | null;
  compraId?: string | null;
  observaciones?: string | null;
  sede?: { id: string; nombre: string } | null;
  productoStock?: {
    id: string;
    producto?: { id: string; nombre: string; codigoEmpresa?: string } | null;
    variante?: { id: string; nombre: string; sku?: string } | null;
  } | null;
}

export interface LotesFiltros {
  limit?: number;
  cursor?: string;
  sedeId?: string;
  productoStockId?: string;
  proveedorId?: string;
  estado?: EstadoLote;
  search?: string;
}

export interface LotesPagina {
  data: Lote[];
  meta: { total: number; limit: number; hasNext: boolean; nextCursor: string | null };
}

/** Nombre que se muestra: el de la variante manda sobre el del producto. */
export function nombreDeLote(l: Lote): string {
  return (
    l.productoStock?.variante?.nombre ??
    l.productoStock?.producto?.nombre ??
    '(sin producto)'
  );
}

/**
 * El día del envase para mostrar ("01/10/26"), leído del día guardado y no
 * del instante: `new Date(iso).toLocaleDateString()` sobre la medianoche UTC
 * imprime el día ANTERIOR en Lima.
 */
export function formatearDiaCalendario(
  fecha: string | null | undefined,
  opts: { mes?: 'numeric' | 'short' } = {},
): string {
  if (!fecha) return '';
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: opts.mes === 'short' ? 'short' : '2-digit',
    year: '2-digit',
  });
}

/**
 * Días que faltan para el vencimiento. Negativo = ya pasó. Null = no vence.
 *
 * 🔴 Por DÍA de calendario, no por instante: el backend guarda la medianoche
 * UTC del día del envase, así que el día se lee de los primeros 10 caracteres
 * y se compara contra hoy local. Convertirlo a hora local (`new Date(iso)`)
 * daba el día ANTERIOR desde las 19:00 —Lima está a −5 de UTC— y la fila
 * decía "vencido" un día antes que el envase.
 */
export function diasParaVencer(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - hoyUtc) / 86400000);
}

/**
 * En qué situación está, que es lo que decide el color de la fila y si hay que
 * hacer algo con él.
 */
export type SituacionLote = 'vencido' | 'por-vencer' | 'ok' | 'agotado';

export function situacionDeLote(l: Lote, diasAlerta = 30): SituacionLote {
  if (l.cantidadActual <= 0 || l.estado === 'AGOTADO') return 'agotado';
  const dias = diasParaVencer(l.fechaVencimiento);
  if (dias == null) return 'ok';
  if (dias < 0) return 'vencido';
  return dias <= diasAlerta ? 'por-vencer' : 'ok';
}
