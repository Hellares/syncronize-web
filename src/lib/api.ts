const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3000/api';

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 15 }, // Cache por 15 segundos
  });

  if (!res.ok) {
    const error = new Error(`API error: ${res.status}`) as any;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

// ─── Marketplace API ───

export async function getEmpresaBySubdominio(subdominio: string) {
  return fetchApi(`/marketplace/empresas/${subdominio}`);
}

export async function getProductosByEmpresa(
  subdominio: string,
  params?: { page?: number; limit?: number; search?: string },
) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  return fetchApi(`/marketplace/empresas/${subdominio}/productos${qs ? `?${qs}` : ''}`);
}

export async function getProductoDetalle(id: string) {
  return fetchApi(`/marketplace/productos/${id}`);
}

export async function getPreguntasProducto(productoId: string, page = 1, limit = 10) {
  return fetchApi(`/marketplace/productos/${productoId}/preguntas?page=${page}&limit=${limit}`);
}

export async function getOpinionesProducto(productoId: string, page = 1, limit = 10) {
  return fetchApi(`/marketplace/productos/${productoId}/opiniones?page=${page}&limit=${limit}`);
}

export async function getServiciosByEmpresa(subdominio: string) {
  return fetchApi(`/marketplace/empresas/${subdominio}/servicios?limit=10`);
}
