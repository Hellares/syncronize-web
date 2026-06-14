// Catálogo de plantillas de servicio predefinidas (paridad con
// catalogo_plantillas_servicio.dart de Flutter). NO repiten los campos nativos
// de la orden (equipo/marca/serie/condición/problema); solo campos adicionales.
import type { CatalogoPlantilla } from '@/core/types/servicio-catalogo';

export const CATALOGO_PLANTILLAS: CatalogoPlantilla[] = [
  {
    nombre: 'Reparación de Celulares',
    descripcion: 'Campos adicionales para servicio técnico de celulares: IMEI, patrón de desbloqueo, accesorios y tipo de falla.',
    icon: '📱',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: true, placeholder: 'Ej: Galaxy S24, iPhone 15 Pro', orden: 1 },
      { nombre: 'IMEI', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Número IMEI de 15 dígitos', orden: 2 },
      { nombre: 'Color del equipo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Ej: Negro, Blanco, Azul', orden: 3 },
      { nombre: 'Patrón de desbloqueo', tipoCampo: 'PATRON_DESBLOQUEO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, descripcion: 'Patrón o PIN proporcionado por el cliente', orden: 4 },
      { nombre: 'Accesorios recibidos', tipoCampo: 'CHECKBOX_MULTIPLE', categoria: 'EQUIPO_CLIENTE', esRequerido: false, opciones: ['Cargador', 'Cable USB', 'Audífonos', 'Funda/Case', 'Protector de pantalla', 'Caja original', 'Chip SIM', 'Memoria SD'], orden: 5 },
      { nombre: 'Tipo de falla', tipoCampo: 'OPCION_SIMPLES', categoria: 'DIAGNOSTICO', esRequerido: false, opciones: ['Pantalla rota/dañada', 'No enciende', 'Batería agotada', 'Problemas de carga', 'Falla de software', 'Cámara dañada', 'Altavoz/micrófono', 'Botones no funcionan', 'Mojado/líquido', 'Placa dañada', 'Conector de carga'], permiteOtro: true, orden: 6 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo al momento de recepción', orden: 7 },
      { nombre: 'Componentes a reemplazar', tipoCampo: 'TEXTO_AREA', categoria: 'COMPONENTE', esRequerido: false, placeholder: 'Lista de repuestos necesarios', orden: 8 },
    ],
  },
  {
    nombre: 'Reparación de Laptops',
    descripcion: 'Campos adicionales para laptops/notebooks: contraseña, accesorios, estado de componentes y tipo de falla.',
    icon: '💻',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: true, placeholder: 'Ej: Pavilion 15, ThinkPad X1', orden: 1 },
      { nombre: 'Contraseña del equipo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Contraseña de inicio de sesión', orden: 2 },
      { nombre: 'Incluye cargador', tipoCampo: 'CHECKBOX', categoria: 'EQUIPO_CLIENTE', esRequerido: false, orden: 3 },
      { nombre: 'Accesorios recibidos', tipoCampo: 'CHECKBOX_MULTIPLE', categoria: 'EQUIPO_CLIENTE', esRequerido: false, opciones: ['Cargador', 'Mouse', 'Maletín/Funda', 'Disco externo', 'USB/Pendrive'], orden: 4 },
      { nombre: 'Tipo de falla', tipoCampo: 'OPCION_SIMPLES', categoria: 'DIAGNOSTICO', esRequerido: false, opciones: ['No enciende', 'Pantalla dañada/rota', 'Teclado no funciona', 'Problemas de batería', 'Sobrecalentamiento', 'Lentitud/rendimiento', 'Virus/malware', 'Disco duro dañado', 'Falla de RAM', 'Puerto USB/HDMI dañado', 'Bisagras rotas', 'Problema de red/WiFi', 'Sonido no funciona'], permiteOtro: true, orden: 5 },
      { nombre: 'Estado de componentes', tipoCampo: 'OBJETO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Estado actual de los componentes principales', opciones: [
        { nombre: 'Pantalla', tipo: 'OPCION_SIMPLES', opciones: ['Bueno', 'Regular', 'Malo', 'No aplica'] },
        { nombre: 'Teclado', tipo: 'OPCION_SIMPLES', opciones: ['Bueno', 'Regular', 'Malo', 'No aplica'] },
        { nombre: 'Batería', tipo: 'OPCION_SIMPLES', opciones: ['Bueno', 'Regular', 'Malo', 'No aplica'] },
        { nombre: 'Cargador', tipo: 'OPCION_SIMPLES', opciones: ['Bueno', 'Regular', 'Malo', 'No aplica'] },
        { nombre: 'Disco duro', tipo: 'OPCION_SIMPLES', opciones: ['Bueno', 'Regular', 'Malo', 'No aplica'] },
      ], orden: 6 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo', orden: 7 },
    ],
  },
  {
    nombre: 'Reparación de PCs',
    descripcion: 'Campos adicionales para computadoras de escritorio: contraseña, periféricos, especificaciones y tipo de falla.',
    icon: '🖥️',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Modelo del equipo', orden: 1 },
      { nombre: 'Contraseña del equipo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Contraseña de inicio de sesión', orden: 2 },
      { nombre: 'Periféricos recibidos', tipoCampo: 'CHECKBOX_MULTIPLE', categoria: 'EQUIPO_CLIENTE', esRequerido: false, opciones: ['Monitor', 'Teclado', 'Mouse', 'Cable de poder', 'Cable HDMI/VGA', 'Parlantes', 'Webcam'], orden: 3 },
      { nombre: 'Tipo de falla', tipoCampo: 'OPCION_SIMPLES', categoria: 'DIAGNOSTICO', esRequerido: false, opciones: ['No enciende', 'Pantalla azul/BSOD', 'Lentitud/rendimiento', 'Sobrecalentamiento', 'Ruidos extraños', 'Virus/malware', 'Disco duro dañado', 'Falla de RAM', 'Fuente de poder', 'Tarjeta madre', 'Problema de red', 'No muestra imagen'], permiteOtro: true, orden: 4 },
      { nombre: 'Especificaciones del equipo', tipoCampo: 'OBJETO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Componentes internos identificados', opciones: [
        { nombre: 'Procesador', tipo: 'TEXTO' },
        { nombre: 'RAM', tipo: 'TEXTO' },
        { nombre: 'Disco duro/SSD', tipo: 'TEXTO' },
        { nombre: 'Tarjeta gráfica', tipo: 'TEXTO' },
        { nombre: 'Sistema operativo', tipo: 'TEXTO' },
      ], orden: 5 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo', orden: 6 },
    ],
  },
  {
    nombre: 'Reparación de Tablets',
    descripcion: 'Campos adicionales para tablets/iPads: IMEI, patrón de desbloqueo, accesorios y tipo de falla.',
    icon: '📲',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: true, placeholder: 'Ej: iPad Pro 12.9, Galaxy Tab S9', orden: 1 },
      { nombre: 'IMEI', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Solo si tiene conexión celular', orden: 2 },
      { nombre: 'Patrón de desbloqueo', tipoCampo: 'PATRON_DESBLOQUEO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, descripcion: 'Patrón o PIN proporcionado por el cliente', orden: 3 },
      { nombre: 'Accesorios recibidos', tipoCampo: 'CHECKBOX_MULTIPLE', categoria: 'EQUIPO_CLIENTE', esRequerido: false, opciones: ['Cargador', 'Cable USB', 'Funda/Case', 'Lápiz/Stylus', 'Teclado externo'], orden: 4 },
      { nombre: 'Tipo de falla', tipoCampo: 'OPCION_SIMPLES', categoria: 'DIAGNOSTICO', esRequerido: false, opciones: ['Pantalla rota/dañada', 'No enciende', 'Batería agotada', 'Problemas de carga', 'Falla de software', 'Botones no funcionan', 'Mojado/líquido', 'Conector de carga', 'Cámara dañada', 'Altavoz/micrófono'], permiteOtro: true, orden: 5 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo', orden: 6 },
      { nombre: 'Componentes a reemplazar', tipoCampo: 'TEXTO_AREA', categoria: 'COMPONENTE', esRequerido: false, placeholder: 'Lista de repuestos necesarios', orden: 7 },
    ],
  },
  {
    nombre: 'Reparación de Impresoras',
    descripcion: 'Campos adicionales para impresoras: accesorios y tipo de falla específicos de impresión.',
    icon: '🖨️',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: true, placeholder: 'Modelo de la impresora', orden: 1 },
      { nombre: 'Accesorios recibidos', tipoCampo: 'CHECKBOX_MULTIPLE', categoria: 'EQUIPO_CLIENTE', esRequerido: false, opciones: ['Cable de poder', 'Cable USB', 'Bandeja de papel', 'Cartuchos/Tóner'], orden: 2 },
      { nombre: 'Tipo de falla', tipoCampo: 'OPCION_SIMPLES', categoria: 'DIAGNOSTICO', esRequerido: false, opciones: ['No imprime', 'Atascos de papel', 'Impresión borrosa', 'Rayas en la impresión', 'No reconoce cartuchos', 'Error de conexión', 'Ruidos extraños', 'No enciende', 'Fuga de tinta', 'Escáner no funciona'], permiteOtro: true, orden: 3 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo', orden: 4 },
    ],
  },
  {
    nombre: 'Servicio Técnico General',
    descripcion: 'Plantilla genérica adaptable a cualquier equipo. Solo campos adicionales; ideal como punto de partida para personalizar.',
    icon: '🛠️',
    campos: [
      { nombre: 'Modelo', tipoCampo: 'TEXTO', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Modelo del equipo', orden: 1 },
      { nombre: 'Accesorios recibidos', tipoCampo: 'TEXTO_AREA', categoria: 'EQUIPO_CLIENTE', esRequerido: false, placeholder: 'Lista de accesorios que deja el cliente', orden: 2 },
      { nombre: 'Evidencia fotográfica', tipoCampo: 'ARCHIVO', categoria: 'DIAGNOSTICO', esRequerido: false, descripcion: 'Fotos del estado del equipo', orden: 3 },
      { nombre: 'Componentes/repuestos necesarios', tipoCampo: 'TEXTO_AREA', categoria: 'COMPONENTE', esRequerido: false, placeholder: 'Lista de repuestos necesarios', orden: 4 },
    ],
  },
];
