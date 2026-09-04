'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Cotizacion } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as cfgService from '@/features/configuracion-documentos/services/configuracion-documentos-service';
import EnviarPorWhatsappDialog from '@/features/whatsapp/components/EnviarPorWhatsappDialog';
import { construirCotizacionPdf, type ModoCotizacionPdf } from './cotizacion-pdf';

interface Props {
  cotizacion: Cotizacion;
  onClose: () => void;
}

export default function CotizacionPdfGenerator({ cotizacion, onClose }: Props) {
  const { empresa } = useEmpresa();
  const [mode, setMode] = useState<ModoCotizacionPdf>('interno');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // El nombre con el que la empresa se presenta. Sale de la MISMA fuente que
  // el encabezado del PDF, para que el mensaje y el documento no digan
  // nombres distintos.
  const [nombreMarca, setNombreMarca] = useState<string>('');

  const c = cotizacion;

  useEffect(() => {
    let cancelado = false;
    cfgService
      .getConfiguracion()
      .then((cfg) => {
        if (!cancelado) setNombreMarca(cfg.nombreComercial?.trim() ?? '');
      })
      // Sin configuracion se cae al nombre de la empresa, mas abajo.
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const marca = nombreMarca || empresa?.nombre || empresa?.razonSocial || 'la empresa';

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

  // El PDF se arma acá y no en el backend: la plantilla y la marca viven en el
  // cliente, y regenerarlo del otro lado seria mantener dos veces el mismo
  // documento. Se arma al enviar, no al abrir el cuadro.
  const construirAdjunto = useCallback(
    async () =>
      (await construirCotizacionPdf({ cotizacion: c, mode, empresa })).output('blob'),
    [c, mode, empresa],
  );

  if (enviando) {
    return (
      <EnviarPorWhatsappDialog
        titulo="Enviar cotización"
        textoInicial={
          `Hola, te saludamos tus amigos de ${marca}. ` +
          `Te enviamos la cotización ${c.codigo}.`
        }
        numeroInicial={c.telefonoCliente ?? ''}
        ayudaNumero={
          c.telefonoCliente
            ? 'Viene de la ficha del cliente. Se puede cambiar solo para este envío.'
            : 'El cliente no tiene teléfono registrado: escribilo acá.'
        }
        adjunto={{
          nombre: `cotizacion_${c.codigo}.pdf`,
          detalle: `Cotización ${c.codigo} · modo ${mode}`,
          tipo: 'pdf',
          construir: construirAdjunto,
        }}
        onClose={() => setEnviando(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generar PDF"
        className="w-full max-w-sm rounded-xl bg-white p-6 font-sans shadow-xl"
      >
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

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          {/* Enviar por WhatsApp NO depende de que la línea esté vinculada: el
              cuadro decide solo si sale desde el sistema o abre WhatsApp con el
              PDF descargado. Antes, sin vinculación, este camino ni se ofrecía. */}
          <button
            onClick={() => setEnviando(true)}
            disabled={generating}
            className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#1da851] disabled:opacity-50"
          >
            WhatsApp
          </button>
          <button
            onClick={generatePdf}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
          >
            {generating && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {generating ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
