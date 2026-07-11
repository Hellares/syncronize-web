// Catálogo curado de códigos de producto SUNAT (UNSPSC 8 dígitos).
//
// Fuente: anexos 25.1, 25.2 y 25.3 del Catálogo N.° 25 — "Reglas de
// validación actualizado al 24.04.2026" (cpe.sunat.gob.pe), vigencia
// 01.08.2026. Desde esa fecha un código INVÁLIDO en el comprobante es
// RECHAZO (ERR-3496): por eso el campo se elige de esta lista y nunca
// es texto libre.
//
// El código es OPCIONAL: solo es obligatorio para RUCs del padrón 12
// de SUNAT ("obligado a enviar código de producto") y en liquidaciones
// de compra. Sin código, el XML sale sin el tag y SUNAT no valida nada.
//
// Espejo de Flutter: lib/features/producto/domain/entities/codigo_producto_sunat.dart
// — mantener ambas listas sincronizadas.

export interface CodigoProductoSunat {
  codigo: string;
  descripcion: string;
  grupo: string;
}

export const GRUPOS_CODIGO_SUNAT = {
  genericos: 'Genéricos (comodín aceptado por SUNAT)',
  detraccion: 'Bienes con detracción (25.2)',
  percepcion: 'Bienes con percepción (25.3)',
  oro: 'Oro y minería (25.1)',
  explosivos: 'Explosivos (25.1)',
  quimicos: 'Insumos químicos (25.1)',
  combustibles: 'Combustibles (25.1)',
  maquinaria: 'Maquinaria y equipos (25.1)',
  otrosBienes: 'Otros bienes (25.1)',
  servicios: 'Servicios (25.1)',
} as const;

/** Grupos en orden de presentación (mismo orden que Flutter). */
export const GRUPOS_ORDEN: string[] = [
  GRUPOS_CODIGO_SUNAT.genericos,
  GRUPOS_CODIGO_SUNAT.detraccion,
  GRUPOS_CODIGO_SUNAT.percepcion,
  GRUPOS_CODIGO_SUNAT.combustibles,
  GRUPOS_CODIGO_SUNAT.otrosBienes,
  GRUPOS_CODIGO_SUNAT.oro,
  GRUPOS_CODIGO_SUNAT.explosivos,
  GRUPOS_CODIGO_SUNAT.quimicos,
  GRUPOS_CODIGO_SUNAT.maquinaria,
  GRUPOS_CODIGO_SUNAT.servicios,
];

const G = GRUPOS_CODIGO_SUNAT;

/** Lista completa de los anexos 25.1 + 25.2 + 25.3 (oficial SUNAT) + genéricos. */
export const CATALOGO_CODIGOS_PRODUCTO_SUNAT: CodigoProductoSunat[] = [
  // ── Genéricos: valores comodín EXENTOS de la validación ERR-3496
  //    ("diferente de 8 ceros y de 8 nueves"). Para empresas del padrón 12
  //    cuyos productos NO están en los anexos — los bienes fiscalizados
  //    deben llevar su código específico, no el genérico. ──
  { codigo: '00000000', descripcion: 'Sin código de producto SUNAT asignado', grupo: G.genericos },
  { codigo: '99999999', descripcion: 'Mercadería genérica / no clasificable', grupo: G.genericos },

  // ── Anexo 25.2: bienes sujetos a DETRACCIÓN ──
  { codigo: '50111500', descripcion: 'Carnes y despojos comestibles', grupo: G.detraccion },
  { codigo: '11111111', descripcion: 'Bienes gravados con el IGV por renuncia a la exoneración', grupo: G.detraccion },
  { codigo: '10171503', descripcion: 'Harina, polvo y pellets de pescado, crustáceos y moluscos', grupo: G.detraccion },
  { codigo: '11101600', descripcion: 'Minerales metálicos no auríferos', grupo: G.detraccion },
  { codigo: '11101714', descripcion: 'Plomo', grupo: G.detraccion },
  { codigo: '11111600', descripcion: 'Piedra', grupo: G.detraccion },
  { codigo: '11111700', descripcion: 'Arena', grupo: G.detraccion },
  { codigo: '11121600', descripcion: 'Madera', grupo: G.detraccion },
  { codigo: '11140000', descripcion: 'Chatarra y materiales de desecho', grupo: G.detraccion },
  { codigo: '50120000', descripcion: 'Recursos hidrobiológicos', grupo: G.detraccion },
  { codigo: '50151600', descripcion: 'Aceite de pescado', grupo: G.detraccion },
  { codigo: '50161509', descripcion: 'Caña de azúcar', grupo: G.detraccion },
  { codigo: '50171500', descripcion: 'Páprika', grupo: G.detraccion },
  { codigo: '50203205', descripcion: 'Leche cruda entera', grupo: G.detraccion },
  { codigo: '50403200', descripcion: 'Maíz amarillo', grupo: G.detraccion },

  // ── Anexo 25.3: bienes sujetos a PERCEPCIÓN ──
  { codigo: '50202300', descripcion: 'Agua, agua mineral y demás bebidas no alcohólicas', grupo: G.percepcion },
  { codigo: '50202201', descripcion: 'Cerveza de malta', grupo: G.percepcion },
  { codigo: '15101502', descripcion: 'Kerosene', grupo: G.percepcion },
  { codigo: '15101504', descripcion: 'Combustible para aviación', grupo: G.percepcion },
  { codigo: '15101509', descripcion: 'Combustible de uso marino (bunker)', grupo: G.percepcion },
  { codigo: '15111510', descripcion: 'Gas licuado de petróleo (GLP)', grupo: G.percepcion },
  { codigo: '12142104', descripcion: 'Dióxido de carbono', grupo: G.percepcion },
  { codigo: '13111039', descripcion: 'Poli (tereftalato de etileno) PET en formas primarias', grupo: G.percepcion },
  { codigo: '13102020', descripcion: 'Envases o preformas de PET', grupo: G.percepcion },
  { codigo: '24122000', descripcion: 'Envases de vidrio (bombonas, botellas, frascos, tarros)', grupo: G.percepcion },
  { codigo: '24122004', descripcion: 'Tapones, tapas, cápsulas y dispositivos de cierre', grupo: G.percepcion },
  { codigo: '50221002', descripcion: 'Harina de trigo o de morcajo', grupo: G.percepcion },
  { codigo: '50221110', descripcion: 'Trigo y morcajo', grupo: G.percepcion },

  // ── Anexo 25.1: combustibles ──
  { codigo: '15101505', descripcion: 'Combustible diésel', grupo: G.combustibles },
  { codigo: '15101506', descripcion: 'Gasolina', grupo: G.combustibles },
  { codigo: '15100000', descripcion: 'Otros combustibles', grupo: G.combustibles },

  // ── Anexo 25.1: otros bienes ──
  { codigo: '12352104', descripcion: 'Alcoholes o sus sustitutos', grupo: G.otrosBienes },
  { codigo: '50161509', descripcion: 'Azúcares naturales o productos endulzantes', grupo: G.otrosBienes },
  { codigo: '50221101', descripcion: 'Grano de cereal (arroz)', grupo: G.otrosBienes },

  // ── Anexo 25.1: oro y minería ──
  { codigo: '11101616', descripcion: 'Mineral de oro', grupo: G.oro },
  { codigo: '11101801', descripcion: 'Oro', grupo: G.oro },

  // ── Anexo 25.1: explosivos ──
  { codigo: '12131500', descripcion: 'Explosivos', grupo: G.explosivos },
  { codigo: '12131501', descripcion: 'Dinamita', grupo: G.explosivos },
  { codigo: '12131502', descripcion: 'Cartuchos explosivos', grupo: G.explosivos },
  { codigo: '12131503', descripcion: 'Explosivos propelentes', grupo: G.explosivos },
  { codigo: '12131504', descripcion: 'Cargas explosivas', grupo: G.explosivos },
  { codigo: '12131505', descripcion: 'Explosivos plásticos', grupo: G.explosivos },
  { codigo: '12131506', descripcion: 'Explosivos aluminizados', grupo: G.explosivos },
  { codigo: '12131508', descripcion: 'Explosivos de polvo de nitroglicerina', grupo: G.explosivos },
  { codigo: '12131509', descripcion: 'Nitrato de amonio y fuel oil (ANFO)', grupo: G.explosivos },
  { codigo: '12131507', descripcion: 'Explosivos de nitrato de amonio', grupo: G.explosivos },

  // ── Anexo 25.1: insumos químicos ──
  { codigo: '12141726', descripcion: 'Mercurio (Hg)', grupo: G.quimicos },
  { codigo: '12352117', descripcion: 'Cianuros o isocianuros', grupo: G.quimicos },

  // ── Anexo 25.1: maquinaria y equipos ──
  { codigo: '20101504', descripcion: 'Cortadores de roca', grupo: G.maquinaria },
  { codigo: '20101600', descripcion: 'Cribas y equipos de alimentación', grupo: G.maquinaria },
  { codigo: '20111601', descripcion: 'Maquinaria de sondeo o de perforación', grupo: G.maquinaria },
  { codigo: '20111607', descripcion: 'Maquinaria para hacer túneles', grupo: G.maquinaria },
  { codigo: '22101501', descripcion: 'Cargadores frontales', grupo: G.maquinaria },
  { codigo: '22101502', descripcion: 'Niveladoras', grupo: G.maquinaria },
  { codigo: '22101505', descripcion: 'Aplanadoras', grupo: G.maquinaria },
  { codigo: '22101509', descripcion: 'Retroexcavadoras', grupo: G.maquinaria },
  { codigo: '22101511', descripcion: 'Compactadores', grupo: G.maquinaria },
  { codigo: '22101513', descripcion: 'Dragalíneas', grupo: G.maquinaria },
  { codigo: '22101514', descripcion: 'Dragas', grupo: G.maquinaria },
  { codigo: '22101516', descripcion: 'Excavadoras de fosos', grupo: G.maquinaria },
  { codigo: '22101518', descripcion: 'Raspadores elevadores', grupo: G.maquinaria },
  { codigo: '22101519', descripcion: 'Máquina giratoria con cazoleta de rastrillos abiertas', grupo: G.maquinaria },
  { codigo: '22101520', descripcion: 'Máquina giratoria con rastrillos elevadores', grupo: G.maquinaria },
  { codigo: '22101521', descripcion: 'Rastrilladora arrastrada', grupo: G.maquinaria },
  { codigo: '22101522', descripcion: 'Buldóceres de orugas', grupo: G.maquinaria },
  { codigo: '22101523', descripcion: 'Buldóceres de ruedas', grupo: G.maquinaria },
  { codigo: '22101524', descripcion: 'Excavadoras móviles', grupo: G.maquinaria },
  { codigo: '22101525', descripcion: 'Excavadoras de ruedas', grupo: G.maquinaria },
  { codigo: '22101526', descripcion: 'Excavadoras de orugas', grupo: G.maquinaria },
  { codigo: '22101528', descripcion: 'Cargadores de ruedas', grupo: G.maquinaria },
  { codigo: '22101529', descripcion: 'Cargadores sobre patines con dirección', grupo: G.maquinaria },
  { codigo: '22101530', descripcion: 'Raspadores abiertos', grupo: G.maquinaria },
  { codigo: '22101532', descripcion: 'Cargadores de orugas', grupo: G.maquinaria },
  { codigo: '22101534', descripcion: 'Excavadoras de campaña', grupo: G.maquinaria },
  { codigo: '22101602', descripcion: 'Equipo de apisonamiento', grupo: G.maquinaria },
  { codigo: '22101701', descripcion: 'Palas excavadoras', grupo: G.maquinaria },
  { codigo: '22101702', descripcion: 'Palas mecánicas para movimiento de tierra', grupo: G.maquinaria },
  { codigo: '22101713', descripcion: 'Brazo de retroexcavadora o secciones del brazo', grupo: G.maquinaria },
  { codigo: '22101714', descripcion: 'Kits de reparación o piezas de apisonadora', grupo: G.maquinaria },
  { codigo: '25181709', descripcion: 'Pala cargadora', grupo: G.maquinaria },
  { codigo: '26111600', descripcion: 'Generadores de potencia', grupo: G.maquinaria },
  { codigo: '26111603', descripcion: 'Generadores eólicos', grupo: G.maquinaria },
  { codigo: '39121013', descripcion: 'Convertidores rotativos eléctricos', grupo: G.maquinaria },
  { codigo: '40151530', descripcion: 'Bombas de dragado', grupo: G.maquinaria },

  // ── Anexo 25.1: servicios ──
  { codigo: '71101710', descripcion: 'Alquiler/leasing de maquinaria y equipo para minería', grupo: G.servicios },
  { codigo: '72141701', descripcion: 'Alquiler/leasing de maquinaria para construcción', grupo: G.servicios },
  { codigo: '72141702', descripcion: 'Alquiler/leasing de equipo para construcción', grupo: G.servicios },
  { codigo: '73121509', descripcion: 'Servicios de purificación de metales', grupo: G.servicios },
  { codigo: '73121613', descripcion: 'Servicios de fundición de metales', grupo: G.servicios },
  { codigo: '73121500', descripcion: 'Procesos de fundición, refinación y formado de metales', grupo: G.servicios },
];

/** Busca la descripción de un código (para mostrar la selección actual). */
export function buscarCodigoProductoSunat(codigo?: string | null): CodigoProductoSunat | null {
  if (!codigo) return null;
  return CATALOGO_CODIGOS_PRODUCTO_SUNAT.find((c) => c.codigo === codigo) ?? null;
}
