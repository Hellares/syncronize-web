// --- BOM / Fabricación (F4) — contratos del backend producto-componente ---

/** Línea de receta (GET /productos/:id/componentes) */
export interface ComponenteBOM {
  id: string;
  productoId: string;
  componenteId: string;
  componenteVarianteId?: string | null;
  /** Cantidad POR UNIDAD fabricada, en unidad nativa del componente */
  cantidad: number;
  notas?: string | null;
  componente: {
    id: string;
    nombre: string;
    codigoEmpresa: string;
    /** Símbolo de la unidad base del insumo (ej: g, cm, UND) */
    unidadMedida?: string | null;
    unidadMedidaNombre?: string | null;
    factorCompra?: number | null;
    unidadCompraSimbolo?: string | null;
    /** Nombre de la variante del insumo si aplica (ej: "T20 Niño") */
    varianteNombre?: string | null;
  };
  precioCostoUnitario?: number | null;
  subtotal?: number | null;
  stockDisponible?: number | null;
  sedeUsada?: string | null;
}

export interface CalcularCostoBOMResponse {
  costoTotal: number;
  cantidadComponentes: number;
  componentesSinCosto: Array<{ id: string; nombre: string }>;
  sedeId: string;
}

// --- DTOs ---

export interface CrearComponenteBOMDto {
  /** Producto insumo */
  componenteId: string;
  /** Variante del producto FINAL (omitir para receta base) */
  varianteId?: string;
  /** Variante del INSUMO (requerido si el insumo tiene variantes) */
  componenteVarianteId?: string;
  /** Por unidad fabricada, en unidad nativa del componente (≥ 0.0001) */
  cantidad: number;
  notas?: string;
}

export interface ActualizarComponenteBOMDto {
  cantidad?: number;
  notas?: string;
}

export interface CopiarRecetaDto {
  /** Variante destino (copia la receta base) */
  varianteId: string;
  /** true = reemplaza receta existente de la variante */
  sobrescribir?: boolean;
}

export interface FabricarDto {
  sedeId: string;
  /** Obligatorio si el producto tiene variantes */
  varianteId?: string;
  /** Unidades enteras del producto final */
  cantidad: number;
  observaciones?: string;
  /** true = solo descuenta insumos (producción previa, no suma stock final) */
  soloConsumirInsumos?: boolean;
  /** Costo de mano de obra TOTAL del lote */
  costoManoObra?: number;
}

/** Respuesta de POST fabricar */
export interface FabricarResponse {
  numeroDocumento: string;
  cantidadProducida: number;
  stockFinalNuevo: number;
  precioCostoAnterior?: number | null;
  precioCostoNuevo?: number | null;
  costoActualizado: boolean;
  razonCostoNoActualizado?: string | null;
  costoInsumos?: number | null;
  costoManoObra?: number | null;
  costoLoteTotal?: number | null;
}

// --- Lotes de producción ---

export interface LoteProduccion {
  id?: string;
  numeroDocumento: string;
  productoId?: string | null;
  productoNombre?: string;
  codigoEmpresa?: string | null;
  varianteId?: string | null;
  varianteNombre?: string | null;
  cantidadProducida: number;
  stockNuevo?: number;
  /** Solo lotes con costeo (costoManoObra registrado) */
  costoLote?: number | null;
  costoUnitario?: number | null;
  creadoEn: string;
  observaciones?: string | null;
  sede?: { id?: string; nombre: string };
  usuario?: { id?: string; nombre: string } | null;
}

export interface LotesProduccionResponse {
  items: LoteProduccion[];
  total: number;
  limit: number;
  offset: number;
}

/** Detalle de un lote (GET fabricaciones/:numeroDocumento) */
export interface DetalleFabricacion {
  insumosConsumidos: Array<{
    nombre: string;
    cantidadConsumida: number;
    unidadMedida?: string | null;
    stockNuevo?: number;
    costoUnitarioMomento?: number | null;
    costoUnitarioActual?: number | null;
    ultimaCompra?: {
      proveedor: string;
      cantidad: number;
      precioUnitario: number;
      total: number;
      fecha: string;
    } | null;
  }>;
  costoInsumos?: number | null;
  costoManoObra?: number | null;
  costoLoteTotal?: number | null;
}

// --- Trazabilidad / Ficha 360 (GET /productos/:id/trazabilidad) ---

export interface TrazabilidadProducto {
  producto: {
    id: string;
    nombre: string;
    codigoEmpresa?: string;
    esInsumo?: boolean;
    esFabricado?: boolean;
    tieneVariantes?: boolean;
    unidadMedidaSimbolo?: string | null;
  };
  stock: {
    stockTotal: number;
    valorizado: number;
    porSede: Array<{
      sedeNombre: string;
      varianteNombre?: string | null;
      stockActual: number;
      precioCosto?: number | string | null;
      productoStockId?: string;
    }>;
  };
  kardex: Array<{
    tipo: string;
    numeroDocumento?: string | null;
    sedeNombre: string;
    fecha: string;
    cantidad: number;
    precioCostoUnitario?: number | null;
  }>;
  compras: Array<{
    compraCodigo: string;
    proveedor: string;
    fecha: string;
    cantidad: number;
    total: number;
    moneda?: string;
    varianteNombre?: string | null;
  }>;
  proveedores: Array<{
    proveedor: string;
    veces: number;
    cantidadAcum: number;
    precioPromedio: number;
    ultimaCompra?: string | null;
  }>;
  lotes: Array<{
    codigo: string;
    proveedor?: string;
    fechaIngreso: string;
    fechaVencimiento?: string | null;
    cantidadInicial: number;
    cantidadActual: number;
    precioCosto?: number | string | null;
    varianteNombre?: string | null;
  }>;
  fabricacion: {
    lotesFabricados: Array<{
      numeroDocumento: string;
      fecha: string;
      cantidad: number;
      precioCostoUnitario?: number | null;
    }>;
    insumosConsumidos: Array<{
      insumo: string;
      cantidad: number;
      costo?: number | null;
    }>;
    usadoEnRecetas: Array<{
      productoFinalNombre: string;
      varianteFinalNombre?: string | null;
      componenteVarianteNombre?: string | null;
      cantidadPorUnidad: number;
    }>;
  };
  ventas: Array<{
    ventaCodigo: string;
    cliente?: string;
    fecha: string;
    cantidad: number;
    total: number;
    moneda?: string;
    varianteNombre?: string | null;
  }>;
  devoluciones: Array<{
    codigo: string;
    motivo?: string;
    fecha: string;
    cantidad: number;
    ventaCodigo?: string | null;
    varianteNombre?: string | null;
  }>;
  transferencias: Array<{
    origen: string;
    destino: string;
    codigo: string;
    estado: string;
    fecha: string;
    cantidadEnviada?: number | null;
    cantidadRecibida?: number | null;
    cantidadSolicitada?: number | null;
    varianteNombre?: string | null;
  }>;
}
