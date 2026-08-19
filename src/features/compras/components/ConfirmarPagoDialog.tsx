'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BancoEmpresa, MetodoPago, FuentePagoCompra, PagoContadoCompra } from '@/core/types/compra';
import { getBancos } from '@/features/compras/services/compra-service';

interface Props {
  isOpen: boolean;
  total: number;
  moneda: string;
  onRegistrar: (pago: PagoContadoCompra) => void;
  onOmitir: () => void;
  onClose: () => void;
}

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de `servicios/nueva`, `CotizacionForm` y los formularios de compra. El
// ring va BAKED porque aca el error es un banner, no una marca por campo.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const METODOS: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'];

export default function ConfirmarPagoDialog({ isOpen, total, moneda, onRegistrar, onOmitir, onClose }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [fuente, setFuente] = useState<FuentePagoCompra>('TESORERIA');
  const [bancoId, setBancoId] = useState<string>('');
  const [monto, setMonto] = useState(String(total));
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
    setMonto(total.toFixed(2));
    getBancos().then(setBancos).catch(() => setBancos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, total]);

  useEffect(() => {
    if (fuente === 'BANCO' && !bancoId && bancosCompatibles.length > 0) {
      const principal = bancosCompatibles.find((b) => b.esPrincipal) ?? bancosCompatibles[0];
      setBancoId(principal.id);
    }
  }, [fuente, bancoId, bancosCompatibles]);

  if (!isOpen) return null;

  const onMetodo = (m: MetodoPago) => {
    setMetodo(m);
    const f = defaultFuente(m);
    setFuente(f);
    if (f !== 'BANCO') setBancoId('');
  };

  const registrar = () => {
    if (fuente === 'BANCO' && !bancoId) return setError('Seleccioná la cuenta bancaria');
    let m = parseFloat(monto.replace(',', '.')) || 0;
    if (m <= 0) return setError('Ingresá un monto válido');
    if (m > total + 0.001) m = total;
    onRegistrar({
      metodoPago: metodo,
      fuente,
      monto: Math.round(m * 100) / 100,
      ...(fuente === 'BANCO' ? { bancoId } : {}),
    });
  };

  const fuentes: FuentePagoCompra[] = esExtranjera
    ? ['BANCO']
    : esBancario
      ? ['BANCO', 'TESORERIA', 'CAJA']
      : ['TESORERIA', 'CAJA'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-[#004A94]">¿Cómo pagaste la compra?</h2>
        <p className="mb-3 text-xs text-gray-500">Total: {sim(moneda)} {total.toFixed(2)}</p>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Método de pago</label>
            <select className={INPUT_STD} value={metodo} onChange={(e) => onMetodo(e.target.value as MetodoPago)}>
              {METODOS.map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Monto (máx {sim(moneda)} {total.toFixed(2)})</label>
            <input className={INPUT_STD} value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label className={LABEL}>Sale de</label>
            <select className={INPUT_STD} value={fuente} onChange={(e) => { setFuente(e.target.value as FuentePagoCompra); }}>
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
                No hay cuentas bancarias en {moneda}. Creá una en Tesorería.
              </div>
            ) : (
              <div>
                <label className={LABEL}>Cuenta bancaria</label>
                <select className={INPUT_STD} value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
                  {bancosCompatibles.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombreBanco} ·· {b.numeroCuenta} ({b.moneda ?? 'PEN'})</option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        <div className="mt-5 space-y-2">
          <button onClick={registrar} className="w-full rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]">
            Registrar pago
          </button>
          <button onClick={onOmitir} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Omitir (lo pago después)
          </button>
          <button onClick={onClose} className="w-full px-4 py-1 text-xs text-gray-500 hover:underline">Cancelar</button>
          <p className="text-center text-[11px] text-gray-400">Si lo omitís, la compra queda pendiente en Cuentas por Pagar.</p>
        </div>
      </div>
    </div>
  );
}
