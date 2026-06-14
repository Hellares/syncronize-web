// Generador ESC-POS para tickets de venta — réplica de
// ticket_venta_esc_pos_generator.dart de Flutter (Bluetooth Classic → QZ Tray).
import type { Venta } from '@/core/types/venta';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import type { OrdenServicio } from '@/core/types/orden-servicio';
import {
  TIPO_SERVICIO_LABEL, ESTADO_OS_CONFIG, PRIORIDAD_LABEL, TIPO_ACCION_LABEL,
  nombreClienteOrden, subtotalComponentesOrden, costoFinalOrden, saldoPendienteOrden,
} from '@/core/types/orden-servicio';
import type { TipoServicio, PrioridadServicio, TipoAccionComponente } from '@/core/types/orden-servicio';

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

/** Formatea el valor de un campo dinámico para el ticket (omite booleanos/vacíos). */
function osFieldValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(v => osFieldValue(v)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`).join(' | ');
  }
  const s = String(value).trim();
  return s === 'true' || s === 'false' ? '' : s;
}

/** Genera los bytes del ticket de orden de servicio (paridad ticket_esc_pos_generator.dart de Flutter). */
export function generarTicketOrdenServicio(orden: OrdenServicio, empresa: EmpresaInfo, paperWidth: 58 | 80): number[] {
  const b = new EscPosBuilder(paperWidth);
  b.reset().fontB();

  // --- Encabezado empresa ---
  b.align('center').bold(true).sizeDoubleHeight(true)
    .text(empresa.nombreComercial || empresa.razonSocial || 'EMPRESA')
    .sizeDoubleHeight(false).bold(false);
  if (empresa.razonSocial && empresa.nombreComercial) b.text(empresa.razonSocial);
  if (empresa.ruc) b.text(`RUC: ${empresa.ruc}`);
  if (empresa.direccionFiscal) b.text(empresa.direccionFiscal);
  if (empresa.telefono) b.text(`Tel: ${empresa.telefono}`);
  b.hr();

  // --- Documento ---
  b.text('ORDEN DE SERVICIO').text(orden.codigo).hr();

  // --- Metadata ---
  b.align('left').text(`Fecha: ${new Date(orden.creadoEn).toLocaleString('es-PE')}`);
  if ((orden.numeroReingresos ?? 0) > 0) {
    b.align('center').bold(true).text(`*** REINGRESO #${orden.numeroReingresos} ***`).bold(false).align('left');
  }
  b.hr();

  // --- Cliente ---
  b.text('CLIENTE').text(`Nombre: ${nombreClienteOrden(orden)}`);
  const doc = orden.clienteEmpresa?.ruc ?? orden.clienteEmpresa?.numeroDocumento ?? orden.cliente?.persona?.dni;
  const tel = orden.clienteEmpresa?.telefono ?? orden.cliente?.persona?.telefono;
  const email = orden.clienteEmpresa?.email ?? orden.cliente?.persona?.email;
  if (doc) b.text(`Doc: ${doc}`);
  if (tel) b.text(`Tel: ${tel}`);
  if (email) b.text(`Email: ${email}`);
  b.hr();

  // --- Detalle del servicio ---
  b.text('DETALLE DEL SERVICIO');
  b.text(`Tipo: ${TIPO_SERVICIO_LABEL[orden.tipoServicio as TipoServicio] ?? orden.tipoServicio}`);
  b.text(`Estado: ${ESTADO_OS_CONFIG[orden.estado]?.label ?? orden.estado}`);
  b.text(`Prioridad: ${PRIORIDAD_LABEL[orden.prioridad as PrioridadServicio] ?? orden.prioridad}`);
  const tecnico = orden.tecnico?.persona ? [orden.tecnico.persona.nombres, orden.tecnico.persona.apellidos].filter(Boolean).join(' ') : null;
  if (tecnico) b.text(`Tecnico: ${tecnico}`);

  // --- Equipo ---
  if (orden.tipoEquipo || orden.marcaEquipo || orden.numeroSerie) {
    b.hr().text('EQUIPO');
    if (orden.tipoEquipo) b.text(`Tipo: ${orden.tipoEquipo}`);
    if (orden.marcaEquipo) b.text(`Marca: ${orden.marcaEquipo}`);
    if (orden.numeroSerie) b.text(`N/Serie: ${orden.numeroSerie}`);
    if (orden.condicionEquipo) b.text(`Condicion: ${orden.condicionEquipo}`);
  }

  // --- Datos adicionales (campos dinámicos) ---
  const datos = orden.datosPersonalizados ?? {};
  const datosKeys = Object.keys(datos);
  if (datosKeys.length > 0) {
    const lineas = datosKeys.map(k => ({ k, v: osFieldValue(datos[k]) })).filter(x => x.v);
    if (lineas.length > 0) {
      b.hr().text('DATOS ADICIONALES');
      for (const { k, v } of lineas) b.text(`${k}: ${v}`);
    }
  }

  // --- Problema ---
  if (orden.descripcionProblema) {
    b.hr().text('PROBLEMA REPORTADO').text(orden.descripcionProblema);
  }

  // --- Componentes / trabajos ---
  const comps = orden.componentes ?? [];
  if (comps.length > 0) {
    b.hr().text('DETALLE DE TRABAJOS');
    for (const c of comps) {
      const nombre = c.componente?.tipoComponente?.nombre ?? c.componente?.marca ?? 'Componente';
      const modelo = c.componente?.modelo ? ` ${c.componente.modelo}` : '';
      const accion = TIPO_ACCION_LABEL[c.tipoAccion as TipoAccionComponente] ?? c.tipoAccion;
      const costo = Number(c.costoAccion ?? 0) + Number(c.costoRepuestos ?? 0);
      b.kv(`- ${nombre}${modelo} (${accion})`, costo > 0 ? `S/ ${fmt(costo)}` : '');
      if (c.descripcionAccion) b.text(`  ${c.descripcionAccion}`);
      if (c.garantiaMeses) b.text(`  Garantia: ${c.garantiaMeses} meses`);
    }
  }

  // --- Notas ---
  if (orden.notas) b.hr().text('NOTAS').text(orden.notas);

  // --- Costos (modelo aditivo: repuestos/componentes + servicio − descuento) ---
  const compSub = subtotalComponentesOrden(orden);
  const totalCli = costoFinalOrden(orden);
  if (totalCli != null) {
    b.hr().text('COSTOS');
    if (compSub > 0) b.kv('Repuestos/componentes:', `S/ ${fmt(compSub)}`);
    if (Number(orden.costoTotal ?? 0) > 0) b.kv('Costo servicio:', `S/ ${fmt(orden.costoTotal)}`);
    if (Number(orden.descuento ?? 0) > 0) b.kv('Descuento:', `-S/ ${fmt(orden.descuento)}`);
    b.kv('Total al cliente:', `S/ ${fmt(totalCli)}`);
    if (Number(orden.adelanto ?? 0) > 0) {
      const met = orden.metodoPagoAdelanto ? ` (${orden.metodoPagoAdelanto})` : '';
      b.kv(`Adelanto${met}:`, `-S/ ${fmt(orden.adelanto)}`);
    }
    const saldo = saldoPendienteOrden(orden) ?? 0;
    b.hr().bold(true).sizeDoubleHeight(true);
    b.kv(saldo <= 0.005 ? 'PAGADO:' : 'SALDO:', `S/ ${fmt(saldo <= 0.005 ? 0 : saldo)}`);
    b.sizeDoubleHeight(false).bold(false);
  }

  // --- QR ---
  b.hr().feed(1).align('center');
  b.qrcode(`${orden.codigo}|${ESTADO_OS_CONFIG[orden.estado]?.label ?? orden.estado}|${new Date(orden.creadoEn).toLocaleDateString('es-PE')}`, 5);
  b.feed(1);

  // --- Firma ---
  b.hr().feed(3);
  b.text('________________________').text('Firma del cliente');
  b.feed(1).bold(true).text('Gracias por su preferencia').bold(false);

  b.feed(3).cut();
  return b.build();
}
