// PDF "Estado de cuenta" del cliente (paridad con pdf_estado_cuenta_generator.dart).
// jsPDF + autotable, mismo patrón que estado-cuenta-tercero-pdf.ts.

import type { EstadoCuentaCliente, VentaCreditoEC, AbonoEC } from '@/core/types/cuentas-cobrar';
import type { RowInput } from 'jspdf-autotable';
import type { VentaDetalle } from '@/core/types/venta';

/** Las líneas de cada venta, por `ventaId`. El estado de cuenta no las trae:
 *  las pide la pantalla antes de generar el PDF. */
export type DetallesPorVenta = Record<string, VentaDetalle[] | undefined>;

/**
 * Qué entra en el documento.
 *
 * Nace de un problema real: una vez saldada la venta, su fila en el historial y
 * sus abonos hacen ruido en el PDF que se le manda al cliente para cobrarle.
 * Por eso el historial y los abonos arrancan APAGADOS, y se pueden elegir
 * ventas puntuales --el cliente que pide el detalle de pagos de UNA venta--.
 */
export interface OpcionesEstadoCuenta {
  incluirPendientes: boolean;
  incluirHistorial: boolean;
  incluirAbonos: boolean;
  /** Las líneas de cada venta, colgando de su fila. */
  incluirDetalle: boolean;
  /** Si viene, SOLO estas ventas. Vacío o ausente = todas. */
  ventasIds?: string[];
}

export const OPCIONES_POR_DEFECTO: OpcionesEstadoCuenta = {
  incluirPendientes: true,
  incluirHistorial: false,
  incluirAbonos: false,
  incluirDetalle: true,
};

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
  opciones: OpcionesEstadoCuenta = OPCIONES_POR_DEFECTO,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  const c = data.cliente;
  const r = data.resumen;
  // 🔴 El RESUMEN de arriba no se filtra nunca: es la deuda real del cliente.
  // Recalcularlo sobre las ventas elegidas diría que debe menos de lo que debe.
  // Lo que se aclara, abajo de la tabla, es cuántas de cuántas se muestran.
  const elegidas = opciones.ventasIds?.length
    ? data.ventas.filter((v) => opciones.ventasIds!.includes(v.ventaId))
    : data.ventas;
  const hayFiltro = elegidas.length !== data.ventas.length;
  const pendientes = opciones.incluirPendientes
    ? elegidas.filter((v) => v.saldoPendiente > 0.01)
    : [];
  const historial = opciones.incluirHistorial
    ? elegidas.filter((v) => v.saldoPendiente <= 0.01)
    : [];
  // Los abonos siguen a las ventas elegidas: si se pidió el detalle de una
  // venta, los abonos de las otras no tienen por qué aparecer.
  const codigosElegidos = new Set(elegidas.map((v) => v.codigo));
  const abonos = opciones.incluirAbonos
    ? data.abonos.filter((a) => !a.ventaCodigo || codigosElegidos.has(a.ventaCodigo))
    : [];

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

  // ── Cliente a la izquierda, saldo a la derecha, en la MISMA fila ──
  //
  // El saldo ocupaba una banda de color de ancho completo debajo del cliente:
  // 17 mm de alto para un solo numero, en una hoja donde lo que importa es la
  // lista de ventas. Pegado al nombre dice lo mismo y devuelve el espacio.
  const conSaldo = r.saldoPendiente > 0.005;
  const anchoTarjeta = 48;
  const altoTarjeta = 15;
  const xTarjeta = W - margin - anchoTarjeta;
  const yTarjeta = y - 3;

  // 🔴 jsPDF no tiene degradados: se simula con franjas verticales de 0.4 mm
  // interpolando los dos colores. A esa altura el corte no se ve.
  const radio = 1.6; // 6 px
  // El degradado se dibuja con rectangulos, asi que para que respete la
  // esquina redondeada se RECORTA contra el mismo contorno antes de pintarlo.
  doc.saveGraphicsState();
  doc.roundedRect(xTarjeta, yTarjeta, anchoTarjeta, altoTarjeta, radio, radio, null as unknown as string);
  doc.clip();
  doc.discardPath();
  const franjas = Math.round(anchoTarjeta / 0.4);
  const desde: [number, number, number] = [255, 255, 255];
  const hasta: [number, number, number] = conSaldo ? [254, 226, 226] : [220, 252, 231];
  for (let i = 0; i < franjas; i++) {
    const t = i / (franjas - 1);
    doc.setFillColor(
      Math.round(desde[0] + (hasta[0] - desde[0]) * t),
      Math.round(desde[1] + (hasta[1] - desde[1]) * t),
      Math.round(desde[2] + (hasta[2] - desde[2]) * t),
    );
    doc.rect(xTarjeta + (anchoTarjeta * i) / franjas, yTarjeta, anchoTarjeta / franjas + 0.15, altoTarjeta, 'F');
  }
  doc.restoreGraphicsState();
  // El borde toma el color del texto, como las tarjetas de la web.
  const borde: [number, number, number] = conSaldo ? [220, 100, 100] : [90, 180, 120];
  doc.setDrawColor(...borde).setLineWidth(0.4)
    .roundedRect(xTarjeta, yTarjeta, anchoTarjeta, altoTarjeta, radio, radio, 'S');

  const tinta: [number, number, number] = conSaldo ? [190, 40, 40] : [30, 130, 70];
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(110, 110, 110);
  doc.text('SALDO PENDIENTE', xTarjeta + anchoTarjeta - 3, yTarjeta + 5, { align: 'right' });
  doc.setFontSize(14).setTextColor(...tinta);
  doc.text(money(r.saldoPendiente), xTarjeta + anchoTarjeta - 3, yTarjeta + 11, { align: 'right' });
  if (r.totalMora > 0) {
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(190, 90, 30);
    doc.text(`incl. mora ${money(r.totalMora)}`, xTarjeta + anchoTarjeta - 3, yTarjeta + 14, { align: 'right' });
  }

  // El nombre se corta contra la tarjeta: sin esto un cliente con razon social
  // larga se le mete encima.
  const anchoCliente = xTarjeta - margin - 5;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(110, 110, 110);
  doc.text('Cliente', margin, y);
  y += 4.5;
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
  const nombreCliente: string[] = doc.splitTextToSize(c.nombre ?? 'Cliente', anchoCliente);
  doc.text(nombreCliente.slice(0, 2), margin, y);
  y += 4.5 * Math.min(nombreCliente.length, 2);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(
    `${c.documento ? `RUC/DNI: ${c.documento} · ` : ''}${c.tipo === 'EMPRESA' ? 'Empresa' : 'Persona'}`,
    margin, y,
  );

  // Lo que siga arranca debajo de las DOS columnas.
  y = Math.max(y, yTarjeta + altoTarjeta) + 6;
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
   * Las líneas de una venta, colgando de su fila.
   *
   * Van como filas de la MISMA tabla y no como una tabla aparte: así el corte
   * de página las mantiene pegadas a su venta y las columnas siguen alineadas.
   * Los `colSpan` suman 7, que son las columnas de la tabla de ventas.
   *
   * 🔴 La flecha `└─>` NO se escribe, se DIBUJA con líneas en `didDrawCell`:
   * las fuentes estándar de jsPDF son WinAnsi y no tienen los caracteres de
   * dibujo de caja --saldrían como basura--. Escribirla en ASCII (`|_>`) se ve
   * feo, así que se reserva el margen izquierdo de la celda y ahí se trazan
   * los dos segmentos y la punta.
   */
  const SANGRIA_FLECHA = 7;

  const filasDetalle = (v: VentaCreditoEC) => {
    if (!opciones.incluirDetalle) return [];
    const lineas = detallesPorVenta[v.ventaId];
    if (!lineas?.length) return [];
    // `lineWidth: 0` saca las lineas de la grilla en estas filas: sin la
    // division, un nombre largo usa todo el ancho en vez de romperse en dos
    // renglones contra una celda angosta. El bloque se sigue leyendo como del
    // renglon de arriba por el fondo gris y la flecha.
    const tenue = {
      fontSize: 5.5,
      textColor: [110, 110, 110] as [number, number, number],
      fillColor: [248, 250, 252] as [number, number, number],
      lineWidth: 0,
    };
    return lineas.map((d) => {
      const cant = Number(d.cantidad ?? 0);
      const pu = Number(d.precioUnitario ?? 0);
      // Sin el "1 x S/ 36.00": la venta ya dice cuanto se cobro, aca alcanza
      // QUE se vendio y cuanto sumo esa linea.
      return [
        {
          content: d.descripcion,
          colSpan: 5,
          styles: { ...tenue, cellPadding: { top: 1.5, right: 1.8, bottom: 1.5, left: SANGRIA_FLECHA } },
        },
        { content: money(d.total ?? cant * pu), colSpan: 2, styles: { ...tenue, halign: 'right' as const } },
      ];
    });
  };

  /** Traza `└─>` dentro de la sangría que dejó la celda del detalle. */
  const dibujarFlecha = (x: number, yCelda: number) => {
    const izq = x + 2.2;      // donde baja el trazo vertical
    const alto = 2.7;         // hasta la mitad de la primera linea de texto
    const largo = 2.6;        // el tramo horizontal
    doc.setDrawColor(160, 160, 160).setLineWidth(0.25);
    doc.line(izq, yCelda, izq, yCelda + alto);
    doc.line(izq, yCelda + alto, izq + largo, yCelda + alto);
    // La punta, dos trazos cortos.
    doc.line(izq + largo, yCelda + alto, izq + largo - 0.9, yCelda + alto - 0.7);
    doc.line(izq + largo, yCelda + alto, izq + largo - 0.9, yCelda + alto + 0.7);
  };

  const tablaVentas = (titulo: string, ventas: VentaCreditoEC[], emptyMsg?: string) => {
    seccion(titulo);
    if (!ventas.length) {
      if (emptyMsg) { doc.setFontSize(9).setFont('helvetica', 'normal').text(emptyMsg, margin, y + 3); y += 9; }
      return;
    }
    // Se arma antes para poder anotar QUE filas son de detalle: `didDrawCell`
    // solo recibe el indice, no sabe de donde salio la fila.
    const cuerpo: RowInput[] = [];
    const conFlecha = new Set<number>();
    for (const v of ventas) {
      cuerpo.push([
        v.codigo,
        fmtFecha(v.fechaVenta),
        fmtFecha(v.fechaVencimiento),
        money(v.total),
        money(v.totalPagado),
        money(v.saldoPendiente),
        v.estado,
      ]);
      for (const fila of filasDetalle(v)) {
        conFlecha.add(cuerpo.length);
        cuerpo.push(fila);
      }
    }

    autoTable(doc, {
      startY: y,
      head: [['Código', 'Fecha', 'Vence', 'Total', 'Abonado', 'Saldo', 'Estado']],
      body: cuerpo,
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [0, 74, 148], fontSize: 8 },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center' } },
      margin: { left: margin, right: margin },
      theme: 'grid',
      didDrawCell: (d) => {
        if (d.section !== 'body' || d.column.index !== 0) return;
        if (!conFlecha.has(d.row.index)) return;
        dibujarFlecha(d.cell.x, d.cell.y);
      },
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

  if (opciones.incluirPendientes) tablaVentas('VENTAS PENDIENTES', pendientes, 'Sin ventas pendientes.');
  if (opciones.incluirHistorial && historial.length) tablaVentas('HISTORIAL (PAGADAS)', historial);
  if (opciones.incluirAbonos) tablaAbonos(abonos);

  // Sin esta línea, un PDF de dos ventas parecería el estado de cuenta entero.
  if (hayFiltro) {
    doc.setFontSize(7.5).setFont('helvetica', 'italic').setTextColor(130, 130, 130);
    doc.text(
      `Muestra ${elegidas.length} de ${data.ventas.length} ventas a crédito del cliente.`,
      margin, y,
    );
    y += 6;
  }

  return doc;
}

export async function descargarEstadoCuentaCliente(
  data: EstadoCuentaCliente,
  empresaNombre: string,
  empresaRuc?: string,
  detallesPorVenta: DetallesPorVenta = {},
  opciones: OpcionesEstadoCuenta = OPCIONES_POR_DEFECTO,
): Promise<void> {
  const doc = await construirEstadoCuentaClientePdf(data, empresaNombre, empresaRuc, detallesPorVenta, opciones);
  const nombre = (data.cliente.nombre ?? 'cliente').replace(/[^A-Za-z0-9]+/g, '_');
  doc.save(`estado-cuenta-${nombre}.pdf`);
}
