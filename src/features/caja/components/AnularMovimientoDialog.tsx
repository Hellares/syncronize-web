'use client';

import { useState, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import type { MovimientoCaja } from '@/core/types/caja';
import { CATEGORIA_MOVIMIENTO_LABEL } from '@/core/types/caja';
import * as cajaService from '../services/caja-service';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';

interface Props {
  isOpen: boolean;
  cajaId: string;
  movimiento: MovimientoCaja | null;
  onSuccess: () => void;
  onClose: () => void;
}

// Mismos roles autorizadores que liquidación (paridad backend autorizar-operacion)
const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];

/** Anular movimiento manual: requiere motivo + autorizadoPorId (propio si admin/gerente, si no DNI+password) */
export default function AnularMovimientoDialog({ isOpen, cajaId, movimiento, onSuccess, onClose }: Props) {
  const { userRoles } = useEmpresa();
  const { state: authState } = useAuth();

  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAutorizacion, setShowAutorizacion] = useState(false);

  const userId = authState.status === 'authenticated' ? authState.user.id : undefined;
  const esAutorizador = useMemo(
    () => userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol)),
    [userRoles]
  );

  useEffect(() => {
    if (isOpen) { setMotivo(''); setError(''); }
  }, [isOpen]);

  const anular = async (autorizadoPorId: string) => {
    if (!movimiento) return;
    setIsSubmitting(true);
    setError('');
    try {
      await cajaService.anularMovimiento(cajaId, movimiento.id, { autorizadoPorId, motivo: motivo.trim() });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al anular el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnular = () => {
    setError('');
    if (!motivo.trim()) { setError('El motivo es obligatorio'); return; }
    if (esAutorizador && userId) {
      anular(userId);
    } else {
      setShowAutorizacion(true);
    }
  };

  if (!isOpen || !movimiento) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-semibold text-gray-900">Anular movimiento</h3>
          <p className="mt-1 text-xs text-gray-500">
            {CATEGORIA_MOVIMIENTO_LABEL[movimiento.categoria] ?? movimiento.categoria} · S/ {Number(movimiento.monto).toFixed(2)}
            {movimiento.descripcion ? ` · ${movimiento.descripcion}` : ''}
          </p>
          <div className="mt-3 space-y-3">
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[60px]"
              value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo de la anulación *" autoFocus />
            {!esAutorizador && (
              <p className="text-[10px] text-amber-600">⚠ Se pedirá autorización de un administrador o gerente.</p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleAnular} disabled={isSubmitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {isSubmitting ? 'Anulando...' : 'Anular'}
            </button>
          </div>
        </div>
      </div>

      <AutorizacionDialog
        isOpen={showAutorizacion}
        operacion="ANULAR_MOVIMIENTO_CAJA"
        titulo="Autorizar anulación"
        descripcion="Anular un movimiento de caja requiere autorización de un administrador o gerente."
        motivo={motivo}
        onAuthorized={(auth) => { setShowAutorizacion(false); anular(auth.autorizadoPorId); }}
        onClose={() => setShowAutorizacion(false)}
      />
    </>
  );
}
