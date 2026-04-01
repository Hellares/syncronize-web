// --- Entidades relacionadas ---

export interface ProductoCategoria {
  id: string;
  nombre: string;
  categoriaMaestraId?: string;
  slug?: string;
}

export interface ProductoMarca {
  id: string;
  nombre: string;
  marcaMaestraId?: string;
  slug?: string;
  logo?: string;
}

export interface ProductoArchivo {
  id: string;
  url: string;
  urlThumbnail?: string;
  categoria?: string;
  orden?: number;
}

export interface AtributoInfo {
  id: string;
  nombre: string;
  clave: string;
  tipo: string;
  unidad?: string;
}

export interface AtributoValor {
  id: string;
  atributoId: string;
  valor: string;
  atributo: AtributoInfo;
}

// --- Stock por Sede ---

export interface StockPorSedeInfo {
  sedeId: string;
  sedeNombre: string;
  sedeCodigo: string;
  cantidad: number;
  stockMinimo?: number;
  stockMaximo?: number;
  ubicacion?: string;
  precio?: number;
  precioCosto?: number;
  precioOferta?: number;
  enOferta: boolean;
  fechaInicioOferta?: string;
  fechaFinOferta?: string;
  precioConfigurado: boolean;
  precioIncluyeIgv?: boolean;
}

// --- Variante ---

export interface ProductoVariante {
  id: string;
  productoId: string;
  empresaId: string;
  nombre: string;
  sku: string;
  codigoBarras?: string;
  codigoEmpresa: string;
  atributosValores: AtributoValor[];
  peso?: number;
  dimensiones?: Record<string, number>;
  isActive: boolean;
  orden: number;
  archivos?: ProductoArchivo[];
  stocksPorSede?: StockPorSedeInfo[];
  creadoEn: string;
  actualizadoEn: string;
}

// --- Producto completo ---

export interface Producto {
  id: string;
  empresaId: string;
  sedeId?: string;
  codigoEmpresa: string;
  codigoSistema: string;
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  peso?: number;
  dimensiones?: Record<string, number>;
  videoUrl?: string;
  impuestoPorcentaje?: number;
  descuentoMaximo?: number;
  visibleMarketplace: boolean;
  destacado: boolean;
  ordenMarketplace?: number;
  tieneVariantes: boolean;
  esCombo: boolean;
  tipoPrecioCombo?: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO' | null;
  configuracionPrecioId?: string;
  isActive: boolean;
  deletedAt?: string;
  creadoEn: string;
  actualizadoEn: string;
  categoria?: ProductoCategoria;
  marca?: ProductoMarca;
  sede?: { id: string; nombre: string };
  unidadMedida?: { id: string; nombre: string; abreviatura?: string };
  imagenes?: string[];
  archivos?: ProductoArchivo[];
  atributosValores?: AtributoValor[];
  variantes?: ProductoVariante[];
  stocksPorSede?: StockPorSedeInfo[];
  comboReservado?: number;
}

// --- Filtros ---

export type OrdenProducto =
  | 'NOMBRE_ASC' | 'NOMBRE_DESC'
  | 'PRECIO_ASC' | 'PRECIO_DESC'
  | 'STOCK_ASC' | 'STOCK_DESC'
  | 'RECIENTES' | 'ANTIGUOS';

export interface ProductoFiltros {
  page: number;
  limit: number;
  search?: string;
  empresaCategoriaId?: string;
  empresaMarcaId?: string;
  sedeId?: string;
  visibleMarketplace?: boolean;
  destacado?: boolean;
  enOferta?: boolean;
  stockBajo?: boolean;
  soloProductos?: boolean;
  soloCombos?: boolean;
  orden?: OrdenProducto;
}

// --- Paginación ---

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  limit: number;
  totalPages: number;
  offset: number;
  nextOffset: number | null;
  prevOffset: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// --- DTOs ---

export interface CreateProductoDto {
  empresaId: string;
  nombre: string;
  descripcion?: string;
  sku?: string;
  codigoBarras?: string;
  peso?: number;
  dimensiones?: Record<string, number>;
  videoUrl?: string;
  impuestoPorcentaje?: number;
  descuentoMaximo?: number;
  visibleMarketplace?: boolean;
  destacado?: boolean;
  tieneVariantes?: boolean;
  esCombo?: boolean;
  tipoPrecioCombo?: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO';
  configuracionPrecioId?: string;
  empresaCategoriaId?: string;
  empresaMarcaId?: string;
  unidadMedidaId?: string;
  sedesIds?: string[];
  imagenesIds?: string[];
}

export type UpdateProductoDto = Partial<Omit<CreateProductoDto, 'empresaId' | 'sedesIds'>>;
