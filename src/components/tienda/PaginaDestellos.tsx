'use client';

import { useEffect, useRef } from 'react';

/**
 * El brillo del mouse de los destellos del banner (`BannerDestellos`), en el
 * fondo de toda la página: una grilla invisible cuyos puntos se encienden en
 * blanco alrededor del cursor (el fondo de la tienda siempre es de color).
 * Va fija detrás del contenido (como el fondo), así que se ve entre las
 * tarjetas y no encima de ellas.
 *
 * Solo se dibuja cuando se mueve el mouse (no hay animación continua). Sin
 * mouse (celular) o con "reducir movimiento" no hace nada.
 */
export function PaginaDestellos() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SPACING = 32;
    const RADIO = 190;
    const DOT_BASE = 1;
    const DOT_MAX = 3.5;

    let ancho = 0;
    let alto = 0;
    let pendiente = 0;
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujar();
    };

    // Solo los puntos dentro del radio: unas decenas por cuadro.
    const dibujar = () => {
      pendiente = 0;
      ctx.clearRect(0, 0, ancho, alto);
      if (mouse.x < 0) return;
      const c0 = Math.max(0, Math.floor((mouse.x - RADIO) / SPACING));
      const c1 = Math.ceil((mouse.x + RADIO) / SPACING);
      const r0 = Math.max(0, Math.floor((mouse.y - RADIO) / SPACING));
      const r1 = Math.ceil((mouse.y + RADIO) / SPACING);
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const x = col * SPACING;
          const y = row * SPACING;
          const dist = Math.hypot(x - mouse.x, y - mouse.y);
          if (dist >= RADIO) continue;
          const intensity = 1 - dist / RADIO;
          const size = DOT_BASE + intensity * (DOT_MAX - DOT_BASE);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + intensity * 0.8})`;
          ctx.fill();
          if (intensity > 0.45) {
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.35})`;
            ctx.fill();
          }
        }
      }
    };

    const pedirCuadro = () => { if (!pendiente) pendiente = requestAnimationFrame(dibujar); };
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; pedirCuadro(); };
    const onSalir = (e: MouseEvent) => {
      if (e.relatedTarget) return; // se movió a otro elemento, sigue en la página
      mouse.x = -1000; mouse.y = -1000; pedirCuadro();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseout', onSalir);
    return () => {
      cancelAnimationFrame(pendiente);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseout', onSalir);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="hidden md:block fixed inset-0 w-full h-full pointer-events-none z-0" />;
}
