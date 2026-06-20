export type TipoDocumentoIdentidad = 'RUC' | 'DNI' | 'PASAPORTE' | 'CARNET_EXTRANJERIA' | 'OTROS';

export type TerminosPago =
  | 'CONTADO'
  | 'CREDITO_7'
  | 'CREDITO_15'
  | 'CREDITO_30'
  | 'CREDITO_45'
  | 'CREDITO_60'
  | 'CREDITO_90'
  | 'PERSONALIZADO';

export interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  nombreComercial?: string | null;
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  email?: string | null;
  telefono?: string | null;
  telefonoAlternativo?: string | null;
  sitioWeb?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  pais?: string;
  terminosPago?: TerminosPago | null;
  diasCredito?: number | null;
  notas?: string | null;
  isActive: boolean;
  /** Ficha de cliente vinculada (si el proveedor también es cliente / mismo tercero). */
  clienteEmpresa?: { id: string; codigo: string; razonSocial: string } | null;
}

export interface CreateProveedorDto {
  nombre: string;
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  nombreComercial?: string;
  email?: string;
  telefono?: string;
  telefonoAlternativo?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  departamento?: string;
  terminosPago?: TerminosPago;
  diasCredito?: number;
  notas?: string;
}

// ── Estado de cuenta del tercero (cuenta corriente: compras + ventas) ──
export interface EcItem {
  descripcion: string;
  cantidad: number;
  total: number;
}

export interface EcDoc {
  tipo: 'COMPRA' | 'VENTA';
  lado: 'LE_DEBO' | 'ME_DEBE';
  id: string;
  codigo: string;
  fecha: string;
  total: number;
  pagado: number;
  saldoPendiente: number;
  moneda: string;
  estado: string;
  items: EcItem[];
}

export interface EstadoCuentaTercero {
  proveedor: { id: string; nombre: string; numeroDocumento: string; clienteEmpresaCodigo?: string | null };
  clienteEmpresaId: string | null;
  esTercero: boolean;
  leDeboPorMoneda: Record<string, number>;
  meDebePorMoneda: Record<string, number>;
  netoPorMoneda: Record<string, number>;
  rango: { desde: string; hasta: string };
  pendientes: { ventas: EcDoc[]; compras: EcDoc[] };
  historial: { ventas: EcDoc[]; compras: EcDoc[] };
}

export interface RegistrarComoClienteResult {
  clienteEmpresa: { id: string; codigo: string; razonSocial: string };
  accion: 'YA_VINCULADO' | 'VINCULADO_EXISTENTE' | 'CREADO';
}
