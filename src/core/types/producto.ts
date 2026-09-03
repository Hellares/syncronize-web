import type { TipoPrecioNivel } from './precio';

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

export type MotivoLiquidacion =
  | 'FUERA_DE_CAMPANA' | 'SIN_ROTACION' | 'PROXIMO_A_VENCER' | 'DESCONTINUADO' | 'OTRO';

/**
 * Unidad de medida como la MANDA el backend.
 *
 * 🔴 NO trae `nombre` ni `abreviatura` planos: trae el par personalizado/local
 * de la empresa y, debajo, la unidad maestra. Declararla como
 * `{ nombre, abreviatura }` hacia que `unidadCompra.nombre` fuera undefined en
 * silencio — y con eso el selector "Comprar por" no aparecia nunca.
 */
export interface UnidadMedidaRef {
  id: string;
  nombrePersonalizado?: string | null;
  simboloPersonalizado?: string | null;
  nombreLocal?: string | null;
  simboloLocal?: string | null;
  unidadMaestra?: { id: string; codigo?: string; nombre?: string; simbolo?: string } | null;
}

/** Nombre legible de una unidad, en el orden en que el backend las resuelve. */
export function nombreUnidad(u?: UnidadMedidaRef | null): string | undefined {
  if (!u) return undefined;
  return u.nombrePersonalizado ?? u.nombreLocal ?? u.unidadMaestra?.nombre ?? undefined;
}

/** Simbolo corto de una unidad (g, kg, und). */
export function simboloUnidad(u?: UnidadMedidaRef | null): string | undefined {
  if (!u) return undefined;
  return u.simboloPersonalizado ?? u.simboloLocal ?? u.unidadMaestra?.simbolo ?? undefined;
}

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
  enLiquidacion?: boolean;
  precioLiquidacion?: number;
  motivoLiquidacion?: MotivoLiquidacion;
  observacionesLiquidacion?: string;
  fechaInicioLiquidacion?: string;
  fechaFinLiquidacion?: string;
  precioConfigurado: boolean;
  precioIncluyeIgv?: boolean;
}

// Helpers de precio efectivo (misma semántica que ProductoStock en stock.ts / Flutter):
// inicio inclusivo, fin exclusivo, fecha fin null = sin vencimiento.
export function infoOfertaActiva(s: StockPorSedeInfo): boolean {
  if (!s.enOferta || s.precioOferta == null) return false;
  const now = new Date();
  if (s.fechaInicioOferta && now < new Date(s.fechaInicioOferta)) return false;
  if (s.fechaFinOferta && now > new Date(s.fechaFinOferta)) return false;
  return true;
}

export function infoLiquidacionActiva(s: StockPorSedeInfo): boolean {
  if (!s.enLiquidacion || s.precioLiquidacion == null) return false;
  const now = new Date();
  if (s.fechaInicioLiquidacion && now < new Date(s.fechaInicioLiquidacion)) return false;
  if (s.fechaFinLiquidacion && now > new Date(s.fechaFinLiquidacion)) return false;
  return true;
}

// Prioridad: liquidación > oferta > base
export function infoPrecioEfectivo(s: StockPorSedeInfo): number | undefined {
  if (infoLiquidacionActiva(s)) return s.precioLiquidacion;
  if (infoOfertaActiva(s)) return s.precioOferta;
  return s.precio;
}

// --- Variante ---

/**
 * Nivel de precio por volumen tal como VIENE en el payload de la variante: un
 * subconjunto de `PrecioNivel`, sin `productoId`/`orden`/timestamps.
 *
 * 🔴 El nivel NO es por sede (`PrecioNivel` no tiene `sedeId`), a diferencia de
 * precio y costo, que sí viven en `ProductoStock`.
 */
export interface PrecioNivelVariante {
  id: string;
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number | null;
  tipoPrecio: TipoPrecioNivel;
  precio?: number | null;
  porcentajeDesc?: number | null;
}

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
  /** Unidad PROPIA de la variante. El backend la manda plana; el objeto
   *  `unidadMedida` puede no venir en el primer payload. */
  unidadMedidaId?: string | null;
  unidadMedida?: UnidadMedidaRef;
  /** Unidad de PRESENTACION propia: un granel se guarda en gramos y se habla en kg. */
  unidadPresentacionId?: string | null;
  unidadPresentacionSimbolo?: string | null;
  factorPresentacion?: number | null;
  /**
   * Apertura de bulto: en que variante se convierte esta al abrirla
   * (SACO -> GRANEL) y cuantas unidades de venta del destino salen de 1 bulto.
   * Es lo que distingue lo que se COMPRA de lo que entra al abrir.
   */
  varianteAperturaId?: string | null;
  rendimientoApertura?: number | null;
  isActive: boolean;
  orden: number;
  archivos?: ProductoArchivo[];
  stocksPorSede?: StockPorSedeInfo[];
  /**
   * Niveles de precio por volumen, ordenados por cantidad mínima. El backend
   * los manda en el mismo payload de la variante para que la lista pueda
   * mostrar el nivel VIGENTE sin una llamada por variante.
   */
  preciosNivel?: PrecioNivelVariante[];
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
  tipoAfectacionIgv?: 'GRAVADO' | 'EXONERADO' | 'INAFECTO';
  aplicaIcbper?: boolean;
  /** Código producto SUNAT (UNSPSC catálogo 25, 8 dígitos). Solo viaja al XML si está seteado. */
  codigoProductoSunat?: string;
  visibleMarketplace: boolean;
  destacado: boolean;
  ordenMarketplace?: number;
  tieneVariantes: boolean;
  esCombo: boolean;
  esInsumo?: boolean;
  tipoPrecioCombo?: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO' | null;
  configuracionPrecioId?: string;
  isActive: boolean;
  deletedAt?: string;
  creadoEn: string;
  actualizadoEn: string;
  categoria?: ProductoCategoria;
  marca?: ProductoMarca;
  sede?: { id: string; nombre: string };
  unidadMedida?: UnidadMedidaRef;
  unidadCompra?: UnidadMedidaRef;
  factorCompra?: number;
  /** Presentacion del producto; las variantes sin una propia la heredan. */
  unidadPresentacionSimbolo?: string | null;
  factorPresentacion?: number | null;
  imagenes?: string[];
  archivos?: ProductoArchivo[];
  atributosValores?: AtributoValor[];
  /** Las plantillas con las que se cargaron los atributos, EN ORDEN.
   *  Es el que manda para agrupar la ficha técnica. */
  plantillasAtributosIds?: string[];
  variantes?: ProductoVariante[];
  stocksPorSede?: StockPorSedeInfo[];
  comboReservado?: number;
}

// --- Filtros ---

// Valores en minúscula: deben coincidir con el enum OrdenProducto del backend (query-producto.dto.ts)
export type OrdenProducto =
  | 'nombre_asc' | 'nombre_desc'
  | 'precio_asc' | 'precio_desc'
  | 'stock_asc' | 'stock_desc'
  | 'recientes' | 'antiguos';

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
  /** true=solo insumos, false=solo no-insumos, undefined=todos */
  esInsumo?: boolean;
  /** Solo productos con liquidación activa */
  enLiquidacion?: boolean;
  /** Papelera: solo productos eliminados (deletedAt != null) */
  soloEliminados?: boolean;
  /** true=activos, false=inactivos, undefined=ambos */
  isActive?: boolean;
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
  tipoAfectacionIgv?: string;
  aplicaIcbper?: boolean;
  /** Código producto SUNAT (catálogo 25, 8 dígitos, de la lista curada). null = quitar. */
  codigoProductoSunat?: string | null;
  visibleMarketplace?: boolean;
  destacado?: boolean;
  tieneVariantes?: boolean;
  esCombo?: boolean;
  esInsumo?: boolean;
  tipoPrecioCombo?: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO';
  configuracionPrecioId?: string;
  empresaCategoriaId?: string;
  empresaMarcaId?: string;
  unidadMedidaId?: string;
  /** Unidad de COMPRA (proveedor vende en otra unidad, ej: PAQUETE de 100 BOLSAS). Requiere factorCompra. null = limpiar. */
  unidadCompraId?: string | null;
  /** Unidades de venta por 1 unidad de compra (ej: 100). Requerido si unidadCompraId. null = limpiar. */
  factorCompra?: number | null;
  sedesIds?: string[];
  imagenesIds?: string[];
  atributosEstructurados?: Array<{ atributoId: string; valor: string }>;
}

export type UpdateProductoDto = Partial<Omit<CreateProductoDto, 'empresaId' | 'sedesIds'>>;

// --- Atributos de Producto ---

/// Espeja el enum `AtributoTipo` del backend. Comparte vocabulario con los
/// tipos de campo de las plantillas de servicio (`servicio-catalogo.ts`):
/// quedan fuera TABLA y OBJETO porque guardan estructura y el valor de un
/// atributo es un string con índice GIN para los filtros del marketplace.
export type AtributoTipo =
  // Con lista de valores
  | 'SELECT' | 'MULTI_SELECT'
  // Sus opciones dependen del valor elegido en `dependeDeAtributoId`
  | 'SELECT_DEPENDIENTE'
  // Dato libre
  | 'TEXTO' | 'TEXTO_AREA' | 'NUMERO' | 'MONEDA' | 'BOOLEAN'
  | 'FECHA' | 'HORA' | 'EMAIL' | 'TELEFONO' | 'URL'
  // Códigos e identificación
  | 'CODIGO_BARRAS' | 'PIN_CLAVE' | 'PATRON_DESBLOQUEO'
  | 'DOCUMENTO_IDENTIDAD' | 'PLACA_VEHICULO' | 'LICENCIA_CONDUCIR'
  // Archivos: el valor es la URL del storage
  | 'FOTO' | 'FIRMA' | 'ARCHIVO'
  // Otros
  | 'INSPECCION_VISUAL' | 'PRODUCTO_CATALOGO'
  // Legacy: nombres de atributo disfrazados de tipo, fuera del selector
  | 'COLOR' | 'TALLA' | 'MATERIAL' | 'CAPACIDAD';

/** Una opción elegible, y de qué valor del atributo padre cuelga. */
export interface OpcionAtributo {
  id: string;
  valor: string;
  /** Null en los atributos raíz. */
  padreValor: string | null;
  orden: number;
}

export interface ProductoAtributo {
  id: string;
  empresaId: string;
  nombre: string;
  clave: string;
  tipo: AtributoTipo;
  /** Lista PLANA: en un dependiente vienen todas las ramas mezcladas. */
  valores: string[];
  /** Las opciones con su jerarquía. Vacío en los tipos sin lista. */
  opciones?: OpcionAtributo[];
  /** Atributo del que dependen estas opciones. */
  dependeDeAtributoId?: string | null;
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
  /** Sin esto, un atributo dependiente dentro de una plantilla mostraría la lista plana. */
  opciones?: OpcionAtributo[];
  dependeDeAtributoId?: string | null;
}

export interface PlantillaAtributo {
  id: string;
  atributoId: string;
  orden: number;
  requeridoOverride?: boolean;
  valoresOverride?: string[];
  atributo: PlantillaAtributoInfo;
}

/** Lo que espera `POST/PATCH /producto-atributo-plantillas`. */
export interface CreateAtributoPlantillaDto {
  nombre: string;
  descripcion?: string;
  icono?: string;
  categoriaId?: string;
  orden?: number;
  atributos: Array<{
    atributoId: string;
    orden?: number;
    requeridoOverride?: boolean;
    valoresOverride?: string[];
  }>;
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
  /** Unidad PROPIA de la variante: un SACO en 'und' bajo un producto en gramos. */
  unidadMedidaId?: string | null;
  /** Presentacion propia: el granel se guarda en gramos y se habla en kg. */
  unidadPresentacionId?: string | null;
  factorPresentacion?: number | null;
  /** Apertura de bulto: en que variante se convierte al abrirla, y cuanto rinde. */
  varianteAperturaId?: string | null;
  rendimientoApertura?: number | null;
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
  /**
   * Opciones con su jerarquía. Si viaja, MANDA sobre `valores`, que el backend
   * regenera a partir de acá. `id` permite renombrar una opción sin que se
   * borren sus hijas.
   */
  opciones?: { id?: string; valor: string; padreValor?: string | null; orden?: number }[];
  dependeDeAtributoId?: string | null;
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
