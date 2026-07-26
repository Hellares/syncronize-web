import { apiClient } from '@/core/api/client';
import type { VentaDeliveryLocal } from '@/core/types/venta';

// Los DTOs de delivery exigen empresaId en el BODY (gotcha create del proyecto).

export interface SolicitarDeliveryDto {
  empresaId: string;
  ventaId: string;
  /** Default: nombre del cliente de la venta */
  destinatarioNombre?: string;
  /** Default: teléfono del cliente de la venta */
  destinatarioCelular?: string;
  direccion: string;
  referencia?: string;
  distrito?: string;
  /** Tarifa que cobra el repartidor al entregar. Vacía = tarifa de la sede */
  costoDelivery?: number;
  /** Interno: lo lleva un empleado — no se publica al pool */
  esInterno?: boolean;
  encargadoInterno?: string;
}

export interface ActualizarDireccionDto {
  empresaId: string;
  direccion: string;
  referencia?: string;
  distrito?: string;
}

/** Publica el delivery (venta PAGADA_COMPLETA) — push a repartidores salvo interno. */
export async function solicitarDelivery(dto: SolicitarDeliveryDto): Promise<VentaDeliveryLocal> {
  const res = await apiClient.post('/delivery-local/solicitar', dto);
  return res.data;
}

/** Corrige la dirección de entrega; sin pin nuevo el anterior se descarta. */
export async function actualizarDireccion(deliveryId: string, dto: ActualizarDireccionDto): Promise<VentaDeliveryLocal> {
  const res = await apiClient.patch(`/delivery-local/${deliveryId}/direccion`, dto);
  return res.data;
}

export async function cancelarDelivery(deliveryId: string, data: { empresaId: string; motivo?: string }): Promise<void> {
  await apiClient.post(`/delivery-local/${deliveryId}/cancelar`, data);
}

/** Interno (staff avanza estados, sin PIN): SOLICITADO → EN_CAMINO → ENTREGADO */
export async function internoEnCamino(deliveryId: string, empresaId: string): Promise<void> {
  await apiClient.post(`/delivery-local/${deliveryId}/interno/en-camino`, { empresaId });
}

export async function internoEntregado(deliveryId: string, empresaId: string): Promise<void> {
  await apiClient.post(`/delivery-local/${deliveryId}/interno/entregado`, { empresaId });
}

/** Manda el pin de entrega por WhatsApp (instancia de la empresa) a un celular. */
export async function compartirUbicacion(deliveryId: string, data: { empresaId: string; celular: string }): Promise<void> {
  await apiClient.post(`/delivery-local/${deliveryId}/compartir-ubicacion`, data);
}
