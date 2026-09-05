/**
 * El catálogo de productos en PDF: una grilla de dos columnas con foto,
 * nombre, precio y las características principales de cada uno.
 *
 * Es el MISMO documento que arma el app (`catalogo_pdf.dart`), medida por
 * medida: la misma empresa manda el catálogo desde el celular o desde la web y
 * al cliente le tiene que llegar la misma hoja.
 *
 * 🔴 El membrete lleva el NOMBRE COMERCIAL y el color que la empresa configuró,
 * no la razón social ni el azul del sistema. `Empresa.nombre` guarda la razón
 * social —el alta por RUC la copia ahí—, así que un catálogo armado con ese
 * campo sale encabezado "JAYLI FLORES S.A.C." en vez de "JAYLILAND".
 */

import { encajarEn, type ImagenPdf } from '@/core/pdf/imagenes-pdf';

/**
 * Una foto del ítem. Cuando un producto tiene varias, cada una suele ser un
 * COLOR o un DIBUJO distinto del mismo artículo, al mismo precio.
 */
export interface FotoItem {
  url: string;
  elegida: boolean;
}

/** Un renglón del catálogo, ya resuelto por la pantalla: producto o variante. */
export interface ItemCatalogo {
  id: string;
  titulo: string;
  codigo?: string | null;
  /**
   * La descripción del producto. Vacía o ausente = no se dibuja nada, ni el
   * espacio: una tarjeta con un hueco donde iría un texto se ve rota.
   */
  descripcion?: string | null;
  /**
   * 🔴 TODAS sus fotos, no una. Con varias elegidas sale **una tarjeta por
   * foto**, con los mismos datos: son el mismo producto en otro color, y una
   * sola foto dejaba el resto del surtido invisible.
   */
  fotos: FotoItem[];
  precio: number;
  stock: number;
  /** `nombre: valor` ya aplanados y en orden. */
  caracteristicas: [string, string][];
  elegido: boolean;
}

/** Lo que termina siendo UNA tarjeta del PDF. */
export interface TarjetaCatalogo {
  item: ItemCatalogo;
  fotoUrl?: string;
  /** "Diseño 2 de 5", solo cuando el ítem aporta más de una tarjeta. */
  etiqueta?: string;
}

/**
 * Expande los ítems en tarjetas: una por foto elegida.
 *
 * 🔴 Las tarjetas se numeran ("Diseño 2 de 5") en cuanto hay más de una. Sin
 * eso el catálogo muestra cinco tarjetas idénticas y el cliente solo puede
 * pedir "la tercera foto", que del otro lado del WhatsApp no se sabe cuál es.
 */
export function tarjetasDe(items: ItemCatalogo[]): TarjetaCatalogo[] {
  return items
    .filter((i) => i.elegido)
    .flatMap((item) => {
      const fotos = item.fotos.filter((f) => f.elegida);
      if (fotos.length <= 1) return [{ item, fotoUrl: fotos[0]?.url }];
      return fotos.map((f, i) => ({
        item,
        fotoUrl: f.url,
        etiqueta: `Diseño ${i + 1} de ${fotos.length}`,
      }));
    });
}

/** Con qué se presenta la empresa. Sale de la configuración de documentos. */
export interface MarcaCatalogo {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sedeNombre?: string | null;
  textoPie?: string | null;
  /** `[r, g, b]` del color primario. */
  color: [number, number, number];
  logo?: ImagenPdf | null;
}

export interface OpcionesCatalogo {
  incluirPrecio?: boolean;
  incluirCaracteristicas?: boolean;
  incluirCodigo?: boolean;
  /**
   * Tope por tarjeta. Con 3 se cortaba una SECCIÓN entera sin avisar: un
   * producto con procesador y disco mostraba solo el procesador.
   */
  maxCaracteristicas?: number;
}

type RGB = [number, number, number];

const GRIS: RGB = [107, 114, 128];
const GRIS_OSCURO: RGB = [55, 65, 81];
const GRIS_CLARO: RGB = [244, 245, 247];
const AMBAR: RGB = [180, 83, 9];
const AMBAR_FONDO: RGB = [254, 243, 199];

/**
 * Mezcla un color con blanco. `t` es cuánto blanco entra (0 = el color puro).
 *
 * Los fondos suaves —la caja del rótulo, el borde de la tarjeta, la línea del
 * pie— salen todos del color de la empresa. Fijarlos a un gris haría que una
 * marca roja quedara con detalles celestes.
 */
function tinte(color: RGB, t: number): RGB {
  return color.map((c) => Math.round(c + (255 - c) * t)) as RGB;
}

function fmtPrecio(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Medidas de la hoja, en mm ──
const MARGEN = 10;
/** La grilla se mete respecto del membrete, que va a todo el ancho. */
const SANGRIA_GRILLA = 7;
const SEPARACION_COLUMNAS = 4;
/** Alto de la foto. Es la medida que eligió el user en el app. */
const ALTO_FOTO = 49;
const PADDING_TARJETA = 3;

export async function construirCatalogoPdf(params: {
  items: ItemCatalogo[];
  marca: MarcaCatalogo;
  imagenes: Map<string, ImagenPdf>;
  opciones?: OpcionesCatalogo;
}) {
  const { items, marca, imagenes } = params;
  const {
    incluirPrecio = true,
    incluirCaracteristicas = true,
    incluirCodigo = true,
    maxCaracteristicas = 8,
  } = params.opciones ?? {};

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const anchoHoja = doc.internal.pageSize.getWidth();
  const altoHoja = doc.internal.pageSize.getHeight();

  const tarjetas = tarjetasDe(items);
  const color = marca.color;
  const tinteSuave = tinte(color, 0.92);
  const tinteBorde = tinte(color, 0.78);

  const anchoTarjeta =
    (anchoHoja - 2 * MARGEN - 2 * SANGRIA_GRILLA - SEPARACION_COLUMNAS) / 2;
  const izquierdaGrilla = MARGEN + SANGRIA_GRILLA;

  // 🔴 Con ceros a la izquierda y armada a mano: `toLocaleDateString('es-PE')`
  // devuelve `4/9/2026` en un entorno y `04/09/2026` en otro, y el catálogo de
  // la web no puede salir con otra fecha que el del app.
  const hoy = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  const fecha = `${dosDigitos(hoy.getDate())}/${dosDigitos(hoy.getMonth() + 1)}/${hoy.getFullYear()}`;

  /** Las características que entran, ya recortadas. */
  const rasgosDe = (t: TarjetaCatalogo) =>
    incluirCaracteristicas ? t.item.caracteristicas.slice(0, maxCaracteristicas) : [];

  /** Las líneas de la descripción, que también mueven el alto. */
  const lineasDescripcion = (t: TarjetaCatalogo): string[] => {
    const texto = (t.item.descripcion ?? '').trim();
    if (!texto) return [];
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    return (
      doc.splitTextToSize(texto, anchoTarjeta - 2 * PADDING_TARJETA) as string[]
    ).slice(0, 3);
  };

  /** El título ocupa una o dos líneas y eso cambia el alto de la tarjeta. */
  const lineasTitulo = (t: TarjetaCatalogo): string[] => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    return (
      doc.splitTextToSize(t.item.titulo, anchoTarjeta - 2 * PADDING_TARJETA) as string[]
    ).slice(0, 2);
  };

  const altoTarjeta = (t: TarjetaCatalogo): number => {
    const rasgos = rasgosDe(t);
    const hayMas =
      incluirCaracteristicas && t.item.caracteristicas.length > maxCaracteristicas;
    let h = ALTO_FOTO + PADDING_TARJETA;
    h += lineasTitulo(t).length * 3.4;
    if (t.etiqueta) h += 3;
    if (incluirCodigo && t.item.codigo) h += 3;
    if (incluirPrecio || t.item.stock <= 0) h += 6;
    h += lineasDescripcion(t).length * 2.8;
    if (rasgos.length) h += 2 + rasgos.length * 3.2 + (hayMas ? 3 : 0) + 3;
    return h + PADDING_TARJETA;
  };

  function dibujarTarjeta(tj: TarjetaCatalogo, x: number, y: number, alto: number) {
    const it = tj.item;
    // El marco, con el borde en el tinte de la marca.
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...tinteBorde);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, anchoTarjeta, alto, 2, 2, 'FD');

    // La foto va al ras de los bordes de arriba: la tarjeta se lee como una
    // ficha y no como un texto con una imagen pegada encima.
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(x + 0.3, y + 0.3, anchoTarjeta - 0.6, ALTO_FOTO, 2, 2, 'F');
    // El borde de abajo del recuadro de la foto queda recto: si no, se ve el
    // redondeo en el medio de la tarjeta.
    doc.rect(x + 0.3, y + ALTO_FOTO - 2, anchoTarjeta - 0.6, 2.3, 'F');

    const foto = tj.fotoUrl ? imagenes.get(tj.fotoUrl) : undefined;
    if (foto) {
      const caja = encajarEn(foto, {
        x: x + 1.5,
        y: y + 1.5,
        w: anchoTarjeta - 3,
        h: ALTO_FOTO - 3,
      });
      doc.addImage(foto.dataUrl, 'JPEG', caja.x, caja.y, caja.w, caja.h);
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS);
      doc.text('sin foto', x + anchoTarjeta / 2, y + ALTO_FOTO / 2, { align: 'center' });
    }

    let cursor = y + ALTO_FOTO + PADDING_TARJETA + 1;
    const izq = x + PADDING_TARJETA;
    const ancho = anchoTarjeta - 2 * PADDING_TARJETA;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS_OSCURO);
    for (const linea of lineasTitulo(tj)) {
      doc.text(linea, izq, cursor);
      cursor += 3.4;
    }

    // "Diseño 2 de 5": lo unico que distingue dos tarjetas del mismo producto.
    if (tj.etiqueta) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...color);
      doc.text(tj.etiqueta, izq, cursor + 0.6);
      cursor += 3;
    }

    if (incluirCodigo && it.codigo) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS);
      doc.text(`Cód. ${it.codigo}`, izq, cursor + 0.6);
      cursor += 3;
    }

    if (incluirPrecio || it.stock <= 0) {
      cursor += 4;
      if (incluirPrecio) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(fmtPrecio(it.precio), izq, cursor);
      }
      // Lo que se ofrece por encargo se dice, no se disimula.
      if (it.stock <= 0) {
        const w = 13;
        doc.setFillColor(...AMBAR_FONDO);
        doc.roundedRect(x + anchoTarjeta - PADDING_TARJETA - w, cursor - 3, w, 4, 1, 1, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...AMBAR);
        doc.text('A pedido', x + anchoTarjeta - PADDING_TARJETA - w / 2, cursor - 0.2, {
          align: 'center',
        });
      }
      cursor += 2;
    }

    // Después del precio y antes de las características, que es el orden en el
    // que se lee una ficha: qué es, cuánto sale, de qué se trata, y el detalle.
    const descripcion = lineasDescripcion(tj);
    if (descripcion.length) {
      cursor += 2.4;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS_OSCURO);
      for (const linea of descripcion) {
        doc.text(linea, izq, cursor);
        cursor += 2.8;
      }
      cursor -= 0.4;
    }

    const rasgos = rasgosDe(tj);
    if (rasgos.length) {
      const hayMas = it.caracteristicas.length > maxCaracteristicas;
      const altoBloque = rasgos.length * 3.2 + (hayMas ? 3 : 0) + 3;
      // Las características van en su propio bloque gris: sin eso se leían como
      // una continuación del nombre.
      doc.setFillColor(...GRIS_CLARO);
      doc.roundedRect(izq, cursor, ancho, altoBloque, 1.5, 1.5, 'F');
      let fila = cursor + 3.4;
      const anchoNombre = ancho * 0.4;
      for (const [nombre, valor] of rasgos) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRIS);
        doc.text(recortar(doc, nombre, anchoNombre - 2), izq + 2, fila);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRIS_OSCURO);
        doc.text(recortar(doc, valor, ancho - anchoNombre - 4), izq + anchoNombre, fila);
        fila += 3.2;
      }
      if (hayMas) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRIS);
        doc.text(
          `y ${it.caracteristicas.length - maxCaracteristicas} más`,
          izq + 2,
          fila,
        );
      }
    }
  }

  /**
   * El membrete de la cotización pero SIN "COTIZACIÓN", código ni validez: esto
   * no es un documento con vigencia, es una lista de productos. La fecha queda
   * en chico, que un catálogo con precios sin fecha envejece mal.
   *
   * Devuelve dónde empieza el contenido.
   */
  function membrete(): number {
    let y = MARGEN + 4;
    const derecha = anchoHoja - MARGEN;

    // La caja del rótulo, a la derecha.
    const anchoCaja = 34;
    const altoCaja = 17;
    doc.setFillColor(...tinteSuave);
    doc.roundedRect(derecha - anchoCaja, y - 4, anchoCaja, altoCaja, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text('CATÁLOGO', derecha - 3, y + 1, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS_OSCURO);
    doc.text(
      tarjetas.length === 1 ? '1 artículo' : `${tarjetas.length} artículos`,
      derecha - 3,
      y + 5,
      { align: 'right' },
    );
    doc.setTextColor(...GRIS);
    doc.text(fecha, derecha - 3, y + 9, { align: 'right' });

    // Con logo va el logo Y el nombre debajo: el nombre comercial es la marca y
    // no se pierde aunque el logo la repita.
    let x = MARGEN;
    if (marca.logo) {
      const caja = encajarEn(marca.logo, { x: MARGEN, y: y - 4, w: 38, h: 16 });
      doc.addImage(marca.logo.dataUrl, 'JPEG', caja.x, caja.y, caja.w, caja.h);
      x = MARGEN + 42;
    }

    doc.setFontSize(marca.logo ? 12 : 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(marca.nombre, x, y + 1);

    // La dirección de la SEDE manda sobre la fiscal: el cliente va a la tienda,
    // no al domicilio del contribuyente.
    const datos = [
      marca.ruc ? `RUC: ${marca.ruc}` : null,
      marca.sedeNombre ? `Sede: ${marca.sedeNombre}` : null,
      marca.direccion || null,
      marca.telefono ? `Tel: ${marca.telefono}` : null,
    ].filter(Boolean) as string[];

    let fila = y + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    for (const d of datos) {
      doc.text(recortar(doc, d, anchoHoja - x - anchoCaja - MARGEN - 6), x, fila);
      fila += 3.4;
    }

    y = Math.max(fila, y + altoCaja) + 1;
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(MARGEN, y, derecha, y);
    return y + 6;
  }

  /**
   * La franja de las hojas 2 en adelante: quién manda el catálogo, sin repetir
   * el membrete entero y sin comerse media hoja de productos.
   */
  function franja(): number {
    const y = MARGEN + 2;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(marca.nombre, MARGEN, y);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.text('Catálogo de productos', anchoHoja - MARGEN, y, { align: 'right' });
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(MARGEN, y + 1.5, anchoHoja - MARGEN, y + 1.5);
    return y + 7;
  }

  function pie(pagina: number, total: number) {
    const y = altoHoja - MARGEN - 1;
    doc.setDrawColor(...tinteBorde);
    doc.setLineWidth(0.2);
    doc.line(MARGEN, y - 4, anchoHoja - MARGEN, y - 4);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    const izquierda = [marca.textoPie, marca.telefono ? `Tel: ${marca.telefono}` : null]
      .filter(Boolean)
      .join('   ·   ');
    if (izquierda) doc.text(izquierda, MARGEN, y);
    doc.text(`Página ${pagina} de ${total}`, anchoHoja - MARGEN, y, { align: 'right' });
  }

  // ── El armado, fila por fila ──
  let y = membrete();
  const limiteY = altoHoja - MARGEN - 8;

  for (let i = 0; i < tarjetas.length; i += 2) {
    const fila = tarjetas.slice(i, i + 2);
    // 🔴 Las dos tarjetas de la fila terminan a la misma altura: si no, la que
    // tiene menos características queda corta y la grilla se ve dentada.
    const alto = Math.max(...fila.map(altoTarjeta));

    if (y + alto > limiteY && i > 0) {
      doc.addPage();
      y = franja();
    }

    fila.forEach((tj, col) => {
      const x = izquierdaGrilla + col * (anchoTarjeta + SEPARACION_COLUMNAS);
      dibujarTarjeta(tj, x, y, alto);
    });
    y += alto + 5;
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    pie(p, total);
  }

  return doc;
}

/** Corta un texto al ancho disponible, con puntos suspensivos. */
function recortar(
  doc: { getTextWidth: (t: string) => number },
  texto: string,
  ancho: number,
): string {
  if (doc.getTextWidth(texto) <= ancho) return texto;
  let corto = texto;
  while (corto.length > 1 && doc.getTextWidth(`${corto}…`) > ancho) {
    corto = corto.slice(0, -1);
  }
  return `${corto}…`;
}
