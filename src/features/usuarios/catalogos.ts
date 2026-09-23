import type { PermisosPorRol, RolUsuario } from '@/core/types/usuario';

/**
 * Catálogos de la ficha de usuario: roles, permisos especiales, elementos
 * ocultables y la configuración estándar de cada rol.
 *
 * 🔴 Son COPIA de los del app, escritos a mano:
 *  - permisos especiales → `syncronize-app/lib/core/utils/granular_permissions_catalog.dart`
 *    (y el del backend, `granular-permissions.catalog.ts`, que RECHAZA con 400
 *    un id que no conozca);
 *  - dashboard → `AccesosRapidosCatalogo` en `accesos_rapidos_section.dart`;
 *  - menú → `syncronize-app/lib/core/utils/menu_drawer_catalogo.dart`;
 *  - presets → `syncronize-app/lib/core/utils/rol_presets.dart`.
 * Al tocar uno allá, tocarlo acá. Los ids son para siempre: renombrar uno le
 * hace reaparecer el elemento a todos los que lo tenían oculto.
 */

/** Permisos efectivos: el mapa de booleanos de `EmpresaPermissions`. */
export type Permisos = Record<string, boolean>;

// ─── Roles ───────────────────────────────────────────────────────────────

/** Mismo orden que el dropdown del app. */
export const ROLES: { value: RolUsuario; label: string }[] = [
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'CONTADOR', label: 'Contador' },
  { value: 'EMPRESA_ADMIN', label: 'Admin Empresa' },
  { value: 'SEDE_ADMIN', label: 'Admin Sede' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'LECTURA', label: 'Solo Lectura' },
  { value: 'REPARTIDOR', label: 'Repartidor' },
];

export function etiquetaRol(rol: string): string {
  return ROLES.find((r) => r.value === rol)?.label ?? rol;
}

const ROLES_SEDE: Record<string, string> = {
  GERENTE_SEDE: 'Gerente de Sede',
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
  VENDEDOR: 'Vendedor',
  ALMACENERO: 'Almacenero',
  TECNICO_SERVICIO: 'Técnico de Servicio',
  REPARTIDOR: 'Repartidor',
  CONTADOR_SEDE: 'Contador',
  ASISTENTE: 'Asistente',
  CONSULTOR: 'Consultor',
  PRACTICANTE: 'Practicante',
};

export function etiquetaRolSede(rol: string): string {
  return ROLES_SEDE[rol] ?? rol;
}

// ─── Permisos especiales (granulares) ────────────────────────────────────

export interface PermisoEspecial {
  id: string;
  label: string;
  description: string;
  category: string;
}

export const PERMISO_CAJA_ABRIR = 'caja.abrir';
export const PERMISO_CAJA_CERRAR = 'caja.cerrar';

/** El orden importa: la ficha los agrupa por categoría en este orden. */
export const PERMISOS_ESPECIALES: PermisoEspecial[] = [
  { id: PERMISO_CAJA_ABRIR, label: 'Abrir caja', description: 'Permite abrir la caja del turno aunque no sea CAJERO/ADMIN.', category: 'Caja' },
  { id: PERMISO_CAJA_CERRAR, label: 'Cerrar caja', description: 'Permite cerrar caja con conteo físico.', category: 'Caja' },
  { id: 'venta.descuento-libre', label: 'Aplicar descuento libre', description: 'Descuentos sin solicitar autorización superior.', category: 'Venta' },
  { id: 'venta.editar-precio', label: 'Editar precio en venta', description: 'Modificar el precio del producto al cobrar.', category: 'Venta' },
  { id: 'producto.editar-costo', label: 'Editar costo de productos', description: 'Modificar el costo registrado del producto.', category: 'Producto' },
  {
    id: 'producto.alta-rapida-venta',
    label: 'Crear productos desde Venta Rápida',
    description: 'Dar de alta un producto sin salir del mostrador, indicando solo nombre, precio de venta y cantidad. No habilita ver ni cargar el costo: la ficha se completa después desde Inventario.',
    category: 'Producto',
  },
  {
    id: 'cotizacion.crear',
    label: 'Crear cotizaciones',
    description: 'Crear cotizaciones y ver las propias sin ser vendedor (pensado para el técnico). Incluye ver el catálogo de productos y registrar al cliente si no existe — no editar ni eliminar los que ya están. No habilita convertirlas en venta ni aprobarlas.',
    category: 'Cotización',
  },
  { id: 'devolucion.crear', label: 'Crear devolución', description: 'Registrar devoluciones sin ser administrador (por defecto solo los admin pueden).', category: 'Devolución' },
];

export function permisosEspecialesPorCategoria(): [string, PermisoEspecial[]][] {
  const grupos = new Map<string, PermisoEspecial[]>();
  for (const p of PERMISOS_ESPECIALES) {
    if (!grupos.has(p.category)) grupos.set(p.category, []);
    grupos.get(p.category)!.push(p);
  }
  return [...grupos.entries()];
}

/** Un id que ya no está en el catálogo se muestra CRUDO: es basura para limpiar. */
export function etiquetaPermisoEspecial(id: string): string {
  return PERMISOS_ESPECIALES.find((p) => p.id === id)?.label ?? id;
}

// ─── Accesos rápidos del dashboard ───────────────────────────────────────

type Regla = (p: Permisos) => boolean;

/** (id, label, cuándo lo ve). Sin prefijo `menu.`. */
export const ACCESOS_RAPIDOS: { id: string; label: string; regla: Regla }[] = [
  { id: 'venta-rapida', label: 'Venta Rápida', regla: (p) => p.canManageVentas },
  { id: 'venta-avanzada', label: 'Venta Avanzada', regla: (p) => p.canManageVentas },
  { id: 'cola-pos', label: 'Cola POS', regla: (p) => p.canViewVentas },
  { id: 'ventas', label: 'Ventas', regla: (p) => p.canViewVentas },
  { id: 'cotizaciones', label: 'Cotizaciones', regla: (p) => p.canViewCotizaciones },
  { id: 'caja', label: 'Caja', regla: (p) => p.canViewCaja },
  { id: 'monitor-cajas', label: 'Monitor Cajas', regla: (p) => p.canViewCaja },
  { id: 'historial-cajas', label: 'Historial de Cajas', regla: (p) => p.canViewCaja },
  { id: 'tesoreria', label: 'Tesorería', regla: (p) => p.canViewReports || p.canViewStatistics },
  { id: 'caja-chica', label: 'Caja Chica', regla: (p) => p.canViewCaja },
  { id: 'cuentas-por-cobrar', label: 'Cuentas por Cobrar', regla: (p) => p.canViewVentas },
  { id: 'finanzas', label: 'Finanzas', regla: (p) => p.canViewReports || p.canViewStatistics },
  { id: 'facturacion', label: 'Facturación', regla: (p) => p.canManageInvoices },
  { id: 'productos', label: 'Productos', regla: (p) => p.canViewProducts },
  { id: 'servicios', label: 'Servicios', regla: (p) => p.canViewServices },
  { id: 'monitor-productos', label: 'Monitor Productos', regla: (p) => p.canViewProducts },
  { id: 'ordenes-servicio', label: 'Órdenes de Servicio', regla: (p) => p.canManageOrders },
  { id: 'flujo-docs', label: 'Flujo de Documentos', regla: (p) => p.canViewVentas },
  { id: 'guias-remision', label: 'Guías de Remisión', regla: (p) => p.canManageInvoices },
  { id: 'sorteos', label: 'Sorteos', regla: (p) => p.canViewVentas },
  { id: 'config', label: 'Configuración', regla: (p) => p.canManageSettings },
];

export const IDS_ACCESOS_RAPIDOS = ACCESOS_RAPIDOS.map((a) => a.id);

// ─── Menú lateral ────────────────────────────────────────────────────────

const ventas: Regla = (p) =>
  p.canViewCotizaciones || p.canViewVentas || p.canViewDevoluciones || p.canViewDiscounts || p.canViewReports;
const servicios: Regla = (p) =>
  p.canViewServices || p.canManageOrders || p.canManageServices || p.canManageSettings;
const tesoreria: Regla = (p) =>
  p.canViewCaja || p.canManageCaja || p.canViewReports || p.canManageSettings;
const facturacion: Regla = (p) => p.canManageInvoices || p.canViewReports;
/** La sección Inventario entera es de quien gestiona productos. */
const inventario: Regla = (p) => p.canManageProducts;

/**
 * Secciones del menú que se pueden ocultar por usuario. Incluye los ids del
 * dashboard que también viven en el menú: tildar uno oculta en los dos lados.
 * Administración y Catálogos quedaron afuera a propósito (ya los cierran los
 * permisos del rol).
 */
export const MENU_OCULTABLE: { seccion: string; items: { id: string; label: string; regla: Regla }[] }[] = [
  {
    seccion: 'Ventas',
    items: [
      { id: 'venta-rapida', label: 'Venta Rápida', regla: (p) => ventas(p) && p.canManageVentas },
      { id: 'venta-avanzada', label: 'Venta Avanzada', regla: (p) => ventas(p) && p.canManageVentas },
      { id: 'cotizaciones', label: 'Cotizaciones', regla: (p) => ventas(p) && p.canViewCotizaciones },
      { id: 'ventas', label: 'Ventas', regla: (p) => ventas(p) && p.canViewVentas },
      { id: 'cola-pos', label: 'Cola POS', regla: (p) => ventas(p) && p.canViewVentas },
      { id: 'menu.ventas.devoluciones', label: 'Devoluciones', regla: (p) => ventas(p) && p.canViewDevoluciones },
      { id: 'menu.ventas.reportes', label: 'Reportes Ventas', regla: (p) => ventas(p) && p.canViewStatistics },
      { id: 'menu.ventas.politicas-descuento', label: 'Políticas de Descuento', regla: (p) => ventas(p) && p.canViewDiscounts },
      { id: 'menu.ventas.tipo-cambio', label: 'Tipo de Cambio', regla: (p) => ventas(p) && p.canViewVentas },
    ],
  },
  {
    seccion: 'Servicios',
    items: [
      { id: 'servicios', label: 'Servicios', regla: (p) => servicios(p) && p.canViewServices },
      { id: 'ordenes-servicio', label: 'Órdenes de Servicio', regla: (p) => servicios(p) && p.canManageOrders },
      { id: 'menu.servicios.citas', label: 'Citas', regla: (p) => servicios(p) && p.canManageOrders },
      { id: 'menu.servicios.historial-cliente', label: 'Historial por Cliente', regla: (p) => servicios(p) && p.canManageOrders },
      { id: 'menu.servicios.plantillas', label: 'Plantillas de Servicio', regla: (p) => servicios(p) && p.canManageServices },
      { id: 'menu.servicios.tercerizacion', label: 'Tercerización B2B', regla: (p) => servicios(p) && p.canManageOrders },
      { id: 'menu.servicios.vinculaciones', label: 'Vinculaciones B2B', regla: (p) => servicios(p) && p.canManageSettings },
    ],
  },
  {
    seccion: 'Tesorería',
    items: [
      { id: 'caja', label: 'Caja', regla: (p) => tesoreria(p) && p.canViewCaja },
      { id: 'monitor-cajas', label: 'Monitor Cajas', regla: (p) => tesoreria(p) && p.canViewCaja },
      { id: 'historial-cajas', label: 'Historial de Cajas', regla: (p) => tesoreria(p) && p.canViewCaja },
      { id: 'tesoreria', label: 'Tesorería', regla: (p) => tesoreria(p) && p.canViewCaja },
      { id: 'menu.tesoreria.consolidado', label: 'Tesorería Consolidado', regla: (p) => tesoreria(p) && p.canViewCaja },
      { id: 'caja-chica', label: 'Caja Chica', regla: (p) => tesoreria(p) && p.canManageCaja },
      { id: 'menu.tesoreria.gastos-recurrentes', label: 'Gastos Recurrentes', regla: (p) => tesoreria(p) && p.canViewGastosRecurrentes },
      { id: 'menu.tesoreria.cuentas-bancarias', label: 'Cuentas Bancarias', regla: (p) => tesoreria(p) && p.canViewReports },
      { id: 'menu.tesoreria.cuentas-recaudacion', label: 'Cuentas de Recaudación', regla: (p) => tesoreria(p) && p.canViewReports },
      { id: 'menu.tesoreria.agentes-bancarios', label: 'Agentes Bancarios', regla: (p) => tesoreria(p) && p.canManageSettings },
      { id: 'cuentas-por-cobrar', label: 'Cuentas por Cobrar', regla: (p) => tesoreria(p) && p.canViewReports },
    ],
  },
  {
    seccion: 'Facturación SUNAT',
    items: [
      { id: 'facturacion', label: 'Monitor Facturación', regla: (p) => facturacion(p) && p.canManageInvoices },
      { id: 'guias-remision', label: 'Guías de Remisión', regla: (p) => facturacion(p) && p.canManageInvoices },
      { id: 'menu.facturacion.catalogos-gre', label: 'Catálogos GRE', regla: (p) => facturacion(p) && p.canManageSettings },
      { id: 'menu.facturacion.anulaciones', label: 'Anulaciones SUNAT', regla: (p) => facturacion(p) && p.canManageSettings },
      { id: 'flujo-docs', label: 'Flujo Documentos', regla: (p) => facturacion(p) && p.canViewVentas },
      { id: 'menu.facturacion.correlativos', label: 'Reporte Correlativos', regla: (p) => facturacion(p) && p.canViewReports },
    ],
  },
  {
    seccion: 'Inventario',
    items: [
      { id: 'menu.inventario.stock-sede', label: 'Stock por Sede', regla: inventario },
      { id: 'menu.inventario.alertas-stock', label: 'Alertas de Stock', regla: inventario },
      { id: 'menu.inventario.transferencias', label: 'Transferencias', regla: inventario },
      { id: 'menu.inventario.incidencias-transferencia', label: 'Incidencias de Transferencia', regla: inventario },
      { id: 'menu.inventario.reportes-incidencia', label: 'Reportes de Incidencia', regla: inventario },
      { id: 'menu.inventario.kardex', label: 'Kardex', regla: inventario },
      { id: 'menu.inventario.produccion', label: 'Producción (lotes fabricados)', regla: inventario },
      { id: 'menu.inventario.abrir-bultos', label: 'Abrir bultos', regla: inventario },
      { id: 'menu.inventario.trazabilidad', label: 'Trazabilidad de producto', regla: inventario },
      { id: 'menu.inventario.inventario-fisico', label: 'Inventario Físico', regla: inventario },
      { id: 'menu.inventario.stock-ubicacion', label: 'Stock por Ubicación', regla: inventario },
      { id: 'menu.inventario.gestion-ubicaciones', label: 'Gestión Ubicaciones', regla: inventario },
      { id: 'menu.inventario.stock-min-max', label: 'Stock Min/Max', regla: inventario },
      { id: 'menu.inventario.merma', label: 'Merma y Pérdida', regla: inventario },
      { id: 'menu.inventario.valorizacion', label: 'Valorización', regla: inventario },
      { id: 'menu.inventario.reorden', label: 'Reorden', regla: inventario },
      { id: 'menu.inventario.rotacion', label: 'Rotación', regla: inventario },
      { id: 'menu.inventario.historial-precios', label: 'Historial de Precios', regla: inventario },
      { id: 'monitor-productos', label: 'Monitor Productos', regla: inventario },
      { id: 'menu.inventario.codigos-barras', label: 'Códigos de Barras', regla: inventario },
    ],
  },
];

/** Etiqueta de un id oculto (dashboard o menú). Desconocido → crudo, a propósito. */
export function etiquetaOculto(id: string): string {
  const acceso = ACCESOS_RAPIDOS.find((a) => a.id === id);
  if (acceso) return acceso.label;
  for (const s of MENU_OCULTABLE) {
    const item = s.items.find((i) => i.id === id);
    if (item) return item.label;
  }
  return id;
}

// ─── Permisos efectivos del rol elegido ──────────────────────────────────

/**
 * Qué va a poder hacer alguien con ese rol y esos permisos especiales: el OR
 * del rol y de cada granular. Null si el backend no conoce el rol (o todavía
 * no llegó la tabla): en ese caso la ficha ofrece todas las casillas.
 *
 * Las reglas NO se copian acá: vienen del backend, que es la única fuente.
 */
export function permisosDelUsuario(
  tabla: PermisosPorRol | null,
  rol: string | null,
  especiales: Iterable<string>,
): Permisos | null {
  if (!tabla || !rol) return null;
  const base = tabla.roles[rol];
  if (!base) return null;
  const efectivos: Permisos = { ...base };
  for (const id of especiales) {
    for (const clave of tabla.granulares[id] ?? []) efectivos[clave] = true;
  }
  return efectivos;
}

// ─── Configuración estándar por rol ──────────────────────────────────────

export interface RolPreset {
  /** Dashboard + menú: terminan juntos en `accesosRapidosOcultos`. */
  ocultos: string[];
  permisosEspeciales: string[];
}

/**
 * 🔴 Solo se oculta lo que el rol REALMENTE ve. Esto OCULTA, no prohíbe.
 * Abrir y cerrar caja ya vienen con el rol CAJERO: no se suman acá.
 */
const PRESETS: Partial<Record<RolUsuario, RolPreset>> = {
  VENDEDOR: {
    ocultos: ['monitor-productos', 'flujo-docs', 'cuentas-por-cobrar', 'menu.ventas.tipo-cambio'],
    permisosEspeciales: [],
  },
  CAJERO: {
    ocultos: [
      'monitor-productos', 'flujo-docs', 'tesoreria', 'sorteos', 'monitor-cajas', 'caja-chica', 'guias-remision',
      'menu.tesoreria.consolidado',
    ],
    permisosEspeciales: [],
  },
  TECNICO: {
    ocultos: ['monitor-productos', 'menu.servicios.plantillas', 'menu.servicios.tercerizacion'],
    permisosEspeciales: [],
  },
  CONTADOR: {
    ocultos: ['venta-rapida', 'venta-avanzada', 'cola-pos', 'caja', 'sorteos'],
    permisosEspeciales: [],
  },
  OPERADOR: { ocultos: ['monitor-productos'], permisosEspeciales: [] },
  LECTURA: { ocultos: ['venta-rapida', 'venta-avanzada', 'cola-pos'], permisosEspeciales: [] },
  REPARTIDOR: { ocultos: ['venta-rapida', 'venta-avanzada', 'cola-pos', 'monitor-productos'], permisosEspeciales: [] },
};

export function presetParaRol(rol: RolUsuario): RolPreset {
  return PRESETS[rol] ?? { ocultos: [], permisosEspeciales: [] };
}

// ─── Etiquetas de los permisos calculados ────────────────────────────────

/**
 * Nombre legible de cada clave de `EmpresaPermissions`, para "Ver permisos".
 * Una clave que no está acá se muestra cruda: es nueva y falta nombrarla.
 */
export const ETIQUETAS_PERMISO: Record<string, string> = {
  canViewUsers: 'Ver usuarios',
  canManageUsers: 'Gestionar usuarios',
  canViewProducts: 'Ver productos',
  canManageProducts: 'Gestionar productos',
  canViewServices: 'Ver servicios',
  canManageServices: 'Gestionar servicios',
  canViewClients: 'Ver clientes',
  canManageClients: 'Gestionar clientes',
  canCrearClientes: 'Registrar clientes',
  canViewDiscounts: 'Ver descuentos',
  canManageDiscounts: 'Gestionar descuentos',
  canAssignDiscounts: 'Asignar descuentos',
  canViewCotizaciones: 'Ver cotizaciones',
  canManageCotizaciones: 'Gestionar cotizaciones',
  canViewVentas: 'Ver ventas',
  canManageVentas: 'Vender',
  canViewDevoluciones: 'Ver devoluciones',
  canManageDevoluciones: 'Gestionar devoluciones',
  canViewProveedores: 'Ver proveedores',
  canManageProveedores: 'Gestionar proveedores',
  canViewCompras: 'Ver compras',
  canManageCompras: 'Gestionar compras',
  canApproveOrdenesCompra: 'Aprobar órdenes de compra',
  canViewCaja: 'Ver caja',
  canManageCaja: 'Operar caja',
  canAbrirCaja: 'Abrir caja',
  canCerrarCaja: 'Cerrar caja',
  canManageSedes: 'Gestionar sedes',
  canViewReports: 'Ver reportes',
  canManageInvoices: 'Facturación electrónica',
  canManageOrders: 'Órdenes de servicio',
  canAsignarTecnico: 'Asignar técnico a una orden',
  canGestionarCostosOrden: 'Costos y adelantos de la orden',
  canViewStatistics: 'Ver estadísticas',
  canManageSettings: 'Configuración de la empresa',
  canManagePaymentMethods: 'Métodos de pago',
  canChangePlan: 'Cambiar el plan',
  canViewEmpleados: 'Ver empleados',
  canManageEmpleados: 'Gestionar empleados',
  canViewAsistencia: 'Ver asistencia',
  canManageAsistencia: 'Gestionar asistencia',
  canViewPlanilla: 'Ver planilla',
  canManagePlanilla: 'Gestionar planilla',
  canApproveIncidencias: 'Aprobar incidencias',
  canApprovePlanilla: 'Aprobar planilla',
  canViewReportesIncidencia: 'Ver reportes de incidencia',
  canManageReportesIncidencia: 'Gestionar reportes de incidencia',
  canViewGastosRecurrentes: 'Ver gastos recurrentes',
  canManageGastosRecurrentes: 'Gestionar gastos recurrentes',
  canEditarCostoProducto: 'Editar el costo de productos',
  canAltaRapidaVenta: 'Crear productos desde Venta Rápida',
  canEditarPrecioVenta: 'Editar precio en la venta',
  canDescuentoLibre: 'Descuento libre',
};
