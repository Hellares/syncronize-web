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
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [tipoCambio, setTipoCambio] = useState('');
  const [referencia, setReferencia] = useState('');
  const [bancos, setBancos] = useState<BancoEmpresa[]>([]);
  const [error, setError] = useState<string | null>(null);

  const esBancario = metodo !== 'EFECTIVO';
  const defaultFuente = (m: MetodoPago): FuentePagoCompra =>
    m === 'EFECTIVO' ? 'TESORERIA' : 'BANCO';

  // ¿De que moneda sale la plata? Las cajas son en soles; el banco, la suya.
  const bancoElegido =
    bancos.find((b) => b.id === bancoIdEfectivo) ?? null;
  const monedaFuente =
    fuente === 'BANCO' ? (bancoElegido?.moneda ?? 'PEN').toUpperCase() : 'PEN';
  // 🔴 Que no coincidan es el caso NORMAL cuando el proveedor factura en
  // dolares y la empresa no maneja dolares. El monto se escribe siempre en la
  // moneda de la DEUDA; los soles que salen se derivan con el TC de hoy.
  const conversion = monedaFuente !== moneda.toUpperCase();
  const tc = parseFloat(tipoCambio.replace(',', '.')) || 0;
  const montoNum = parseFloat(monto.replace(',', '.')) || 0;
  const saleDeLaFuente = conversion && tc > 0 ? Math.round(montoNum * tc * 100) / 100 : null;

  // Todas las cuentas: pagar una factura en dolares desde una en soles es
  // justamente lo que hay que poder hacer. La moneda va en la etiqueta.
  const bancosCompatibles = useMemo(() => bancos, [bancos]);
  // 🔴 La cuenta por defecto se DERIVA en el render, no se setea en un
  // effect: `useEffect` + `setState` no pasa el lint de este repo. Mientras el
  // usuario no elija, vale la principal (o la primera).
  const bancoIdEfectivo =
    bancoId ||
    (bancosCompatibles.find((b) => b.esPrincipal) ?? bancosCompatibles[0])?.id ||
    '';


  // 🔴 Nada de "resetear en un effect al abrir": `useEffect` + `setState` no
  // pasa el lint de este repo. El dialogo se MONTA recién cuando se abre (la
  // página lo renderiza con `isOpen && ...`), así que los valores iniciales de
  // `useState` ya son el estado limpio de cada apertura.
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

  const submit = () => {
    if (fuente === 'BANCO' && !bancoIdEfectivo) return setError('Seleccioná la cuenta bancaria');
    const m = Math.round(montoNum * 100) / 100;
    if (m <= 0) return setError('Ingresá un monto válido');
    if (m > saldo + 0.001) return setError(`El monto excede el saldo (${sim(moneda)} ${saldo.toFixed(2)})`);
    if (conversion && !(tc > 0)) {
      return setError(
        `La deuda es en ${moneda} y el pago sale en ${monedaFuente}: falta el tipo de cambio del día.`,
      );
    }
    onRegistrar({
      metodoPago: metodo,
      // `monto` son los soles que salen; `montoAplicado` lo que cancela de la
      // deuda. Sin conversion son el mismo numero y viaja solo `monto`.
      monto: conversion ? Math.round(m * tc * 100) / 100 : m,
      ...(conversion ? { tipoCambio: tc, montoAplicado: m } : {}),
      fuente,
      ...(fuente === 'BANCO' ? { bancoId: bancoIdEfectivo } : {}),
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
    });
  };

  const fuentes: FuentePagoCompra[] = esBancario
    ? ['BANCO', 'TESORERIA', 'CAJA']
    : ['TESORERIA', 'CAJA'];

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
          <div className={conversion ? 'grid grid-cols-2 gap-2' : ''}>
            <div>
              <label className={labelClass}>Monto (máx {sim(moneda)} {saldo.toFixed(2)})</label>
              <input className={inputClass} value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
            </div>
            {conversion && (
              <div>
                <label className={labelClass}>TC del día</label>
                <input className={`${inputClass} text-right`} value={tipoCambio} placeholder="3.755"
                  onChange={(e) => setTipoCambio(e.target.value)} inputMode="decimal" />
              </div>
            )}
          </div>
          {conversion && (
            saleDeLaFuente != null ? (
              <p className="rounded-md bg-blue-50 px-2.5 py-1.5 text-[11px] text-gray-600">
                Cancela <strong className="text-gray-900">{sim(moneda)} {montoNum.toFixed(2)}</strong> de la deuda
                {' · '}salen <strong className="text-[#004A94]">{sim(monedaFuente)} {saleDeLaFuente.toFixed(2)}</strong>
              </p>
            ) : (
              <p className="rounded-md bg-amber-100 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                La deuda es en {moneda} y la plata sale en {monedaFuente}: poné el tipo de cambio de hoy.
              </p>
            )
          )}
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
                No hay cuentas bancarias cargadas.
              </div>
            ) : (
              <div>
                <label className={labelClass}>Cuenta bancaria</label>
                <select className={inputClass} value={bancoIdEfectivo} onChange={(e) => setBancoId(e.target.value)}>
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
