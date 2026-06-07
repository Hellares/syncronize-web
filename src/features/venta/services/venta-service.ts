import { apiClient } from '@/core/api/client';
import type { CrearYCobrarVentaDto, Venta, ClienteResueltoDni, ClienteResueltoRuc } from '@/core/types/venta';

/** POS: crea y cobra la venta en una sola operación (requiere caja abierta).
 *  409 con divergencias[] si los precios difieren del recálculo server (re-sync y reintentar). */
export async function crearYCobrar(data: CrearYCobrarVentaDto): Promise<Venta> {
  const res = await apiClient.post<Venta>('/ventas/cobrar', data);
  return res.data;
}

export async function getVenta(id: string): Promise<Venta> {
  const res = await apiClient.get<Venta>(`/ventas/${id}`);
  return res.data;
}

/** Precio calculado por cantidad (niveles server-side) — producto */
export async function calcularPrecioProducto(productoId: string, cantidad: number, sedeId: string): Promise<{ precioUnitario: number; nivelAplicado?: unknown }> {
  const res = await apiClient.get(`/productos/${productoId}/calcular-precio?cantidad=${cantidad}&sedeId=${sedeId}`);
  return res.data;
}

export async function calcularPrecioVariante(varianteId: string, cantidad: number, sedeId: string): Promise<{ precioUnitario: number; nivelAplicado?: unknown }> {
  const res = await apiClient.get(`/productos/variantes/${varianteId}/calcular-precio?cantidad=${cantidad}&sedeId=${sedeId}`);
  return res.data;
}

// --- Cliente unificado (RENIEC/SUNAT, paridad Flutter) ---

export async function buscarClientePorDni(dni: string): Promise<ClienteResueltoDni> {
  const res = await apiClient.get<ClienteResueltoDni>(`/clientes/por-dni/${dni}`);
  return res.data;
}

export async function buscarClientePorRuc(ruc: string): Promise<ClienteResueltoRuc> {
  const res = await apiClient.get<ClienteResueltoRuc>(`/clientes/por-ruc/${ruc}`);
  return res.data;
}

/** Cliente genérico "CLIENTES VARIOS" (doc 00000000). No válido para FACTURA ni crédito */
export async function obtenerClienteGenerico(): Promise<ClienteResueltoDni> {
  const res = await apiClient.get<ClienteResueltoDni>('/clientes/generico');
  return res.data;
}
