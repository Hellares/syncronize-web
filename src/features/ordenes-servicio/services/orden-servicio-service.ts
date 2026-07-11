import { apiClient } from '@/core/api/client';
import type {
  OrdenServicio,
  OrdenesListResponse,
  OrdenesFiltros,
  CreateOrdenServicioDto,
  TransitionEstadoDto,
  HistorialOS,
  OrdenCobrable,
  OrdenServicioComponente,
  TipoComponente,
  Componente,
  FindOrCreateComponenteDto,
  CreateServicioComponenteDto,
  UpdateServicioComponenteDto,
  Tecnico,
  MensajeServicio,
  AdelantoOrden,
  AgregarAdelantoDto,
} from '@/core/types/orden-servicio';

const BASE = '/ordenes-servicio';

export async function getOrdenes(filtros: OrdenesFiltros = {}): Promise<OrdenesListResponse> {
  const q = new URLSearchParams();
  q.set('page', String(filtros.page ?? 1));
  q.set('limit', String(filtros.limit ?? 15));
  if (filtros.search) q.set('search', filtros.search);
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.tipoServicio) q.set('tipoServicio', filtros.tipoServicio);
  if (filtros.prioridad) q.set('prioridad', filtros.prioridad);
  if (filtros.clienteId) q.set('clienteId', filtros.clienteId);
  if (filtros.clienteEmpresaId) q.set('clienteEmpresaId', filtros.clienteEmpresaId);
  if (filtros.tecnicoId) q.set('tecnicoId', filtros.tecnicoId);
  if (filtros.fechaDesde) q.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) q.set('fechaHasta', filtros.fechaHasta);
  const res = await apiClient.get<OrdenesListResponse>(`${BASE}?${q.toString()}`);
  return res.data;
}

export async function getOrden(id: string): Promise<OrdenServicio> {
  const res = await apiClient.get<OrdenServicio>(`${BASE}/${id}`);
  return res.data;
}

export async function crearOrden(data: CreateOrdenServicioDto): Promise<OrdenServicio> {
  const res = await apiClient.post<OrdenServicio>(BASE, data);
  return res.data;
}

export async function actualizarOrden(id: string, data: Partial<CreateOrdenServicioDto>): Promise<OrdenServicio> {
  const res = await apiClient.put<OrdenServicio>(`${BASE}/${id}`, data);
  return res.data;
}

export async function transicionarEstado(id: string, data: TransitionEstadoDto): Promise<OrdenServicio> {
  const res = await apiClient.patch<OrdenServicio>(`${BASE}/${id}/estado`, data);
  return res.data;
}

export async function asignarTecnico(id: string, tecnicoId: string): Promise<OrdenServicio> {
  const res = await apiClient.patch<OrdenServicio>(`${BASE}/${id}/tecnico`, { tecnicoId });
  return res.data;
}

// --- Libro de adelantos (modelo acumulativo: cada abono SUMA, nunca reemplaza) ---

/** Registra un abono (INGRESO en caja con su método; delta a OrdenServicio.adelanto) */
export async function agregarAdelanto(ordenId: string, data: AgregarAdelantoDto): Promise<AdelantoOrden> {
  const res = await apiClient.post(`${BASE}/${ordenId}/adelantos`, data);
  return res.data;
}

/** Anula un abono (EGRESO en caja; resta del total). Los ajustes negativos no se anulan. */
export async function anularAdelanto(ordenId: string, adelantoId: string): Promise<void> {
  await apiClient.patch(`${BASE}/${ordenId}/adelantos/${adelantoId}/anular`);
}

export async function getHistorial(id: string): Promise<HistorialOS[]> {
  const res = await apiClient.get(`${BASE}/${id}/historial`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Órdenes cobrables desde Venta Rápida (REPARADO/LISTO_ENTREGA con saldo ≥ 0 sin venta vinculada). */
export async function getOrdenesCobrables(search?: string): Promise<OrdenCobrable[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiClient.get(`${BASE}/cobrables${q}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

// ── Mensajes (chat orden↔cliente, lado staff: perm MANAGE_ORDERS) ──

/** Lista los mensajes de la orden. El backend marca como leídos los del cliente al consultar. */
export async function getMensajes(ordenId: string): Promise<MensajeServicio[]> {
  const res = await apiClient.get(`${BASE}/${ordenId}/mensajes`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Envía un mensaje como técnico/empresa. */
export async function enviarMensaje(ordenId: string, contenido: string): Promise<MensajeServicio> {
  const res = await apiClient.post<MensajeServicio>(`${BASE}/${ordenId}/mensajes`, { contenido });
  return res.data;
}

/** Cuenta mensajes del cliente sin leer (badge), sin marcarlos leídos. */
export async function contarMensajesNoLeidos(ordenId: string): Promise<number> {
  const res = await apiClient.get(`${BASE}/${ordenId}/mensajes/no-leidos`);
  return Number((res.data as { count?: number })?.count ?? 0);
}

// ── Componentes de la orden ──

export async function addComponente(ordenId: string, data: CreateServicioComponenteDto): Promise<OrdenServicioComponente> {
  const res = await apiClient.post<OrdenServicioComponente>(`${BASE}/${ordenId}/componentes`, data);
  return res.data;
}

/** Edita la acción/costos de un componente ya agregado (DTO parcial; null limpia). */
export async function updateComponente(ordenId: string, componenteId: string, data: UpdateServicioComponenteDto): Promise<OrdenServicioComponente> {
  const res = await apiClient.patch<OrdenServicioComponente>(`${BASE}/${ordenId}/componentes/${componenteId}`, data);
  return res.data;
}

export async function deleteComponente(ordenId: string, componenteId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${ordenId}/componentes/${componenteId}`);
}

export async function getTiposComponente(): Promise<TipoComponente[]> {
  const res = await apiClient.get('/tipos-componente');
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export type CategoriaComponente = 'HARDWARE' | 'SOFTWARE' | 'PERIFERICO' | 'ACCESORIOS' | 'CONSUMIBLES';

/** Crea un tipo de componente al vuelo (cuando no existe en el catálogo). */
export async function crearTipoComponente(data: { nombre: string; categoria: CategoriaComponente; descripcion?: string }): Promise<TipoComponente> {
  const res = await apiClient.post<TipoComponente>('/tipos-componente', data);
  return res.data;
}

/** Marcas existentes para un tipo (sugerencias del input de marca). */
export async function getMarcasComponente(tipoComponenteId: string): Promise<string[]> {
  const res = await apiClient.get(`/componentes/marcas?tipoComponenteId=${encodeURIComponent(tipoComponenteId)}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Modelos existentes para un tipo + marca (sugerencias del input de modelo). */
export async function getModelosComponente(tipoComponenteId: string, marca: string): Promise<string[]> {
  const res = await apiClient.get(`/componentes/modelos?tipoComponenteId=${encodeURIComponent(tipoComponenteId)}&marca=${encodeURIComponent(marca)}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Lista los componentes ya registrados de un tipo (para reutilizar y no duplicar). */
export async function getComponentes(tipoComponenteId: string, search?: string): Promise<Componente[]> {
  const q = new URLSearchParams({ tipoComponenteId, limit: '100' });
  if (search?.trim()) q.set('search', search.trim());
  const res = await apiClient.get(`/componentes?${q.toString()}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Busca o crea el componente físico (tipo + marca + modelo) y devuelve su id. */
export async function findOrCreateComponente(data: FindOrCreateComponenteDto): Promise<{ id: string; [key: string]: unknown }> {
  const res = await apiClient.post('/componentes/find-or-create', data);
  return res.data;
}

// ── Técnicos (usuarios de la empresa) ──

export async function getTecnicos(): Promise<Tecnico[]> {
  const res = await apiClient.get('/usuarios?limit=200');
  const body = res.data as { data?: unknown[] } | unknown[];
  const list = (Array.isArray(body) ? body : body.data ?? []) as Array<Record<string, unknown>>;
  return list.map((u) => {
    const persona = u.persona as { nombres?: string; apellidos?: string } | undefined;
    const nombre = persona
      ? [persona.nombres, persona.apellidos].filter(Boolean).join(' ')
      : [u.nombres, u.apellidos].filter(Boolean).join(' ') || String(u.email ?? u.id);
    return { id: String(u.id), nombre, rol: (u.rol ?? u.rolGlobal) as string | undefined };
  });
}
