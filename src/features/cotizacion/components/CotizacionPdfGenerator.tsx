'use client';

import { useState, useCallback } from 'react';
import type { Cotizacion } from '@/core/types/cotizacion';
import { vendedorParaTicket } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

interface Props {
  cotizacion: Cotizacion;
  onClose: () => void;
}

const TIPO_AFECTACION_LABELS: Record<string, string> = {
  '10': 'Gravado',
  '20': 'Exonerado',
  '30': 'Inafecto',
};

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date?: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE');
}

export default function CotizacionPdfGenerator({ cotizacion, onClose }: Props) {
  const { empresa } = useEmpresa();
  const [mode, setMode] = useState<'interno' | 'cliente'>('interno');
  const [generating, setGenerating] = useState(false);

  const c = cotizacion;
  const currSymbol = c.moneda === 'USD' ? '$' : 'S/';
  // Alias del vendedor tiene prioridad (paridad Flutter vendedorParaTicket)
  const vendedorNombre = vendedorParaTicket(c) || '-';

  const generatePdf = useCallback(async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Header - Empresa
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(empresa?.nombre || empresa?.razonSocial || 'Empresa', margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (empresa?.ruc) {
        doc.text(`RUC: ${empresa.ruc}`, margin, y);
        y += 4;
      }
      if (empresa?.direccionFiscal) {
        doc.text(empresa.direccionFiscal, margin, y);
        y += 4;
      }
      if (empresa?.telefono || empresa?.email) {
        doc.text(
          [empresa?.telefono, empresa?.email].filter(Boolean).join(' | '),
          margin, y
        );
        y += 4;
      }

      // Cotizacion title
      y += 4;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 74, 148);
      doc.text(`COTIZACION ${c.codigo}`, pageWidth - margin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 3;

      // Linea separadora
      doc.setDrawColor(0, 74, 148);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Info general + Cliente
      doc.setFontSize(9);
      const col1X = margin;
      const col2X = pageWidth / 2 + 5;

      // Left column - General
      doc.setFont('helvetica', 'bold');
      doc.text('Informacion General', col1X, y);
      doc.text('Cliente', col2X, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      const infoLines = [
        ['Codigo:', c.codigo],
        ['Fecha:', formatDate(c.fechaEmision)],
        ['Vencimiento:', c.fechaVencimiento ? formatDate(c.fechaVencimiento) : '-'],
        ['Vendedor:', vendedorNombre],
        ['Sede:', c.sede?.nombre || '-'],
        ['Moneda:', c.moneda],
      ];

      if (c.nombre) infoLines.splice(1, 0, ['Nombre:', c.nombre]);

      const clienteLines = [
        ['Nombre:', c.nombreCliente],
        ['Documento:', c.documentoCliente || '-'],
        ['Email:', c.emailCliente || '-'],
        ['Telefono:', c.telefonoCliente || '-'],
        ['Direccion:', c.direccionCliente || '-'],
      ];

      const maxLines = Math.max(infoLines.length, clienteLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (infoLines[i]) {
          doc.setFont('helvetica', 'bold');
          doc.text(infoLines[i][0], col1X, y);
          doc.setFont('helvetica', 'normal');
          doc.text(infoLines[i][1], col1X + 25, y);
        }
        if (clienteLines[i]) {
          doc.setFont('helvetica', 'bold');
          doc.text(clienteLines[i][0], col2X, y);
          doc.setFont('helvetica', 'normal');
          doc.text(clienteLines[i][1], col2X + 25, y);
        }
        y += 4.5;
      }

      y += 4;

      // Items table
      const detalles = c.detalles?.sort((a, b) => a.orden - b.orden) || [];

      if (mode === 'interno') {
        // Full detail table
        const tableHead = [['#', 'Descripcion', 'Cant.', 'P. Unit.', 'Desc.', 'IGV', 'Total']];
        const tableBody = detalles.map((d, i) => [
          String(i + 1),
          d.descripcion,
          String(d.cantidad),
          `${currSymbol} ${fmt(d.precioUnitario)}`,
          d.descuento > 0 ? `${currSymbol} ${fmt(d.descuento)}` : '-',
          `${currSymbol} ${fmt(d.igv)}`,
          `${currSymbol} ${fmt(d.total)}`,
        ]);

        autoTable(doc, {
          startY: y,
          head: tableHead,
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 74, 148],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'right', cellWidth: 15 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 25 },
          },
          margin: { left: margin, right: margin },
        });
      } else {
        // Client mode - simplified
        const tableHead = [['#', 'Descripcion', 'Cant.', 'Total']];
        const tableBody = detalles.map((d, i) => [
          String(i + 1),
          d.descripcion,
          String(d.cantidad),
          `${currSymbol} ${fmt(d.total)}`,
        ]);

        autoTable(doc, {
          startY: y,
          head: tableHead,
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 74, 148],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'right', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
        });
      }

      // Totals
      y = (doc as any).lastAutoTable.finalY + 8;

      const totalsX = pageWidth - margin - 60;
      doc.setFontSize(9);

      if (mode === 'interno') {
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX, y);
        doc.text(`${currSymbol} ${fmt(c.subtotal)}`, pageWidth - margin, y, { align: 'right' });
        y += 5;

        if (c.descuento > 0) {
          doc.text('Descuento:', totalsX, y);
          doc.setTextColor(220, 38, 38);
          doc.text(`-${currSymbol} ${fmt(c.descuento)}`, pageWidth - margin, y, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          y += 5;
        }

        doc.text('IGV:', totalsX, y);
        doc.text(`${currSymbol} ${fmt(c.impuestos)}`, pageWidth - margin, y, { align: 'right' });
        y += 5;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX, y, pageWidth - margin, y);
      y += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', totalsX, y);
      doc.text(`${currSymbol} ${fmt(c.total)}`, pageWidth - margin, y, { align: 'right' });
      y += 10;

      // Observaciones y condiciones
      doc.setFontSize(9);
      if (c.observaciones) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(c.observaciones, pageWidth - margin * 2);
        doc.text(obsLines, margin, y);
        y += obsLines.length * 4 + 4;
      }

      if (c.condiciones) {
        doc.setFont('helvetica', 'bold');
        doc.text('Condiciones:', margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const condLines = doc.splitTextToSize(c.condiciones, pageWidth - margin * 2);
        doc.text(condLines, margin, y);
      }

      // Save
      const filename = `cotizacion_${c.codigo}_${mode}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGenerating(false);
    }
  }, [c, mode, empresa, vendedorNombre, currSymbol]);

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
