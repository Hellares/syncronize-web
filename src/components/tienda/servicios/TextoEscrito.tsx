'use client';

import { useEffect, useState } from 'react';

/**
 * Texto que "se escribe" letra por letra con un cursor que parpadea, y se
 * vuelve a escribir cada `repetirCada` ms. El texto completo ocupa su lugar
 * desde el principio (invisible), así la fila no salta mientras se escribe;
 * lectores de pantalla y buscadores leen el texto entero. Con "reducir
 * movimiento" se muestra completo.
 */
export function TextoEscrito({ texto, velocidad = 70, demora = 400, repetirCada = 15000 }: {
  texto: string;
  velocidad?: number;
  demora?: number;
  repetirCada?: number;
}) {
  const [n, setN] = useState(texto.length);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let escribir: ReturnType<typeof setInterval> | undefined;
    const empezar = () => {
      clearInterval(escribir);
      setN(0);
      let i = 0;
      escribir = setInterval(() => {
        i++;
        setN(i);
        if (i >= texto.length) clearInterval(escribir);
      }, velocidad);
    };
    const inicio = setTimeout(empezar, demora);
    const bucle = setInterval(empezar, repetirCada);
    return () => {
      clearTimeout(inicio);
      clearInterval(bucle);
      clearInterval(escribir);
    };
  }, [texto, velocidad, demora, repetirCada]);

  return (
    <span className="relative inline-grid">
      <span className="sr-only">{texto}</span>
      {/* Reserva el ancho del texto completo */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{texto}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {texto.slice(0, n)}
        <span className="inline-block w-[3px] h-[0.9em] ml-1 align-[-0.08em] bg-white animate-pulse" />
      </span>
    </span>
  );
}
