import { apiClient } from '@/core/api/client';
import type {
  CuentaPorCobrar,
  ResumenCuentasCobrar,
  ConfiguracionMora,
  CuentasCobrarFiltros,
  RegistrarAbonoDto,
  DeudaCliente,
  EstadoCuentaCliente,
  FuenteIngreso,
} from '@/core/types/cuentas-cobrar';

const BASE = '/cuentas-por-cobrar';

/** Registra un abono (endpoint canónico CxC): imputa en cascada mora → interés → principal.
 *  `fuente` decide a dónde ENTRA el dinero (TESORERIA/CAJA/BANCO). */
export async function registrarAbono(ventaId: string, dto: RegistrarAbonoDto): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/${ventaId}/abono`, dto);
  return res.data;
}

/** Anula un abono: revierte el ingreso (caja/banco) y recomputa cuotas */
export async function anularAbono(pagoId: string, motivo?: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/pagos/${pagoId}/anular`, motivo ? { motivo } : {});
  return res.data;
}

/** Deuda agrupada por cliente */
export async function getPorCliente(): Promise<DeudaCliente[]> {
  const res = await apiClient.get(`${BASE}/por-cliente`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

/** Estado de cuenta del cliente (ventas crédito + abonos + saldo) */
export async function getEstadoCuentaCliente(params: { clienteId?: string; clienteEmpresaId?: string }): Promise<EstadoCuentaCliente> {
  const q = new URLSearchParams();
  if (params.clienteId) q.set('clienteId', params.clienteId);
  if (params.clienteEmpresaId) q.set('clienteEmpresaId', params.clienteEmpresaId);
  const res = await apiClient.get(`${BASE}/estado-cuenta-cliente?${q.toString()}`);
  return res.data;
}

export async function getCuentas(filtros: CuentasCobrarFiltros = {}): Promise<CuentaPorCobrar[]> {
  const q = new URLSearchParams();
  if (filtros.estado) q.set('estado', filtros.estado);
  if (filtros.clienteId) q.set('clienteId', filtros.clienteId);
  if (filtros.sedeId) q.set('sedeId', filtros.sedeId);
  if (filtros.search) q.set('search', filtros.search);
  const query = q.toString();
  const res = await apiClient.get(`${BASE}${query ? `?${query}` : ''}`);
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function getResumen(): Promise<ResumenCuentasCobrar> {
  const res = await apiClient.get<ResumenCuentasCobrar>(`${BASE}/resumen`);
  return res.data;
}

export async function getDetalle(ventaId: string): Promise<CuentaPorCobrar & Record<string, unknown>> {
  const res = await apiClient.get(`${BASE}/${ventaId}`);
  return res.data;
}

export async function getConfiguracionMora(): Promise<ConfiguracionMora> {
  const res = await apiClient.get<ConfiguracionMora>(`${BASE}/configuracion-mora`);
  return res.data;
}

export async function updateConfiguracionMora(data: Partial<ConfiguracionMora>): Promise<ConfiguracionMora> {
  const res = await apiClient.patch<ConfiguracionMora>(`${BASE}/configuracion-mora`, data);
  return res.data;
}

// ── Pagos que reportan los clientes desde la tienda web ("Mis compras") ──

export interface ReporteAbonoCliente {
  id: string;
  cliente: string;
  documento: string | null;
  monto: number;
  metodoPago: 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  numeroOperacion: string | null;
  comprobanteUrl: string;
  /** Todas las capturas (un pago en varios Yape). */
  comprobantes: string[];
  empresaBancoId: string | null;
  cuentaReportada: { id: string; nombreBanco: string; numeroCuenta: string } | null;
  /** A qué ventas va y cuánto a cada una (una transferencia puede saldar varias). */
  lineas: { ventaId: string; ventaCodigo: string; monto: number }[];
  /** Sin líneas: el cliente depositó sin decir qué paga; la tienda lo reparte. */
  esDeposito?: boolean;
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  motivoRechazo: string | null;
  creadoEn: string;
  revisadoEn: string | null;
}

export async function getReportesAbono(estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'PENDIENTE'): Promise<ReporteAbonoCliente[]> {
  const res = await apiClient.get(`${BASE}/reportes-abono?estado=${estado}`);
  return Array.isArray(res.data) ? res.data : [];
}

/** Aprueba el pago reportado: registra el abono (entra a `fuente`, y a `bancoId` si es BANCO). */
export async function aprobarReporteAbono(id: string, destino: { fuente: FuenteIngreso; bancoId?: string }): Promise<{ depositoId?: string }> {
  const res = await apiClient.post(`${BASE}/reportes-abono/${id}/aprobar`, destino);
  return res.data;
}

export async function rechazarReporteAbono(id: string, motivo: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/reportes-abono/${id}/rechazar`, { motivo });
  return res.data;
}

// ── Depósitos del cliente sin repartir + saldo a favor ──

/** El cliente: su ficha (persona) o el cliente empresa. Va uno de los dos. */
export interface TitularDeposito {
  clienteId?: string | null;
  clienteEmpresaId?: string | null;
}

export interface DepositoCliente {
  id: string;
  monto: number;
  aplicado: number;
  /** Lo que todavía no se aplicó a ninguna venta. */
  disponible: number;
  metodoPago: string;
  referencia: string | null;
  fuente: FuenteIngreso;
  /** PANEL = lo registró la tienda · TIENDA = lo reportó el cliente. */
  origen: 'PANEL' | 'TIENDA';
  nota: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  fecha: string;
  aplicaciones: { ventaId: string; ventaCodigo: string | null; monto: number; pagoId: string; fecha: string }[];
}

export interface DepositosDeCliente {
  cliente: { nombre: string; clienteId: string | null; clienteEmpresaId: string | null };
  saldoAFavor: number;
  depositos: DepositoCliente[];
}

/** Una venta con deuda y cuánto propone el sistema aplicarle. */
export interface VentaReparto {
  ventaId: string;
  codigo: string;
  fechaVenta: string;
  saldo: number;
  cuotasPendientes: number;
  proximaCuota: { numero: number | null; monto: number; fechaVencimiento: string };
  sugerido: number;
  cuotasCubiertas: number;
}

export interface SugerenciaReparto {
  /** Lo que el cliente ya tenía a favor antes de este depósito. */
  saldoAFavor: number;
  monto: number;
  deuda: number;
  sugerido: number;
  /** Lo que no alcanza para ninguna cuota entera. */
  sobrante: number;
  ventas: VentaReparto[];
}

export interface LineaReparto { ventaId: string; monto: number }

const queryTitular = (t: TitularDeposito) => {
  const q = new URLSearchParams();
  if (t.clienteEmpresaId) q.set('clienteEmpresaId', t.clienteEmpresaId);
  else if (t.clienteId) q.set('clienteId', t.clienteId);
  return q;
};

export async function getDepositosCliente(t: TitularDeposito): Promise<DepositosDeCliente> {
  const res = await apiClient.get(`${BASE}/depositos?${queryTitular(t).toString()}`);
  return res.data;
}

/** Cómo repartir `monto` entre las ventas con deuda: cuotas completas, la que vence primero. */
export async function sugerirRepartoDeposito(t: TitularDeposito, monto: number): Promise<SugerenciaReparto> {
  const q = queryTitular(t);
  q.set('monto', String(monto));
  const res = await apiClient.get(`${BASE}/depositos/sugerencia?${q.toString()}`);
  return res.data;
}

export interface RegistrarDepositoDto extends TitularDeposito {
  monto: number;
  metodoPago: string;
  referencia?: string;
  fuente?: FuenteIngreso;
  bancoId?: string;
  nota?: string;
  /** Repartir en el mismo acto; lo que no se reparta queda a favor. */
  lineas?: LineaReparto[];
}

export async function registrarDepositoCliente(dto: RegistrarDepositoDto): Promise<{ depositoId: string; aplicado: number }> {
  const res = await apiClient.post(`${BASE}/depositos`, dto);
  return res.data;
}

/** Reparte el saldo a favor del cliente entre sus ventas. */
export async function aplicarSaldoAFavor(t: TitularDeposito, lineas: LineaReparto[]): Promise<{ aplicado: number; saldoAFavor: number }> {
  const res = await apiClient.post(`${BASE}/depositos/aplicar`, {
    ...(t.clienteEmpresaId ? { clienteEmpresaId: t.clienteEmpresaId } : { clienteId: t.clienteId }),
    lineas,
  });
  return res.data;
}

/** Solo si no tiene nada repartido: revierte el ingreso. */
export async function anularDepositoCliente(id: string, motivo?: string): Promise<unknown> {
  const res = await apiClient.post(`${BASE}/depositos/${id}/anular`, motivo ? { motivo } : {});
  return res.data;
}
