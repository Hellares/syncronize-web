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
  atributosEstructurados?: Array<{ atributoId: string; valor: string }>;
}

export type UpdateProductoDto = Partial<Omit<CreateProductoDto, 'empresaId' | 'sedesIds'>>;

// --- Atributos de Producto ---

export type AtributoTipo =
  | 'COLOR' | 'TALLA' | 'MATERIAL' | 'CAPACIDAD'
  | 'TEXTO' | 'NUMERO' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN';

export interface ProductoAtributo {
  id: string;
  empresaId: string;
  nombre: string;
  clave: string;
  tipo: AtributoTipo;
  valores: string[];
  unidad?: string;
  requerido?: boolean;
  descripcion?: string;
  orden?: number;
  isActive: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

// --- Plantillas de Atributos ---

export interface PlantillaAtributoInfo {
  id: string;
  nombre: string;
  clave: string;
  tipo: AtributoTipo;
  requerido: boolean;
  descripcion?: string;
  unidad?: string;
  valores: string[];
}

export interface PlantillaAtributo {
  id: string;
  atributoId: string;
  orden: number;
  requeridoOverride?: boolean;
  valoresOverride?: string[];
  atributo: PlantillaAtributoInfo;
}

export interface AtributoPlantilla {
  id: string;
  empresaId: string;
  categoriaId?: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  esPredefinida: boolean;
  orden: number;
  isActive: boolean;
  atributos: PlantillaAtributo[];
  creadoEn: string;
  actualizadoEn: string;
}

// --- DTOs de Variantes ---

export interface CreateVarianteDto {
  nombre: string;
  sku: string;
  codigoBarras?: string;
  atributosEstructurados?: Array<{ atributoId: string; valor: string }>;
  peso?: number;
  dimensiones?: Record<string, number>;
  isActive?: boolean;
  orden?: number;
  imagenesIds?: string[];
}

export type UpdateVarianteDto = Partial<CreateVarianteDto>;

export interface GenerarCombinacionesDto {
  atributos: Array<{ atributoId: string; valores: string[] }>;
  precioBase: number;
  precioCosto?: number;
  skuBase?: string;
  stockDistribucion?: 'EQUITATIVO' | 'SIN_STOCK';
  stockTotal?: number;
}

export interface SetVarianteAtributosDto {
  atributos: Array<{ atributoId: string; valor: string }>;
}

// --- DTOs de Atributos ---

export interface CreateProductoAtributoDto {
  nombre: string;
  clave: string;
  tipo: AtributoTipo;
  valores?: string[];
  unidad?: string;
  requerido?: boolean;
  descripcion?: string;
  orden?: number;
  mostrarEnListado?: boolean;
  usarParaFiltros?: boolean;
  mostrarEnMarketplace?: boolean;
}

export type UpdateProductoAtributoDto = Partial<CreateProductoAtributoDto>;

// --- Bulk Upload ---

export interface BulkUploadError {
  fila: number;
  columna: string;
  valor?: string;
  mensaje: string;
}

export interface BulkUploadResult {
  totalFilas: number;
  creados: number;
  errores: number;
  detalleErrores: BulkUploadError[];
  productosCreados: Array<{ id: string; nombre: string; codigoEmpresa: string }>;
}
