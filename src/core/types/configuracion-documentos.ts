/**
 * Identidad de marca y plantillas de los PDF de la empresa.
 *
 * El modelo lo comparten la web y el app: lo que se configura acá cambia los
 * documentos de los dos lados. Endpoints en `/configuracion-documentos`.
 */

export type TipoDocumento =
  | 'COTIZACION'
  | 'FACTURA'
  | 'BOLETA'
  | 'NOTA_CREDITO'
  | 'NOTA_DEBITO'
  | 'GUIA_REMISION'
  | 'TICKET_VENTA'
  | 'ORDEN_SERVICIO';

export type FormatoPapel = 'A4' | 'TICKET_80MM' | 'TICKET_58MM';

export type PosicionLogo = 'IZQUIERDA' | 'CENTRO' | 'DERECHA';

export const POSICIONES_LOGO: { value: PosicionLogo; label: string }[] = [
  { value: 'IZQUIERDA', label: 'Izquierda' },
  { value: 'CENTRO', label: 'Centro' },
  { value: 'DERECHA', label: 'Derecha' },
];

/** Configuración global: la marca, común a todos los documentos. */
export interface ConfiguracionDocumentos {
  id: string;
  empresaId: string;
  logoUrl?: string | null;
  nombreComercial?: string | null;
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  textoPiePagina: string;
  /** null = usa `textoPiePagina`. */
  textoPieVenta?: string | null;
  /** null = usa `textoPiePagina`. */
  textoPieServicio?: string | null;
  mostrarPaginacion: boolean;
  /**
   * Datos fiscales que agrega `completa/:tipo`. NO se guardan acá: salen de
   * Empresa, y la sede emisora los pisa si tiene los suyos.
   */
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

/**
 * Plantilla de UN tipo de documento.
 *
 * 🔴 Los cuatro márgenes son `Decimal` en Prisma y llegan como **string**
 * ("10.00"), no como número — ver [[feedback_prisma_decimal_serializa_como_string]].
 * Usar `margenesDePlantilla()` en vez de leerlos directo.
 */
export interface PlantillaDocumento {
  id: string;
  empresaId: string;
  tipoDocumento: TipoDocumento;
  formatoPapel: FormatoPapel;
  nombre: string;
  margenSuperior: number | string;
  margenInferior: number | string;
  margenIzquierdo: number | string;
  margenDerecho: number | string;
  mostrarLogo: boolean;
  mostrarDatosEmpresa: boolean;
  mostrarDatosCliente: boolean;
  mostrarDetalles: boolean;
  mostrarTotales: boolean;
  mostrarObservaciones: boolean;
  mostrarCondiciones: boolean;
  mostrarFirma: boolean;
  mostrarCodigoQR: boolean;
  mostrarPiePagina: boolean;
  /** null = usa `colorPrimario` de la configuración global. */
  colorEncabezado?: string | null;
  /** null = usa `colorTexto` de la configuración global. */
  colorCuerpo?: string | null;
  /**
   * Condiciones con las que nace un documento nuevo de este tipo.
   *
   * 🔴 Es un DEFAULT del formulario, no algo que se inyecte al imprimir: la
   * cotización guarda su propio texto, así que cambiar esto NO reescribe las
   * ya emitidas.
   */
  condicionesPorDefecto?: string | null;
  /**
   * Logo propio de ESTE tipo de documento. null = usa el de la marca.
   *
   * Un logo cuadrado se ve bien en un ticket de 80 mm y se pierde en la
   * cabecera de una cotización A4, que pide uno apaisado.
   */
  logoUrl?: string | null;
  /** Dónde va el logo en la hoja. */
  posicionLogo?: PosicionLogo;
  isActive: boolean;
  esPorDefecto: boolean;
}

/** Lo que devuelve `GET /configuracion-documentos/completa/:tipo`. */
export interface ConfiguracionCompleta {
  configuracion: ConfiguracionDocumentos;
  plantilla: PlantillaDocumento;
  /**
   * Sede emisora, solo si se pidió con `sedeId`. Trae la dirección: la del
   * documento sale de acá, no de `Cotizacion.sede`, que solo tiene el nombre.
   */
  sede?: {
    id: string;
    nombre: string;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    rucSede?: string | null;
    razonSocialSede?: string | null;
    direccionFiscalSede?: string | null;
  } | null;
}

export type UpdateConfiguracionDto = Partial<
  Pick<
    ConfiguracionDocumentos,
    | 'logoUrl'
    | 'nombreComercial'
    | 'colorPrimario'
    | 'colorSecundario'
    | 'colorTexto'
    | 'textoPiePagina'
    | 'textoPieVenta'
    | 'textoPieServicio'
    | 'mostrarPaginacion'
  >
>;

export type UpdatePlantillaDto = Partial<
  Omit<
    PlantillaDocumento,
    'id' | 'empresaId' | 'tipoDocumento' | 'nombre' | 'isActive' | 'esPorDefecto'
  >
>;

/** Los cuatro márgenes en mm, ya numéricos. */
export function margenesDePlantilla(p: PlantillaDocumento) {
  return {
    top: Number(p.margenSuperior ?? 10),
    bottom: Number(p.margenInferior ?? 10),
    left: Number(p.margenIzquierdo ?? 10),
    right: Number(p.margenDerecho ?? 10),
  };
}

/**
 * `#1565C0` → `[21, 101, 192]`, que es lo que come jsPDF.
 *
 * Un color inválido cae a negro en vez de romper el PDF: el documento tiene
 * que salir igual, aunque salga feo.
 */
export function hexARgb(hex?: string | null): [number, number, number] {
  const limpio = (hex ?? '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return [0, 0, 0];
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
}

export const FORMATOS_PAPEL: { value: FormatoPapel; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'TICKET_80MM', label: 'Ticket 80mm' },
  { value: 'TICKET_58MM', label: 'Ticket 58mm' },
];

/** Las secciones que el usuario puede prender y apagar, en orden de lectura. */
export const SECCIONES_PLANTILLA: {
  key: keyof PlantillaDocumento;
  label: string;
  ayuda?: string;
}[] = [
  { key: 'mostrarLogo', label: 'Logo' },
  { key: 'mostrarDatosEmpresa', label: 'Datos de la empresa' },
  { key: 'mostrarDatosCliente', label: 'Datos del cliente' },
  { key: 'mostrarDetalles', label: 'Detalle de ítems' },
  { key: 'mostrarTotales', label: 'Totales' },
  { key: 'mostrarObservaciones', label: 'Observaciones' },
  { key: 'mostrarCondiciones', label: 'Condiciones' },
  { key: 'mostrarFirma', label: 'Espacio para firma' },
  { key: 'mostrarPiePagina', label: 'Pie de página' },
  {
    key: 'mostrarCodigoQR',
    label: 'Código QR',
    ayuda: 'El PDF de la web todavía no lo dibuja',
  },
];
