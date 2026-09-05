/**
 * La ficha de un producto dibujada en un `<canvas>`, para MANDARLA por
 * WhatsApp.
 *
 * Es la misma ficha que el app captura de un widget (`ficha_compartible.dart`):
 * franja con la marca, foto, nombre, precio y características.
 *
 * 🔴 **No va con html2canvas.** Tailwind v4 emite los colores como `oklch()` y
 * html2canvas revienta al parsearlos. Dibujando a mano, además, el resultado no
 * depende de cómo el navegador interprete el CSS: la imagen sale igual en todas
 * las máquinas, que es lo que importa cuando el archivo se le manda a un
 * cliente.
 *
 * 🔴 **Todo tiene que estar RESUELTO antes de dibujar**: una fuente que todavía
 * no cargó sale en Times New Roman y una foto a medio bajar no sale. Por eso
 * [dibujarFicha] espera a `document.fonts.ready` y a los bitmaps ANTES de
 * pintar el primer pixel.
 */

export interface MarcaFicha {
  nombre: string;
  telefono?: string | null;
  textoPie?: string | null;
  color: [number, number, number];
  logoUrl?: string | null;
}

export interface DatosFicha {
  titulo: string;
  codigo?: string | null;
  /** La descripción del producto. Vacía o ausente = no se dibuja nada. */
  descripcion?: string | null;
  fotoUrl?: string | null;
  precio: number;
  /** El de lista, solo si hay rebaja vigente: sirve para tacharlo. */
  precioAnterior?: number | null;
  /** `nombre: valor` ya aplanados y en orden. */
  caracteristicas: [string, string][];
  marca: MarcaFicha;
}

export interface OpcionesFicha {
  incluirPrecio?: boolean;
  incluirCaracteristicas?: boolean;
  incluirCodigo?: boolean;
}

/**
 * Ancho del lienzo en píxeles lógicos. Con [ESCALA] el PNG sale de ~1080 px de
 * ancho, que es lo que WhatsApp muestra sin recomprimir feo.
 */
const ANCHO = 360;
const ESCALA = 3;

const PAD = 14;
const ALTO_CABECERA = 46;
const ALTO_FOTO = 260;
const ALTO_PIE = 38;

const TINTA = '#111827';
const GRIS_TEXTO = '#6b7280';
const GRIS_FONDO = '#f3f4f6';
const GRIS_BORDE = '#e5e7eb';
const ROJO = '#dc2626';

const FUENTE = '"Amazon Ember", system-ui, -apple-system, sans-serif';

function rgb([r, g, b]: [number, number, number]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function money(v: number) {
  return `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Baja una imagen para el canvas. null si no se pudo: la ficha sale igual. */
async function cargarBitmap(url?: string | null): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function envolver(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxAncho: number,
  maxLineas = 3,
): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= maxAncho || !actual) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = p;
      if (lineas.length === maxLineas) break;
    }
  }
  if (lineas.length < maxLineas && actual) lineas.push(actual);
  return lineas.slice(0, maxLineas);
}

/** Corta con puntos suspensivos lo que no entra en una línea. */
function recortar(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string {
  if (ctx.measureText(texto).width <= maxAncho) return texto;
  let corto = texto;
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > maxAncho) {
    corto = corto.slice(0, -1);
  }
  return `${corto}…`;
}

/**
 * Dibuja la ficha en [canvas] y lo deja del tamaño exacto del contenido.
 *
 * Va en dos pasadas: primero se mide con las mismas fuentes con las que se va a
 * escribir —el alto depende de cuántas líneas ocupe el nombre y de cuántas
 * características haya—, y recién ahí se fija el alto del lienzo. Fijarlo antes
 * dejaba fichas con un hueco abajo o con la última fila cortada.
 */
export async function dibujarFicha(
  canvas: HTMLCanvasElement,
  datos: DatosFicha,
  opciones: OpcionesFicha = {},
): Promise<void> {
  const {
    incluirPrecio = true,
    incluirCaracteristicas = true,
    incluirCodigo = true,
  } = opciones;

  // 🔴 Antes de medir NADA: con la fuente sin cargar, el ancho de cada línea es
  // el de otra tipografía y el texto termina cortado donde no va.
  if (document.fonts?.ready) await document.fonts.ready;

  const [foto, logo] = await Promise.all([
    cargarBitmap(datos.fotoUrl),
    cargarBitmap(datos.marca.logoUrl),
  ]);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const anchoTexto = ANCHO - 2 * PAD;
  const rasgos = incluirCaracteristicas ? datos.caracteristicas : [];
  const hayRebaja =
    datos.precioAnterior != null && datos.precioAnterior > datos.precio;

  // ── Pasada 1: medir ──
  ctx.font = `700 17px ${FUENTE}`;
  const lineasTitulo = envolver(ctx, datos.titulo, anchoTexto, 3);

  const textoDescripcion = (datos.descripcion ?? '').trim();
  ctx.font = `400 11.5px ${FUENTE}`;
  const lineasDescripcion = textoDescripcion
    ? envolver(ctx, textoDescripcion, anchoTexto, 5)
    : [];

  let alto = ALTO_CABECERA + ALTO_FOTO + 12;
  alto += lineasTitulo.length * 21;
  if (incluirCodigo && datos.codigo) alto += 22;
  if (incluirPrecio) alto += 40;
  if (lineasDescripcion.length) alto += 12 + lineasDescripcion.length * 16;
  if (rasgos.length) alto += 26 + rasgos.length * 22;
  alto += 14 + ALTO_PIE;

  canvas.width = ANCHO * ESCALA;
  canvas.height = Math.round(alto) * ESCALA;
  // El CSS lo muestra a tamaño lógico; el bitmap va a ×3 para que WhatsApp no
  // lo vea pixelado.
  canvas.style.width = `${ANCHO}px`;
  canvas.style.height = `${Math.round(alto)}px`;
  ctx.scale(ESCALA, ESCALA);

  // ── Pasada 2: dibujar ──
  const marca = rgb(datos.marca.color);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ANCHO, alto);

  // Cabecera con la marca.
  ctx.fillStyle = marca;
  ctx.fillRect(0, 0, ANCHO, ALTO_CABECERA);
  let xNombre = PAD;
  if (logo) {
    // El logo sobre fondo blanco: la mayoría vienen recortados sobre blanco y
    // sobre la franja de color se veían sucios.
    const caja = 26;
    const yCaja = (ALTO_CABECERA - caja - 6) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(PAD, yCaja, caja + 6, caja + 6, 6);
    ctx.fill();
    const escala = Math.min(caja / logo.width, caja / logo.height);
    const w = logo.width * escala;
    const h = logo.height * escala;
    // Centrado dentro de la caja blanca: un logo apaisado pegado a la
    // izquierda se lee como un error de alineación.
    ctx.drawImage(logo, PAD + 3 + (caja - w) / 2, yCaja + 3 + (caja - h) / 2, w, h);
    xNombre = PAD + caja + 15;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 13.5px ${FUENTE}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(
    recortar(ctx, datos.marca.nombre, ANCHO - xNombre - PAD),
    xNombre,
    ALTO_CABECERA / 2,
  );
  ctx.textBaseline = 'alphabetic';

  // Foto: `contain` y centrada. Recortar una foto de producto le come el borde,
  // que es justo lo que el cliente quiere ver.
  ctx.fillStyle = GRIS_FONDO;
  ctx.fillRect(0, ALTO_CABECERA, ANCHO, ALTO_FOTO);
  if (foto) {
    const escala = Math.min((ANCHO - 12) / foto.width, (ALTO_FOTO - 12) / foto.height);
    const w = foto.width * escala;
    const h = foto.height * escala;
    ctx.drawImage(foto, (ANCHO - w) / 2, ALTO_CABECERA + (ALTO_FOTO - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#9ca3af';
    ctx.font = `400 12px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText('sin foto', ANCHO / 2, ALTO_CABECERA + ALTO_FOTO / 2);
    ctx.textAlign = 'left';
  }

  let y = ALTO_CABECERA + ALTO_FOTO + 24;

  ctx.fillStyle = TINTA;
  ctx.font = `700 17px ${FUENTE}`;
  for (const linea of lineasTitulo) {
    ctx.fillText(linea, PAD, y);
    y += 21;
  }

  if (incluirCodigo && datos.codigo) {
    const etiqueta = `Cód. ${datos.codigo}`;
    ctx.font = `400 10px ${FUENTE}`;
    const w = ctx.measureText(etiqueta).width + 12;
    ctx.fillStyle = GRIS_FONDO;
    ctx.beginPath();
    ctx.roundRect(PAD, y - 9, w, 16, 4);
    ctx.fill();
    ctx.fillStyle = GRIS_TEXTO;
    ctx.fillText(etiqueta, PAD + 6, y + 2);
    y += 22;
  }

  if (incluirPrecio) {
    y += 20;
    ctx.font = `800 27px ${FUENTE}`;
    ctx.fillStyle = hayRebaja ? ROJO : marca;
    ctx.fillText(money(datos.precio), PAD, y);
    if (hayRebaja && datos.precioAnterior != null) {
      const xAnterior = PAD + ctx.measureText(money(datos.precio)).width + 10;
      ctx.font = `400 12px ${FUENTE}`;
      ctx.fillStyle = '#9ca3af';
      const anterior = money(datos.precioAnterior);
      ctx.fillText(anterior, xAnterior, y - 14);
      const anchoAnterior = ctx.measureText(anterior).width;
      ctx.fillRect(xAnterior, y - 18, anchoAnterior, 1);

      // El descuento en porcentaje: "antes S/ 120" dice poco, "-25%" se entiende
      // de un vistazo y es lo que hace que la ficha se reenvíe.
      const pct = Math.round(
        ((datos.precioAnterior - datos.precio) / datos.precioAnterior) * 100,
      );
      if (pct > 0) {
        ctx.font = `700 10px ${FUENTE}`;
        const etiqueta = `-${pct}%`;
        const w = ctx.measureText(etiqueta).width + 10;
        ctx.fillStyle = '#fee2e2';
        ctx.beginPath();
        ctx.roundRect(xAnterior, y - 10, w, 14, 4);
        ctx.fill();
        ctx.fillStyle = ROJO;
        ctx.fillText(etiqueta, xAnterior + 5, y);
      }
    }
    y += 20;
  }

  // Después del precio y antes de las características.
  if (lineasDescripcion.length) {
    y += 12;
    ctx.font = `400 11.5px ${FUENTE}`;
    ctx.fillStyle = '#374151';
    for (const linea of lineasDescripcion) {
      ctx.fillText(linea, PAD, y);
      y += 16;
    }
    y -= 4;
  }

  if (rasgos.length) {
    y += 14;
    ctx.fillStyle = marca;
    ctx.fillRect(PAD, y - 8, 16, 2);
    ctx.font = `700 9px ${FUENTE}`;
    ctx.fillStyle = GRIS_TEXTO;
    ctx.fillText('CARACTERÍSTICAS', PAD + 22, y - 4);
    y += 12;

    const anchoNombre = anchoTexto * 0.42;
    ctx.beginPath();
    ctx.roundRect(PAD, y - 4, anchoTexto, rasgos.length * 22, 6);
    ctx.strokeStyle = GRIS_BORDE;
    ctx.lineWidth = 1;
    ctx.stroke();

    rasgos.forEach(([nombre, valor], i) => {
      const filaY = y - 4 + i * 22;
      // Cebra en las pares, igual que la ficha técnica del detalle.
      if (i % 2 === 0) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(PAD + 0.5, filaY + 0.5, anchoTexto - 1, 22);
      }
      if (i > 0) {
        ctx.strokeStyle = GRIS_BORDE;
        ctx.beginPath();
        ctx.moveTo(PAD, filaY);
        ctx.lineTo(PAD + anchoTexto, filaY);
        ctx.stroke();
      }
      ctx.font = `400 10px ${FUENTE}`;
      ctx.fillStyle = GRIS_TEXTO;
      ctx.fillText(recortar(ctx, nombre, anchoNombre - 14), PAD + 8, filaY + 14);
      ctx.font = `600 10px ${FUENTE}`;
      ctx.fillStyle = '#374151';
      ctx.fillText(
        recortar(ctx, valor, anchoTexto - anchoNombre - 16),
        PAD + anchoNombre,
        filaY + 14,
      );
    });
    y += rasgos.length * 22 + 4;
  }

  // Pie.
  const yPie = alto - ALTO_PIE;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, yPie, ANCHO, ALTO_PIE);
  ctx.strokeStyle = GRIS_BORDE;
  ctx.beginPath();
  ctx.moveTo(0, yPie);
  ctx.lineTo(ANCHO, yPie);
  ctx.stroke();

  const tel = datos.marca.telefono?.trim();
  if (tel) {
    ctx.font = `600 11.5px ${FUENTE}`;
    ctx.fillStyle = '#374151';
    ctx.fillText(tel, PAD, yPie + 23);
  }
  const cierre = datos.marca.textoPie?.trim() || 'Consulte disponibilidad';
  ctx.font = `400 9.5px ${FUENTE}`;
  ctx.fillStyle = '#9ca3af';
  ctx.textAlign = tel ? 'right' : 'left';
  ctx.fillText(cierre, tel ? ANCHO - PAD : PAD, yPie + 23);
  ctx.textAlign = 'left';
}

/** El PNG listo para mandar. */
export function fichaABlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo armar la imagen'))),
      'image/png',
    );
  });
}
