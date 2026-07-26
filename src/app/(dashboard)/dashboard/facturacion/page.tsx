'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type {
  ComprobanteItem,
  TipoComprobante,
  SunatStatus,
  Emisor,
} from '@/core/types/facturacion';
import {
  TIPO_COMPROBANTE_LABEL,
  SUNAT_STATUS_CONFIG,
  PROVEEDOR_ARCHIVADO,
} from '@/core/types/facturacion';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import CrearNotaDialog from '@/features/facturacion/components/CrearNotaDialog';
import AnularComprobanteDialog from '@/features/facturacion/components/AnularComprobanteDialog';

const TIPOS: Array<{ value: TipoComprobante | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'BOLETA', label: 'Boletas' },
  { value: 'FACTURA', label: 'Facturas' },
  { value: 'NOTA_CREDITO', label: 'N. Crédito' },
  { value: 'NOTA_DEBITO', label: 'N. Débito' },
];

const ESTADOS: Array<{ value: SunatStatus | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'ACEPTADO', label: 'Aceptado' },
  { value: 'PROCESANDO', label: 'Procesando' },
  { value: 'PENDIENTE', label: 'Sin enviar' },
  { value: 'ERROR_COMUNICACION', label: 'Error' },
  { value: 'RECHAZADO', label: 'Rechazado' },
];

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

const LIMIT = 20;

export default function MonitorFacturacionPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageInvoices || permissions.canManageSettings;

  const [items, setItems] = useState<ComprobanteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');
  const [bulkBusy, setBulkBusy] = useState<'enviar' | 'consultar' | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoComprobante | ''>('');
  const [estado, setEstado] = useState<SunatStatus | ''>('');
  const [rucEmisor, setRucEmisor] = useState('');
  const [emisores, setEmisores] = useState<Emisor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-RUC: chips de emisor solo con 2+ emisores
  useEffect(() => {
    facturacionService.getEmisores().then(setEmisores).catch(() => setEmisores([]));
  }, []);
  const multiEmisor = emisores.length >= 2;
  const razonPorRuc = useMemo(
    () => Object.fromEntries(emisores.map(e => [e.ruc, e.razonSocial])),
    [emisores],
  );

  // Diálogos
  const [notaTarget, setNotaTarget] = useState<{ comp: ComprobanteItem; tipoNota: 'NOTA_CREDITO' | 'NOTA_DEBITO' } | null>(null);
  const [anularTarget, setAnularTarget] = useState<ComprobanteItem | null>(null);

  const fetch = useCallback(async (opts?: { page?: number; busqueda?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await facturacionService.listarComprobantes({
        tipo: tipo || undefined,
        sunatStatus: estado || undefined,
        rucEmisor: rucEmisor || undefined,
        busqueda: (opts?.busqueda ?? busqueda) || undefined,
        page: opts?.page ?? page,
        limit: LIMIT,
      });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError('Error al cargar los comprobantes');
    } finally {
      setIsLoading(false);
    }
  }, [tipo, estado, rucEmisor, busqueda, page]);

  // Refetch al cambiar filtros (reinicia a página 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); fetch({ page: 1 }); }, [tipo, estado, rucEmisor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch({ page }); }, [page]);

  const handleSearch = (q: string) => {
    setBusqueda(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetch({ page: 1, busqueda: q }); }, 400);
  };

  const flash = (msg: string) => { setAccionMsg(msg); setTimeout(() => setAccionMsg(''), 4000); };

  const handleReenviar = async (comp: ComprobanteItem) => {
    setRowBusy(comp.id);
    setError(null);
    try {
      await facturacionService.reenviarComprobante(comp.id);
      flash(`${comp.codigoGenerado} reenviado`);
      fetch();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo reenviar el comprobante');
    } finally {
      setRowBusy(null);
    }
  };

  const handleConsultar = async (comp: ComprobanteItem) => {
    setRowBusy(comp.id);
    setError(null);
    try {
      await facturacionService.consultarComprobante(comp.id);
      flash(`Estado de ${comp.codigoGenerado} actualizado`);
      fetch();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo consultar el estado');
    } finally {
      setRowBusy(null);
    }
  };

  const handleEnviarPendientes = async () => {
    setBulkBusy('enviar');
    setError(null);
    try {
      const r = await facturacionService.enviarPendientes();
      flash(`Enviados ${r.enviados}/${r.total} · ${r.errores} con error`);
      fetch();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudieron enviar los pendientes');
    } finally {
      setBulkBusy(null);
    }
  };

  const handleConsultarPendientes = async () => {
    setBulkBusy('consultar');
    setError(null);
    try {
      const r = await facturacionService.consultarPendientes();
      flash(`Consultados ${r.procesados}: ${r.actualizados} actualizados, ${r.aunProcesando} aún procesando`);
      fetch();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo consultar los pendientes');
    } finally {
      setBulkBusy(null);
    }
  };

  // Reglas de acciones (paridad Flutter)
  const esNota = (c: ComprobanteItem) => c.tipoComprobante === 'NOTA_CREDITO' || c.tipoComprobante === 'NOTA_DEBITO';
  // RECHAZADOS también se reenvían: el backend auto-repara correlativos duplicados
  // y Syncrofact reemplaza documentos rechazados (para SUNAT nunca existieron)
  const puedeReenviar = (c: ComprobanteItem) =>
    (c.sunatStatus === 'PENDIENTE' || c.sunatStatus === 'ERROR_COMUNICACION' || c.sunatStatus === 'RECHAZADO') &&
    !(c.proveedorEmisor && PROVEEDOR_ARCHIVADO[c.proveedorEmisor]);
  const puedeNota = (c: ComprobanteItem) =>
    c.sunatStatus === 'ACEPTADO' && !c.anulado && !!c.sedeId && (c.tipoComprobante === 'FACTURA' || c.tipoComprobante === 'BOLETA');
  const puedeAnular = (c: ComprobanteItem) =>
    c.sunatStatus === 'ACEPTADO' && !c.anulado && !!c.sedeId && (c.tipoComprobante === 'FACTURA' || c.tipoComprobante === 'BOLETA');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Comprobantes Electrónicos</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Cargando...' : `${total} comprobantes`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push('/dashboard/facturacion/correlativos')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Correlativos
          </button>
          <button onClick={() => router.push('/dashboard/facturacion/configuracion')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            ⚙ Configuración
          </button>
          {puedeGestionar && (
            <>
              <button onClick={handleConsultarPendientes} disabled={bulkBusy !== null}
                className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">
                {bulkBusy === 'consultar' ? 'Consultando...' : '↻ Consultar pendientes'}
              </button>
              <button onClick={handleEnviarPendientes} disabled={bulkBusy !== null}
                className="rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                {bulkBusy === 'enviar' ? 'Enviando...' : '↑ Enviar pendientes'}
              </button>
            </>
          )}
        </div>
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[220px] flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={busqueda} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por código, cliente o documento..." />
        <select value={tipo} onChange={e => setTipo(e.target.value as TipoComprobante | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]">
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ESTADOS.map(e => (
          <button key={e.value} onClick={() => setEstado(e.value)}
            className={`rounded-full border px-3 py-1 text-xs ${estado === e.value ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {/* Emisores (multi-RUC): filtra por el RUC con el que se emitió */}
      {multiEmisor && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-gray-400">Emisor:</span>
          <button onClick={() => setRucEmisor('')}
            className={`rounded-full border px-3 py-1 text-xs ${rucEmisor === '' ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Todos
          </button>
          {emisores.map(em => (
            <button key={em.ruc} onClick={() => setRucEmisor(em.ruc)}
              title={em.ruc}
              className={`rounded-full border px-3 py-1 text-xs ${rucEmisor === em.ruc ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {em.razonSocial}{!em.activo ? ' (inactivo)' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🧾</p><p className="text-gray-400">Sin comprobantes con estos filtros</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Comprobante</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Fecha</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">SUNAT</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(c => {
                const cfg = SUNAT_STATUS_CONFIG[c.sunatStatus] ?? { label: c.sunatStatus, text: 'text-gray-600', bg: 'bg-gray-100' };
                const busy = rowBusy === c.id;
                return (
                  <tr key={c.id} className="align-top hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-600">
                          {TIPO_COMPROBANTE_LABEL[c.tipoComprobante] ?? c.tipoComprobante}
                        </span>
                        {esNota(c) && c.comprobanteOrigenId && <span className="text-[9px] text-gray-400">↩ nota</span>}
                      </div>
                      <p className="mt-0.5 font-mono text-xs font-medium text-gray-900">{c.codigoGenerado}</p>
                      {/* Rótulo del emisor (multi-RUC): a qué RUC pertenece la serie */}
                      {multiEmisor && c.rucEmisor && (
                        <p className="max-w-[160px] truncate text-[9px] font-semibold text-teal-600" title={c.rucEmisor}>
                          {razonPorRuc[c.rucEmisor] ?? c.rucEmisor}
                        </p>
                      )}
                      {c.anulado && <span className="text-[9px] font-semibold text-red-500">ANULADO</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-800 truncate max-w-[180px]">{c.nombreCliente ?? '—'}</p>
                      {c.numeroDocumento && <p className="text-[10px] text-gray-400">{c.numeroDocumento}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{fmtFecha(c.fechaEmision)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-sm font-bold text-gray-900">{fmt(c.total)}</span>
                      {c.moneda && c.moneda !== 'PEN' && <p className="text-[9px] text-gray-400">{c.moneda}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
                      {c.errorProveedor && (c.sunatStatus === 'ERROR_COMUNICACION' || c.sunatStatus === 'RECHAZADO') && (
                        <p className="mt-0.5 max-w-[200px] truncate text-[9px] text-red-400" title={c.errorProveedor}>{c.errorProveedor}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {c.ventaId && (
                          <button onClick={() => router.push(`/dashboard/ventas/${c.ventaId}`)}
                            className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Venta</button>
                        )}
                        {c.sunatPdfUrl && (
                          <a href={c.sunatPdfUrl} target="_blank" rel="noopener noreferrer"
                            className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">PDF</a>
                        )}
                        {c.enlaceProveedor && (
                          <a href={c.enlaceProveedor} target="_blank" rel="noopener noreferrer"
                            className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Ver</a>
                        )}
                        {c.sunatStatus === 'PROCESANDO' && puedeGestionar && (
                          <button onClick={() => handleConsultar(c)} disabled={busy}
                            className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                            {busy ? '...' : 'Consultar'}
                          </button>
                        )}
                        {puedeGestionar && puedeReenviar(c) && (
                          <button onClick={() => handleReenviar(c)} disabled={busy}
                            className="rounded border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                            {busy ? '...' : 'Reenviar'}
                          </button>
                        )}
                        {puedeGestionar && puedeNota(c) && (
                          <>
                            <button onClick={() => setNotaTarget({ comp: c, tipoNota: 'NOTA_CREDITO' })}
                              className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">N. Crédito</button>
                            <button onClick={() => setNotaTarget({ comp: c, tipoNota: 'NOTA_DEBITO' })}
                              className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">N. Débito</button>
                          </>
                        )}
                        {puedeGestionar && puedeAnular(c) && (
                          <button onClick={() => setAnularTarget(c)}
                            className="rounded border border-red-200 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50">Anular</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      {/* Diálogos */}
      {notaTarget && (
        <CrearNotaDialog
          isOpen
          comprobante={notaTarget.comp}
          tipoNota={notaTarget.tipoNota}
          onClose={() => setNotaTarget(null)}
          onSuccess={(nota) => { setNotaTarget(null); flash(`${nota.codigoGenerado} emitida`); fetch(); }}
        />
      )}
      {anularTarget && (
        <AnularComprobanteDialog
          isOpen
          comprobante={anularTarget}
          onClose={() => setAnularTarget(null)}
          onSuccess={(msg) => { setAnularTarget(null); flash(msg); fetch(); }}
        />
      )}
    </div>
  );
}
