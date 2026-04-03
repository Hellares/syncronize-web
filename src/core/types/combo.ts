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

// --- DTOs ---

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
