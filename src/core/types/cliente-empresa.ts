export interface ClienteEmpresa {
  id: string;
  empresaId: string;
  codigo: string;
  razonSocial: string;
  nombreComercial?: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  departamento?: string;
  distrito?: string;
  ubigeo?: string;
  estadoContribuyente?: string;
  condicionContribuyente?: string;
  notas?: string;
  isActive: boolean;
}

export interface CreateClienteEmpresaDto {
  razonSocial: string;
  nombreComercial?: string;
  tipoDocumento?: string;
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  departamento?: string;
  distrito?: string;
  ubigeo?: string;
  estadoContribuyente?: string;
  condicionContribuyente?: string;
}

export interface ConsultaRucResult {
  ruc: string;
  razonSocial: string;
  tipoContribuyente: string;
  estado: string;
  condicion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  direccionCompleta: string;
  ubigeo: string;
}

export interface ConsultaDniResult {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  direccionCompleta: string;
  ubigeo: string;
}
