'use client';

import { useEffect, useRef, useState } from 'react';
import { TiendaColors, alpha } from '@/lib/colors';
import { soles } from '@/lib/tienda-compra';
import { mensajeError } from '@/lib/mis-servicios';
import { MediosPago, MetodoAbono, misCompras } from '@/lib/mis-compras';

/** Un abono grande puede ir en varios Yape (límite por operación): una captura por cada uno. */
const MAX_CAPTURAS = 3;

const METODOS: { id: MetodoAbono; texto: string; color: string }[] = [
  { id: 'YAPE', texto: 'Yape', color: '#742284' },
  { id: 'PLIN', texto: 'Plin', color: '#0bb4c8' },
  { id: 'TRANSFERENCIA', texto: 'Transferencia', color: '#1f4bb0' },
];

/**
 * Abonar a una compra a crédito: el cliente elige cuánto y cómo, ve el QR o la
 * cuenta de la tienda, paga en su app y sube la captura. Queda EN REVISIÓN:
 * recién cuando la tienda lo aprueba baja su saldo.
 */
export function AbonarDialog({ subdominio, ventaId, codigo, disponible, sugerido, colors, onListo, onCerrar }: {
  subdominio: string;
  ventaId: string;
  codigo: string;
  /** Saldo menos lo que ya está en revisión: el tope del abono. */
  disponible: number;
  /** Lo que se propone de entrada (la próxima cuota). */
  sugerido: number;
  colors: TiendaColors;
  onListo: () => void;
  onCerrar: () => void;
}) {
  const [medios, setMedios] = useState<MediosPago | null>(null);
  const [metodo, setMetodo] = useState<MetodoAbono>('YAPE');
  const [monto, setMonto] = useState(Math.min(sugerido > 0 ? sugerido : disponible, disponible).toFixed(2));
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [operacion, setOperacion] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [vistas, setVistas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    misCompras.mediosPago(subdominio)
      .then((m) => { if (vivo) { setMedios(m); setCuentaId(m.cuentas[0]?.id ?? null); } })
      .catch(() => { if (vivo) setMedios({ qrYapeUrl: null, qrPlinUrl: null, cuentas: [] }); });
    return () => { vivo = false; };
  }, [subdominio]);

  // Las vistas previas de las capturas (y su limpieza).
  useEffect(() => {
    const urls = archivos.map((f) => URL.createObjectURL(f));
    setVistas(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [archivos]);

  const agregar = (lista: FileList | null) => {
    if (!lista?.length) return;
    const nuevas = [...archivos, ...Array.from(lista)];
    if (nuevas.length > MAX_CAPTURAS) setError(`Puedes subir hasta ${MAX_CAPTURAS} capturas por pago`);
    setArchivos(nuevas.slice(0, MAX_CAPTURAS));
    if (inputRef.current) inputRef.current.value = '';
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) onCerrar(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [enviando, onCerrar]);

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(texto); setTimeout(() => setCopiado(null), 1800); } catch { /* sin permiso */ }
  };

  const valor = Number(monto.replace(',', '.'));
  const qr = metodo === 'YAPE' ? medios?.qrYapeUrl : metodo === 'PLIN' ? medios?.qrPlinUrl : null;
  const sinCuentas = metodo === 'TRANSFERENCIA' && medios !== null && medios.cuentas.length === 0;

  const enviar = async () => {
    setError(null);
    if (!(valor > 0)) return setError('Escribe el monto que pagaste');
    if (valor > disponible + 0.005) return setError(`El monto no puede ser mayor a ${soles(disponible)}`);
    if (metodo === 'TRANSFERENCIA' && !cuentaId) return setError('Elige la cuenta a la que transferiste');
    if (archivos.length === 0) return setError('Sube la captura de tu pago');
    setEnviando(true);
    try {
      await misCompras.reportarAbono(subdominio, ventaId, {
        monto: Math.round(valor * 100) / 100,
        metodoPago: metodo,
        numeroOperacion: operacion,
        empresaBancoId: metodo === 'TRANSFERENCIA' ? cuentaId ?? undefined : undefined,
        comprobantes: archivos,
      });
      setListo(true);
      onListo();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo enviar tu pago. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Abonar a ${codigo}`} onClick={() => !enviando && onCerrar()}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-[17px] font-medium text-gray-900">Abonar a {codigo}</h2>
            <p className="text-xs text-gray-500">Puedes pagar hasta {soles(disponible)}</p>
          </div>
          <button type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar" className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {listo ? (
          <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
            <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f7ee', color: '#146c3a' }}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            <p className="text-base font-medium text-gray-900">Recibimos tu pago de {soles(valor)}</p>
            <p className="text-sm text-gray-500 max-w-sm">La tienda lo va a revisar. Mientras tanto aparece como <b className="font-medium text-gray-700">en revisión</b> y tu saldo baja cuando lo confirmen.</p>
            <button type="button" onClick={onCerrar} className="mt-2 h-11 px-6 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: colors.primario }}>Entendido</button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-gray-600">¿Cuánto vas a pagar?</span>
                <div className="flex items-center h-12 rounded-xl border border-gray-200 px-3.5 focus-within:border-gray-400">
                  <span className="text-gray-500 mr-1.5">S/</span>
                  <input
                    value={monto}
                    onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
                    inputMode="decimal"
                    className="flex-1 min-w-0 outline-none text-lg font-medium tabular-nums text-gray-900"
                  />
                  {valor !== disponible && (
                    <button type="button" onClick={() => setMonto(disponible.toFixed(2))} className="text-xs font-medium" style={{ color: colors.primario }}>Todo ({soles(disponible)})</button>
                  )}
                </div>
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-gray-600">¿Cómo vas a pagar?</span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Método de pago">
                  {METODOS.map((m) => {
                    const activo = metodo === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setMetodo(m.id)}
                        className="h-11 rounded-xl border-2 text-sm font-medium transition-colors"
                        style={activo ? { borderColor: m.color, backgroundColor: alpha(m.color, 0.08), color: m.color } : { borderColor: '#e5e7eb', color: '#4b5563' }}
                      >
                        {m.texto}
                      </button>
                    );
                  })}
                </div>
              </div>

              {medios === null ? (
                <div className="flex justify-center py-6"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" /></div>
              ) : metodo === 'TRANSFERENCIA' ? (
                sinCuentas ? (
                  <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">La tienda todavía no registró cuentas bancarias. Paga con Yape o Plin.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-gray-600">Transfiere a una de estas cuentas y elige a cuál:</span>
                    {medios.cuentas.map((c) => {
                      const activa = cuentaId === c.id;
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl border-2 px-3.5 py-2.5 flex flex-col gap-1.5"
                          style={{ borderColor: activa ? colors.primario : '#e5e7eb' }}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="radio" name="cuenta" checked={activa} onChange={() => setCuentaId(c.id)} className="w-4 h-4" style={{ accentColor: colors.primario }} />
                            <span className="text-sm font-medium text-gray-900">{c.banco}</span>
                            <span className="text-xs text-gray-500">{c.tipoCuenta === 'CORRIENTE' ? 'Cuenta corriente' : 'Cuenta de ahorros'}</span>
                          </label>
                          <Dato etiqueta="Número" valor={c.numero} copiado={copiado === c.numero} onCopiar={() => void copiar(c.numero)} colors={colors} />
                          {c.cci && <Dato etiqueta="CCI" valor={c.cci} copiado={copiado === c.cci} onCopiar={() => void copiar(c.cci!)} colors={colors} />}
                          {c.titular && <span className="text-xs text-gray-500">Titular: {c.titular}</span>}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-slate-50 px-4 py-4 flex flex-col items-center gap-2 text-center">
                  {qr ? (
                    <>
                      <img src={qr} alt={`QR de ${metodo === 'YAPE' ? 'Yape' : 'Plin'} de la tienda`} className="w-48 h-48 object-contain rounded-lg bg-white" />
                      <p className="text-sm text-gray-600">Escanea el QR con tu app de {metodo === 'YAPE' ? 'Yape' : 'Plin'} y paga <b className="font-medium text-gray-900">{valor > 0 ? soles(valor) : 'el monto'}</b>.</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">La tienda no subió su QR de {metodo === 'YAPE' ? 'Yape' : 'Plin'}. Paga al número que te dieron en la tienda y sube la captura.</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-gray-600">Sube la captura de tu pago</span>
                <span className="text-xs text-gray-400 -mt-1">¿Lo pagaste en varios Yape? Sube una captura por cada uno (hasta {MAX_CAPTURAS}).</span>
                <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => agregar(e.target.files)} />
                {vistas.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {vistas.map((v, i) => (
                      <div key={v} className="relative w-20 h-20">
                        <img src={v} alt={`Captura ${i + 1}`} className="w-full h-full rounded-xl object-cover ring-1 ring-gray-200" />
                        <button
                          type="button"
                          onClick={() => setArchivos((a) => a.filter((_, j) => j !== i))}
                          aria-label={`Quitar captura ${i + 1}`}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-900/80 text-white flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      </div>
                    ))}
                    {archivos.length < MAX_CAPTURAS && (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 flex flex-col items-center justify-center gap-0.5 text-xs hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        Otra
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="h-20 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 flex flex-col items-center justify-center gap-1 hover:bg-gray-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
                    Elegir imagen(es)
                  </button>
                )}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-gray-600">N° de operación <span className="text-gray-400">(opcional)</span></span>
                <input
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value.slice(0, 40))}
                  className="h-11 rounded-xl border border-gray-200 px-3.5 outline-none focus:border-gray-400 text-sm"
                  placeholder="Ej: 12345678"
                />
              </label>

              {error && <p className="text-sm text-[#b42318]">{error}</p>}
            </div>
            <div className="px-5 py-3.5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={enviando || sinCuentas}
                className="w-full h-12 rounded-xl text-white text-[15px] font-medium disabled:opacity-60"
                style={{ backgroundColor: colors.primario }}
              >
                {enviando ? 'Enviando...' : `Enviar pago${valor > 0 ? ` de ${soles(valor)}` : ''}`}
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">Tu saldo baja cuando la tienda confirme el pago.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, copiado, onCopiar, colors }: { etiqueta: string; valor: string; copiado: boolean; onCopiar: () => void; colors: TiendaColors }) {
  return (
    <div className="flex items-center justify-between gap-2 pl-6">
      <span className="text-xs text-gray-500">{etiqueta}</span>
      <button type="button" onClick={onCopiar} className="flex items-center gap-2 min-h-[32px] text-sm tabular-nums text-gray-900">
        {valor}
        <span className="text-xs font-medium" style={{ color: colors.primario }}>{copiado ? 'Copiado' : 'Copiar'}</span>
      </button>
    </div>
  );
}
