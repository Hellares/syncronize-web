'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Las tres formas de meter una imagen, en un solo lugar.
 *
 * 1. El botón, que abre el selector del sistema.
 * 2. Arrastrar y soltar sobre la tarjeta.
 * 3. Ctrl+V con una imagen en el portapapeles (una captura de pantalla, o una
 *    foto copiada desde WhatsApp Web).
 *
 * 🔴 El input va SIN `capture`: con `capture="environment"` el celular abre la
 * cámara directo y **esconde la galería**, así que no se puede adjuntar una
 * foto que ya estaba en el teléfono. Sin el atributo, el navegador ofrece las
 * dos y el usuario elige.
 *
 * Vive suelto porque lo usan la tarjeta del cobro y la galería del detalle: si
 * cada una tuviera su copia, el límite de tamaño y el filtro de tipo se
 * despegarían con el primer cambio.
 */

/** Lo que el navegador acepta antes de mandarlo. El backend valida igual. */
export const MAX_MB = 10;

interface Opciones<T> {
  /** Sube UNA imagen. Lo que devuelva se acumula en `items`. */
  subir: (file: File) => Promise<T>;
  /** Tope de imágenes. Sin esto no hay límite. */
  max?: number;
  /** Cuántas hay ya cargadas (la galería del detalle arranca con las guardadas). */
  yaHay?: number;
  onSubidaOk?: (item: T) => void;
  /** Sube mientras haya alguna en vuelo. */
  onEnVueloChange?: (enVuelo: boolean) => void;
}

export function useCapturaImagenes<T>({
  subir,
  max,
  yaHay = 0,
  onSubidaOk,
  onEnVueloChange,
}: Opciones<T>) {
  const [enVuelo, setEnVuelo] = useState(0);
  const [error, setError] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const marcar = useCallback(
    (delta: number) => {
      setEnVuelo((n) => {
        const v = Math.max(0, n + delta);
        onEnVueloChange?.(v > 0);
        return v;
      });
    },
    [onEnVueloChange],
  );

  const procesar = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError('');
      const imagenes = files.filter((f) => f.type.startsWith('image/'));
      if (imagenes.length < files.length) {
        setError('Solo se pueden adjuntar imágenes.');
      }
      // 🔴 El cupo se calcula acá y se descuenta en el loop, no en un ref
      // escrito durante el render: eso ultimo no pasa el lint de este repo y
      // ademas es lo que React llama un side-effect en render.
      const cupos = max != null ? Math.max(0, max - yaHay) : imagenes.length;
      const lote = imagenes.slice(0, cupos);
      if (imagenes.length > lote.length) {
        setError(`Máximo ${max} fotos.`);
      }

      for (const file of lote) {
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`"${file.name || 'la imagen'}" pesa más de ${MAX_MB} MB.`);
          continue;
        }
        marcar(1);
        try {
          const item = await subir(file);
          onSubidaOk?.(item);
        } catch {
          setError('No se pudo subir una de las fotos. Probá de nuevo.');
        } finally {
          marcar(-1);
        }
      }
    },
    [max, yaHay, marcar, onSubidaOk, subir],
  );

  /** Del `<input type="file">`. */
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void procesar(Array.from(e.target.files ?? []));
      // Sin esto, elegir el MISMO archivo dos veces seguidas no dispara change.
      if (inputRef.current) inputRef.current.value = '';
    },
    [procesar],
  );

  /**
   * Ctrl+V en cualquier parte de la página.
   *
   * 🔴 Solo actúa si el portapapeles trae una IMAGEN: pegar texto en el campo
   * del monto o del documento tiene que seguir funcionando normal.
   */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const archivos = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
        .map((i) => i.getAsFile())
        .filter((f): f is File => f != null);
      if (!archivos.length) return;
      e.preventDefault();
      void procesar(archivos);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [procesar]);

  /** Para el `<div>` que recibe el arrastre. */
  const propsZona = {
    onDragOver: (e: React.DragEvent) => {
      // Sin `preventDefault` el navegador ABRE la imagen y se pierde la venta.
      e.preventDefault();
      if (!arrastrando) setArrastrando(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Entrar a un hijo dispara dragleave del padre: se ignora si el puntero
      // sigue adentro, o la zona parpadea mientras se arrastra por encima.
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setArrastrando(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setArrastrando(false);
      void procesar(Array.from(e.dataTransfer.files ?? []));
    },
  };

  return {
    inputRef,
    onInputChange,
    propsZona,
    arrastrando,
    enVuelo,
    error,
    setError,
    abrirSelector: () => inputRef.current?.click(),
  };
}
