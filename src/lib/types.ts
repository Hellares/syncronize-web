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
  personalizaciones?: { bannerPrincipalUrl?: string; bannerPrincipalTexto?: string; colorPrimario?: string }[];
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
  imagenes: { id: string; url: string; thumbnail?: string }[];
  atributos: { nombre: string; valor: string }[];
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
