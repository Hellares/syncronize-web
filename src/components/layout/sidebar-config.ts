import type { EmpresaPermissions } from '@/core/types/empresa';

export interface SidebarItem {
  label: string;
  href: string;
  icon?: string;
  permission?: keyof EmpresaPermissions;
}

export interface SidebarSection {
  label: string;
  icon: string;
  permission?: keyof EmpresaPermissions;
  items: SidebarItem[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    label: 'Productos',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    permission: 'canViewProducts',
    items: [
      { label: 'Productos', href: '/dashboard/productos' },
      { label: 'Combos', href: '/dashboard/combos' },
      { label: 'Carga Masiva', href: '/dashboard/productos/bulk', permission: 'canManageProducts' },
      { label: 'Atributos', href: '/dashboard/atributos', permission: 'canManageProducts' },
      { label: 'Compatibilidad', href: '/dashboard/compatibilidad', permission: 'canManageProducts' },
      { label: 'Config. Precios', href: '/dashboard/configuraciones-precio', permission: 'canManageProducts' },
      { label: 'Categorías', href: '/dashboard/categorias' },
      { label: 'Marcas', href: '/dashboard/marcas' },
      { label: 'Unidades de Medida', href: '/dashboard/unidades' },
    ],
  },
  {
    label: 'Inventario',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    permission: 'canViewProducts',
    items: [
      { label: 'Stock por Sede', href: '/dashboard/stock' },
      { label: 'Monitor de Productos', href: '/dashboard/monitor-productos' },
      { label: 'Transferencias', href: '/dashboard/transferencias' },
      { label: 'Incidencias', href: '/dashboard/transferencias/incidencias' },
      { label: 'Alertas de Stock', href: '/dashboard/alertas-stock' },
      { label: 'Inventario Físico', href: '/dashboard/inventarios' },
      { label: 'Merma y Pérdida', href: '/dashboard/merma' },
      { label: 'Liquidaciones', href: '/dashboard/liquidaciones' },
      { label: 'Producción', href: '/dashboard/produccion' },
      { label: 'Trazabilidad', href: '/dashboard/trazabilidad' },
      { label: 'Reportes de Inventario', href: '/dashboard/reportes-inventario' },
      { label: 'Historial de Precios', href: '/dashboard/historial-precios' },
      { label: 'Verificación de Precios', href: '/dashboard/verificacion-precios' },
      { label: 'Ajuste Masivo de Precios', href: '/dashboard/ajuste-precios', permission: 'canManageProducts' },
    ],
  },
  {
    label: 'Operaciones',
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    items: [
      { label: 'Venta Rápida', href: '/dashboard/venta-rapida', permission: 'canViewVentas' },
      { label: 'Mi Caja', href: '/dashboard/caja', permission: 'canViewCaja' },
      { label: 'Monitor de Cajas', href: '/dashboard/caja/monitor', permission: 'canViewCaja' },
      { label: 'Historial de Cajas', href: '/dashboard/caja/historial', permission: 'canViewCaja' },
      { label: 'Tesorería', href: '/dashboard/tesoreria', permission: 'canViewCaja' },
      { label: 'Cotizaciones', href: '/dashboard/cotizaciones', permission: 'canViewCotizaciones' },
      { label: 'Ventas', href: '/dashboard/ventas', permission: 'canViewVentas' },
      { label: 'Cola POS', href: '/dashboard/pos', permission: 'canViewVentas' },
      { label: 'Cuentas por Cobrar', href: '/dashboard/cuentas-cobrar', permission: 'canViewVentas' },
      { label: 'Cuentas por Pagar', href: '/dashboard/cuentas-pagar', permission: 'canViewCompras' },
      { label: 'Devoluciones', href: '/dashboard/devoluciones', permission: 'canViewDevoluciones' },
      { label: 'Reportes de Ventas', href: '/dashboard/reportes-ventas', permission: 'canViewVentas' },
      { label: 'Resumen Financiero', href: '/dashboard/resumen-financiero', permission: 'canViewReports' },
    ],
  },
  {
    label: 'Compras',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    permission: 'canViewCompras',
    items: [
      { label: 'Compras', href: '/dashboard/compras' },
      { label: 'Órdenes de Compra', href: '/dashboard/ordenes-compra' },
      { label: 'Proveedores', href: '/dashboard/proveedores', permission: 'canViewProveedores' },
    ],
  },
  {
    label: 'Facturación',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    permission: 'canManageInvoices',
    items: [
      { label: 'Comprobantes', href: '/dashboard/facturacion' },
      { label: 'Correlativos', href: '/dashboard/facturacion/correlativos' },
      { label: 'Configuración', href: '/dashboard/facturacion/configuracion' },
    ],
  },
  // NOTA: la sección RRHH se retiró del sidebar — sus páginas no existen aún en la web
  // (rrhh/empleados/turnos/asistencia/planilla/adelantos viven solo en la app Flutter).
  {
    label: 'Clientes',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    permission: 'canViewClients',
    items: [
      { label: 'Clientes', href: '/dashboard/clientes' },
      { label: 'Políticas VIP', href: '/dashboard/politicas-vip', permission: 'canViewDiscounts' },
      { label: 'Servicios', href: '/dashboard/servicios', permission: 'canViewServices' },
      { label: 'Catálogo de Servicios', href: '/dashboard/catalogo-servicios', permission: 'canViewServices' },
      { label: 'Campos de Servicio', href: '/dashboard/campos-servicio', permission: 'canViewServices' },
      { label: 'Plantillas de Servicio', href: '/dashboard/plantillas-servicio', permission: 'canViewServices' },
      { label: 'Tercerización B2B', href: '/dashboard/tercerizacion', permission: 'canManageOrders' },
    ],
  },
  {
    label: 'Administración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    permission: 'canManageSettings',
    items: [
      // Perfil/Configuración/Usuarios/Sedes/Personalización: páginas aún no construidas en web
      { label: 'Integración Yape', href: '/dashboard/integraciones/yape' },
    ],
  },
];

/**
 * Accesos rápidos de la cabecera.
 *
 * Son las tres pantallas del día a día del mostrador: entrar por el menú
 * —abrirlo, buscar la sección, bajar hasta el ítem— cuesta demasiado para algo
 * que se usa decenas de veces al día. Salen de la misma lista que el menú
 * (mismos href y mismos permisos) para que no puedan decir cosas distintas.
 */
export const ACCESOS_RAPIDOS: SidebarItem[] = [
  {
    label: 'Venta Rápida',
    href: '/dashboard/venta-rapida',
    permission: 'canViewVentas',
    icon: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  },
  {
    label: 'Ventas',
    href: '/dashboard/ventas',
    permission: 'canViewVentas',
    icon: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM9 8h6M9 12h6',
  },
  {
    label: 'Cotizaciones',
    href: '/dashboard/cotizaciones',
    permission: 'canViewCotizaciones',
    icon: 'M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4v2h6V4M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4',
  },
];
