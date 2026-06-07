'use client';

import { useState, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import type { ProductoStock, MotivoLiquidacion } from '@/core/types/stock';
import { nombreProductoStock, isLiquidacionActiva } from '@/core/types/stock';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';
import * as stockService from '../services/stock-service';
import AutorizacionDialog from './AutorizacionDialog';

interface Props {
  isOpen: boolean;
  stock: ProductoStock | null;
  onSuccess: () => void;
  onClose: () => void;
}

const MOTIVOS: { value: MotivoLiquidacion; label: string }[] = [
  { value: 'FUERA_DE_CAMPANA', label: 'Fuera de campaña' },
  { value: 'SIN_ROTACION', label: 'Sin rotación' },
  { value: 'PROXIMO_A_VENCER', label: 'Próximo a vencer' },
  { value: 'DESCONTINUADO', label: 'Descontinuado' },
  { value: 'OTRO', label: 'Otro' },
];

// Roles que pueden autorizar con su propia sesión (misma lista que Flutter/backend)
const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

/**
 * Activar/desactivar liquidación (remate bajo costo) — paridad con GestionarLiquidacionDialog de Flutter.
 * Validaciones: precioLiquidacion <= precioCosto, costo > 0, motivo OTRO requiere observaciones.
 * Autorización: usuario en sesión si es admin/gerente; si no, dialog DNI+password (ACTIVAR_LIQUIDACION).
 */
export default function GestionarLiquidacionDialog({ isOpen, stock, onSuccess, onClose }: Props) {
  const { userRoles } = useEmpresa();
  const { state: authState } = useAuth();

  const [precioLiquidacion, setPrecioLiquidacion] = useState('');
  const [motivo, setMotivo] = useState<MotivoLiquidacion>('FUERA_DE_CAMPANA');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAutorizacion, setShowAutorizacion] = useState(false);
  const [confirmDesactivar, setConfirmDesactivar] = useState(false);

  const activa = stock ? isLiquidacionActiva(stock) : false;
  const userId = authState.status === 'authenticated' ? authState.user.id : undefined;
  const esAutorizador = useMemo(
    () => userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol)),
    [userRoles]
  );

  useEffect(() => {
    if (isOpen && stock) {
      setPrecioLiquidacion(stock.precioLiquidacion != null ? String(stock.precioLiquidacion) : '');
      setMotivo(stock.motivoLiquidacion ?? 'FUERA_DE_CAMPANA');
      setFechaFin(stock.fechaFinLiquidacion?.split('T')[0] ?? '');
      setObservaciones(stock.observacionesLiquidacion ?? '');
      setError('');
      setConfirmDesactivar(false);
    }
  }, [isOpen, stock]);

  const validate = (): string | null => {
    if (!stock) return 'Sin stock';
    const precio = parseFloat(precioLiquidacion);
    if (!precioLiquidacion || isNaN(precio) || precio <= 0) return 'Ingresa el precio de liquidación';
    if (stock.precioCosto == null || stock.precioCosto <= 0) {
      return 'El producto no tiene precio de costo configurado — configúralo antes de liquidar';
    }
    if (precio > stock.precioCosto) {
      return `El precio de liquidación debe ser menor o igual al costo (S/ ${Number(stock.precioCosto).toFixed(2)})`;
    }
    if (motivo === 'OTRO' && !observaciones.trim()) return 'Indica las observaciones para el motivo "Otro"';
    return null;
  };

  const activar = async (autorizadoPorId: string) => {
    if (!stock) return;
    setIsSubmitting(true);
    setError('');
    try {
      await stockService.activarLiquidacion(stock.id, {
        precioLiquidacion: parseFloat(precioLiquidacion),
        motivoLiquidacion: motivo,
        autorizadoPorId,
        // Fin de día local → ISO (vigente hasta desactivación manual si se omite)
        fechaFin: fechaFin ? new Date(`${fechaFin}T23:59:59`).toISOString() : undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al activar la liquidación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivar = () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    // Igual que Flutter: si el usuario en sesión tiene rol autorizador, usa su propio id
    if (esAutorizador && userId) {
      activar(userId);
    } else {
      setShowAutorizacion(true);
    }
  };

  const handleDesactivar = async () => {
    if (!stock) return;
    setIsSubmitting(true);
    setError('');
    try {
      await stockService.desactivarLiquidacion(stock.id);
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al desactivar la liquidación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Liquidación</span>
            <h3 className="text-base font-bold text-gray-900">{activa ? 'Gestionar liquidación' : 'Activar liquidación'}</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">{nombreProductoStock(stock)}</p>

          {/* Contexto de precios */}
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-gray-400">Precio base</p>
              <p className="text-sm font-semibold text-gray-900">{stock.precio != null ? `S/ ${Number(stock.precio).toFixed(2)}` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400">Costo</p>
              <p className="text-sm font-semibold text-gray-900">{stock.precioCosto != null ? `S/ ${Number(stock.precioCosto).toFixed(2)}` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400">Stock</p>
              <p className="text-sm font-semibold text-gray-900">{stock.stockActual}</p>
            </div>
          </div>

          {activa ? (
            /* --- Estado activo: resumen + desactivar --- */
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-sm text-red-700">
                  Liquidación activa a <strong>S/ {Number(stock.precioLiquidacion).toFixed(2)}</strong>
                  {stock.precioCosto != null && stock.precioLiquidacion != null && (
                    <span className="text-xs"> (pérdida S/ {(Number(stock.precioCosto) - Number(stock.precioLiquidacion)).toFixed(2)}/u)</span>
                  )}
                </p>
                <p className="text-xs text-red-600">
                  Motivo: {MOTIVOS.find(m => m.value === stock.motivoLiquidacion)?.label ?? stock.motivoLiquidacion}
                  {stock.fechaFinLiquidacion
                    ? ` · vence ${new Date(stock.fechaFinLiquidacion).toLocaleDateString('es-PE')}`
                    : ' · sin vencimiento'}
                </p>
                {stock.observacionesLiquidacion && <p className="text-xs text-red-500">{stock.observacionesLiquidacion}</p>}
              </div>

              {!confirmDesactivar ? (
                <button onClick={() => setConfirmDesactivar(true)}
                  className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  Desactivar liquidación
                </button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs text-amber-700">¿Desactivar la liquidación? El producto volverá a su precio normal.</p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setConfirmDesactivar(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">No</button>
                    <button onClick={handleDesactivar} disabled={isSubmitting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      {isSubmitting ? 'Desactivando...' : 'Sí, desactivar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- Activación --- */
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Precio de liquidación * <span className="text-gray-400">(≤ costo)</span></label>
                <input className={inputClass} type="number" step="0.01" min="0" value={precioLiquidacion}
                  onChange={e => setPrecioLiquidacion(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Motivo *</label>
                <select className={selectClass} value={motivo} onChange={e => setMotivo(e.target.value as MotivoLiquidacion)}>
                  {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Vence el <span className="text-gray-400">(vacío = sin vencimiento)</span></label>
                <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Observaciones {motivo === 'OTRO' && <span className="text-red-500">*</span>}
                </label>
                <textarea className={`${inputClass} min-h-[60px]`} value={observaciones}
                  onChange={e => setObservaciones(e.target.value)} placeholder="Detalle del motivo..." />
              </div>
              {!esAutorizador && (
                <p className="text-[10px] text-amber-600">⚠ Se pedirá autorización de un administrador o gerente.</p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} disabled={isSubmitting}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cerrar
            </button>
            {!activa && (
              <button onClick={handleActivar} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Activando...' : 'Activar liquidación'}
              </button>
            )}
          </div>
        </div>
      </div>

      <AutorizacionDialog
        isOpen={showAutorizacion}
        operacion="ACTIVAR_LIQUIDACION"
        titulo="Autorizar liquidación"
        descripcion="Liquidar bajo costo requiere autorización de un administrador o gerente."
        onAuthorized={(auth) => { setShowAutorizacion(false); activar(auth.autorizadoPorId); }}
        onClose={() => setShowAutorizacion(false)}
      />
    </>
  );
}
