'use client';

import { useState, useCallback } from 'react';
import type { Cotizacion } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { construirCotizacionPdf, type ModoCotizacionPdf } from './cotizacion-pdf';

interface Props {
  cotizacion: Cotizacion;
  onClose: () => void;
}

export default function CotizacionPdfGenerator({ cotizacion, onClose }: Props) {
  const { empresa } = useEmpresa();
  const [mode, setMode] = useState<ModoCotizacionPdf>('interno');
  const [generating, setGenerating] = useState(false);

  const c = cotizacion;

  const generatePdf = useCallback(async () => {
    setGenerating(true);
    try {
      const doc = await construirCotizacionPdf({ cotizacion: c, mode, empresa });
      doc.save(`cotizacion_${c.codigo}_${mode}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGenerating(false);
    }
  }, [c, mode, empresa]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
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
