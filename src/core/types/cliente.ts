// Clientes persona (B2C / DNI) — alineado con backend /clientes.
// Para clientes empresa (B2B / RUC) ver cliente-empresa.ts + cliente-service.ts.

export type OrdenCliente = 'nombre_asc' | 'nombre_desc' | 'recientes' | 'antiguos';

export interface ClientePersona {
  id: string; // EmpresaPersona ID
  personaId: string;
  usuarioId?: string | null;
  dni?: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  isActive: boolean;
  estado?: string;
  emailVerificado?: boolean;
  telefonoVerificado?: boolean;
  dniVerificado?: boolean;
  yaExistiaEnSistema?: boolean;
  registradoPor?: string | null;
  registradoPorNombre?: string | null;
  fechaRegistro?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  [key: string]: unknown;
}

export interface CreateClienteDto {
  dni: string;          // 8 dígitos
  nombres: string;
  apellidos: string;
  telefono: string;     // 9 dígitos
  email?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  notas?: string;
}

export interface UpdateClienteDto {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  notas?: string;
  isActive?: boolean;
}

export interface RegistroClienteResponse {
  cliente: ClientePersona;
  yaExistia: boolean;
  yaEraClienteEmpresa: boolean;
  mensaje: string;
}

export interface ClientesFiltros {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  orden?: OrdenCliente;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}
