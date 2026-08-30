import type { Cotizacion } from '@/core/types/cotizacion';
import type { EmpresaInfo } from '@/core/types/empresa';
import { vendedorParaTicket } from '@/core/types/cotizacion';
import * as cfgService from '@/features/configuracion-documentos/services/configuracion-documentos-service';
import {
  hexARgb,
  margenesDePlantilla,
  type ConfiguracionCompleta,
} from '@/core/types/configuracion-documentos';

export type ModoCotizacionPdf = 'interno' | 'cliente';

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
type LogoCargado = { dataUrl: string; ancho: number; alto: number };

async function cargarLogo(url?: string | null): Promise<LogoCargado | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    // Las medidas reales importan: dibujar con un ancho y un alto fijos
    // DEFORMA el logo, y un logo estirado se nota mas que uno chico.
    const bitmap = await createImageBitmap(blob);
    const medidas = { ancho: bitmap.width, alto: bitmap.height };
    bitmap.close();
    return { dataUrl, ...medidas };
  } catch {
    return null;
  }
}

/** Encaja un logo dentro de una caja sin deformarlo. */
function encajarLogo(logo: LogoCargado, maxAncho: number, maxAlto: number) {
  const escala = Math.min(maxAncho / logo.ancho, maxAlto / logo.alto);
  return { w: logo.ancho * escala, h: logo.alto * escala };
}

/**
 * Dibuja el PDF de una cotizacion y devuelve el documento SIN guardarlo.
 *
 * Lo usan la descarga y el preview de la pantalla de configuracion. Que sea
 * uno solo es el punto: un preview dibujado aparte se separa del PDF real a la
 * primera correccion y pasa a mentir.
 */
export async function construirCotizacionPdf(params: {
  cotizacion: Cotizacion;
  mode: ModoCotizacionPdf;
  empresa?: EmpresaInfo | null;
  /**
   * Configuracion ya resuelta. Se pasa para previsualizar valores que TODAVIA
   * no se guardaron; omitirla la pide a la API.
   */
  cfg?: ConfiguracionCompleta | null;
}) {
  const { cotizacion: c, mode, empresa } = params;
  const currSymbol = c.moneda === 'USD' ? '$' : 'S/';
  // Alias del vendedor tiene prioridad (paridad Flutter vendedorParaTicket)
  const vendedorNombre = vendedorParaTicket(c) || '-';

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // La marca y la plantilla de COTIZACION, resueltas por el backend. Si no
  // se pueden traer, el PDF sale con los valores de siempre: un documento
  // sin los colores de la empresa es mejor que ningun documento.
  const cfg =
    params.cfg !== undefined
      ? params.cfg
      : await cfgService
          .getConfiguracionCompleta('COTIZACION', {
            formato: 'A4',
            sedeId: c.sedeId ?? undefined,
          })
          .catch(() => null);
  const marca = cfg?.configuracion;
  const plt = cfg?.plantilla;
  const ver = (k: keyof NonNullable<typeof plt>) => (plt ? Boolean(plt[k]) : true);

  const mrg = plt ? margenesDePlantilla(plt) : { top: 20, bottom: 10, left: 15, right: 15 };
  const colorEnc = hexARgb(plt?.colorEncabezado || marca?.colorPrimario || '#004A94');
  const colorTxt = hexARgb(plt?.colorCuerpo || marca?.colorTexto || '#000000');
  // El logo de la PLANTILLA gana sobre el de la marca: un logo cuadrado sirve
  // para un ticket de 80 mm y se pierde en una cabecera A4, que pide uno
  // apaisado. Sin logo propio se cae al de la marca.
  const logoData = ver('mostrarLogo')
    ? await cargarLogo(plt?.logoUrl || marca?.logoUrl)
    : null;

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

// ── Cabecera ──
  //
  // Dos columnas: a la izquierda logo + empresa, a la derecha el titulo con la
  // fecha y el codigo. Antes el codigo y la fecha vivian abajo, en
  // "Informacion General": estan arriba porque son lo primero que se busca al
  // recibir una cotizacion.

  // Banda de color al tope de la hoja. Va en y=0 a proposito, por fuera del
  // margen: es un elemento de marca, no contenido.
  doc.setFillColor(...colorEnc);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  const yBanda = Math.max(mrg.top, 6);
  const posLogo = (plt?.posicionLogo ?? 'IZQUIERDA').toUpperCase();

  // El logo se encaja en una caja SIN deformarse; la caja define cuanto
  // desplaza al texto que tiene al lado.
  const cajaLogo = { w: 22, h: 18 };
  const dim = logoData ? encajarLogo(logoData, cajaLogo.w, cajaLogo.h) : null;

  // Con el logo centrado o a la derecha, la fila de la empresa arranca DEBAJO
  // de el; a la izquierda comparten fila.
  let yFila = yBanda + 4;
  if (dim && posLogo !== 'IZQUIERDA') {
    const xLogo =
      posLogo === 'CENTRO'
        ? (pageWidth - dim.w) / 2
        : pageWidth - marginR - dim.w;
    try {
      doc.addImage(logoData!.dataUrl, xLogo, yFila, dim.w, dim.h, undefined, 'FAST');
    } catch {
      // Formato que jsPDF no digiere: se sigue sin logo.
    }
    yFila += dim.h + 4;
  }

  // Columna derecha: titulo + ficha de fecha y codigo.
  const anchoFicha = 62;
  const xFicha = pageWidth - marginR - anchoFicha;
  let yDer = yFila;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...colorEnc);
  doc.text('Cotización', pageWidth - marginR, yDer + 7, { align: 'right' });
  yDer += 13;

  // Barra vertical de acento al costado de la ficha, como en el modelo.
  const filas: [string, string][] = [
    ['Fecha:', formatDate(c.fechaEmision)],
    ['N° de Cotización:', c.codigo],
  ];
  if (c.fechaVencimiento) filas.push(['Válida hasta:', formatDate(c.fechaVencimiento)]);

  const altoFicha = filas.length * 4.6;
  doc.setFillColor(...colorEnc);
  doc.rect(xFicha, yDer - 1, 1.1, altoFicha, 'F');

  doc.setFontSize(8);
  let yf = yDer + 2.2;
  for (const [label, valor] of filas) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorEnc);
    doc.text(label, xFicha + 3, yf);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colorTxt);
    doc.text(valor, xFicha + 32, yf);
    yf += 4.6;
  }
  const yFinDer = yf;

  // Columna izquierda: logo + datos de la empresa.
  let xTexto = marginL;
  if (dim && posLogo === 'IZQUIERDA') {
    try {
      doc.addImage(logoData!.dataUrl, marginL, yFila, dim.w, dim.h, undefined, 'FAST');
    } catch {
      // idem
    }
    xTexto = marginL + dim.w + 5;
  }

  let yIzq = yFila;
  if (ver('mostrarDatosEmpresa')) {
    // El nombre comercial manda sobre la razon social: es el que el cliente
    // reconoce.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colorEnc);
    doc.text(
      (marca?.nombreComercial || empresa?.nombre || empresa?.razonSocial || 'Empresa').toUpperCase(),
      xTexto, yIzq + 4,
    );
    yIzq += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorTxt);
    // Los datos fiscales salen de `completa` (que ya aplico la sede) y caen al
    // contexto de empresa si no vinieron.
    const ruc = marca?.ruc ?? empresa?.ruc;
    const direccion = marca?.direccion ?? empresa?.direccionFiscal;
    const telefono = marca?.telefono ?? empresa?.telefono;
    const email = marca?.email ?? empresa?.email;
    // El texto se corta ANTES de la ficha de la derecha, no contra el margen:
    // si no, la direccion larga se le mete encima.
    const anchoTexto = xFicha - xTexto - 6;
    const lineas: string[] = [];
    if (ruc) lineas.push(`RUC: ${ruc}`);
    if (direccion) lineas.push(...doc.splitTextToSize(direccion, anchoTexto));
    if (telefono || email) lineas.push([telefono, email].filter(Boolean).join(' | '));
    for (const linea of lineas) {
      doc.text(linea, xTexto, yIzq);
      yIzq += 3.6;
    }
  }

  // La cabecera termina donde termine la columna mas larga.
  y = Math.max(yIzq, yFinDer, yFila + (dim && posLogo === 'IZQUIERDA' ? dim.h : 0)) + 3;

  doc.setDrawColor(...colorEnc);
  doc.setLineWidth(0.4);
  doc.line(marginL, y, pageWidth - marginR, y);
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
  // La direccion de la sede sale de `completa` --`Cotizacion.sede` solo trae el
  // nombre--. Se usa la direccion OPERATIVA y no la fiscal porque la fiscal ya
  // esta arriba, en los datos de la empresa: repetirla no aporta.
  const sedeCfg = cfg?.sede;
  const dirSede = sedeCfg?.direccion || sedeCfg?.direccionFiscalSede;
  const nombreSede = sedeCfg?.nombre || c.sede?.nombre;
  const sedeConDireccion = nombreSede
    ? dirSede
      ? `${nombreSede} - ${dirSede}`
      : nombreSede
    : '-';

  // Codigo, fecha y vencimiento ya estan en la cabecera: repetirlos aca solo
  // gastaba renglones.
  const infoLines = [
    ['Vendedor:', vendedorNombre],
    ['Sede:', sedeConDireccion],
    ['Moneda:', c.moneda],
  ];

  if (c.nombre) infoLines.unshift(['Nombre:', c.nombre]);

  const clienteLines = !ver('mostrarDatosCliente') ? [] : [
    ['Nombre:', c.nombreCliente],
    ['Documento:', c.documentoCliente || '-'],
    ['Email:', c.emailCliente || '-'],
    ['Telefono:', c.telefonoCliente || '-'],
    ['Direccion:', c.direccionCliente || '-'],
  ];

  // Cada columna avanza SU propio alto y los valores se parten al ancho de su
  // columna: una direccion larga --la de la sede o la del cliente-- antes se
  // dibujaba en una sola linea y se montaba sobre la columna de al lado.
  const sangriaValor = 25;
  const dibujarColumna = (
    filas: string[][],
    x: number,
    ancho: number,
    yInicial: number,
  ) => {
    let yc = yInicial;
    for (const [label, valor] of filas) {
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, yc);
      doc.setFont('helvetica', 'normal');
      const partes: string[] = doc.splitTextToSize(valor || '-', ancho - sangriaValor);
      doc.text(partes, x + sangriaValor, yc);
      yc += 4.5 * partes.length;
    }
    return yc;
  };

  const yInfo = dibujarColumna(infoLines, col1X, col2X - 4 - col1X, y);
  const yCliente = clienteLines.length
    ? dibujarColumna(clienteLines, col2X, pageWidth - marginR - col2X, y)
    : y;
  y = Math.max(yInfo, yCliente);

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


  return doc;
}
