// Hoja de derivación A4 de una tercerización B2B (paridad pdf_tercerizacion_generator.dart).
// Mismo patrón jsPDF + autotable que orden-servicio-pdf.ts.

import type { Tercerizacion, TercerizacionNota, TercerizacionComponente, DatoAdicional } from '@/core/types/tercerizacion';
import { ESTADO_TERCERIZACION_CONFIG } from '@/core/types/tercerizacion';

function fmt(n: number | undefined | null): string {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function valorAdicional(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(valorAdicional).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${val}`).join(' · ');
  return String(v);
}

/** Genera y descarga la hoja de derivación A4 de la tercerización. */
export async function descargarHojaDerivacion(t: Tercerizacion, notas: TercerizacionNota[] = []): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Título
  doc.setFontSize(15).setFont('helvetica', 'bold').setTextColor(0, 74, 148);
  doc.text('HOJA DE DERIVACIÓN', margin, y);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(`Orden: ${t.ordenOrigen?.codigo ?? t.id}`, pageWidth - margin, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(0, 74, 148).setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Empresas origen → destino
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Empresa origen (deriva)', margin, y);
  doc.text('Empresa destino (ejecuta)', pageWidth / 2 + 5, y);
  y += 5;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const o = t.empresaOrigen, d = t.empresaDestino;
  const origenLines = [o?.nombre ?? '-', o?.ruc ? `RUC: ${o.ruc}` : '', o?.telefono ?? '', o?.direccionFiscal ?? ''].filter(Boolean);
  const destinoLines = [d?.nombre ?? '-', d?.telefono ?? '', d?.direccionFiscal ?? '', d?.distrito ?? ''].filter(Boolean);
  const maxLines = Math.max(origenLines.length, destinoLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (origenLines[i]) doc.text(doc.splitTextToSize(origenLines[i], pageWidth / 2 - margin - 5), margin, y);
    if (destinoLines[i]) doc.text(doc.splitTextToSize(destinoLines[i], pageWidth / 2 - margin - 5), pageWidth / 2 + 5, y);
    y += 4.5;
  }
  y += 2;

  doc.setFontSize(9).setFont('helvetica', 'bold'); doc.text('Estado:', margin, y);
  doc.setFont('helvetica', 'normal'); doc.text(ESTADO_TERCERIZACION_CONFIG[t.estado]?.label ?? t.estado, margin + 18, y);
  doc.setFont('helvetica', 'bold'); doc.text('Solicitada:', pageWidth / 2 + 5, y);
  doc.setFont('helvetica', 'normal'); doc.text(fmtFecha(t.fechaSolicitud), pageWidth / 2 + 28, y);
  y += 7;

  // Equipo
  const eq = (t.datosEquipo ?? {}) as Record<string, unknown>;
  const equipoPartes = [eq.tipoEquipo, eq.marcaEquipo, eq.modeloEquipo, eq.serieEquipo ? `S/N: ${eq.serieEquipo}` : null].filter(Boolean).map(String);
  if (equipoPartes.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.text('Equipo:', margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(equipoPartes.join(' · '), margin + 18, y);
    y += 5;
  }
  if (eq.condicionEquipo) {
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(`Condición: ${eq.condicionEquipo}`, pageWidth - margin * 2), margin, y);
    y += 5;
  }

  // Problema + síntomas
  if (t.descripcionProblema) {
    doc.setFont('helvetica', 'bold'); doc.text('Problema:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(t.descripcionProblema, pageWidth - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 4 + 2;
  }
  if (Array.isArray(t.sintomas) && t.sintomas.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(`Síntomas: ${(t.sintomas as unknown[]).map(String).join(', ')}`, pageWidth - margin * 2), margin, y);
    y += 6;
  }

  // Componentes
  const comps = Array.isArray(t.componentesData) ? (t.componentesData as TercerizacionComponente[]) : [];
  if (comps.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Componente', 'Acción', 'Detalle']],
      body: comps.map(c => [
        c.componente?.nombre ?? c.componente?.codigo ?? '-',
        (c.tipoAccion ?? '').replace(/_/g, ' '),
        [c.descripcionAccion, c.observaciones].filter(Boolean).join(' · '),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 74, 148], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'center', cellWidth: 28 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  }

  // Datos adicionales
  const adicionales = (t.datosAdicionales ?? []) as DatoAdicional[];
  const adicionalesRows = adicionales.map(a => [a.etiqueta, valorAdicional(a.valor)]).filter(r => r[1]);
  if (adicionalesRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Dato adicional', 'Valor']],
      body: adicionalesRows,
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  }

  // Precio B2B
  if (t.precioB2B != null) {
    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text('Precio B2B:', pageWidth - margin - 50, y);
    doc.text(`S/ ${fmt(t.precioB2B)}`, pageWidth - margin, y, { align: 'right' });
    y += 7;
  }

  // Bitácora
  if (notas.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Fecha', 'Contenido']],
      body: notas.map(n => [n.tipo, fmtFecha(n.creadoEn), n.contenido]),
      theme: 'grid',
      headStyles: { fillColor: [0, 74, 148], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 34 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 8;
  }

  // Firmas
  if (y > 250) { doc.addPage(); y = 30; } else { y = Math.max(y, 255); }
  const colW = (pageWidth - margin * 2) / 2;
  doc.setDrawColor(120, 120, 120).setLineWidth(0.3);
  doc.line(margin + 5, y, margin + colW - 5, y);
  doc.line(margin + colW + 5, y, pageWidth - margin - 5, y);
  y += 4;
  doc.setFontSize(8).setFont('helvetica', 'normal');
  doc.text('Entregado por (origen)', margin + 5, y);
  doc.text('Recibido por (destino)', margin + colW + 5, y);

  doc.save(`hoja_derivacion_${t.ordenOrigen?.codigo ?? t.id}.pdf`);
}
