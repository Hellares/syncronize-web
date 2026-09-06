// PDF "Estado de cuenta" del cliente (paridad con pdf_estado_cuenta_generator.dart).
// jsPDF + autotable, mismo patrón que estado-cuenta-tercero-pdf.ts.

import type { EstadoCuentaCliente, VentaCreditoEC, AbonoEC } from '@/core/types/cuentas-cobrar';
import type { VentaDetalle } from '@/core/types/venta';

/** Las líneas de cada venta, por `ventaId`. El estado de cuenta no las trae:
 *  las pide la pantalla antes de generar el PDF. */
export type DetallesPorVenta = Record<string, VentaDetalle[] | undefined>;

const money = (v: number) => `S/ ${Number(v ?? 0).toFixed(2)}`;
const fmtFecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—');
const fuenteLabel = (f?: string | null) =>
  f === 'TESORERIA' ? 'Tesorería' : f === 'CAJA' ? 'Caja' : f === 'BANCO' ? 'Banco' : f ?? '—';

/**
 * Arma el documento y lo devuelve SIN guardarlo.
 *
 * Separado de `descargar` para poder renderizarlo en Node --jiti + PyMuPDF--
 * y mirar como queda sin levantar el dashboard: `doc.save()` es del navegador.
 */
export async function construirEstadoCuentaClientePdf(
  data: EstadoCuentaCliente,
  empresaNombre: string,
  empresaRuc?: string,
  detallesPorVenta: DetallesPorVenta = {},
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  const c = data.cliente;
  const r = data.resumen;
  const pendientes = data.ventas.filter((v) => v.saldoPendiente > 0.01);
  const historial = data.ventas.filter((v) => v.saldoPendiente <= 0.01);

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
  doc.text(c.nombre ?? 'Cliente', margin, y);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  y += 4;
  doc.text(
    `${c.documento ? `RUC/DNI: ${c.documento} · ` : ''}${c.tipo === 'EMPRESA' ? 'Empresa' : 'Persona'}`,
    margin, y,
  );
  y += 6;

  // Resumen: saldo pendiente destacado + vendido/abonado/mora/#ventas
  const conSaldo = r.saldoPendiente > 0.005;
  doc.setFillColor(...(conSaldo ? [200, 50, 50] : [40, 150, 80]) as [number, number, number])
    .rect(margin, y, W - margin * 2, 13, 'F');
  doc.setTextColor(255, 255, 255).setFontSize(8).setFont('helvetica', 'bold');
  doc.text('SALDO PENDIENTE', margin + 3, y + 5);
  doc.setFontSize(11).text(
    `${money(r.saldoPendiente)}${r.totalMora > 0 ? `   (incl. mora ${money(r.totalMora)})` : ''}`,
    margin + 3, y + 10,
  );
  y += 17;
  doc.setTextColor(0, 0, 0).setFont('helvetica', 'normal').setFontSize(9);
  doc.text(
    `Total vendido: ${money(r.totalVendido)}    Total abonado: ${money(r.totalAbonado)}    Ventas: ${r.cantidadVentas} (${r.ventasConSaldo} con saldo)`,
    margin, y,
  );
  y += 7;

  const seccion = (titulo: string) => {
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40, 40, 40).text(titulo, margin, y);
    y += 2;
  };

  /**
   * Las líneas de una venta, colgando de su fila con una flecha.
   *
   * Van como filas de la MISMA tabla y no como una tabla aparte: así el corte
   * de página las mantiene pegadas a su venta y las columnas siguen alineadas.
   * Los `colSpan` suman 7, que son las columnas de la tabla de ventas.
   *
   * 🔴 La flecha es ASCII (`|_>`) a propósito: las fuentes estándar de jsPDF
   * son WinAnsi y un `└─>` sale como basura.
   */
  const filasDetalle = (v: VentaCreditoEC) => {
    const lineas = detallesPorVenta[v.ventaId];
    if (!lineas?.length) return [];
    const tenue = { fontSize: 6.5, textColor: [110, 110, 110] as [number, number, number], fillColor: [248, 250, 252] as [number, number, number] };
    return lineas.map((d) => {
      const cant = Number(d.cantidad ?? 0);
      const pu = Number(d.precioUnitario ?? 0);
      return [
        { content: `   |_>  ${d.descripcion}`, colSpan: 3, styles: tenue },
        { content: `${cant} x ${money(pu)}`, colSpan: 2, styles: { ...tenue, halign: 'right' as const } },
        { content: money(d.total ?? cant * pu), colSpan: 2, styles: { ...tenue, halign: 'right' as const } },
      ];
    });
  };

  const tablaVentas = (titulo: string, ventas: VentaCreditoEC[], emptyMsg?: string) => {
    seccion(titulo);
    if (!ventas.length) {
      if (emptyMsg) { doc.setFontSize(9).setFont('helvetica', 'normal').text(emptyMsg, margin, y + 3); y += 9; }
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [['Código', 'Fecha', 'Vence', 'Total', 'Abonado', 'Saldo', 'Estado']],
      body: ventas.flatMap((v) => [
        [
          v.codigo,
          fmtFecha(v.fechaVenta),
          fmtFecha(v.fechaVencimiento),
          money(v.total),
          money(v.totalPagado),
          money(v.saldoPendiente),
          v.estado,
        ],
        ...filasDetalle(v),
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [0, 74, 148], fontSize: 8 },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center' } },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  };

  const tablaAbonos = (abonos: AbonoEC[]) => {
    seccion('ABONOS');
    if (!abonos.length) {
      doc.setFontSize(9).setFont('helvetica', 'normal').text('Sin abonos registrados.', margin, y + 3);
      y += 9;
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Método', 'Fuente', 'Venta', 'Monto']],
      body: abonos.map((a) => [
        fmtFecha(a.fechaPago),
        a.metodoPago,
        fuenteLabel(a.fuente),
        a.ventaCodigo ?? '—',
        money(a.monto),
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [0, 74, 148], fontSize: 8 },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: margin, right: margin },
      theme: 'grid',
    });
    // @ts-expect-error lastAutoTable lo agrega el plugin
    y = doc.lastAutoTable.finalY + 6;
  };

  tablaVentas('VENTAS PENDIENTES', pendientes, 'Sin ventas pendientes.');
  tablaAbonos(data.abonos);
  if (historial.length) tablaVentas('HISTORIAL (PAGADAS)', historial);

  return doc;
}

export async function descargarEstadoCuentaCliente(
  data: EstadoCuentaCliente,
  empresaNombre: string,
  empresaRuc?: string,
  detallesPorVenta: DetallesPorVenta = {},
): Promise<void> {
  const doc = await construirEstadoCuentaClientePdf(data, empresaNombre, empresaRuc, detallesPorVenta);
  const nombre = (data.cliente.nombre ?? 'cliente').replace(/[^A-Za-z0-9]+/g, '_');
  doc.save(`estado-cuenta-${nombre}.pdf`);
}
