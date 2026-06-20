// PDF "Estado de cuenta" del tercero (paridad con estado_cuenta_tercero_pdf.dart).
// jsPDF + autotable, mismo patrón que los otros generadores de la web.

import type { EstadoCuentaTercero, EcDoc } from '@/core/types/proveedor';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const money = (m: string, v: number) => `${sim(m)} ${Number(v ?? 0).toFixed(2)}`;
const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '');
const porMonedaTxt = (m: Record<string, number>) => {
  const e = Object.entries(m).filter(([, v]) => Math.abs(v) > 0.001);
  return e.length ? e.map(([k, v]) => money(k, v)).join('   ') : '—';
};

export async function descargarEstadoCuentaTercero(
  data: EstadoCuentaTercero,
  empresaNombre: string,
  empresaRuc?: string,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  // Encabezado
  doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
  doc.text(empresaNombre, margin, y);
  doc.setFontSize(13).setTextColor(0, 74, 148);
  doc.text('ESTADO DE CUENTA', W - margin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0).setFont('helvetica', 'normal').setFontSize(9);
  if (empresaRuc) { y += 4.5; doc.text(`RUC: ${empresaRuc}`, margin, y); }
  doc.text(`Emitido: ${fmtFecha(new Date().toISOString())}`, W - margin, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(0, 74, 148).setLineWidth(0.5).line(margin, y, W - margin, y);
  y += 6;

  // Cliente
  doc.setFontSize(8).setTextColor(110, 110, 110).text('Cliente', margin, y);
  y += 4;
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
  doc.text(data.proveedor.nombre, margin, y);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  if (data.proveedor.numeroDocumento) { y += 4; doc.text(`RUC/Doc: ${data.proveedor.numeroDocumento}`, margin, y); }
  y += 6;

  // Resumen: Le debo (rojo) / Me debe (verde)
  const boxW = (W - margin * 2 - 4) / 2;
  const box = (x: number, label: string, txt: string, rgb: [number, number, number]) => {
    doc.setFillColor(...rgb).rect(x, y, boxW, 13, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(8).setFont('helvetica', 'bold');
    doc.text(label, x + 3, y + 5);
    doc.setFontSize(10).text(txt, x + 3, y + 10);
  };
  box(margin, 'Le debo (compras)', porMonedaTxt(data.leDeboPorMoneda), [200, 50, 50]);
  box(margin + boxW + 4, 'Me debe (ventas)', porMonedaTxt(data.meDebePorMoneda), [40, 150, 80]);
  y += 16;

  // Neto (celeste)
  doc.setFillColor(20, 90, 170).rect(margin, y, W - margin * 2, 12, 'F');
  doc.setTextColor(255, 255, 255).setFontSize(8).setFont('helvetica', 'bold').text('SALDO NETO', margin + 3, y + 5);
  const netoTxt = Object.entries(data.netoPorMoneda).map(([k, v]) =>
    Math.abs(v) < 0.01 ? `${sim(k)} 0.00 saldado` : v > 0 ? `Le debo ${money(k, v)}` : `Me debe ${money(k, -v)}`,
  ).join('    ') || 'Sin saldos';
  doc.setFontSize(11).text(netoTxt, margin + 3, y + 10);
  y += 16;
  doc.setTextColor(0, 0, 0);

  const itemsTxt = (d: EcDoc) =>
    (d.items ?? []).map((i) => `${i.cantidad} x ${i.descripcion}  (${money(d.moneda, i.total)})`).join('\n') || '—';

  const tablaDocs = (titulo: string, docs: EcDoc[]) => {
    if (!docs.length) return;
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(0, 74, 148).text(titulo, margin, y);
    y += 1.5;
    autoTable(doc, {
      startY: y,
      head: [['Documento', 'Detalle', 'Total', 'Saldo']],
      body: docs.map((d) => [
        `${d.codigo}\n${fmtFecha(d.fecha)} · ${d.estado}`,
        itemsTxt(d),
        money(d.moneda, d.total),
        d.saldoPendiente > 0.001 ? money(d.moneda, d.saldoPendiente) : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.8, valign: 'top' },
      headStyles: { fillColor: [0, 74, 148], fontSize: 8 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 5;
  };

  const seccion = (titulo: string) => {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40, 40, 40).text(titulo, margin, y);
    y += 4;
  };

  seccion('PENDIENTES DE PAGO');
  if (!data.pendientes.ventas.length && !data.pendientes.compras.length) {
    doc.setFontSize(9).setFont('helvetica', 'normal').text('No hay saldos pendientes.', margin, y); y += 6;
  } else {
    tablaDocs('Ventas por cobrar', data.pendientes.ventas);
    tablaDocs('Compras por pagar', data.pendientes.compras);
  }

  const r = data.rango;
  const rangoTxt = r?.desde && r?.hasta ? ` (${fmtFecha(r.desde)} - ${fmtFecha(r.hasta)})` : '';
  seccion(`HISTORIAL${rangoTxt}`);
  if (!data.historial.ventas.length && !data.historial.compras.length) {
    doc.setFontSize(9).setFont('helvetica', 'normal').text('Sin movimientos en el período.', margin, y);
  } else {
    tablaDocs('Ventas', data.historial.ventas);
    tablaDocs('Compras', data.historial.compras);
  }

  const nombre = data.proveedor.nombre.replace(/[^A-Za-z0-9]+/g, '_');
  doc.save(`estado-cuenta-${nombre}.pdf`);
}
