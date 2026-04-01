'use client';

import { useEffect, useRef } from 'react';

export default function GridWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let mouse = { x: -1000, y: -1000 };
    let waves: { x: number; y: number; time: number; speed: number }[] = [];
    let lastWaveTime = 0;

    const SPACING = 32;
    const DOT_BASE = 1.2;
    const DOT_MAX = 4.5;
    const WAVE_RADIUS_MAX = 500;
    const WAVE_SPEED = 170;
    const MOUSE_RADIUS = 200;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const spawnWave = (time: number) => {
      waves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        time,
        speed: WAVE_SPEED + Math.random() * 50,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn waves periodically
      if (time - lastWaveTime > 2000) {
        spawnWave(time);
        lastWaveTime = time;
      }

      // Clean old waves
      waves = waves.filter((w) => (time - w.time) * 0.001 * w.speed < WAVE_RADIUS_MAX + 100);

      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING;
          const y = row * SPACING;

          let intensity = 0;

          // Wave influence
          for (const w of waves) {
            const dist = Math.sqrt((x - w.x) ** 2 + (y - w.y) ** 2);
            const elapsed = (time - w.time) * 0.001;
            const waveRadius = elapsed * w.speed;
            const waveDelta = Math.abs(dist - waveRadius);

            if (waveDelta < 60) {
              const waveFade = 1 - waveDelta / 60;
              const ageFade = 1 - Math.min(waveRadius / WAVE_RADIUS_MAX, 1);
              intensity = Math.max(intensity, waveFade * ageFade);
            }
          }

          // Mouse influence
          const mouseDist = Math.sqrt((x - mouse.x) ** 2 + (y - mouse.y) ** 2);
          if (mouseDist < MOUSE_RADIUS) {
            const mouseFade = 1 - mouseDist / MOUSE_RADIUS;
            intensity = Math.max(intensity, mouseFade * 0.8);
          }

          // Draw dot
          const size = DOT_BASE + intensity * (DOT_MAX - DOT_BASE);
          const alpha = 0.12 + intensity * 0.85;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);

          if (intensity > 0.1) {
            // Cyan glow for active dots
            ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.fill();

            // Outer glow
            if (intensity > 0.3) {
              ctx.beginPath();
              ctx.arc(x, y, size * 3, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(6, 182, 212, ${intensity * 0.2})`;
              ctx.fill();
            }
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
          }
        }
      }

      // Draw grid lines (very subtle)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.5;

      for (let col = 0; col <= cols; col++) {
        ctx.beginPath();
        ctx.moveTo(col * SPACING, 0);
        ctx.lineTo(col * SPACING, canvas.height);
        ctx.stroke();
      }
      for (let row = 0; row <= rows; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * SPACING);
        ctx.lineTo(canvas.width, row * SPACING);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    // Initial waves
    spawnWave(0);
    spawnWave(-800);
    spawnWave(-1600);
    animationId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-[2]"
    />
  );
}
