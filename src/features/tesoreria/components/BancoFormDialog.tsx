'use client';

import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import type { BancoEmpresa } from '@/core/types/compra';
import { crearBanco, actualizarBanco } from '@/features/tesoreria/services/bancos-service';

interface Props {
  isOpen: boolean;
  banco?: BancoEmpresa | null;
  onSuccess: (msg: string) => void;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const TIPOS = ['CORRIENTE', 'AHORROS'];

export default function BancoFormDialog({ isOpen, banco, onSuccess, onClose }: Props) {
  const esEdicion = !!banco;
  const [nombreBanco, setNombreBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('CORRIENTE');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNombreBanco(banco?.nombreBanco ?? '');
    setTipoCuenta((banco as { tipoCuenta?: string } | null | undefined)?.tipoCuenta ?? 'CORRIENTE');
    setNumeroCuenta(banco?.numeroCuenta ?? '');
    setMoneda(banco?.moneda ?? 'PEN');
  }, [isOpen, banco]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!nombreBanco.trim() || !numeroCuenta.trim()) return setError('Banco y número de cuenta son obligatorios');
    setGuardando(true);
    setError(null);
    const dto = { nombreBanco: nombreBanco.trim(), tipoCuenta, numeroCuenta: numeroCuenta.trim(), moneda };
    try {
      if (esEdicion) await actualizarBanco(banco!.id, dto);
      else await crearBanco(dto);
      onSuccess(esEdicion ? 'Cuenta actualizada' : 'Cuenta creada');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string | string[] }>;
      const m = ax.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-base font-semibold text-[#004A94]">{esEdicion ? 'Editar cuenta' : 'Nueva cuenta bancaria'}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Banco</label>
            <input className={inputClass} value={nombreBanco} onChange={(e) => setNombreBanco(e.target.value)} placeholder="BCP, Interbank…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tipo</label>
              <select className={inputClass} value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Moneda</label>
              <select className={inputClass} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>N° de cuenta</label>
            <input className={inputClass} value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={submit} disabled={guardando} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
