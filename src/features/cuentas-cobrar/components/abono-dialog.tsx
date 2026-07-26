'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { FuenteIngreso } from '@/core/types/cuentas-cobrar';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { BancoEmpresa } from '@/core/types/compra';
import { getBancos } from '@/features/compras/services/compra-service';
import * as cxcService from '@/features/cuentas-cobrar/services/cuentas-cobrar-service';

const METODOS_PAGO: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'];

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  ventaId: string;
  /** Código visible de la venta (VTA-SED-XXXXX) */
  codigo: string;
  saldoPendiente: number;
  totalMora?: number;
  /** Con cuotas se aclara la imputación en cascada */
  tieneCuotas?: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Registra un abono a una venta a crédito por el endpoint canónico de CxC.
 *
 * A diferencia de `POST /ventas/:id/pago` (que asienta SIEMPRE en la caja del
 * cajero), acá se elige a dónde ENTRA el dinero — Tesorería / Caja / Banco —
 * y el backend imputa en cascada mora → interés → capital sobre las cuotas
 * más antiguas. Lo usan la página de Cuentas por Cobrar y el detalle de una
 * venta a crédito, por eso recibe datos sueltos y no la entidad de CxC.
 */
export default function AbonoDialog({
  ventaId,
  codigo,
  saldoPendiente,
  totalMora = 0,
  tieneCuotas = false,
  onSuccess,
  onClose,
}: Props) {
  const maxAbono = saldoPendiente + totalMora;

  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('EFECTIVO');
  const [fuente, setFuente] = useState<FuenteIngreso>('TESORERIA');
  const [bancoId, setBancoId] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [monto, setMonto] = useState(maxAbono > 0 ? maxAbono.toFixed(2) : '');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // EFECTIVO no entra a banco (paridad Flutter); digitales default BANCO
  const fuentesValidas: FuenteIngreso[] =
    metodoPago === 'EFECTIVO' ? ['TESORERIA', 'CAJA'] : ['BANCO', 'TESORERIA', 'CAJA'];

  useEffect(() => { getBancos().then(setBancos).catch(() => setBancos([])); }, []);
  useEffect(() => {
    if (fuente === 'BANCO' && !bancoId && bancos.length > 0) {
      const principal = bancos.find(b => b.esPrincipal) ?? bancos[0];
      setBancoId(principal.id);
    }
  }, [fuente, bancoId, bancos]);

  const onMetodo = (m: MetodoPagoVenta) => {
    setMetodoPago(m);
    const f: FuenteIngreso = m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO';
    setFuente(f);
    if (f !== 'BANCO') setBancoId('');
    // Bancarización: digitales llevan referencia (default 00000 como la app)
    if (m !== 'EFECTIVO' && !referencia) setReferencia('00000');
  };

  const submit = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Monto inválido'); return; }
    if (m > maxAbono + 0.005) { setError(`El abono no puede superar ${fmt(maxAbono)} (saldo + mora)`); return; }
    if (fuente === 'BANCO' && !bancoId) { setError('Selecciona la cuenta bancaria'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await cxcService.registrarAbono(ventaId, {
        metodoPago,
        monto: m,
        referencia: metodoPago !== 'EFECTIVO' ? (referencia.trim() || '00000') : undefined,
        fuente,
        ...(fuente === 'BANCO' ? { bancoId } : {}),
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Abono a {codigo}</h3>
        <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Saldo total: <strong>{fmt(saldoPendiente)}</strong>{totalMora > 0 && <> · mora {fmt(totalMora)}</>}
        </p>
        {tieneCuotas && (
          <p className="mt-1.5 text-[10px] text-gray-400">El abono se imputa automáticamente en cascada: mora → interés → capital de las cuotas más antiguas.</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {METODOS_PAGO.map(m => (
            <button key={m} onClick={() => onMetodo(m)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoPago === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
              {METODO_PAGO_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-right text-sm outline-none focus:border-[#437EFF]"
            type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
          {metodoPago !== 'EFECTIVO' && (
            <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="N° operación" />
          )}
        </div>

        {/* Fuente del ingreso: a dónde ENTRA el dinero */}
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Entra a</label>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            value={fuente} onChange={e => { setFuente(e.target.value as FuenteIngreso); if (e.target.value !== 'BANCO') setBancoId(''); }}>
            {fuentesValidas.map(f => (
              <option key={f} value={f}>
                {f === 'TESORERIA' ? 'Tesorería (Caja Central)' : f === 'CAJA' ? 'Caja (mi caja abierta)' : 'Banco (cuenta de la empresa)'}
              </option>
            ))}
          </select>
        </div>
        {fuente === 'BANCO' && (
          bancos.length === 0 ? (
            <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">No hay cuentas bancarias. Crea una en Tesorería.</p>
          ) : (
            <select className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              value={bancoId} onChange={e => setBancoId(e.target.value)}>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta} ({b.moneda ?? 'PEN'})</option>)}
            </select>
          )
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Registrando...' : 'Registrar abono'}
          </button>
        </div>
      </div>
    </div>
  );
}
