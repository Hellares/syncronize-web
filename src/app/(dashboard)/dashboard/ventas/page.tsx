'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Venta, EstadoVenta, CanalVenta, TipoEntregaFiltro } from '@/core/types/venta';
import { ESTADO_VENTA_CONFIG, tieneDeliveryActivo } from '@/core/types/venta';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { Emisor } from '@/core/types/facturacion';
import * as ventaService from '@/features/venta/services/venta-service';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const ESTADOS: Array<{ value: EstadoVenta | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'PAGADA_PARCIAL', label: 'Pago parcial' },
  { value: 'PAGADA_COMPLETA', label: 'Pagada' },
  { value: 'ANULADA', label: 'Anulada' },
  { value: 'BORRADOR', label: 'Borrador' },
];

const CANALES: Array<{ value: CanalVenta | ''; label: string }> = [
  { value: '', label: 'Todos los canales' },
  { value: 'POS', label: 'Mostrador' },
  { value: 'ONLINE', label: 'Marketplace' },
  { value: 'WHATSAPP_IA', label: 'Agente IA (WhatsApp)' },
  { value: 'COTIZACION', label: 'Cotización' },
];

const ENTREGAS: Array<{ value: TipoEntregaFiltro | ''; label: string }> = [
  { value: '', label: 'Toda entrega' },
  { value: 'ENVIO', label: '🚚 Envío agencia' },
  { value: 'DELIVERY', label: '🛵 Delivery' },
  { value: 'RECOJO', label: '🏬 Recoge en tienda' },
  { value: 'FISICA', label: 'Venta física' },
];

/** Prefijo del chip de comprobante (paridad Flutter _ComprobanteChip) */
const CHIP_COMPROBANTE: Record<string, string> = {
  FACTURA: 'FEL', BOLETA: 'BEL', NOTA_CREDITO: 'NCE', NOTA_DEBITO: 'NDE',
};

function sunatDotColor(status?: string | null): string {
  if (status === 'ACEPTADO') return 'bg-green-500';
  if (status === 'RECHAZADO') return 'bg-red-500';
  return 'bg-amber-400';
}

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Atajos de fecha (paridad Flutter: Hoy/Ayer/Semana/Mes) */
function rangoAtajo(atajo: string): { desde: string; hasta: string } {
  const hoy = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  switch (atajo) {
    case 'hoy': return { desde: d(hoy), hasta: d(hoy) };
    case 'ayer': { const a = new Date(hoy); a.setDate(a.getDate() - 1); return { desde: d(a), hasta: d(a) }; }
    case 'semana': { const s = new Date(hoy); s.setDate(s.getDate() - s.getDay() + 1); return { desde: d(s), hasta: d(hoy) }; }
    case 'mes': { const m = new Date(hoy.getFullYear(), hoy.getMonth(), 1); return { desde: d(m), hasta: d(hoy) }; }
    default: return { desde: '', hasta: '' };
  }
}

export default function VentasPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<EstadoVenta | ''>('');
  const [canal, setCanal] = useState<CanalVenta | ''>('');
  const [sedeId, setSedeId] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntregaFiltro | ''>('');
  const [entregaBusqueda, setEntregaBusqueda] = useState('');
  const [rucEmisor, setRucEmisor] = useState('');
  const [emisores, setEmisores] = useState<Emisor[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [atajo, setAtajo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entregaDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emisores (multi-RUC): el filtro solo aparece con 2+
  useEffect(() => {
    facturacionService.getEmisores().then(setEmisores).catch(() => setEmisores([]));
  }, []);

  const fetch = useCallback(async (q?: string, eb?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ventaService.getVentas({
        search: (q ?? search) || undefined,
        estado: estado || undefined,
        canalVenta: canal || undefined,
        sedeId: sedeId || undefined,
        tipoEntrega: tipoEntrega || undefined,
        entregaBusqueda: (eb ?? entregaBusqueda) || undefined,
        rucEmisor: rucEmisor || undefined,
        // Backend espera datetime: día completo local (paridad DateFormatter start/endOfDay)
        fechaDesde: fechaDesde ? new Date(`${fechaDesde}T00:00:00`).toISOString() : undefined,
        fechaHasta: fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).toISOString() : undefined,
      });
      setVentas(data);
    } catch {
      setError('Error al cargar las ventas');
    } finally {
      setIsLoading(false);
    }
  }, [search, estado, canal, sedeId, tipoEntrega, entregaBusqueda, rucEmisor, fechaDesde, fechaHasta]);

  // Refetch al cambiar filtros (search y entregaBusqueda van con debounce propio)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [estado, canal, sedeId, tipoEntrega, rucEmisor, fechaDesde, fechaHasta]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch(q), 400);
  };

  const handleEntregaBusqueda = (q: string) => {
    setEntregaBusqueda(q);
    if (entregaDebRef.current) clearTimeout(entregaDebRef.current);
    entregaDebRef.current = setTimeout(() => fetch(undefined, q), 400);
  };

  const aplicarAtajo = (a: string) => {
    setAtajo(a);
    const { desde, hasta } = rangoAtajo(a);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  // Totales de lo visible (sin anuladas)
  const totalVisible = ventas.filter(v => v.estado !== 'ANULADA').reduce((a, v) => a + Number(v.total ?? 0), 0);

  // "Mis ventas": rol limitado (server filtra; aviso UI paridad Flutter)
  const esVistaLimitada = permissions.canViewVentas && !permissions.canManageUsers && !permissions.canManageSettings;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando...' : `${ventas.length} ventas · ${fmt(totalVisible)}`}
            {esVistaLimitada && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Mostrando solo tus ventas</span>}
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/venta-rapida')}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
          + Venta Rápida
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por código, cliente o documento..." />
        </div>
        <select value={estado} onChange={e => setEstado(e.target.value as EstadoVenta | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={canal} onChange={e => setCanal(e.target.value as CanalVenta | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
          {CANALES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={tipoEntrega} onChange={e => setTipoEntrega(e.target.value as TipoEntregaFiltro | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
          {ENTREGAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(tipoEntrega === 'ENVIO' || tipoEntrega === 'DELIVERY' || tipoEntrega === '') && (
          <input
            className="w-44 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
            value={entregaBusqueda} onChange={e => handleEntregaBusqueda(e.target.value)}
            placeholder={tipoEntrega === 'DELIVERY' ? 'Dirección o distrito...' : tipoEntrega === 'ENVIO' ? 'Agencia o destino...' : 'Agencia, dirección, destino...'} />
        )}
        {emisores.length >= 2 && (
          <select value={rucEmisor} onChange={e => setRucEmisor(e.target.value)}
            className="rounded-lg border border-teal-200 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 text-teal-800">
            <option value="">Todos los emisores</option>
            {emisores.map(em => <option key={em.ruc} value={em.ruc}>{em.razonSocial} ({em.ruc})</option>)}
            <option value="SIN_COMPROBANTE">Ticket sin comprobante</option>
          </select>
        )}
        <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setAtajo(''); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
        <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setAtajo(''); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]" />
      </div>

      {/* Atajos de fecha */}
      <div className="flex flex-wrap gap-1.5">
        {[['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['mes', 'Este mes']].map(([k, lbl]) => (
          <button key={k} onClick={() => aplicarAtajo(k)}
            className={`rounded-full border px-3 py-1 text-xs ${atajo === k ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {lbl}
          </button>
        ))}
        {(fechaDesde || fechaHasta) && (
          <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setAtajo(''); }}
            className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50">
            ✕ Limpiar fechas
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : ventas.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🧾</p><p className="text-gray-400">Sin ventas con estos filtros</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5 hidden lg:table-cell">Vendedor</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Comprobante</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ventas.map(v => {
                const cfg = ESTADO_VENTA_CONFIG[(v.estado ?? '') as EstadoVenta];
                return (
                  <tr key={v.id} onClick={() => router.push(`/dashboard/ventas/${v.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-medium text-gray-900">{v.codigo}</span>
                      {(v.ordenesServicio ?? []).map(os => (
                        <span key={os.codigo} className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] text-blue-700">{os.codigo}</span>
                      ))}
                      {v.cotizacionCodigo && <span className="ml-1 rounded bg-teal-100 px-1 py-0.5 text-[9px] text-teal-700">{v.cotizacionCodigo}</span>}
                      {/* Delivery manda sobre el chip de envío (paridad card Flutter) */}
                      {tieneDeliveryActivo(v) ? (
                        <span className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold ${v.deliveryLocal!.estado === 'ENTREGADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                          title={[v.deliveryLocal?.direccion, v.deliveryLocal?.distrito].filter(Boolean).join(' — ') || 'Delivery local'}>
                          🛵 {v.deliveryLocal!.estado === 'ENTREGADO' ? 'Delivery ✓' : v.deliveryLocal!.estado === 'EN_CAMINO' ? 'Delivery · EN CAMINO' : 'Delivery'}
                        </span>
                      ) : v.conEnvio ? (
                        <span className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold ${v.envio?.rotuloImpresoEn ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-500'}`}
                          title={[v.envio?.rotuloImpresoEn ? 'Rótulo impreso' : 'Rótulo pendiente', v.envio?.agenciaNombre, [v.envio?.destinoDepartamento, v.envio?.destinoProvincia].filter(Boolean).join(' / ')].filter(Boolean).join(' — ')}>
                          🚚 {v.envio?.rotuloImpresoEn ? 'Envío · IMP' : 'Envío'}
                        </span>
                      ) : (v.canalVenta === 'ONLINE' || v.canalVenta === 'WHATSAPP_IA') ? (
                        <span className="ml-1 rounded bg-cyan-50 px-1 py-0.5 text-[9px] font-semibold text-cyan-700" title="Recoge en tienda (venta remota sin envío ni delivery)">
                          🏬 Recojo
                        </span>
                      ) : null}
                      {v.canalVenta === 'ONLINE' && (
                        <span className="ml-1 rounded bg-teal-100 px-1 py-0.5 text-[9px] font-semibold text-teal-700">Marketplace</span>
                      )}
                      {v.canalVenta === 'WHATSAPP_IA' && (
                        <span className="ml-1 rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-700">🤖 Agente IA</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtFecha(v.fechaVenta ?? v.creadoEn)}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-800 truncate max-w-[180px]">{v.nombreCliente ?? '—'}</p>
                      {v.documentoCliente && <p className="text-[10px] text-gray-400">{v.documentoCliente}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{(v.vendedorAlias || v.vendedorNombre) ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {v.codigoComprobante ? (
                        // Chip BEL:/FEL: con punto de color por estado SUNAT (paridad app)
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5"
                          title={`SUNAT: ${v.comprobanteSunatStatus ?? 'sin estado'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sunatDotColor(v.comprobanteSunatStatus)}`} />
                          <span className="font-mono text-[10px] font-medium text-gray-700">
                            {CHIP_COMPROBANTE[v.tipoComprobante ?? ''] ?? 'CPE'}: {v.codigoComprobante}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">{v.tipoComprobante ?? 'TICKET'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-sm font-bold ${v.estado === 'ANULADA' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{fmt(v.total)}</span>
                      {(v.metodoPago) && <p className="text-[9px] text-gray-400">{METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago}{v.esCredito ? ' · Crédito' : ''}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg?.color ?? 'text-gray-600'} ${cfg?.bg ?? 'bg-gray-100'}`}>
                        {cfg?.label ?? v.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
