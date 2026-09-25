/**
 * Efecto "el producto vuela al carrito": una copia de la foto sale de
 * `origen`, viaja en curva hasta el carrito visible y se achica; al llegar el
 * carrito da un salto. Es solo decoración: sin foto, sin carrito a la vista o
 * con "reducir movimiento" no hace nada.
 */
export function volarAlCarrito(origen: HTMLElement | null) {
  if (!origen || typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Hay un carrito por cabecera (celular y escritorio): va al que se ve.
  const destino = Array.from(document.querySelectorAll<HTMLElement>('[data-carrito-destino]'))
    .find((el) => el.getBoundingClientRect().width > 0);
  if (!destino) return;

  const desde = origen.getBoundingClientRect();
  const hasta = destino.getBoundingClientRect();
  if (!desde.width) return;

  const lado = Math.min(desde.width, desde.height, 180);
  const x0 = desde.left + desde.width / 2 - lado / 2;
  const y0 = desde.top + desde.height / 2 - lado / 2;
  // Si la cabecera ya salió de la pantalla, termina en la esquina de arriba.
  const x1 = Math.min(Math.max(hasta.left + hasta.width / 2, 24), window.innerWidth - 24) - lado / 2;
  const y1 = Math.max(hasta.top + hasta.height / 2, 24) - lado / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;

  const clon = origen.cloneNode(true) as HTMLElement;
  Object.assign(clon.style, {
    position: 'fixed',
    left: `${x0}px`,
    top: `${y0}px`,
    width: `${lado}px`,
    height: `${lado}px`,
    margin: '0',
    objectFit: 'contain',
    background: '#fff',
    borderRadius: '9999px',
    boxShadow: '0 10px 30px rgba(0,0,0,.25)',
    zIndex: '70',
    pointerEvents: 'none',
  });
  document.body.appendChild(clon);

  // Primero sube un poco y después cae al carrito: la curva se nota más.
  const vuelo = clon.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 60}px) scale(0.55)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.6 },
    ],
    { duration: 750, easing: 'cubic-bezier(.45,0,.25,1)' },
  );
  vuelo.onfinish = () => {
    clon.remove();
    destino.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.3)' },
        { transform: 'scale(0.92)' },
        { transform: 'scale(1)' },
      ],
      { duration: 450, easing: 'ease-out' },
    );
  };
  vuelo.oncancel = () => clon.remove();
}
