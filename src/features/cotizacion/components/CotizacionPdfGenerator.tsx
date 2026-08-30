'use client';

import { useState, useCallback } from 'react';
import type { Cotizacion } from '@/core/types/cotizacion';
import { vendedorParaTicket } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as cfgService from '@/features/configuracion-documentos/services/configuracion-documentos-service';
import { hexARgb, margenesDePlantilla } from '@/core/types/configuracion-documentos';

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

/** `jspdf-autotable` cuelga esto del doc en runtime, pero no lo declara. */
type DocConAutoTable = { lastAutoTable?: { finalY: number } };

/**
 * El logo como data URL, que es lo unico que jsPDF sabe dibujar.
 *
 * Devuelve null ante cualquier problema --CORS, 404, formato raro-- a
 * proposito: el PDF tiene que salir igual. Quedarse sin cotizacion por un
 * logo que no carga seria mucho peor que una cotizacion sin logo.
 */
async function cargarLogo(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

      // La marca y la plantilla de COTIZACION, resueltas por el backend. Si no
      // se pueden traer, el PDF sale con los valores de siempre: un documento
      // sin los colores de la empresa es mejor que ningun documento.
      const cfg = await cfgService
        .getConfiguracionCompleta('COTIZACION', { formato: 'A4', sedeId: c.sedeId ?? undefined })
        .catch(() => null);
      const marca = cfg?.configuracion;
      const plt = cfg?.plantilla;
      const ver = (k: keyof NonNullable<typeof plt>) => (plt ? Boolean(plt[k]) : true);

      const mrg = plt ? margenesDePlantilla(plt) : { top: 20, bottom: 10, left: 15, right: 15 };
      const colorEnc = hexARgb(plt?.colorEncabezado || marca?.colorPrimario || '#004A94');
      const colorTxt = hexARgb(plt?.colorCuerpo || marca?.colorTexto || '#000000');
      const logoData = ver('mostrarLogo') ? await cargarLogo(marca?.logoUrl) : null;

      const doc = new jsPDF('p', 'mm', 'a4');
      const docAT = doc as unknown as DocConAutoTable;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginL = mrg.left;
      const marginR = mrg.right;
      // `margin` se conserva como el izquierdo porque es el que usa casi todo
      // el layout; el derecho solo aparece al alinear a la derecha.
      const margin = marginL;
      let y = mrg.top + 5;

      doc.setTextColor(...colorTxt);

      // El logo va arriba a la derecha; el titulo baja lo necesario para no
      // pisarlo (ver el Math.max de mas abajo).
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', pageWidth - marginR - 28, mrg.top, 28, 14, undefined, 'FAST');
        } catch {
          // Formato que jsPDF no digiere: se sigue sin logo.
        }
      }

      // Header - Empresa. El nombre comercial manda sobre la razon social: es
      // el que el cliente reconoce.
      if (ver('mostrarDatosEmpresa')) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(
          marca?.nombreComercial || empresa?.nombre || empresa?.razonSocial || 'Empresa',
          margin, y,
        );
        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        // Los datos fiscales salen de `completa` (que ya aplico la sede) y
        // caen al contexto de empresa si no vinieron.
        const ruc = marca?.ruc ?? empresa?.ruc;
        const direccion = marca?.direccion ?? empresa?.direccionFiscal;
        const telefono = marca?.telefono ?? empresa?.telefono;
        const email = marca?.email ?? empresa?.email;
        if (ruc) {
          doc.text(`RUC: ${ruc}`, margin, y);
          y += 4;
        }
        if (direccion) {
          doc.text(direccion, margin, y);
          y += 4;
        }
        if (telefono || email) {
          doc.text([telefono, email].filter(Boolean).join(' | '), margin, y);
          y += 4;
        }
      }

      // Con logo, el titulo nunca sube por encima de su base.
      if (logoData) y = Math.max(y, mrg.top + 16);

      // Cotizacion title
      y += 4;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colorEnc);
      doc.text(`COTIZACION ${c.codigo}`, pageWidth - marginR, y, { align: 'right' });
      doc.setTextColor(...colorTxt);
      y += 3;

      // Linea separadora
      doc.setDrawColor(...colorEnc);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - marginR, y);
      y += 6;

      // Info general + Cliente
      doc.setFontSize(9);
      const col1X = margin;
      const col2X = pageWidth / 2 + 5;

      // Left column - General
      doc.setFont('helvetica', 'bold');
      doc.text('Informacion General', col1X, y);
      if (ver('mostrarDatosCliente')) doc.text('Cliente', col2X, y);
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

      const clienteLines = !ver('mostrarDatosCliente') ? [] : [
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

      if (!ver('mostrarDetalles')) {
        // Sin detalle no hay tabla, pero los totales tienen que seguir
        // apoyandose en algun lado.
        docAT.lastAutoTable = { finalY: y };
      } else if (mode === 'interno') {
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
            fillColor: colorEnc,
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
          margin: { left: marginL, right: marginR },
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
            fillColor: colorEnc,
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'right', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 30 },
          },
          margin: { left: marginL, right: marginR },
        });
      }

      // Totals
      y = (docAT.lastAutoTable?.finalY ?? y) + 8;

      const totalsX = pageWidth - marginR - 60;
      doc.setFontSize(9);

      if (ver('mostrarTotales') && mode === 'interno') {
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX, y);
        doc.text(`${currSymbol} ${fmt(c.subtotal)}`, pageWidth - marginR, y, { align: 'right' });
        y += 5;

        if (c.descuento > 0) {
          doc.text('Descuento:', totalsX, y);
          doc.setTextColor(220, 38, 38);
          doc.text(`-${currSymbol} ${fmt(c.descuento)}`, pageWidth - marginR, y, { align: 'right' });
          doc.setTextColor(...colorTxt);
          y += 5;
        }

        doc.text('IGV:', totalsX, y);
        doc.text(`${currSymbol} ${fmt(c.impuestos)}`, pageWidth - marginR, y, { align: 'right' });
        y += 5;
      }

      if (ver('mostrarTotales')) {
        doc.setDrawColor(200, 200, 200);
        doc.line(totalsX, y, pageWidth - marginR, y);
        y += 5;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX, y);
        doc.text(`${currSymbol} ${fmt(c.total)}`, pageWidth - marginR, y, { align: 'right' });
        y += 10;
      }

      // Observaciones y condiciones
      doc.setFontSize(9);
      if (c.observaciones && ver('mostrarObservaciones')) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(c.observaciones, pageWidth - margin * 2);
        doc.text(obsLines, margin, y);
        y += obsLines.length * 4 + 4;
      }

      if (c.condiciones && ver('mostrarCondiciones')) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Condiciones:', margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const condLines = doc.splitTextToSize(c.condiciones, pageWidth - margin * 2);
        doc.text(condLines, margin, y);
      }

      // Espacio de firma: se ancla ABAJO y no despues del texto, porque es
      // donde el cliente espera firmar aunque la cotizacion sea corta.
      if (ver('mostrarFirma')) {
        const yFirma = pageHeight - mrg.bottom - 22;
        if (yFirma > y) {
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.3);
          doc.line(pageWidth - marginR - 60, yFirma, pageWidth - marginR, yFirma);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('Firma y sello', pageWidth - marginR - 30, yFirma + 4, { align: 'center' });
          doc.setTextColor(...colorTxt);
        }
      }

      // Pie y paginacion, en TODAS las paginas: el pie de la ultima no sirve
      // si el cliente imprime la primera.
      const paginas = doc.getNumberOfPages();
      for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        if (ver('mostrarPiePagina') && marca?.textoPiePagina) {
          doc.text(marca.textoPiePagina, pageWidth / 2, pageHeight - mrg.bottom, { align: 'center' });
        }
        if (marca?.mostrarPaginacion ?? true) {
          doc.text(`${i} / ${paginas}`, pageWidth - marginR, pageHeight - mrg.bottom, { align: 'right' });
        }
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
