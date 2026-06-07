'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Venta, VentaDetalle } from '@/core/types/venta';
import type {
  MotivoDevolucion, EstadoProductoDevolucion, AccionDevolucion, TipoReembolso, CreateDevolucionItemDto,
} from '@/core/types/devolucion';
import {
  MOTIVOS_DEVOLUCION, ESTADOS_PRODUCTO, ACCIONES_PERMITIDAS,
  MOTIVO_DEVOLUCION_LABEL, ESTADO_PRODUCTO_LABEL, ACCION_DEVOLUCION_LABEL, TIPO_REEMBOLSO_LABEL,
} from '@/core/types/devolucion';
import * as ventaService from '@/features/venta/services/venta-service';
import * as devolucionService from '@/features/devoluciones/services/devolucion-service';
import ProductoReemplazoSelector, { type ReemplazoSeleccion } from '@/features/devoluciones/components/ProductoReemplazoSelector';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#437EFF] bg-white';

interface ItemForm {
  ventaDetalleId: string;
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  cantidadMax: number;
  incluir: boolean;
  cantidad: string;
  motivo: MotivoDevolucion;
  estadoProducto: EstadoProductoDevolucion;
  accion: AccionDevolucion;
  observaciones: string;
  reemplazo: ReemplazoSeleccion | null;
}

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function detalleEsRetornable(d: VentaDetalle): boolean {
  return !!(d.productoId || d.varianteId) && !d.servicioId && !d.ordenServicioId;
}

function NuevaDevolucionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ventaIdParam = searchParams.get('ventaId');

  const [venta, setVenta] = useState<Venta | null>(null);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [tipoReembolso, setTipoReembolso] = useState<TipoReembolso>('EFECTIVO');
  const [motivoGeneral, setMotivoGeneral] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cargarVenta = useCallback((v: Venta) => {
    setVenta(v);
    const retornables = (v.detalles ?? []).filter(detalleEsRetornable);
    setItems(retornables.map(d => ({
      ventaDetalleId: d.id,
      productoId: d.productoId ?? undefined,
      varianteId: d.varianteId ?? undefined,
      descripcion: d.descripcion,
      cantidadMax: d.cantidad,
      incluir: true,
      cantidad: String(d.cantidad),
      motivo: 'DEFECTUOSO',
      estadoProducto: 'BUENO',
      accion: 'REINGRESAR_STOCK',
      observaciones: '',
      reemplazo: null,
    })));
  }, []);

  // Precarga desde ?ventaId
  useEffect(() => {
    if (!ventaIdParam) return;
    setBuscando(true);
    ventaService.getVenta(ventaIdParam)
      .then(cargarVenta)
      .catch(() => setError('No se pudo cargar la venta'))
      .finally(() => setBuscando(false));
  }, [ventaIdParam, cargarVenta]);

  const buscarPorCodigo = async () => {
    if (!codigoBusqueda.trim()) return;
    setError('');
    setBuscando(true);
    try {
      const v = await ventaService.buscarVentaPorCodigo(codigoBusqueda.trim());
      if (!v) { setError('No se encontró una venta con ese código'); return; }
      cargarVenta(v);
    } catch {
      setError('Error al buscar la venta');
    } finally {
      setBuscando(false);
    }
  };

  const patchItem = (i: number, patch: Partial<ItemForm>) =>
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      // Al cambiar estadoProducto, reajusta accion si dejó de ser válida
      if (patch.estadoProducto && !ACCIONES_PERMITIDAS[patch.estadoProducto].includes(next.accion)) {
        next.accion = ACCIONES_PERMITIDAS[patch.estadoProducto][0];
      }
      // Si la acción deja de ser CAMBIO_PRODUCTO, limpia el reemplazo
      if (next.accion !== 'CAMBIO_PRODUCTO' && next.reemplazo) next.reemplazo = null;
      return next;
    }));

  const limpiarVenta = () => {
    setVenta(null); setItems([]); setCodigoBusqueda(''); setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!venta) return;
    const incluidos = items.filter(it => it.incluir);
    if (incluidos.length === 0) { setError('Selecciona al menos un ítem a devolver'); return; }

    const payloadItems: CreateDevolucionItemDto[] = [];
    for (const it of incluidos) {
      const cantidad = parseFloat(it.cantidad);
      if (isNaN(cantidad) || cantidad < 1) { setError(`Cantidad inválida en "${it.descripcion}"`); return; }
      if (cantidad > it.cantidadMax) { setError(`"${it.descripcion}": no puedes devolver más de ${it.cantidadMax}`); return; }
      if (it.accion === 'CAMBIO_PRODUCTO' && !it.reemplazo) { setError(`"${it.descripcion}": selecciona el producto de reemplazo`); return; }
      payloadItems.push({
        ventaDetalleId: it.ventaDetalleId,
        productoId: it.productoId,
        varianteId: it.varianteId,
        cantidad,
        motivo: it.motivo,
        estadoProducto: it.estadoProducto,
        accion: it.accion,
        observaciones: it.observaciones.trim() || undefined,
        productoReemplazoId: it.reemplazo?.productoReemplazoId,
        varianteReemplazoId: it.reemplazo?.varianteReemplazoId,
      });
    }

    setIsSubmitting(true);
    try {
      const dev = await devolucionService.crearDevolucion({
        ventaId: venta.id,
        sedeId: venta.sedeId,
        tipoReembolso,
        motivo: motivoGeneral.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        items: payloadItems,
      });
      router.push(`/dashboard/devoluciones/${dev.id}`);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo crear la devolución');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-900">Nueva devolución</h1>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Selección de venta */}
      {!venta ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="mb-1 block text-xs font-medium text-gray-600">Buscar venta por código</label>
          <div className="flex gap-2">
            <input className={inputClass} value={codigoBusqueda} onChange={e => setCodigoBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') buscarPorCodigo(); }}
              placeholder="VTA-... o B001-00000005" />
            <button onClick={buscarPorCodigo} disabled={buscando}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Venta seleccionada */}
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
            <div>
              <p className="font-mono text-sm font-bold text-green-800">{venta.codigo}</p>
              <p className="text-xs text-green-700">{venta.nombreCliente ?? 'Cliente'} · {fmt(venta.total)}</p>
            </div>
            <button onClick={limpiarVenta} className="text-xs text-green-600 hover:text-green-800">Cambiar venta</button>
          </div>

          {/* Tipo de reembolso */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-xs font-medium text-gray-600">Tipo de reembolso</p>
            <div className="grid grid-cols-2 gap-2">
              {(['EFECTIVO', 'CAMBIO_PRODUCTO'] as TipoReembolso[]).map(t => (
                <button key={t} type="button" onClick={() => setTipoReembolso(t)}
                  className={`rounded-lg border p-2.5 text-center text-xs font-medium ${tipoReembolso === t ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {TIPO_REEMBOLSO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Ítems */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-900">Ítems a devolver</p>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400">Esta venta no tiene productos retornables.</p>
            ) : (
              <div className="space-y-3">
                {items.map((it, i) => {
                  const acciones = ACCIONES_PERMITIDAS[it.estadoProducto];
                  return (
                    <div key={it.ventaDetalleId} className={`rounded-lg border p-3 ${it.incluir ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#437EFF]" checked={it.incluir}
                          onChange={e => patchItem(i, { incluir: e.target.checked })} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-gray-800">{it.descripcion}</p>
                            <span className="text-[10px] text-gray-400">máx {it.cantidadMax}</span>
                          </div>

                          {it.incluir && (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div>
                                  <label className="text-[10px] text-gray-400">Cantidad</label>
                                  <input className={selectClass} type="number" step="1" min="1" max={it.cantidadMax}
                                    value={it.cantidad} onChange={e => patchItem(i, { cantidad: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400">Motivo</label>
                                  <select className={selectClass} value={it.motivo} onChange={e => patchItem(i, { motivo: e.target.value as MotivoDevolucion })}>
                                    {MOTIVOS_DEVOLUCION.map(m => <option key={m} value={m}>{MOTIVO_DEVOLUCION_LABEL[m]}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400">Estado</label>
                                  <select className={selectClass} value={it.estadoProducto} onChange={e => patchItem(i, { estadoProducto: e.target.value as EstadoProductoDevolucion })}>
                                    {ESTADOS_PRODUCTO.map(s => <option key={s} value={s}>{ESTADO_PRODUCTO_LABEL[s]}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400">Acción</label>
                                  <select className={selectClass} value={it.accion} onChange={e => patchItem(i, { accion: e.target.value as AccionDevolucion })}>
                                    {acciones.map(a => <option key={a} value={a}>{ACCION_DEVOLUCION_LABEL[a]}</option>)}
                                  </select>
                                </div>
                              </div>

                              {it.accion === 'CAMBIO_PRODUCTO' && venta && (
                                <div>
                                  <label className="text-[10px] text-gray-400">Producto de reemplazo</label>
                                  <ProductoReemplazoSelector sedeId={venta.sedeId} value={it.reemplazo}
                                    onChange={(sel) => patchItem(i, { reemplazo: sel })} />
                                </div>
                              )}

                              <input className={selectClass} value={it.observaciones} onChange={e => patchItem(i, { observaciones: e.target.value })}
                                placeholder="Observaciones del ítem (opcional)" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motivo / observaciones generales */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo general (opcional)</label>
              <input className={inputClass} value={motivoGeneral} onChange={e => setMotivoGeneral(e.target.value)} placeholder="Motivo de la devolución" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Observaciones (opcional)</label>
              <textarea className={`${inputClass} resize-none`} rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pb-4">
            <button onClick={limpiarVenta} disabled={isSubmitting}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            <button onClick={handleSubmit} disabled={isSubmitting || items.filter(it => it.incluir).length === 0}
              className="rounded-lg bg-[#004A94] px-5 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Creando...' : 'Crear devolución'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function NuevaDevolucionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>}>
      <NuevaDevolucionInner />
    </Suspense>
  );
}
