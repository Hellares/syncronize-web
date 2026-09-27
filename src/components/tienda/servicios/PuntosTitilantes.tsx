'use client';

import { useEffect, useRef } from 'react';

/**
 * La grilla de puntos blancos de la portada de servicios, pero viva: cada punto
 * titila a su ritmo (aparece, brilla con halo y se apaga). Va dentro de la capa
 * del fondo, así hereda su difuminado. Se pausa fuera de pantalla y queda
 * quieta con "reducir movimiento".
 */
export function PuntosTitilantes({ espacio = 28 }: { espacio?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ancho = 0, alto = 0, anim = 0;
    let puntos: { x: number; y: number; fase: number; vel: number }[] = [];

    const armar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = canvas.offsetWidth;
      alto = canvas.offsetHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      puntos = [];
      for (let y = espacio / 2; y < alto; y += espacio) {
        for (let x = espacio / 2; x < ancho; x += espacio) {
          puntos.push({ x, y, fase: Math.random() * Math.PI * 2, vel: 0.25 + Math.random() * 0.6 });
        }
      }
    };

    const dibujar = (ms: number) => {
      const t = ms / 1000;
      ctx.clearRect(0, 0, ancho, alto);
      for (const p of puntos) {
        // Un pico corto por ciclo: la mayor parte del tiempo el punto está tenue.
        const pico = quieto ? 0 : Math.pow(Math.max(0, Math.sin(t * p.vel + p.fase)), 40);
        const r = 1.3 + pico * 0.8;
        if (pico > 0.25) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${pico * 0.18})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.16 + pico * 0.8})`;
        ctx.fill();
      }
      if (!quieto) anim = requestAnimationFrame(dibujar);
    };

    const arrancar = () => { if (!anim) anim = requestAnimationFrame(dibujar); };
    const parar = () => { cancelAnimationFrame(anim); anim = 0; };

    armar();
    const ro = new ResizeObserver(() => { armar(); if (quieto) dibujar(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? arrancar() : parar()));
    io.observe(canvas);
    if (quieto) dibujar(0); else arrancar();

    return () => { parar(); ro.disconnect(); io.disconnect(); };
  }, [espacio]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 w-full h-full" />;
}
