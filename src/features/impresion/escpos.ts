// Generador ESC-POS para tickets de venta — réplica de
// ticket_venta_esc_pos_generator.dart de Flutter (Bluetooth Classic → QZ Tray).
import type { Venta } from '@/core/types/venta';
import { METODO_PAGO_LABEL } from '@/core/types/caja';

const ESC = 0x1b;
const GS = 0x1d;

/** Builder mínimo de comandos ESC/POS (texto plano CP437-safe) */
export class EscPosBuilder {
  private bytes: number[] = [];
  /** Caracteres por línea según papel y fuente B (paridad Flutter: 42/58mm, 64/80mm) */
  readonly cols: number;

  constructor(readonly paperWidth: 58 | 80) {
    this.cols = paperWidth === 58 ? 42 : 64;
  }

  /** Normaliza a ASCII imprimible (paridad Flutter: evita abortos por chars fuera de CP437) */
  private sanitize(s: string): string {
    return s
      .replace(/[—–]/g, '-').replace(/[··•]/g, '.').replace(/[""]/g, '"')
      .replace(/['']/g, "'").replace(/…/g, '...')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // á→a, ñ→n
      .replace(/[^\x20-\x7E\n]/g, '?');
  }

  private push(...b: number[]) { this.bytes.push(...b); }

  private encode(s: string) {
    for (const ch of this.sanitize(s)) this.push(ch.charCodeAt(0));
  }

  reset() { this.push(ESC, 0x40); return this; }
  /** Fuente B (chica, más columnas — la que usa Flutter) */
  fontB() { this.push(ESC, 0x4d, 0x01); return this; }
  align(a: 'left' | 'center' | 'right') {
    this.push(ESC, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2);
    return this;
  }
  bold(on: boolean) { this.push(ESC, 0x45, on ? 1 : 0); return this; }
  /** Tamaño: 0 normal, 1 doble alto */
  sizeDoubleHeight(on: boolean) { this.push(GS, 0x21, on ? 0x01 : 0x00); return this; }
  text(s: string) { this.encode(s); this.push(0x0a); return this; }
  hr(ch = '-') { this.text(ch.repeat(this.cols)); return this; }
  feed(n = 1) { this.push(ESC, 0x64, n); return this; }
  cut() { this.push(GS, 0x56, 0x42, 0x00); return this; }

  /** Fila de columnas con anchos fijos (paridad tabla manual Flutter) */
  row(cells: Array<{ text: string; width: number; align?: 'left' | 'right' }>) {
    let line = '';
    for (const c of cells) {
      let t = this.sanitize(c.text);
      if (t.length > c.width) t = t.slice(0, c.width);
      line += c.align === 'right' ? t.padStart(c.width) : t.padEnd(c.width);
    }
    this.text(line);
    return this;
  }

  /** Línea etiqueta....valor (valor a la derecha) */
  kv(label: string, value: string) {
    const l = this.sanitize(label);
    const v = this.sanitize(value);
    const pad = Math.max(1, this.cols - l.length - v.length);
    this.text(l + ' '.repeat(pad) + v);
    return this;
  }

  /** QR nativo ESC-POS (GS ( k) — paridad generator.qrcode de Flutter */
  qrcode(data: string, size = 4) {
    const d = data.slice(0, 700);
    const len = d.length + 3;
    const pL = len % 256, pH = Math.floor(len / 256);
    // Modelo 2
    this.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Tamaño de módulo
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);
    // Corrección L
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    // Almacenar data
    this.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (const ch of d) this.push(ch.charCodeAt(0) & 0xff);
    // Imprimir
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  build(): number[] { return this.bytes; }
}

function fmt(n: number | undefined | null): string {
  return Number(n ?? 0).toFixed(2);
}

interface EmpresaInfo {
  nombreComercial?: string;
  razonSocial?: string;
  ruc?: string;
  direccionFiscal?: string;
  telefono?: string;
}

/** Genera los bytes del ticket de venta (estructura idéntica al generator de Flutter) */
export function generarTicketVenta(venta: Venta, empresa: EmpresaInfo, paperWidth: 58 | 80): number[] {
  const b = new EscPosBuilder(paperWidth);
  b.reset().fontB();

  // --- Encabezado empresa ---
  b.align('center').bold(true).sizeDoubleHeight(true)
    .text(empresa.nombreComercial || empresa.razonSocial || 'EMPRESA')
    .sizeDoubleHeight(false).bold(false);
  if (empresa.razonSocial && empresa.nombreComercial) b.text(empresa.razonSocial);
  if (empresa.ruc) b.text(`RUC: ${empresa.ruc}`);
  if (venta.sedeNombre) b.text(`Sede: ${venta.sedeNombre}`);
  if (empresa.direccionFiscal) b.text(empresa.direccionFiscal);
  if (empresa.telefono) b.text(`Tel: ${empresa.telefono}`);
  b.hr();

  // --- Comprobante ---
  b.bold(true);
  if (venta.codigoComprobante) {
    b.text(venta.tipoComprobante === 'FACTURA' ? 'FACTURA ELECTRONICA' : 'BOLETA DE VENTA ELECTRONICA');
    b.text(venta.codigoComprobante);
  } else {
    b.text(`TICKET ${venta.codigo ?? ''}`);
  }
  b.bold(false).hr();

  // --- Metadata ---
  b.align('left');
  const fecha = venta.fechaVenta ? new Date(venta.fechaVenta) : new Date();
  b.text(`Fecha: ${fecha.toLocaleString('es-PE')}`);
  const vendedor = venta.vendedorAlias || venta.vendedorNombre;
  if (vendedor) b.text(`Vendedor: ${vendedor}`);
  if (venta.cajeroNombre) b.text(`Cajero: ${venta.cajeroNombre}`);
  if (venta.codigoComprobante && venta.codigo) b.text(`Ref interna: ${venta.codigo}`);
  b.text(`Cliente: ${venta.nombreCliente ?? 'CLIENTES VARIOS'}`);
  if (venta.documentoCliente && venta.documentoCliente !== '00000000') {
    b.text(`Doc: ${venta.documentoCliente}`);
  }
  b.hr();

  // --- Items (anchos paridad Flutter: 58mm 4/18/7/7+separadores=42; 80mm 5/32/9/9=64) ---
  const w = paperWidth === 58
    ? { cant: 4, desc: 20, pu: 8, total: 10 }
    : { cant: 5, desc: 38, pu: 9, total: 12 };
  b.row([
    { text: 'CANT', width: w.cant },
    { text: 'DESCRIPCION', width: w.desc },
    { text: 'P.U.', width: w.pu, align: 'right' },
    { text: 'TOTAL', width: w.total, align: 'right' },
  ]);
  b.hr();
  for (const d of venta.detalles ?? []) {
    const desc = `${d.origenComboNombre ? `[${d.origenComboNombre}] ` : ''}${d.descripcion}`;
    // Wrap de descripción por bloques del ancho de columna
    const chunks: string[] = [];
    for (let i = 0; i < desc.length; i += w.desc) chunks.push(desc.slice(i, i + w.desc));
    b.row([
      { text: String(Number(d.cantidad)), width: w.cant },
      { text: chunks[0] ?? '', width: w.desc },
      { text: fmt(d.precioUnitario), width: w.pu, align: 'right' },
      { text: fmt(d.total), width: w.total, align: 'right' },
    ]);
    for (const extra of chunks.slice(1)) {
      b.row([
        { text: '', width: w.cant },
        { text: extra, width: w.desc },
        { text: '', width: w.pu },
        { text: '', width: w.total },
      ]);
    }
    if (Number(d.descuento ?? 0) > 0) {
      b.row([
        { text: '', width: w.cant },
        { text: `  desc -${fmt(d.descuento)}`, width: w.desc + w.pu + w.total },
      ]);
    }
  }
  b.hr();

  // --- Condición + tributos ---
  b.text(`Condicion: ${venta.esCredito ? 'CREDITO' : 'CONTADO'}`);
  b.kv('Op. Gravada:', `S/ ${fmt(venta.subtotal)}`);
  if (Number(venta.descuento ?? 0) > 0) b.kv('Descuento:', `-S/ ${fmt(venta.descuento)}`);
  b.kv('IGV:', `S/ ${fmt(venta.impuestos)}`);

  // --- Total ---
  b.bold(true).sizeDoubleHeight(true);
  b.kv('TOTAL:', `S/ ${fmt(venta.total)}`);
  b.sizeDoubleHeight(false).bold(false);
  b.hr();

  // --- Pagos ---
  const pagos = venta.pagos ?? [];
  if (pagos.length > 0) {
    for (const p of pagos) {
      const met = METODO_PAGO_LABEL[p.metodoPago]?.toUpperCase() ?? p.metodoPago;
      b.kv(`${met}${p.referencia ? ` (${p.referencia})` : ''}:`, `S/ ${fmt(p.monto)}`);
    }
    const recibido = pagos.reduce((a, p) => a + Number(p.monto), 0);
    b.kv('RECIBIDO:', `S/ ${fmt(recibido)}`);
    const vuelto = Number(venta.montoCambio ?? 0);
    if (vuelto > 0) b.kv('VUELTO:', `S/ ${fmt(vuelto)}`);
    b.hr();
  }

  if (venta.esCredito && venta.numeroCuotas) {
    b.align('center').text(`VENTA A CREDITO - ${venta.numeroCuotas} CUOTA(S)`).align('left').hr();
  }

  // --- QR (cadena SUNAT o enlace proveedor, paridad Flutter) ---
  const qrData = (venta as { comprobanteCadenaQR?: string }).comprobanteCadenaQR
    || venta.comprobanteEnlaceProveedor
    || (venta.codigoComprobante ? `${empresa.ruc}|${venta.codigoComprobante}|${fmt(venta.total)}` : null);
  if (qrData) {
    b.align('center').qrcode(qrData);
  }

  // --- Leyenda ---
  b.align('center');
  if (venta.codigoComprobante) {
    b.text('Representacion impresa del');
    b.text('comprobante electronico');
  }
  b.text('Gracias por su compra!');

  b.feed(3).cut();
  return b.build();
}
