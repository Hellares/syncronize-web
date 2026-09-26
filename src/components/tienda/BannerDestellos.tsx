'use client';

import { useEffect, useRef } from 'react';

/**
 * Destellos sobre el banner: el efecto `GridWave` de la landing adaptado a la
 * tienda. Una grilla de puntos tenues por la que cada ~2 s viaja una onda que
 * los enciende en blanco; cerca del mouse también se encienden.
 *
 * Diferencias con el de la landing: no bloquea los clics (escucha el mouse en
 * el contenedor), respeta la densidad de pantalla, se pausa fuera de pantalla,
 * se apaga con "reducir movimiento" y en celular va más tenue.
 */
export function BannerDestellos() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const zona = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !zona || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tactil = window.matchMedia('(hover: none)').matches;
    const FUERZA = tactil ? 0.55 : 1;
    const SPACING = 32;
    const DOT_BASE = 1.1;
    const DOT_MAX = 4;
    const WAVE_RADIUS_MAX = 480;
    const MOUSE_RADIUS = 170;

    let ancho = 0;
    let alto = 0;
    let animationId = 0;
    let visible = true;
    let lastWaveTime = 0;
    let waves: { x: number; y: number; time: number; speed: number }[] = [];
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = canvas.offsetWidth;
      alto = canvas.offsetHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnWave = (time: number) => {
      waves.push({ x: Math.random() * ancho, y: Math.random() * alto, time, speed: 160 + Math.random() * 50 });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, ancho, alto);

      if (time - lastWaveTime > 2200) {
        spawnWave(time);
        lastWaveTime = time;
      }
      waves = waves.filter((w) => (time - w.time) * 0.001 * w.speed < WAVE_RADIUS_MAX + 100);

      const cols = Math.ceil(ancho / SPACING) + 1;
      const rows = Math.ceil(alto / SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING;
          const y = row * SPACING;
          let intensity = 0;

          for (const w of waves) {
            const dist = Math.hypot(x - w.x, y - w.y);
            const waveRadius = (time - w.time) * 0.001 * w.speed;
            const waveDelta = Math.abs(dist - waveRadius);
            if (waveDelta < 60) {
              const ageFade = 1 - Math.min(waveRadius / WAVE_RADIUS_MAX, 1);
              intensity = Math.max(intensity, (1 - waveDelta / 60) * ageFade);
            }
          }

          const mouseDist = Math.hypot(x - mouse.x, y - mouse.y);
          if (mouseDist < MOUSE_RADIUS) intensity = Math.max(intensity, (1 - mouseDist / MOUSE_RADIUS) * 0.8);

          intensity *= FUERZA;
          const size = DOT_BASE + intensity * (DOT_MAX - DOT_BASE);

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          if (intensity > 0.08) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + intensity * 0.8})`;
            ctx.fill();
            if (intensity > 0.3) {
              ctx.beginPath();
              ctx.arc(x, y, size * 3, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.25})`;
              ctx.fill();
            }
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * FUERZA})`;
            ctx.fill();
          }
        }
      }

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.035 * FUERZA})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let col = 0; col <= cols; col++) { ctx.moveTo(col * SPACING, 0); ctx.lineTo(col * SPACING, alto); }
      for (let row = 0; row <= rows; row++) { ctx.moveTo(0, row * SPACING); ctx.lineTo(ancho, row * SPACING); }
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    const arrancar = () => { if (!animationId) animationId = requestAnimationFrame(draw); };
    const parar = () => { cancelAnimationFrame(animationId); animationId = 0; };

    // El canvas no recibe el mouse (dejaría sin clic al link del banner):
    // se escucha en el contenedor.
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Fuera de pantalla no se dibuja (el usuario está mirando productos).
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) arrancar(); else parar();
    });
    io.observe(canvas);
    zona.addEventListener('mousemove', onMove);
    zona.addEventListener('mouseleave', onLeave);
    if (visible) arrancar();

    return () => {
      parar();
      ro.disconnect();
      io.disconnect();
      zona.removeEventListener('mousemove', onMove);
      zona.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />;
}
