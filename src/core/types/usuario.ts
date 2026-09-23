/**
 * Usuarios (trabajadores) de la empresa — `GET/POST/PATCH /usuarios`.
 *
 * Es el mismo shape que consume el app (`usuario_model.dart`). El backend
 * excluye a los CLIENTE del listado: son otro módulo.
 */

export type RolUsuario =
  | 'VENDEDOR'
  | 'CAJERO'
  | 'TECNICO'
  | 'CONTADOR'
  | 'EMPRESA_ADMIN'
  | 'SEDE_ADMIN'
  | 'SUPER_ADMIN'
  | 'OPERADOR'
  | 'LECTURA'
  | 'REPARTIDOR';

export interface UsuarioSede {
  id: string;
  sedeId: string;
  sedeNombre: string;
  /** `SedeRole`: lo DERIVA el backend del rol de empresa. */
  rol: string;
  puedeAbrirCaja: boolean;
  puedeCerrarCaja: boolean;
  limiteCreditoVenta?: number;
  /** Permisos especiales (catálogo granular). */
  permisos: string[];
  /** Ids del dashboard y del menú (`menu.*`) que el admin le ocultó. */
  accesosRapidosOcultos: string[];
  isActive: boolean;
}

export interface Usuario {
  id: string;
  personaId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  email?: string;
  telefono?: string;
  aliasTicket?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  rolEnEmpresa: RolUsuario;
  rolGlobal?: string;
  /** Activo EN ESTA EMPRESA (vínculo vivo + estado ACTIVO + cuenta activa). */
  isActive: boolean;
  emailVerificado: boolean;
  telefonoVerificado: boolean;
  dniVerificado: boolean;
  requiereCambioPassword: boolean;
  lastLoginAt?: string;
  estado: string;
  registradoPor?: string;
  registradoPorNombre?: string;
  creadoEn: string;
  actualizadoEn: string;
  sedes: UsuarioSede[];
}

export interface UsuariosPaginados {
  data: Usuario[];
  meta: { total: number; page: number; totalPages: number };
}

export type OrdenUsuario = 'nombre_asc' | 'nombre_desc' | 'recientes' | 'antiguos';

export interface UsuarioFiltros {
  page?: number;
  /** El backend topa en 100. */
  limit?: number;
  search?: string;
  /** Sin valor el backend devuelve SOLO activos. */
  isActive?: 'true' | 'false';
  rol?: RolUsuario;
  sedeId?: string;
  orden?: OrdenUsuario;
}

/** Lo que viaja a `POST /usuarios/registrar`. */
export interface RegistrarUsuarioDto {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  rol: RolUsuario;
  sedeIds?: string[];
  puedeAbrirCaja?: boolean;
  puedeCerrarCaja?: boolean;
  limiteCreditoVenta?: number;
  permisos?: string[];
  accesosRapidosOcultos?: string[];
}

/**
 * `PATCH /usuarios/:id`. Todo opcional: lo que no viaja no se toca.
 *
 * 🔴 `permisos` y `accesosRapidosOcultos` se aplican a TODAS las sedes
 * enviadas en `sedeIds` (y las que no van, se dan de baja).
 */
export type ActualizarUsuarioDto = Partial<RegistrarUsuarioDto> & {
  /** `''` borra el alias y el ticket vuelve al nombre completo. */
  aliasTicket?: string;
};

export interface RegistroUsuarioResponse {
  usuario: Usuario;
  yaExistia: boolean;
  yaEraEmpleadoEmpresa: boolean;
  mensaje: string;
}

/** Un permiso calculado y de dónde le viene (`GET /usuarios/:id/permisos`). */
export interface PermisoExplicado {
  clave: string;
  valor: boolean;
  origen: 'rol' | 'especial' | null;
  detalle: string | null;
}

export interface PermisosDeUsuario {
  usuario: { id: string; nombre: string; dni: string | null };
  roles: string[];
  sedes: { sedeId: string; sedeNombre: string; rol: string }[];
  permisos: PermisoExplicado[];
  resumen: { concedidos: number; total: number };
  asignado: { permisosEspeciales: string[] };
  ocultos: { dashboard: string[]; menu: string[] };
}

/**
 * `GET /usuarios/permisos-por-rol`: qué da cada rol por sí solo y qué enciende
 * cada permiso especial. Los efectivos de un usuario son el OR de los dos.
 */
export interface PermisosPorRol {
  roles: Record<string, Record<string, boolean>>;
  granulares: Record<string, string[]>;
}
