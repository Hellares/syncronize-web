'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BancoEmpresa, MetodoPago, FuentePagoCompra } from '@/core/types/compra';
import type { RegistrarPagoDto } from '@/core/types/cuentas-pagar';
import { getBancos } from '@/features/compras/services/compra-service';

interface Props {
  isOpen: boolean;
  saldo: number;
  moneda: string;
  onRegistrar: (dto: RegistrarPagoDto) => void;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const METODOS: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'];

export default function PagoProveedorDialog({ isOpen, saldo, moneda, onRegistrar, onClose }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [fuente, setFuente] = useState<FuentePagoCompra>('TESORERIA');
  const [bancoId, setBancoId] = useState('');
  const [monto, setMonto] = useState(String(saldo));
  const [referencia, setReferencia] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [error, setError] = useState<string | null>(null);

  const esExtranjera = moneda.toUpperCase() !== 'PEN';
  const esBancario = metodo !== 'EFECTIVO';
  const defaultFuente = (m: MetodoPago): FuentePagoCompra =>
    esExtranjera ? 'BANCO' : m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO';

  const bancosCompatibles = useMemo(
    () => bancos.filter((b) => (b.moneda ?? 'PEN').toUpperCase() === moneda.toUpperCase()),
    [bancos, moneda],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setMetodo('EFECTIVO');
    setFuente(defaultFuente('EFECTIVO'));
    setMonto(saldo.toFixed(2));
    setReferencia('');
    getBancos().then(setBancos).catch(() => setBancos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saldo]);

  useEffect(() => {
    if (fuente === 'BANCO' && !bancoId && bancosCompatibles.length > 0) {
      setBancoId((bancosCompatibles.find((b) => b.esPrincipal) ?? bancosCompatibles[0]).id);
    }
  }, [fuente, bancoId, bancosCompatibles]);

  if (!isOpen) return null;

  const onMetodo = (m: MetodoPago) => {
    setMetodo(m);
    const f = defaultFuente(m);
    setFuente(f);
    if (f !== 'BANCO') setBancoId('');
  };

  const submit = () => {
    if (fuente === 'BANCO' && !bancoId) return setError('Seleccioná la cuenta bancaria');
    const m = parseFloat(monto.replace(',', '.')) || 0;
    if (m <= 0) return setError('Ingresá un monto válido');
    if (m > saldo + 0.001) return setError(`El monto excede el saldo (${sim(moneda)} ${saldo.toFixed(2)})`);
    onRegistrar({
      metodoPago: metodo,
      monto: Math.round(m * 100) / 100,
      fuente,
      ...(fuente === 'BANCO' ? { bancoId } : {}),
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
    });
  };

  const fuentes: FuentePagoCompra[] = esExtranjera
    ? ['BANCO']
    : esBancario ? ['BANCO', 'TESORERIA', 'CAJA'] : ['TESORERIA', 'CAJA'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-[#004A94]">Registrar pago</h2>
        <p className="mb-3 text-xs text-gray-500">Saldo pendiente: {sim(moneda)} {saldo.toFixed(2)}</p>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Método de pago</label>
            <select className={inputClass} value={metodo} onChange={(e) => onMetodo(e.target.value as MetodoPago)}>
              {METODOS.map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Monto (máx {sim(moneda)} {saldo.toFixed(2)})</label>
            <input className={inputClass} value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label className={labelClass}>Sale de</label>
            <select className={inputClass} value={fuente} onChange={(e) => setFuente(e.target.value as FuentePagoCompra)}>
              {fuentes.map((f) => (
                <option key={f} value={f}>
                  {f === 'TESORERIA' ? 'Tesorería (Caja Central)' : f === 'CAJA' ? 'Caja (mi caja abierta)' : 'Banco (cuenta de la empresa)'}
                </option>
              ))}
            </select>
          </div>
          {fuente === 'BANCO' && (
            bancosCompatibles.length === 0 ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                No hay cuentas bancarias en {moneda}.
              </div>
            ) : (
              <div>
                <label className={labelClass}>Cuenta bancaria</label>
                <select className={inputClass} value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
                  {bancosCompatibles.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta} ({b.moneda ?? 'PEN'})</option>
                  ))}
                </select>
              </div>
            )
          )}
          <div>
            <label className={labelClass}>N° operación / referencia (opcional)</label>
            <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={submit} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]">
            Registrar pago
          </button>
        </div>
      </div>
    </div>
  );
}
