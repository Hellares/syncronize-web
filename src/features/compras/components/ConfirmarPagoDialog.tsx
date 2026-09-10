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
  const [monto, setMonto] = useState(total.toFixed(2));
  const [tipoCambio, setTipoCambio] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [error, setError] = useState<string | null>(null);

  const esBancario = metodo !== 'EFECTIVO';
  const defaultFuente = (m: MetodoPago): FuentePagoCompra =>
    m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO';

  // Se listan TODAS las cuentas: pagar una factura en dolares desde una cuenta
  // en soles es exactamente el caso de uso. La moneda va en la etiqueta.
  const bancosCompatibles = useMemo(() => bancos, [bancos]);
  // 🔴 La cuenta por defecto se DERIVA en el render, no se setea en un
  // effect: `useEffect` + `setState` no pasa el lint de este repo. Mientras el
  // usuario no elija, vale la principal (o la primera).
  const bancoIdEfectivo =
    bancoId ||
    (bancosCompatibles.find((b) => b.esPrincipal) ?? bancosCompatibles[0])?.id ||
    '';

  // ¿De que moneda sale la plata? Las cajas son en soles; el banco, la suya.
  const bancoElegido = bancos.find((b) => b.id === bancoIdEfectivo) ?? null;
  const monedaFuente =
    fuente === 'BANCO' ? (bancoElegido?.moneda ?? 'PEN').toUpperCase() : 'PEN';
  // 🔴 Que no coincidan es lo NORMAL cuando el proveedor factura en dolares y
  // la empresa no maneja dolares: paga en soles al TC del dia. Antes esto se
  // prohibia y no habia forma de registrar el pago real.
  const conversion = monedaFuente !== moneda.toUpperCase();
  const tc = parseFloat(tipoCambio.replace(',', '.')) || 0;
  const montoNum = parseFloat(monto.replace(',', '.')) || 0;
  // El monto se escribe SIEMPRE en la moneda de la compra (es lo que se le debe
  // al proveedor); los soles que salen se derivan.
  const saleDeLaFuente = conversion && tc > 0 ? Math.round(montoNum * tc * 100) / 100 : null;



  // 🔴 Idem PagoProveedorDialog: el reset vive en el MONTAJE, no en un
  // effect. La página renderiza el diálogo solo cuando está abierto.
  useEffect(() => {
    getBancos().then(setBancos).catch(() => setBancos([]));
  }, []);


  if (!isOpen) return null;

  const onMetodo = (m: MetodoPago) => {
    setMetodo(m);
    const f = defaultFuente(m);
    setFuente(f);
    if (f !== 'BANCO') setBancoId('');
  };

  const registrar = () => {
    if (fuente === 'BANCO' && !bancoIdEfectivo) return setError('Seleccioná la cuenta bancaria');
    let m = montoNum;
    if (m <= 0) return setError('Ingresá un monto válido');
    if (m > total + 0.001) m = total;
    m = Math.round(m * 100) / 100;
    if (conversion && !(tc > 0)) {
      return setError(
        `La compra es en ${moneda} y el pago sale en ${monedaFuente}: falta el tipo de cambio del día.`,
      );
    }
    onRegistrar({
      metodoPago: metodo,
      fuente,
      // `monto` son los soles que salen; `montoAplicado` lo que cancela de la
      // deuda. Sin conversion son el mismo numero y viaja solo `monto`.
      monto: conversion ? Math.round(m * tc * 100) / 100 : m,
      ...(conversion ? { tipoCambio: tc, montoAplicado: m } : {}),
      ...(fuente === 'BANCO' ? { bancoId: bancoIdEfectivo } : {}),
    });
  };

  const fuentes: FuentePagoCompra[] = esBancario
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
          <div className={conversion ? 'grid grid-cols-2 gap-2' : ''}>
            <div>
              <label className={LABEL}>Monto (máx {sim(moneda)} {total.toFixed(2)})</label>
              <input className={INPUT_STD} value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
            </div>
            {conversion && (
              <div>
                <label className={LABEL}>TC del día</label>
                <input className={`${INPUT_STD} text-right`} value={tipoCambio} placeholder="3.755"
                  onChange={(e) => setTipoCambio(e.target.value)} inputMode="decimal" />
              </div>
            )}
          </div>
          {/* La cuenta a la vista: se cancela la deuda en la moneda de la
              factura y salen soles de la caja. El TC es el de HOY y no tiene
              por que ser el de la compra — esa brecha es la diferencia de
              cambio, y se ve en el detalle de la compra. */}
          {conversion && (
            saleDeLaFuente != null ? (
              <p className="rounded-md bg-blue-50 px-2.5 py-1.5 text-[11px] text-gray-600">
                Cancela <strong className="text-gray-900">{sim(moneda)} {montoNum.toFixed(2)}</strong> de la deuda
                {' · '}salen <strong className="text-[#004A94]">{sim(monedaFuente)} {saleDeLaFuente.toFixed(2)}</strong>
                {' de '}{fuente === 'BANCO' ? 'la cuenta' : 'la caja'}
              </p>
            ) : (
              <p className="rounded-md bg-amber-100 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                La compra es en {moneda} y la plata sale en {monedaFuente}: poné el tipo de cambio de hoy.
              </p>
            )
          )}
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
                No hay cuentas bancarias cargadas. Creá una en Tesorería.
              </div>
            ) : (
              <div>
                <label className={LABEL}>Cuenta bancaria</label>
                <select className={INPUT_STD} value={bancoIdEfectivo} onChange={(e) => setBancoId(e.target.value)}>
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
