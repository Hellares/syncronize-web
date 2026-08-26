'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Nombre para una imagen que llegó pegada o arrastrada.
 *
 * El portapapeles entrega una captura como `image.png` a secas: con dos o tres
 * la lista de archivos queda ilegible. Lleva un prefijo del contexto y la hora,
 * que es como uno las distingue después. Un archivo arrastrado ya trae nombre
 * propio y se respeta.
 */
export function nombreDeCaptura(blob: Blob, prefijo: string) {
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const t = new Date();
  const dd = (n: number) => String(n).padStart(2, '0');
  const sello = `${t.getFullYear()}${dd(t.getMonth() + 1)}${dd(t.getDate())}-${dd(t.getHours())}${dd(t.getMinutes())}${dd(t.getSeconds())}`;
  return `captura-${prefijo}-${sello}.${ext}`;
}

/**
 * Quiénes están escuchando el pegado, en orden de montaje.
 *
 * 🔴 Hace falta porque estas zonas CONVIVEN: con el diálogo de un componente
 * abierto, su bloque de evidencia y la tarjeta de imágenes de la orden están
 * los dos montados. Sin esto la captura se subía a los dos lados de una sola
 * pegada. `stopPropagation` no alcanza: los dos escuchan en `document`, y el
 * orden en que corren es el de registro —la tarjeta de la orden primero—, no
 * el del DOM.
 *
 * Gana el ÚLTIMO en montarse, que es el que el usuario tiene delante.
 */
const escuchas: Array<(e: ClipboardEvent) => void> = [];

/**
 * UN solo listener en `document` para todas las zonas.
 *
 * 🔴 No puede registrarse uno por instancia: con dos zonas montadas habría dos
 * despachadores y los dos llamarían al mismo último de la pila, subiendo la
 * captura dos veces. Se engancha con la primera zona y se suelta con la
 * última.
 */
let despachador: ((e: ClipboardEvent) => void) | null = null;

/** ¿El evento nació en un campo donde el usuario está escribiendo? */
function esCampoDeTexto(destino: EventTarget | null) {
  const el = destino as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Pegar (Ctrl+V) y arrastrar una imagen para subirla.
 *
 * Son los dos gestos que uno espera cuando acaba de recortar la pantalla del
 * equipo o de guardar una foto: sin esto hay que pasar por el selector de
 * archivos, y en el caso del recorte además guardarlo a disco solo para volver
 * a elegirlo.
 *
 * Devuelve `arrastrando` para resaltar la zona y `zona` para esparcir sobre el
 * contenedor que recibe el arrastre.
 */
export function useImagenPegada({
  activo,
  prefijoNombre,
  onImagen,
}: {
  /** false ⇒ no escucha nada (sin permiso, o subiendo). */
  activo: boolean;
  /** Va en el nombre del archivo pegado: el código de la orden, por ejemplo. */
  prefijoNombre: string;
  onImagen: (file: File) => void | Promise<void>;
}) {
  const [arrastrando, setArrastrando] = useState(false);

  const tomar = useCallback(
    (blob: File | null | undefined, conNombrePropio: boolean) => {
      if (!blob || !blob.type.startsWith('image/')) return false;
      const file = conNombrePropio && blob.name
        ? blob
        : new File([blob], nombreDeCaptura(blob, prefijoNombre), { type: blob.type });
      void onImagen(file);
      return true;
    },
    [onImagen, prefijoNombre],
  );

  // 🔴 El pegado escucha en `document` y no en la zona: el usuario pega apenas
  // copió, sin haber tocado nada de la página, así que no hay elemento con
  // foco donde colgar el listener. A cambio hay que ignorar el pegado que va a
  // un campo de texto — si no, pegar una URL en las notas subiría lo que
  // hubiera en el portapapeles.
  useEffect(() => {
    if (!activo) return;
    const alPegar = (e: ClipboardEvent) => {
      if (esCampoDeTexto(e.target)) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      );
      if (tomar(item?.getAsFile(), false)) e.preventDefault();
    };

    escuchas.push(alPegar);
    if (!despachador) {
      despachador = (e: ClipboardEvent) => escuchas[escuchas.length - 1]?.(e);
      document.addEventListener('paste', despachador);
    }

    return () => {
      const i = escuchas.indexOf(alPegar);
      if (i !== -1) escuchas.splice(i, 1);
      if (escuchas.length === 0 && despachador) {
        document.removeEventListener('paste', despachador);
        despachador = null;
      }
    };
  }, [activo, tomar]);

  const zona = activo
    ? {
        onDragOver: (e: React.DragEvent) => {
          // Sin preventDefault el navegador ABRE la imagen y se pierde la
          // pantalla con lo que el usuario venía cargando.
          e.preventDefault();
          if (!arrastrando) setArrastrando(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          // Solo al salir del contenedor: pasar por encima de un hijo dispara
          // dragleave y la zona parpadearía.
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setArrastrando(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setArrastrando(false);
          tomar(e.dataTransfer.files?.[0], true);
        },
      }
    : {};

  return { arrastrando, zona };
}
