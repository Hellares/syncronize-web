'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { AutorizacionResponse } from '@/core/types/stock';
import * as stockService from '../services/stock-service';

interface Props {
  isOpen: boolean;
  /** Tipo de operación a autorizar, ej: 'ACTIVAR_LIQUIDACION' */
  operacion: string;
  titulo?: string;
  descripcion?: string;
  motivo?: string;
  onAuthorized: (auth: AutorizacionResponse) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

/**
 * Autorización gerencial con DNI + contraseña (equivalente a showAutorizacionDialog de Flutter).
 * Llama POST /auth/autorizar-operacion y devuelve autorizadoPorId via onAuthorized.
 */
export default function AutorizacionDialog({ isOpen, operacion, titulo, descripcion, motivo, onAuthorized, onClose }: Props) {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setDni(''); setPassword(''); setError(''); }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!dni.trim() || !password) { setError('Ingresa DNI y contraseña'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const auth = await stockService.autorizarOperacion({ dni: dni.trim(), password, operacion, motivo });
      onAuthorized(auth);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo autorizar la operación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-gray-900">{titulo || 'Autorización requerida'}</h3>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {descripcion || 'Esta operación requiere autorización de un administrador o gerente. Ingresa sus credenciales.'}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">DNI del autorizador</label>
            <input className={inputClass} value={dni} onChange={e => setDni(e.target.value)} placeholder="12345678" maxLength={15} autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Contraseña</label>
            <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">
            {isSubmitting ? 'Verificando...' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
