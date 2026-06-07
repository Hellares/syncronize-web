// --- Componente Combo ---

export interface ComponenteInfo {
  id: string;
  nombre: string;
  sku?: string;
  precio: number;
  precioEnCombo?: number;
  stock: number;
  esVariante: boolean;
  imagen?: string;
  productoNombre?: string;
  varianteNombre?: string;
}

export interface ComponenteCombo {
  id: string;
  comboId: string;
  componenteProductoId?: string;
  componenteVarianteId?: string;
  cantidad: number;
  precioEnCombo?: number;
  esPersonalizable: boolean;
  categoriaComponente?: string;
  orden: number;
  componenteInfo?: ComponenteInfo;
}

// --- Combo Completo ---

export interface ComboCompleto {
  id: string;
  nombre: string;
  descripcion?: string;
  esCombo: boolean;
  tipoPrecioCombo: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO';
  componentes: ComponenteCombo[];
  precio: number;
  precioCalculado: number;
  precioRegularTotal: number;
  descuentoPorcentaje?: number;
  descuentoAplicado?: number;
  stockDisponible: number;
  stockReservado: number;
  tieneStockSuficiente: boolean;
  componentesSinStock?: string[];
  // Oferta
  precioOferta?: number;
  enOferta?: boolean;
  fechaInicioOferta?: string;
  fechaFinOferta?: string;
  ofertaActiva?: boolean;
  precioSinOferta?: number;
}

// --- Lista de combos (GET /combos?sedeId=) ---

export interface ComboListItem extends ComboCompleto {
  codigoEmpresa?: string;
  sku?: string;
  imagenes?: string[];
  archivos?: Array<{ id: string; url: string; urlThumbnail?: string }>;
}

// --- Precios por sede (GET /combos/:id/precios-por-sede) ---

export interface ComboPrecioSede {
  id: string;
  sedeId: string;
  precio?: number | null;
  precioOferta?: number | null;
  enOferta?: boolean;
  stockActual?: number;
  sede?: { id: string; nombre: string; codigo?: string; isActive?: boolean };
}

// --- Historial de configuración (GET /combos/:id/historial-precios) ---

export type TipoCambioComboConfig =
  | 'TIPO_PRECIO' | 'DESCUENTO' | 'COMPONENTE_PRECIO' | 'PRECIO_FIJO_SEDE' | 'OFERTA_COMBO';

export interface ComboConfigHistorial {
  id: string;
  comboId: string;
  tipoCambio: TipoCambioComboConfig;
  /** JSON string con el valor anterior */
  valorAnterior?: string | null;
  /** JSON string con el valor nuevo */
  valorNuevo: string;
  razon?: string | null;
  sedeId?: string | null;
  usuarioId: string;
  usuario?: { id: string; email?: string; persona?: { nombres?: string; apellidos?: string } };
  creadoEn: string;
}

// --- Reservación (ComboReservacion) ---

export interface ComboReservacion {
  id: string;
  comboId: string;
  sedeId: string;
  cantidad: number;
}

// --- DTOs ---

export interface CreateComboDto {
  empresaId: string;
  sedeId?: string;
  empresaCategoriaId?: string;
  empresaMarcaId?: string;
  nombre: string;
  descripcion?: string;
  tipoPrecioCombo: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO';
  /** Solo para CALCULADO_CON_DESCUENTO (0-100) */
  descuentoPorcentaje?: number;
  /** Solo para tipo FIJO */
  precioFijo?: number;
  sku?: string;
  codigoBarras?: string;
  visibleMarketplace?: boolean;
  destacado?: boolean;
  imagenesIds?: string[];
}

export interface UpdateComboPricingDto {
  tipoPrecioCombo?: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO';
  /** 0-100, null para limpiar. Solo CALCULADO_CON_DESCUENTO */
  descuentoPorcentaje?: number | null;
  /** Solo tipo FIJO — se aplica en la sede del query param */
  precioFijo?: number;
  razon?: string;
}

export interface UpdateComboOfertaDto {
  /** Aplica sobre el precio final calculado (post-descuento) */
  precioOferta: number;
  enOferta: boolean;
  fechaInicioOferta?: string;
  fechaFinOferta?: string;
  razon?: string;
}

export interface CreateComponenteComboDto {
  componenteProductoId?: string;
  componenteVarianteId?: string;
  cantidad: number;
  precioEnCombo?: number;
  esPersonalizable?: boolean;
  categoriaComponente?: string;
}

export interface UpdateComponenteComboDto {
  cantidad?: number;
  precioEnCombo?: number;
  esPersonalizable?: boolean;
  categoriaComponente?: string;
}
