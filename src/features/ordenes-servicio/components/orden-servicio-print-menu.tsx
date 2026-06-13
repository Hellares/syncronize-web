'use client';

// Acciones de impresión de la orden: PDF A4 (jsPDF) + ticket térmico 80/58mm (QZ Tray).
// Paridad con el detalle de OS de Flutter (pdf_orden_servicio_generator + ticket_esc_pos_generator).

import { useState } from 'react';
import type { OrdenServicio } from '@/core/types/orden-servicio';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { generarTicketOrdenServicio } from '@/features/impresion/escpos';
import { getImpresoraConfig, imprimirEnPrincipal } from '@/features/impresion/qz-service';
import ImpresoraConfigDialog from '@/features/impresion/ImpresoraConfigDialog';
import { descargarPdfOrdenServicio } from './orden-servicio-pdf';

export function OrdenServicioPrintMenu({ orden }: { orden: OrdenServicio }) {
  const { empresa } = useEmpresa();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [termBusy, setTermBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const onPdf = async () => {
    setPdfBusy(true);
    try { await descargarPdfOrdenServicio(orden, empresa ?? {}); }
    catch { flash('⚠ No se pudo generar el PDF'); }
    finally { setPdfBusy(false); }
  };

  const onTermica = async () => {
    const ic = getImpresoraConfig();
    if (!ic) { setShowConfig(true); return; }
    setTermBusy(true);
    try {
      const bytes = generarTicketOrdenServicio(orden, {
        nombreComercial: empresa?.nombre,
        razonSocial: empresa?.razonSocial,
        ruc: empresa?.ruc,
        direccionFiscal: empresa?.direccionFiscal,
        telefono: empresa?.telefono,
      }, ic.paperWidth);
      await imprimirEnPrincipal(bytes);
      flash('✓ Enviado a la impresora');
    } catch (err) {
      flash(`⚠ ${err instanceof Error ? err.message : 'Error al imprimir'} — ¿QZ Tray está corriendo?`);
    } finally {
      setTermBusy(false);
    }
  };

  return (
    <>
      <button onClick={onPdf} disabled={pdfBusy}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        {pdfBusy ? 'PDF...' : '📄 PDF'}
      </button>
      <button onClick={onTermica} disabled={termBusy}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        {termBusy ? '...' : '🖨 Térmica'}
      </button>
      <button onClick={() => setShowConfig(true)} title="Configurar impresora"
        className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {msg && <span className={`text-[11px] ${msg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</span>}
      <ImpresoraConfigDialog
        isOpen={showConfig}
        onSaved={(cfg) => { setShowConfig(false); if (cfg) flash(`Impresora: ${cfg.impresoraNombre} (${cfg.paperWidth}mm)`); }}
        onClose={() => setShowConfig(false)}
      />
    </>
  );
}
