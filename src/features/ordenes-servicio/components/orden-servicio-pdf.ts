// PDF A4 de la orden de servicio (paridad pdf_orden_servicio_generator.dart de Flutter).
// Mismo patrón jsPDF + autotable que CotizacionPdfGenerator.

import type { OrdenServicio } from '@/core/types/orden-servicio';
import {
  TIPO_SERVICIO_LABEL, ESTADO_OS_CONFIG, PRIORIDAD_LABEL, TIPO_ACCION_LABEL,
  nombreClienteOrden, saldoOrden,
} from '@/core/types/orden-servicio';
import type { TipoServicio, PrioridadServicio, TipoAccionComponente } from '@/core/types/orden-servicio';

interface EmpresaPdfInfo {
  nombre?: string;
  razonSocial?: string;
  ruc?: string;
  direccionFiscal?: string;
  telefono?: string;
  email?: string;
}

function fmt(n: number | undefined | null): string {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtFecha(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Valor legible de un campo dinámico (omite booleanos/vacíos). */
function campoValor(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(campoValor).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`).join(' | ');
  }
  const s = String(value).trim();
  return s === 'true' || s === 'false' ? '' : s;
}

/** Genera y descarga el PDF A4 de la orden. */
export async function descargarPdfOrdenServicio(orden: OrdenServicio, empresa: EmpresaPdfInfo): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Header empresa
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.text(empresa.nombre || empresa.razonSocial || 'Empresa', margin, y);
  y += 6;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  if (empresa.ruc) { doc.text(`RUC: ${empresa.ruc}`, margin, y); y += 4; }
  if (empresa.direccionFiscal) { doc.text(empresa.direccionFiscal, margin, y); y += 4; }
  if (empresa.telefono || empresa.email) {
    doc.text([empresa.telefono, empresa.email].filter(Boolean).join(' | '), margin, y); y += 4;
  }

  // Título
  y += 4;
  doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 74, 148);
  doc.text(`ORDEN DE SERVICIO ${orden.codigo}`, pageWidth - margin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 3;
  doc.setDrawColor(0, 74, 148).setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Info general + Cliente (2 columnas)
  const col1X = margin;
  const col2X = pageWidth / 2 + 5;
  doc.setFontSize(9).setFont('helvetica', 'bold');
  doc.text('Información de la orden', col1X, y);
  doc.text('Cliente', col2X, y);
  y += 5;

  const tecnico = orden.tecnico?.persona ? [orden.tecnico.persona.nombres, orden.tecnico.persona.apellidos].filter(Boolean).join(' ') : '-';
  const infoLines: [string, string][] = [
    ['Estado:', ESTADO_OS_CONFIG[orden.estado]?.label ?? orden.estado],
    ['Tipo:', TIPO_SERVICIO_LABEL[orden.tipoServicio as TipoServicio] ?? orden.tipoServicio],
    ['Prioridad:', PRIORIDAD_LABEL[orden.prioridad as PrioridadServicio] ?? orden.prioridad],
    ['Creada:', fmtFecha(orden.creadoEn)],
    ['Entrega:', fmtFecha(orden.fechaEntrega)],
    ['Técnico:', tecnico],
  ];
  if ((orden.numeroReingresos ?? 0) > 0) infoLines.push(['Reingreso:', `#${orden.numeroReingresos}`]);

  const docCli = orden.clienteEmpresa?.ruc ?? orden.clienteEmpresa?.numeroDocumento ?? orden.cliente?.persona?.dni ?? '-';
  const telCli = orden.clienteEmpresa?.telefono ?? orden.cliente?.persona?.telefono ?? '-';
  const emailCli = orden.clienteEmpresa?.email ?? orden.cliente?.persona?.email ?? '-';
  const clienteLines: [string, string][] = [
    ['Nombre:', nombreClienteOrden(orden)],
    ['Documento:', docCli],
    ['Teléfono:', telCli],
    ['Email:', emailCli],
  ];

  doc.setFont('helvetica', 'normal');
  const maxLines = Math.max(infoLines.length, clienteLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (infoLines[i]) {
      doc.setFont('helvetica', 'bold'); doc.text(infoLines[i][0], col1X, y);
      doc.setFont('helvetica', 'normal'); doc.text(String(infoLines[i][1]), col1X + 28, y);
    }
    if (clienteLines[i]) {
      doc.setFont('helvetica', 'bold'); doc.text(clienteLines[i][0], col2X, y);
      doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(String(clienteLines[i][1]), pageWidth - margin - col2X - 25), col2X + 25, y);
    }
    y += 4.5;
  }
  y += 2;

  // Equipo
  const equipoPartes = [orden.tipoEquipo, orden.marcaEquipo, orden.modeloEquipo?.modelo, orden.numeroSerie ? `S/N: ${orden.numeroSerie}` : null].filter(Boolean);
  if (equipoPartes.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.text('Equipo:', margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(equipoPartes.join(' · '), margin + 18, y);
    y += 5;
  }
  if (orden.condicionEquipo) {
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(`Condición: ${orden.condicionEquipo}`, pageWidth - margin * 2), margin, y);
    y += 5;
  }

  // Problema
  if (orden.descripcionProblema) {
    doc.setFont('helvetica', 'bold'); doc.text('Problema reportado:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(orden.descripcionProblema, pageWidth - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 4 + 3;
  }

  // Datos adicionales (campos dinámicos)
  const datos = orden.datosPersonalizados ?? {};
  const datosRows = Object.keys(datos).map(k => [k, campoValor(datos[k])]).filter(r => r[1]) as string[][];
  if (datosRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Dato', 'Valor']],
      body: datosRows,
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  }

  // Componentes / trabajos
  const comps = orden.componentes ?? [];
  if (comps.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Componente', 'Acción', 'M.O.', 'Repuestos', 'Total']],
      body: comps.map(c => {
        const nombre = `${c.componente?.tipoComponente?.nombre ?? c.componente?.marca ?? 'Componente'}${c.componente?.modelo ? ` ${c.componente.modelo}` : ''}${c.descripcionAccion ? `\n${c.descripcionAccion}` : ''}`;
        const mo = Number(c.costoAccion ?? 0);
        const rep = Number(c.costoRepuestos ?? 0);
        return [
          nombre,
          TIPO_ACCION_LABEL[c.tipoAccion as TipoAccionComponente] ?? c.tipoAccion,
          `S/ ${fmt(mo)}`,
          `S/ ${fmt(rep)}`,
          `S/ ${fmt(mo + rep)}`,
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [0, 74, 148], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 24 },
        4: { halign: 'right', cellWidth: 24 },
      },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 8;
  }

  // Costos
  if (Number(orden.costoTotal ?? 0) > 0) {
    const totalsX = pageWidth - margin - 60;
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text('Costo del servicio:', totalsX, y);
    doc.text(`S/ ${fmt(orden.costoTotal)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    if (Number(orden.descuento ?? 0) > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text('Descuento:', totalsX, y);
      doc.text(`-S/ ${fmt(orden.descuento)}`, pageWidth - margin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0); y += 5;
    }
    if (Number(orden.adelanto ?? 0) > 0) {
      doc.setTextColor(37, 99, 235);
      doc.text(`Adelanto${orden.metodoPagoAdelanto ? ` (${orden.metodoPagoAdelanto})` : ''}:`, totalsX, y);
      doc.text(`-S/ ${fmt(orden.adelanto)}`, pageWidth - margin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0); y += 5;
    }
    doc.setDrawColor(200, 200, 200).line(totalsX, y, pageWidth - margin, y); y += 5;
    const saldo = saldoOrden(orden);
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text(saldo <= 0.005 ? 'PAGADO:' : 'SALDO:', totalsX, y);
    doc.text(`S/ ${fmt(saldo)}`, pageWidth - margin, y, { align: 'right' });
    y += 10;
  }

  // Notas
  if (orden.notas) {
    doc.setFontSize(9).setFont('helvetica', 'bold'); doc.text('Notas:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(orden.notas, pageWidth - margin * 2), margin, y);
  }

  doc.save(`orden_${orden.codigo}.pdf`);
}
