export interface EmpresaPermissions {
  canViewUsers: boolean;
  canManageUsers: boolean;
  canViewProducts: boolean;
  canManageProducts: boolean;
  canViewServices: boolean;
  canManageServices: boolean;
  canViewClients: boolean;
  canManageClients: boolean;
  canViewDiscounts: boolean;
  canManageDiscounts: boolean;
  canAssignDiscounts: boolean;
  canViewCotizaciones: boolean;
  canManageCotizaciones: boolean;
  canViewVentas: boolean;
  canManageVentas: boolean;
  canViewDevoluciones: boolean;
  canManageDevoluciones: boolean;
  canViewProveedores: boolean;
  canManageProveedores: boolean;
  canViewCompras: boolean;
  canManageCompras: boolean;
  canApproveOrdenesCompra: boolean;
  canViewCaja: boolean;
  canManageCaja: boolean;
  canManageSedes: boolean;
  canViewReports: boolean;
  canManageInvoices: boolean;
  canManageOrders: boolean;
  canViewStatistics: boolean;
  canManageSettings: boolean;
  canManagePaymentMethods: boolean;
  canChangePlan: boolean;
  canViewEmpleados: boolean;
  canManageEmpleados: boolean;
  canViewAsistencia: boolean;
  canManageAsistencia: boolean;
  canViewPlanilla: boolean;
  canManagePlanilla: boolean;
  canApproveIncidencias: boolean;
  canApprovePlanilla: boolean;
  canViewReportesIncidencia: boolean;
  canManageReportesIncidencia: boolean;
  canViewGastosRecurrentes: boolean;
  canManageGastosRecurrentes: boolean;
  // Caja: el flag manda sobre el rol. Un cajero puede tener `canManageCaja`
  // y aun asi no poder CERRAR: eso lo decide `canCerrarCaja`, no el rol.
  canAbrirCaja: boolean;
  canCerrarCaja: boolean;
  canEditarCostoProducto: boolean;
  /** Dar de alta un producto desde Venta Rápida (granular `producto.alta-rapida-venta`). */
  canAltaRapidaVenta: boolean;
  canEditarPrecioVenta: boolean;
  canDescuentoLibre: boolean;
  /**
   * Ids de botones del dashboard e items del menu que el admin le oculto a
   * este usuario (`UsuarioSedeRol.accesosRapidosOcultos`, consolidado entre
   * sedes por el backend).
   *
   * OCULTA, no prohibe: la ruta se sigue pudiendo alcanzar escribiendola. Lo
   * que impide de verdad son los permisos de arriba.
   */
  accesosRapidosOcultos: string[];
}

export interface EmpresaStatistics {
  totalProductos: number;
  totalServicios: number;
  totalUsuarios: number;
  totalSedes: number;
  totalCotizaciones: number;
  totalProveedores: number;
  ordenesPendientes: number;
  comprobantesMes: number;
  ingresosMes: number;
}

export interface PlanSuscripcion {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  periodo: string;
}

export interface EmpresaInfo {
  id: string;
  nombre: string;
  ruc?: string;
  subdominio?: string;
  logo?: string;
  email?: string;
  telefono?: string;
  web?: string;
  descripcion?: string;
  razonSocial?: string;
  rubro?: string;
  tipoContribuyente?: string;
  estadoContribuyente?: string;
  condicionContribuyente?: string;
  direccionFiscal?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  planSuscripcionId?: string;
  estadoSuscripcion: string;
  fechaInicioSuscripcion?: string;
  fechaVencimiento?: string;
  usuariosActuales: number;
  planSuscripcion?: PlanSuscripcion;
}

export interface UserRoleInfo {
  id: string;
  rol: string;
  isActive: boolean;
  estado: string;
  fechaAprobacion?: string;
}

export type TipoSede = 'OPERATIVA_COMPLETA' | 'SOLO_ALMACEN' | 'PUNTO_VENTA' | 'OFICINA_ADMINISTRATIVA' | 'TALLER_LABORATORIO';

export interface Sede {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  telefono?: string;
  email?: string;
  tipoSede: TipoSede;
  direccion?: string;
  referencia?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  esPrincipal: boolean;
  isActive: boolean;
}

export interface EmpresaContext {
  empresa: EmpresaInfo;
  userRoles: UserRoleInfo[];
  sedes: Sede[];
  permissions: EmpresaPermissions;
  statistics: EmpresaStatistics;
  planLimits?: Record<string, unknown>;
}
