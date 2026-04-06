import { apiClient } from '@/core/api/client';
import type {
  ClienteEmpresa,
  CreateClienteEmpresaDto,
  ConsultaRucResult,
  ConsultaDniResult,
} from '@/core/types/cliente-empresa';

// Buscar ClienteEmpresa (B2B - RUC)
export async function getClientesEmpresa(empresaId: string, search?: string): Promise<ClienteEmpresa[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', '10');
  const res = await apiClient.get<{ data: ClienteEmpresa[] }>(
    `/empresas/${empresaId}/clientes-empresa?${params.toString()}`,
  );
  return res.data.data;
}

// Buscar personas vinculadas (clientes persona - DNI)
export interface ClientePersona {
  id: string;
  personaId: string;
  dni?: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export async function getClientesPersona(search?: string): Promise<ClientePersona[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', '10');
  const res = await apiClient.get(
    `/clientes?${params.toString()}`,
  );
  console.log('[getClientesPersona] raw response:', res.data);
  const body = res.data as any;
  const list = Array.isArray(body) ? body : (body.data ?? []);
  return list;
}

// Buscar en ambas tablas (unificado)
export async function buscarClientes(empresaId: string, search: string) {
  const [empresas, personas] = await Promise.all([
    getClientesEmpresa(empresaId, search).catch((e) => { console.error('[buscarClientes] Error empresas:', e); return [] as ClienteEmpresa[]; }),
    getClientesPersona(search).catch((e) => { console.error('[buscarClientes] Error personas:', e); return [] as ClientePersona[]; }),
  ]);
  console.log('[buscarClientes]', { empresas: empresas.length, personas: personas.length, search });

  const resultados: Array<{
    id: string;
    tipo: 'empresa' | 'persona';
    nombre: string;
    documento: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  }> = [];

  for (const e of empresas) {
    resultados.push({
      id: e.id,
      tipo: 'empresa',
      nombre: e.razonSocial,
      documento: e.numeroDocumento,
      email: e.email,
      telefono: e.telefono,
      direccion: e.direccion,
    });
  }

  for (const p of personas) {
    resultados.push({
      id: p.id,
      tipo: 'persona',
      nombre: p.nombreCompleto || `${p.nombres} ${p.apellidos}`.trim(),
      documento: p.dni || '',
      email: p.email,
      telefono: p.telefono,
      direccion: p.direccion,
    });
  }

  return resultados;
}

export async function getCliente(empresaId: string, id: string): Promise<ClienteEmpresa> {
  const res = await apiClient.get<ClienteEmpresa>(
    `/empresas/${empresaId}/clientes-empresa/${id}`,
  );
  return res.data;
}

export async function createCliente(
  empresaId: string,
  data: CreateClienteEmpresaDto,
): Promise<ClienteEmpresa> {
  const res = await apiClient.post<ClienteEmpresa>(
    `/empresas/${empresaId}/clientes-empresa`,
    data,
  );
  return res.data;
}

export async function updateCliente(
  empresaId: string,
  id: string,
  data: Partial<CreateClienteEmpresaDto>,
): Promise<ClienteEmpresa> {
  const res = await apiClient.put<ClienteEmpresa>(
    `/empresas/${empresaId}/clientes-empresa/${id}`,
    data,
  );
  return res.data;
}

export async function consultarRuc(ruc: string): Promise<ConsultaRucResult> {
  const res = await apiClient.get<ConsultaRucResult>(`/consultas/ruc/${ruc}`);
  return res.data;
}

export async function consultarDni(dni: string): Promise<ConsultaDniResult> {
  const res = await apiClient.get<ConsultaDniResult>(`/consultas/dni/${dni}`);
  return res.data;
}
