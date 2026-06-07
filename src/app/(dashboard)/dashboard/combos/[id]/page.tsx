'use client';

import { useState, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import type { ComboCompleto, ComboConfigHistorial, ComboPrecioSede, UpdateComboPricingDto } from '@/core/types/combo';
import * as comboService from '@/features/producto/services/combo-service';
import ComboComponentesList from '@/features/producto/components/combo/ComboComponentesList';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

const TIPO_LABEL: Record<string, string> = {
  FIJO: 'Precio Fijo',
  CALCULADO: 'Calculado',
  CALCULADO_CON_DESCUENTO: 'Calculado c/ Descuento',
};

const HISTORIAL_TIPO: Record<string, { label: string; icon: string }> = {
  TIPO_PRECIO: { label: 'Cambio de tipo de precio', icon: '🔁' },
  DESCUENTO: { label: 'Cambio de descuento', icon: '％' },
  COMPONENTE_PRECIO: { label: 'Precio de componente', icon: '📋' },
  PRECIO_FIJO_SEDE: { label: 'Precio fijo por sede', icon: '🏬' },
  OFERTA_COMBO: { label: 'Oferta del combo', icon: '🏷' },
};

function parseValor(v?: string | null): string {
  if (!v) return '—';
  try {
    const obj = typeof v === 'string' ? JSON.parse(v) : v;
    if (obj && typeof obj === 'object') {
      return Object.entries(obj).map(([k, val]) => `${k}: ${val}`).join(', ');
    }
    return String(obj);
  } catch {
    return String(v);
  }
}

export default function ComboDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: comboId } = use(params);
  const searchParams = useSearchParams();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState(searchParams.get('sedeId') || defaultSede?.id || '');

  const [combo, setCombo] = useState<ComboCompleto | null>(null);
  const [reserva, setReserva] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialogs
  const [showPricing, setShowPricing] = useState(false);
  const [showOferta, setShowOferta] = useState(false);
  const [showReserva, setShowReserva] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const reload = useCallback(async () => {
    if (!sedeId) return;
    setIsLoading(true);
    setError('');
    try {
      const [c, r] = await Promise.all([
        comboService.getComboCompleto(comboId, sedeId),
        comboService.getReservacion(comboId, sedeId).catch(() => ({ cantidad: 0 })),
      ]);
      setCombo(c);
      setReserva(r?.cantidad ?? 0);
    } catch {
      setError('Error al cargar el combo');
    } finally {
      setIsLoading(false);
    }
  }, [comboId, sedeId]);

  useEffect(() => { reload(); }, [reload]);

  const precioFinal = combo
    ? (combo.ofertaActiva && combo.precioOferta != null
      ? Number(combo.precioOferta)
      : combo.tipoPrecioCombo === 'CALCULADO' ? Number(combo.precioCalculado) : Number(combo.precio))
    : 0;

  if (isLoading && !combo) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>;
  }

  if (!combo) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">{error || 'Combo no encontrado'}</p>
        <Link href="/dashboard/combos" className="mt-2 inline-block text-sm text-[#437EFF]">← Volver a combos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/combos" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{combo.nombre}</h1>
            {combo.descripcion && <p className="text-sm text-gray-500">{combo.descripcion}</p>}
          </div>
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#437EFF] bg-white">
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase text-gray-400">Precio final</p>
          {combo.ofertaActiva && combo.precioSinOferta != null && (
            <p className="text-xs text-gray-400 line-through">S/ {Number(combo.precioSinOferta).toFixed(2)}</p>
          )}
          <p className={`text-xl font-bold ${combo.ofertaActiva ? 'text-green-600' : 'text-gray-900'}`}>S/ {precioFinal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase text-gray-400">Por separado</p>
          <p className="text-xl font-bold text-gray-500">S/ {Number(combo.precioRegularTotal).toFixed(2)}</p>
          {(combo.descuentoAplicado ?? 0) > 0 && (
            <p className="text-[10px] text-green-600">Ahorro S/ {Number(combo.descuentoAplicado).toFixed(2)}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase text-gray-400">Stock armable</p>
          <p className={`text-xl font-bold ${combo.stockDisponible <= 0 ? 'text-red-500' : 'text-gray-900'}`}>{combo.stockDisponible}</p>
          {(combo.componentesSinStock?.length ?? 0) > 0 && (
            <p className="text-[10px] text-amber-600">⚠ {combo.componentesSinStock!.join(', ')}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase text-gray-400">Reservados</p>
          <p className="text-xl font-bold text-gray-900">{reserva}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg bg-purple-100 px-3 py-2 text-xs font-medium text-purple-700">
          {TIPO_LABEL[combo.tipoPrecioCombo]}{combo.tipoPrecioCombo === 'CALCULADO_CON_DESCUENTO' && combo.descuentoPorcentaje ? ` (-${combo.descuentoPorcentaje}%)` : ''}
        </span>
        {canManage && (
          <>
            <button onClick={() => setShowPricing(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">⚙ Configurar precio</button>
            <button onClick={() => setShowOferta(true)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${combo.ofertaActiva ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              🏷 {combo.ofertaActiva ? 'Oferta activa' : 'Crear oferta'}
            </button>
            <button onClick={() => setShowReserva(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">📦 Reserva de stock</button>
          </>
        )}
        <button onClick={() => setShowHistorial(!showHistorial)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">🕐 Historial</button>
      </div>

      {/* Historial (colapsable) */}
      {showHistorial && <HistorialSection comboId={comboId} />}

      {/* Componentes */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <ComboComponentesList comboId={comboId} />
      </div>

      {/* Precios por sede */}
      <PreciosPorSedeSection comboId={comboId} />

      {/* Dialogs */}
      {showPricing && (
        <PricingDialog combo={combo} sedeId={sedeId}
          onSuccess={() => { setShowPricing(false); reload(); }}
          onClose={() => setShowPricing(false)} />
      )}
      {showOferta && (
        <OfertaDialog combo={combo} sedeId={sedeId} precioActual={Number(combo.precioSinOferta ?? precioFinal)}
          onSuccess={() => { setShowOferta(false); reload(); }}
          onClose={() => setShowOferta(false)} />
      )}
      {showReserva && (
        <ReservaDialog comboId={comboId} sedeId={sedeId} actual={reserva} max={combo.stockDisponible + reserva}
          onSuccess={() => { setShowReserva(false); reload(); }}
          onClose={() => setShowReserva(false)} />
      )}
    </div>
  );
}

/* --- Pricing dialog (PUT /combos/:id/pricing?sedeId=) --- */
function PricingDialog({ combo, sedeId, onSuccess, onClose }: {
  combo: ComboCompleto; sedeId: string; onSuccess: () => void; onClose: () => void;
}) {
  const [tipo, setTipo] = useState(combo.tipoPrecioCombo);
  const [precioFijo, setPrecioFijo] = useState(combo.tipoPrecioCombo === 'FIJO' ? String(combo.precio ?? '') : '');
  const [descuento, setDescuento] = useState(combo.descuentoPorcentaje != null ? String(combo.descuentoPorcentaje) : '');
  const [razon, setRazon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (tipo === 'FIJO' && (!precioFijo || parseFloat(precioFijo) <= 0)) { setError('Ingresa el precio fijo'); return; }
    if (tipo === 'CALCULADO_CON_DESCUENTO') {
      const d = parseFloat(descuento);
      if (!descuento || isNaN(d) || d < 1 || d > 100) { setError('Descuento entre 1 y 100%'); return; }
    }
    setIsSubmitting(true);
    try {
      const dto: UpdateComboPricingDto = {
        tipoPrecioCombo: tipo,
        precioFijo: tipo === 'FIJO' ? parseFloat(precioFijo) : undefined,
        descuentoPorcentaje: tipo === 'CALCULADO_CON_DESCUENTO' ? parseFloat(descuento) : tipo !== combo.tipoPrecioCombo ? null : undefined,
        razon: razon.trim() || undefined,
      };
      await comboService.updatePricing(combo.id, sedeId, dto);
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al actualizar el precio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Configurar precio del combo</h3>
        <div className="mt-3 space-y-3">
          {(['FIJO', 'CALCULADO', 'CALCULADO_CON_DESCUENTO'] as const).map(t => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={tipo === t} onChange={() => setTipo(t)} className="text-[#437EFF]" />
              {TIPO_LABEL[t]}
            </label>
          ))}
          {tipo === 'FIJO' && (
            <input className={inputClass} type="number" step="0.01" min="0" value={precioFijo}
              onChange={e => setPrecioFijo(e.target.value)} placeholder="Precio fijo S/ (en esta sede)" />
          )}
          {tipo === 'CALCULADO_CON_DESCUENTO' && (
            <input className={inputClass} type="number" step="0.01" min="1" max="100" value={descuento}
              onChange={e => setDescuento(e.target.value)} placeholder="Descuento % (1-100)" />
          )}
          <input className={inputClass} value={razon} onChange={e => setRazon(e.target.value)} placeholder="Razón del cambio (opcional)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Oferta dialog (PUT/DELETE /combos/:id/oferta?sedeId=) --- */
function OfertaDialog({ combo, sedeId, precioActual, onSuccess, onClose }: {
  combo: ComboCompleto; sedeId: string; precioActual: number; onSuccess: () => void; onClose: () => void;
}) {
  const [precioOferta, setPrecioOferta] = useState(combo.precioOferta != null ? String(combo.precioOferta) : '');
  const [fechaInicio, setFechaInicio] = useState(combo.fechaInicioOferta?.split('T')[0] ?? '');
  const [fechaFin, setFechaFin] = useState(combo.fechaFinOferta?.split('T')[0] ?? '');
  const [razon, setRazon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleActivar = async () => {
    setError('');
    const p = parseFloat(precioOferta);
    if (!precioOferta || isNaN(p) || p <= 0) { setError('Ingresa el precio de oferta'); return; }
    if (p >= precioActual) { setError(`La oferta debe ser menor al precio actual (S/ ${precioActual.toFixed(2)})`); return; }
    setIsSubmitting(true);
    try {
      await comboService.updateOferta(combo.id, sedeId, {
        precioOferta: p,
        enOferta: true,
        fechaInicioOferta: fechaInicio ? new Date(`${fechaInicio}T00:00:00`).toISOString() : undefined,
        fechaFinOferta: fechaFin ? new Date(`${fechaFin}T23:59:59`).toISOString() : undefined,
        razon: razon.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al activar la oferta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDesactivar = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await comboService.desactivarOferta(combo.id, sedeId);
      onSuccess();
    } catch {
      setError('Error al desactivar la oferta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Oferta del combo</h3>
        <p className="mt-1 text-xs text-gray-500">Precio actual: S/ {precioActual.toFixed(2)}</p>
        <div className="mt-3 space-y-3">
          <input className={inputClass} type="number" step="0.01" min="0" value={precioOferta}
            onChange={e => setPrecioOferta(e.target.value)} placeholder="Precio de oferta S/" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-gray-500">Inicio (opcional)</label>
              <input className={inputClass} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-gray-500">Fin (opcional)</label>
              <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          </div>
          <input className={inputClass} value={razon} onChange={e => setRazon(e.target.value)} placeholder="Razón (opcional)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          {combo.ofertaActiva ? (
            <button onClick={handleDesactivar} disabled={isSubmitting}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              Desactivar oferta
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleActivar} disabled={isSubmitting} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : combo.ofertaActiva ? 'Actualizar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Reserva dialog (GET/POST/DELETE reservacion) --- */
function ReservaDialog({ comboId, sedeId, actual, max, onSuccess, onClose }: {
  comboId: string; sedeId: string; actual: number; max: number; onSuccess: () => void; onClose: () => void;
}) {
  const [cantidad, setCantidad] = useState(String(actual || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReservar = async () => {
    setError('');
    const c = parseInt(cantidad);
    if (isNaN(c) || c < 0) { setError('Cantidad inválida'); return; }
    setIsSubmitting(true);
    try {
      await comboService.reservarStock(comboId, sedeId, c);
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al reservar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLiberar = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await comboService.liberarReserva(comboId, sedeId);
      onSuccess();
    } catch {
      setError('Error al liberar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Reserva de stock del combo</h3>
        <p className="mt-1 text-xs text-gray-500">
          Reservar aparta el stock de los componentes para el combo — no se podrán vender por separado. Máx: {max}.
        </p>
        <div className="mt-3 space-y-3">
          <input className={inputClass} type="number" min="0" max={max} value={cantidad}
            onChange={e => setCantidad(e.target.value)} placeholder="Cantidad de combos a reservar" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          {actual > 0 ? (
            <button onClick={handleLiberar} disabled={isSubmitting}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              Liberar reserva
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleReservar} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : actual > 0 ? 'Modificar' : 'Reservar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Historial section (GET /combos/:id/historial-precios) --- */
function HistorialSection({ comboId }: { comboId: string }) {
  const [items, setItems] = useState<ComboConfigHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    comboService.getHistorialCombo(comboId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [comboId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800 mb-3">Historial de cambios</p>
      {isLoading ? (
        <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400">Sin cambios registrados</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map(h => {
            const meta = HISTORIAL_TIPO[h.tipoCambio] ?? { label: h.tipoCambio, icon: '•' };
            return (
              <div key={h.id} className="rounded-lg bg-gray-50 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">{meta.icon} {meta.label}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(h.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(h.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  {h.valorAnterior && <span className="line-through text-gray-400">{parseValor(h.valorAnterior)}</span>}
                  {h.valorAnterior && ' → '}
                  <span className="text-gray-700">{parseValor(h.valorNuevo)}</span>
                </p>
                {h.razon && <p className="text-[10px] italic text-gray-400">{h.razon}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --- Precios por sede (read-only) --- */
function PreciosPorSedeSection({ comboId }: { comboId: string }) {
  const [precios, setPrecios] = useState<ComboPrecioSede[]>([]);

  useEffect(() => {
    comboService.getPreciosPorSede(comboId).then(setPrecios).catch(() => {});
  }, [comboId]);

  if (precios.length <= 1) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800 mb-2">Precios por sede</p>
      <div className="space-y-1">
        {precios.map(p => (
          <div key={p.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
            <span className="text-gray-600">{p.sede?.nombre ?? p.sedeId}</span>
            <span className="font-medium text-gray-800">
              {p.precio != null ? `S/ ${Number(p.precio).toFixed(2)}` : '—'}
              {p.enOferta && p.precioOferta != null && <span className="ml-2 text-green-600">oferta S/ {Number(p.precioOferta).toFixed(2)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
