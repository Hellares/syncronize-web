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
      { label: 'Mi Dashboard', href: '/dashboard/vendedor', permission: 'canViewVentas' },
    ],
  },
  {
    label: 'Productos',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    permission: 'canViewProducts',
    items: [
      { label: 'Productos', href: '/dashboard/productos' },
      { label: 'Carga Masiva', href: '/dashboard/productos/bulk', permission: 'canManageProducts' },
      { label: 'Atributos', href: '/dashboard/atributos', permission: 'canManageProducts' },
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
      { label: 'Transferencias', href: '/dashboard/transferencias' },
      { label: 'Alertas de Stock', href: '/dashboard/alertas-stock' },
      { label: 'Inventario Físico', href: '/dashboard/inventario-fisico' },
      { label: 'Merma y Pérdida', href: '/dashboard/merma' },
    ],
  },
  {
    label: 'Operaciones',
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    items: [
      { label: 'Cotizaciones', href: '/dashboard/cotizaciones', permission: 'canViewCotizaciones' },
      { label: 'Ventas', href: '/dashboard/ventas', permission: 'canViewVentas' },
      { label: 'Cola POS', href: '/dashboard/pos', permission: 'canViewVentas' },
      { label: 'Cuentas por Cobrar', href: '/dashboard/cuentas-cobrar', permission: 'canViewVentas' },
      { label: 'Cuentas por Pagar', href: '/dashboard/cuentas-pagar', permission: 'canViewCompras' },
      { label: 'Caja', href: '/dashboard/caja', permission: 'canViewCaja' },
      { label: 'Devoluciones', href: '/dashboard/devoluciones', permission: 'canViewDevoluciones' },
      { label: 'Tipo de Cambio', href: '/dashboard/tipo-cambio', permission: 'canViewVentas' },
      { label: 'Resumen Financiero', href: '/dashboard/resumen-financiero', permission: 'canViewReports' },
    ],
  },
  {
    label: 'Compras',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    permission: 'canViewCompras',
    items: [
      { label: 'Órdenes de Compra', href: '/dashboard/compras' },
      { label: 'Recepciones', href: '/dashboard/recepciones' },
      { label: 'Proveedores', href: '/dashboard/proveedores', permission: 'canViewProveedores' },
      { label: 'Lotes', href: '/dashboard/lotes' },
    ],
  },
  {
    label: 'Recursos Humanos',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    permission: 'canViewEmpleados',
    items: [
      { label: 'Dashboard RRHH', href: '/dashboard/rrhh' },
      { label: 'Empleados', href: '/dashboard/empleados' },
      { label: 'Turnos y Horarios', href: '/dashboard/turnos' },
      { label: 'Asistencia', href: '/dashboard/asistencia', permission: 'canViewAsistencia' },
      { label: 'Planilla', href: '/dashboard/planilla', permission: 'canViewPlanilla' },
      { label: 'Adelantos', href: '/dashboard/adelantos', permission: 'canViewPlanilla' },
    ],
  },
  {
    label: 'Clientes',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    permission: 'canViewClients',
    items: [
      { label: 'Clientes', href: '/dashboard/clientes' },
      { label: 'Servicios', href: '/dashboard/servicios', permission: 'canViewServices' },
      { label: 'Citas', href: '/dashboard/citas', permission: 'canManageOrders' },
    ],
  },
  {
    label: 'Administración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    permission: 'canManageSettings',
    items: [
      { label: 'Perfil de Empresa', href: '/dashboard/empresa' },
      { label: 'Configuración', href: '/dashboard/configuracion' },
      { label: 'Usuarios', href: '/dashboard/usuarios', permission: 'canViewUsers' },
      { label: 'Sedes', href: '/dashboard/sedes', permission: 'canManageSedes' },
      { label: 'Personalización', href: '/dashboard/personalizacion' },
    ],
  },
];
