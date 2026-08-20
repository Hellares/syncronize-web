/**
 * Traduce entre la unidad en la que el sistema GUARDA y la unidad en la que el
 * usuario PIENSA. Port de `lib/core/utils/unidad_presentacion.dart`.
 *
 * Un alimento a granel se guarda en gramos —para que el stock entero aguante
 * los 22 000 de un saco— pero nadie lee "22000" ni "S/0.008". Con la
 * presentación configurada (kg = 1000 g) eso se muestra como **22 kg** y
 * **S/8.00/kg**.
 *
 * Sin presentación el factor es 1 y todo queda exactamente como antes, así que
 * se puede usar en cualquier pantalla sin preguntar si el producto la tiene.
 */
export class UnidadPresentacion {
  /** Unidades de venta que trae 1 de presentación (1 kg = 1000 g). */
  readonly factor: number;
  /** Símbolo de la presentación, ej. "kg". */
  readonly simbolo?: string | null;
  /** Símbolo de la unidad de venta, ej. "g". Fallback sin presentación. */
  readonly simboloVenta?: string | null;

  constructor(factor: number, simbolo?: string | null, simboloVenta?: string | null) {
    this.factor = factor;
    this.simbolo = simbolo;
    this.simboloVenta = simboloVenta;
  }

  /** Producto sin presentación: todo se muestra tal cual está guardado. */
  static ninguna(): UnidadPresentacion {
    return new UnidadPresentacion(1);
  }

  get activa(): boolean {
    return this.factor > 1 && !!this.simbolo;
  }

  /** En qué unidad se le habla al usuario. */
  get simboloVisible(): string | null {
    return (this.activa ? this.simbolo : this.simboloVenta) ?? null;
  }

  /** Cantidad guardada → cantidad que se muestra. 22 000 g → 22 (kg). */
  cantidad(enUnidadDeVenta: number): number {
    return this.activa ? enUnidadDeVenta / this.factor : enUnidadDeVenta;
  }

  /**
   * Precio POR unidad de venta → precio por unidad mostrada.
   * S/0.008 el gramo → S/8.00 el kilo.
   */
  precio(porUnidadDeVenta: number): number {
    return this.activa ? porUnidadDeVenta * this.factor : porUnidadDeVenta;
  }

  /**
   * PRECIO escrito por unidad mostrada → por unidad de venta, que es como se
   * guarda SIEMPRE. S/8.00 el kilo → S/0.008 el gramo.
   */
  precioAUnidadDeVenta(porUnidadMostrada: number): number {
    return this.activa ? porUnidadMostrada / this.factor : porUnidadMostrada;
  }

  /**
   * "22 kg" · "20.5 kg" · "1.237 kg" · sin presentación, "22000".
   *
   * Hasta 3 decimales y sin ceros de relleno: con base en gramos, 3 decimales
   * de un kilo son exactamente 1 g, así que no se pierde precisión al mostrar
   * y no queda "22.000 kg", que se lee horrible.
   */
  cantidadTexto(enUnidadDeVenta: number, conSimbolo = true): string {
    const texto = sinCerosSobrantes(this.cantidad(enUnidadDeVenta), 3);
    const simbolo = this.simboloVisible;
    return conSimbolo && simbolo ? `${texto} ${simbolo}` : texto;
  }

  /**
   * "S/ 8.00/kg". Los precios siempre con 2 decimales: en la unidad en la que
   * se habla, el precio ya es un número normal.
   */
  precioTexto(porUnidadDeVenta: number, moneda = 'S/', conSimbolo = true): string {
    const valor = this.precio(porUnidadDeVenta).toFixed(2);
    if (!conSimbolo || !this.activa) return `${moneda} ${valor}`;
    return `${moneda} ${valor}/${this.simbolo}`;
  }
}

function sinCerosSobrantes(v: number, maxDecimales: number): string {
  if (Number.isInteger(v)) return v.toFixed(0);
  return v.toFixed(maxDecimales).replace(/0+$/, '').replace(/\.$/, '');
}
