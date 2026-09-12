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

/** Días que faltan para el vencimiento. Negativo = ya pasó. Null = no vence. */
export function diasParaVencer(l: Lote): number | null {
  if (!l.fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(l.fechaVencimiento);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

/**
 * En qué situación está, que es lo que decide el color de la fila y si hay que
 * hacer algo con él.
 */
export type SituacionLote = 'vencido' | 'por-vencer' | 'ok' | 'agotado';

export function situacionDeLote(l: Lote, diasAlerta = 30): SituacionLote {
  if (l.cantidadActual <= 0 || l.estado === 'AGOTADO') return 'agotado';
  const dias = diasParaVencer(l);
  if (dias == null) return 'ok';
  if (dias < 0) return 'vencido';
  return dias <= diasAlerta ? 'por-vencer' : 'ok';
}
