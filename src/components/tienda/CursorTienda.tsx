'use client';

import { useEffect, useRef } from 'react';
import { CursorConfig, colorCursor, cursorCss } from '@/lib/cursores';

// Lo que se puede tocar lleva el cursor "de clic" (la tarjeta de producto es
// un div con onClick y `cursor-pointer`).
const CLIC = 'a[href], button:not(:disabled), [role="button"], label[for], select, summary, .cursor-pointer, article';
const TEXTO = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), textarea, [contenteditable="true"]';

/**
 * El cursor elegido por la empresa (`webConfig.cursor`), en toda la tienda.
 * Solo con mouse: en pantallas táctiles no hay cursor. Se aplica con una clase
 * en `<html>` para alcanzar también los modales (van en portal).
 */
export function CursorTienda({ config, primario }: { config?: CursorConfig; primario: string }) {
  const tipo = config?.tipo;
  const color = colorCursor(config, primario);
  const css = cursorCss(tipo, color);
  const anillo = tipo === 'anillo';

  useEffect(() => {
    if (!css && !anillo) return;
    const html = document.documentElement;
    html.classList.add('tienda-cursor');
    return () => html.classList.remove('tienda-cursor');
  }, [css, anillo]);

  if (!css && !anillo) return null;

  const reglas = anillo
    ? `html.tienda-cursor, html.tienda-cursor * { cursor: none !important; }
       html.tienda-cursor :is(${TEXTO}) { cursor: text !important; }`
    : `html.tienda-cursor body { cursor: ${css![0]}; }
       html.tienda-cursor :is(${CLIC}) { cursor: ${css![1]}; }
       html.tienda-cursor :is(${TEXTO}) { cursor: text; }
       html.tienda-cursor button:disabled { cursor: not-allowed; }`;

  return (
    <>
      <style>{`@media (hover: hover) and (pointer: fine) { ${reglas} }`}</style>
      {anillo && <Anillo color={color} />}
    </>
  );
}

/** Un punto pegado al mouse y un aro que lo alcanza con retraso; crece sobre lo que se puede tocar. */
function Anillo({ color }: { color: string }) {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let mx = -100, my = -100, rx = -100, ry = -100, anim = 0, visible = false;
    const mostrar = (v: boolean) => {
      visible = v;
      ring.style.opacity = dot.style.opacity = v ? '1' : '0';
    };
    const mover = () => {
      const k = quieto ? 1 : 0.2;
      rx += (mx - rx) * k;
      ry += (my - ry) * k;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      anim = Math.abs(mx - rx) > 0.2 || Math.abs(my - ry) > 0.2 ? requestAnimationFrame(mover) : 0;
    };
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { rx = mx; ry = my; mostrar(true); }
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      const t = e.target as Element | null;
      // Sobre un campo de texto se ve el cursor de texto: el anillo se esconde.
      const enTexto = !!t?.closest?.(TEXTO);
      ring.style.visibility = dot.style.visibility = enTexto ? 'hidden' : 'visible';
      ring.dataset.sobre = String(!enTexto && !!t?.closest?.(CLIC));
      if (!anim) anim = requestAnimationFrame(mover);
    };
    const onSalir = (e: MouseEvent) => { if (!e.relatedTarget) mostrar(false); };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseout', onSalir);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseout', onSalir);
    };
  }, []);

  return (
    <>
      <style>{`
        .tienda-anillo { position: fixed; left: 0; top: 0; z-index: 9999; pointer-events: none; border-radius: 9999px; opacity: 0; transition: opacity .15s; }
        .tienda-anillo-aro { width: 34px; height: 34px; border: 2px solid var(--cursor-color); transition: opacity .15s, width .18s, height .18s, background-color .18s; }
        .tienda-anillo-aro[data-sobre="true"] { width: 52px; height: 52px; background: color-mix(in srgb, var(--cursor-color) 12%, transparent); }
        .tienda-anillo-punto { width: 6px; height: 6px; background: var(--cursor-color); }
        @media not ((hover: hover) and (pointer: fine)) { .tienda-anillo { display: none; } }
      `}</style>
      <div ref={ringRef} aria-hidden className="tienda-anillo tienda-anillo-aro" style={{ '--cursor-color': color } as React.CSSProperties} />
      <div ref={dotRef} aria-hidden className="tienda-anillo tienda-anillo-punto" style={{ '--cursor-color': color } as React.CSSProperties} />
    </>
  );
}
