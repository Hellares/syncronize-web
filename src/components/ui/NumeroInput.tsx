'use client';

import { useState } from 'react';

/**
 * Input numérico que SE PUEDE DEJAR VACÍO mientras se escribe.
 *
 * 🔴 El patrón de siempre —`value={n}` con
 * `onChange={e => set(parseFloat(e.target.value) || 0)}`— no deja borrar: al
 * vaciar la caja, `parseFloat('')` es `NaN`, el `|| 0` lo convierte en 0 y ese
 * 0 vuelve a la caja en el mismo render. El campo queda con un cero pegado que
 * no se va, y para escribir hay que pelearse con él.
 *
 * Acá el texto TECLEADO vive en el componente y el padre solo recibe números
 * válidos. Mientras el campo está en foco manda lo que el usuario escribió
 * —aunque sea `''` o `'0.'`, que son estados legítimos a mitad de camino— y al
 * salir se vuelve a mostrar el valor del modelo.
 *
 * Va con `type="text"` a propósito: en un `type="number"`, un valor intermedio
 * como `'0.'` o `'1,'` llega a `e.target.value` como `''` según el browser, así
 * que no se puede escribir un decimal de forma confiable. Y eso importa: un
 * granel se cotiza en decimales (1.5 kg).
 */

/** Vacío, o dígitos con UN separador decimal. Coma y punto valen los dos. */
const SOLO_NUMERO = /^\d*(?:[.,]\d*)?$/;

interface Props {
  /** Valor del modelo. Se muestra cuando el campo no se está editando. */
  value: number;
  /** Se llama SOLO con números válidos. */
  onChange: (n: number) => void;
  /** Con qué se queda el modelo si el campo se deja vacío al salir. */
  vacio?: number;
  /** Con este valor la caja se ve vacía (p. ej. 0 en un descuento opcional). */
  ocultarSi?: number;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export default function NumeroInput({
  value,
  onChange,
  vacio = 0,
  ocultarSi,
  placeholder,
  disabled,
  title,
  className,
}: Props) {
  // `null` = no se está editando: manda el valor del modelo.
  const [texto, setTexto] = useState<string | null>(null);

  const delModelo = ocultarSi !== undefined && value === ocultarSi ? '' : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      title={title}
      disabled={disabled}
      placeholder={placeholder}
      value={texto ?? delModelo}
      // Al entrar se selecciona todo: teclear PISA el valor en vez de quedar
      // pegado al lado del que había.
      onFocus={e => e.currentTarget.select()}
      onChange={e => {
        const v = e.target.value.trim();
        // Letras y signos no entran: sin esto, `type="text"` acepta cualquier
        // cosa y el modelo se queda con el último número bueno sin avisar.
        if (!SOLO_NUMERO.test(v)) return;
        setTexto(v);
        const n = parseFloat(v.replace(',', '.'));
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        // Vacío, o a medio escribir (`'.'`): el modelo se queda con `vacio`.
        const n = parseFloat((texto ?? '').replace(',', '.'));
        if (texto !== null && Number.isNaN(n)) onChange(vacio);
        setTexto(null);
      }}
      className={className}
    />
  );
}
