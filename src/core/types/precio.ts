// --- Precio Nivel (Tiered Pricing) ---

export type TipoPrecioNivel = 'PRECIO_FIJO' | 'PORCENTAJE_DESCUENTO';

export interface PrecioNivel {
  id: string;
  productoId?: string;
  varianteId?: string;
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number;
  tipoPrecio: TipoPrecioNivel;
  precio?: number;
  porcentajeDesc?: number;
  descripcion?: string;
  orden: number;
  isActive: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreatePrecioNivelDto {
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number;
  tipoPrecio: TipoPrecioNivel;
  precio?: number;
  porcentajeDesc?: number;
  descripcion?: string;
  orden?: number;
}

export type UpdatePrecioNivelDto = Partial<CreatePrecioNivelDto>;

// --- Configuración Precio (Templates) ---

export interface ConfiguracionPrecioNivel {
  id: string;
  nombre: string;
  cantidadMinima: number;
  cantidadMaxima?: number;
  tipoPrecio: TipoPrecioNivel;
  porcentajeDesc?: number;
  orden: number;
}

export interface ConfiguracionPrecio {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion?: string;
  isActive: boolean;
  niveles: ConfiguracionPrecioNivel[];
  cantidadProductosUsando?: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreateConfiguracionPrecioDto {
  nombre: string;
  descripcion?: string;
  niveles: Array<Omit<CreatePrecioNivelDto, 'precio'>>;
}

export type UpdateConfiguracionPrecioDto = Partial<CreateConfiguracionPrecioDto>;
