// Políticas de descuento / precios VIP — alineado 1:1 con backend /politicas-descuento
// (src/politica-descuento; enums exactos de create-politica-descuento.dto.ts)

export type TipoDescuento = 'TRABAJADOR' | 'FAMILIAR_TRABAJADOR' | 'VIP' | 'PROMOCIONAL' | 'LEALTAD' | 'CUMPLEANIOS';
export type TipoCalculoDescuento = 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_COSTO' | 'PRECIO_MAYOR_DESDE_UNIDAD';
export type EstrategiaMayor = 'PRIMER_NIVEL' | 'MEJOR_NIVEL';

export const TIPO_DESCUENTO_LABEL: Record<TipoDescuento, string> = {
  VIP: 'Cliente VIP',
  PROMOCIONAL: 'Promocional',
  LEALTAD: 'Lealtad',
  CUMPLEANIOS: 'Cumpleaños',
  TRABAJADOR: 'Trabajador',
  FAMILIAR_TRABAJADOR: 'Familiar de trabajador',
};

export const TIPO_CALCULO_LABEL: Record<TipoCalculoDescuento, string> = {
  PORCENTAJE: '% de descuento',
  MONTO_FIJO: 'Monto fijo (S/)',
  PRECIO_COSTO: 'Precio costo + markup',
  PRECIO_MAYOR_DESDE_UNIDAD: 'Precio mayorista desde unidad 1',
};

export const ESTRATEGIA_MAYOR_LABEL: Record<EstrategiaMayor, string> = {
  PRIMER_NIVEL: 'Primer nivel (menor cantidad mínima)',
  MEJOR_NIVEL: 'Mejor nivel (menor precio)',
};

export interface PoliticaDescuento {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion?: string | null;
  tipoDescuento: TipoDescuento;
  tipoCalculo: TipoCalculoDescuento;
  valorDescuento: number;
  descuentoMaximo?: number | null;
  montoMinCompra?: number | null;
  cantidadMaxUsos?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  aplicarATodos: boolean;
  prioridad: number;
  /** Solo PRECIO_COSTO: % sobre el costo; null/0 = costo puro */
  markupSobreCosto?: number | null;
  /** Solo PRECIO_MAYOR_DESDE_UNIDAD */
  estrategiaMayor?: EstrategiaMayor;
  isActive: boolean;
  creadoEn: string;
  actualizadoEn?: string;
  productosAplicables?: Array<{ id: string; productoId: string; descuentoOverride?: number | null; producto?: { id: string; nombre: string; sku?: string | null } }>;
  categoriasAplicables?: Array<{ id: string; categoriaId: string; descuentoOverride?: number | null; categoria?: { id: string; nombrePersonalizado?: string | null; nombreLocal?: string | null } }>;
  usuariosConDescuento?: Array<{ id: string; usuarioId: string; esFamiliar?: boolean }>;
  _count?: { usuariosConDescuento?: number; usosHistorial?: number };
}

export interface CreatePoliticaDescuentoDto {
  nombre: string;
  descripcion?: string;
  tipoDescuento: TipoDescuento;
  tipoCalculo: TipoCalculoDescuento;
  /** Obligatorio (≥0): % o S/ según tipoCalculo; 0 para PRECIO_COSTO/MAYOR */
  valorDescuento: number;
  descuentoMaximo?: number;
  montoMinCompra?: number;
  cantidadMaxUsos?: number;
  fechaInicio?: string;
  fechaFin?: string;
  aplicarATodos?: boolean;
  prioridad?: number;
  markupSobreCosto?: number;
  estrategiaMayor?: EstrategiaMayor;
}

export type UpdatePoliticaDescuentoDto = Partial<CreatePoliticaDescuentoDto> & { isActive?: boolean };

/** GET /:id/clientes — asignación enriquecida */
export interface ClienteAsignado {
  id: string; // id de la asignación (para DELETE)
  politicaId: string;
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
  tipo: 'B2C' | 'B2B';
  nombre?: string | null;
  documento?: string | null;
  creadoEn: string;
}

export interface AsignarClientesDto {
  clienteIds?: string[];
  clienteEmpresaIds?: string[];
}

export interface UsoHistorialItem {
  id: string;
  cantidad: number;
  precioOriginal: number;
  descuentoAplicado: number;
  precioFinal: number;
  tipoCalculo: TipoCalculoDescuento;
  valorDescuento: number;
  creadoEn: string;
  producto?: { id: string; nombre: string; sku?: string | null } | null;
  variante?: { id: string; nombre: string; sku?: string | null } | null;
  sede?: { id: string; nombre: string; codigo?: string } | null;
  cajero?: { id: string; persona?: { nombres?: string; apellidos?: string } } | null;
  [key: string]: unknown;
}

/** Resumen legible del cálculo (para cards y confirmaciones) */
export function resumenCalculo(p: PoliticaDescuento): string {
  switch (p.tipoCalculo) {
    case 'PORCENTAJE':
      return `${Number(p.valorDescuento)}% de descuento${p.descuentoMaximo ? ` (máx S/ ${Number(p.descuentoMaximo).toFixed(2)})` : ''}`;
    case 'MONTO_FIJO':
      return `S/ ${Number(p.valorDescuento).toFixed(2)} de descuento${p.descuentoMaximo ? ` (máx S/ ${Number(p.descuentoMaximo).toFixed(2)})` : ''}`;
    case 'PRECIO_COSTO':
      return Number(p.markupSobreCosto ?? 0) > 0 ? `Costo + ${Number(p.markupSobreCosto)}%` : 'Precio costo puro';
    case 'PRECIO_MAYOR_DESDE_UNIDAD':
      return `Precio mayorista desde la 1ª unidad (${p.estrategiaMayor === 'MEJOR_NIVEL' ? 'mejor nivel' : 'primer nivel'})`;
  }
}

/** Vigente = activa + dentro del rango de fechas (mismo criterio que /vigentes del backend) */
export function esVigente(p: PoliticaDescuento): boolean {
  if (!p.isActive) return false;
  const now = new Date();
  if (p.fechaInicio && new Date(p.fechaInicio) > now) return false;
  if (p.fechaFin && new Date(p.fechaFin) < now) return false;
  return true;
}
