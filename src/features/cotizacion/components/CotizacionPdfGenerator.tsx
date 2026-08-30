'use client';

import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { Cotizacion } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as whatsappService from '@/features/whatsapp/services/whatsapp-service';
import { construirCotizacionPdf, type ModoCotizacionPdf } from './cotizacion-pdf';

interface Props {
  cotizacion: Cotizacion;
  onClose: () => void;
}

const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/** `data:application/pdf;base64,AAA…` → `AAA…`. El backend lo quiere pelado. */
function base64Pelado(dataUri: string): string {
  const coma = dataUri.indexOf(',');
  return coma >= 0 ? dataUri.slice(coma + 1) : dataUri;
}

export default function CotizacionPdfGenerator({ cotizacion, onClose }: Props) {
  const { empresa } = useEmpresa();
  const [mode, setMode] = useState<ModoCotizacionPdf>('interno');
  const [generating, setGenerating] = useState(false);

  const c = cotizacion;

  // ── WhatsApp ──
  const [enviarWa, setEnviarWa] = useState(false);
  const [numero, setNumero] = useState(c.telefonoCliente ?? '');
  const [waConectado, setWaConectado] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!empresa?.id) return;
    let cancelado = false;
    whatsappService
      .getEstado(empresa.id)
      .then(e => { if (!cancelado) setWaConectado(e.conectado); })
      // Sin respuesta se asume NO conectado: prometer un envío que va a fallar
      // es peor que ofrecer la descarga, que siempre funciona.
      .catch(() => { if (!cancelado) setWaConectado(false); });
    return () => { cancelado = true; };
  }, [empresa?.id]);

  const generatePdf = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await construirCotizacionPdf({ cotizacion: c, mode, empresa });
      doc.save(`cotizacion_${c.codigo}_${mode}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('No se pudo generar el PDF');
    } finally {
      setGenerating(false);
    }
  }, [c, mode, empresa]);

  const enviarPorWhatsapp = async () => {
    if (!empresa?.id) return;
    const tel = numero.replace(/\D/g, '');
    if (tel.length < 9) { setError('Ingresá un celular válido'); return; }

    setEnviando(true);
    setError(null);
    try {
      // El PDF se arma acá, no en el backend: la plantilla y la marca viven en
      // el cliente, y regenerarlo del otro lado sería mantener dos veces el
      // mismo documento.
      const doc = await construirCotizacionPdf({ cotizacion: c, mode, empresa });
      const nombreArchivo = `cotizacion_${c.codigo}.pdf`;
      await whatsappService.enviarDocumento(empresa.id, {
        numero: tel,
        base64: base64Pelado(doc.output('datauristring')),
        nombreArchivo,
        caption: `Hola${c.nombreCliente ? ` ${c.nombreCliente}` : ''}, te enviamos la cotización ${c.codigo}.`,
      });
      setEnviado(true);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo enviar por WhatsApp');
    } finally {
      setEnviando(false);
    }
  };

  const ocupado = generating || enviando;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Generar PDF</h3>
        <p className="mt-1 text-sm text-gray-500">Cotizacion {c.codigo}</p>

        <div className="mt-4 space-y-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Modo</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode('interno')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                mode === 'interno'
                  ? 'border-[#004A94] bg-[#004A94]/5 text-[#004A94]'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Interno</div>
              <div className="mt-1 text-xs opacity-70">Todos los precios y detalles</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('cliente')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                mode === 'cliente'
                  ? 'border-[#004A94] bg-[#004A94]/5 text-[#004A94]'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Cliente</div>
              <div className="mt-1 text-xs opacity-70">Solo total por item</div>
            </button>
          </div>
        </div>

        {/* ── Enviar por WhatsApp ── */}
        <div className="mt-4 rounded-lg border border-gray-200 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={enviarWa}
              onChange={e => { setEnviarWa(e.target.checked); setEnviado(false); setError(null); }}
              disabled={waConectado === false}
              className="mt-0.5 accent-[#004A94]"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-800">Enviar por WhatsApp</span>
              {waConectado === null && (
                <span className="block text-[11px] text-gray-400">Verificando la línea…</span>
              )}
              {waConectado === false && (
                // Sin línea vinculada no hay plan B: `wa.me` abre un chat pero
                // NO puede adjuntar archivos. Se dice, en vez de ofrecer algo
                // que no va a mandar nada.
                <span className="block text-[11px] text-amber-600">
                  La empresa no tiene su línea vinculada. Vinculala en Administración → WhatsApp
                  de la empresa, o descargá el PDF y mandalo vos.
                </span>
              )}
            </span>
          </label>

          {enviarWa && waConectado && (
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Celular del cliente
              </label>
              <input
                value={numero}
                onChange={e => { setNumero(e.target.value); setEnviado(false); }}
                placeholder="987654321"
                inputMode="tel"
                className={`${INPUT_STD} w-full`}
              />
              <p className="mt-1 text-[10px] text-gray-400">
                {c.telefonoCliente
                  ? 'Viene de la ficha del cliente. Se puede cambiar solo para este envío.'
                  : 'El cliente no tiene teléfono registrado: escribilo acá.'}
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        {enviado && (
          <p className="mt-3 text-xs font-semibold text-green-700">
            Cotización enviada al {numero}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {enviado ? 'Cerrar' : 'Cancelar'}
          </button>
          {enviarWa && waConectado ? (
            <button
              onClick={enviarPorWhatsapp}
              disabled={ocupado}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {enviando && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {enviando ? 'Enviando…' : enviado ? 'Enviar de nuevo' : 'Enviar por WhatsApp'}
            </button>
          ) : (
            <button
              onClick={generatePdf}
              disabled={ocupado}
              className="flex items-center gap-2 rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
            >
              {generating && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {generating ? 'Generando...' : 'Descargar PDF'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
