export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  subdominio: string;
  logo?: string;
  descripcion?: string;
  email?: string;
  telefono?: string;
  web?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  creadoEn: string;
  sedes?: Sede[];
  _count?: { productos: number; servicios: number };
  personalizaciones?: {
    bannerPrincipalUrl?: string;
    bannerPrincipalTexto?: string;
    banners?: Array<{ url: string; texto?: string; link?: string; orden?: number }>;
    colorPrimario?: string;
    colorSecundario?: string;
    colorAcento?: string;
    bannerColor?: string;
    webConfig?: {
      colorFondo1?: string;
      colorFondo2?: string;
      videos?: Array<{ url: string; titulo?: string }>;
      /** Links o @usuario, tal como los cargó la empresa en el app (Personalización). */
      redes?: { facebook?: string; instagram?: string; tiktok?: string };
      /** La empresa marcó que envía a todo el Perú. */
      enviosNacionales?: boolean;
    };
  }[];
}

export interface Sede {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  referencia?: string;
  stand?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  coordenadas?: { lat: number; lng?: number; lon?: number };
  imagenes?: string[];
  horarioAtencion?: Record<string, { inicio: string; fin: string }>;
  esPrincipal: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  precio?: number;
  precioOferta?: number;
  enOferta: boolean;
  hayStock: boolean;
  imagen?: string;
  calificacion?: number;
  totalOpiniones?: number;
  distancia?: number;
  empresa: {
    id: string;
    nombre: string;
    logo?: string;
    subdominio: string;
    telefono?: string;
    ubicacion?: string;
  };
}

export interface ProductoDetalle extends Producto {
  stockActual: number;
  videoUrl?: string;
  imagenes: { id: string; url: string; thumbnail?: string }[];
  atributos: { nombre: string; valor: string }[];
  /**
   * Los mismos atributos agrupados en las secciones con las que se cargaron
   * (PROCESADOR, MEMORIA, PANTALLA…), ya armadas por el backend.
   *
   * Vacío en los productos que no tienen secciones guardadas: ahí se muestra
   * la lista plana de `atributos`.
   */
  seccionesAtributos?: { nombre: string; atributos: { nombre: string; valor: string }[] }[];
  sede?: {
    nombre: string;
    direccion?: string;
    distrito?: string;
    provincia?: string;
    coordenadas?: { lat: number; lng?: number; lon?: number };
  };
}

export interface Pregunta {
  id: string;
  pregunta: string;
  respuesta?: string;
  nombreUsuario: string;
  creadoEn: string;
  respondidoEn?: string;
}

export interface Opinion {
  id: string;
  calificacion: number;
  comentario?: string;
  imagenes: string[];
  verificada: boolean;
  nombreUsuario: string;
  creadoEn: string;
}

/** Productos por página en la tienda pública (la carga inicial y cada "Ver más"). */
export const TIENDA_PAGE_SIZE = 40;

/** Una categoría de la tienda con productos visibles (EmpresaCategoria). */
export interface CategoriaTienda {
  id: string;
  nombre: string;
  total: number;
}

/**
 * Lo que devuelve `/marketplace/empresas/:subdominio/productos`: la paginación
 * viene en `pagination`, y `categorias` solo en la página 1 (sale de TODO el
 * catálogo visible, no de la página).
 */
export interface ProductosTiendaResponse {
  data: Producto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  categorias?: CategoriaTienda[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
