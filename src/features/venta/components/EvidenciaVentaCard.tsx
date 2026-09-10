'use client';

import { useCallback, useState } from 'react';
import { subirEvidencia, type EvidenciaVenta } from '../services/venta-service';
import { useCapturaImagenes } from './useCapturaImagenes';

/**
 * Fotos de la venta: cómo se vendió el producto y cómo se entrega.
 *
 * 🔴 Cada foto se sube APENAS se elige, no al confirmar la venta. En el
 * mostrador la foto se saca mientras se cobra; dejar la subida para el final
 * pone al cliente a esperar frente a la caja mientras el archivo sale por
 * datos móviles. El botón de cobrar solo espera si queda alguna en vuelo
 * (`onSubiendoChange`), que es lo que el padre consulta.
 *
 * Entran de tres formas —botón, arrastrar y Ctrl+V— y en el celular el botón
 * ofrece cámara o galería. Todo eso vive en `useCapturaImagenes`.
 *
 * Es evidencia INTERNA: no viaja al comprobante ni al ticket del cliente.
 */

const MAX = 6;

interface Props {
  /** Ids ya subidos, para que el padre los mande en `evidenciaIds`. */
  onChange: (ids: string[]) => void;
  /** Sube mientras haya alguna en vuelo: el padre bloquea el cobro con esto. */
  onSubiendoChange?: (subiendo: boolean) => void;
}

export default function EvidenciaVentaCard({ onChange, onSubiendoChange }: Props) {
  const [items, setItems] = useState<EvidenciaVenta[]>([]);

  const onSubidaOk = useCallback(
    (item: EvidenciaVenta) => {
      setItems((prev) => {
        const siguientes = [...prev, item];
        onChange(siguientes.map((i) => i.archivoId));
        return siguientes;
      });
    },
    [onChange],
  );

  // 🔴 Se DESESTRUCTURA: devolver el objeto entero hace que el compilador de
  // React lo trate como portador de un ref y marque cada lectura en el render
  // como "Cannot access refs during render".
  const {
    inputRef,
    onInputChange,
    propsZona,
    arrastrando,
    enVuelo,
    error,
    abrirSelector,
  } = useCapturaImagenes<EvidenciaVenta>({
    subir: subirEvidencia,
    max: MAX,
    yaHay: items.length,
    onSubidaOk,
    onEnVueloChange: onSubiendoChange,
  });

  const quitar = (archivoId: string) => {
    // Solo se saca de la lista: la venta todavía no existe, así que el archivo
    // queda huérfano y lo levanta la limpieza, igual que si se abandona el cobro.
    setItems((prev) => {
      const siguientes = prev.filter((i) => i.archivoId !== archivoId);
      onChange(siguientes.map((i) => i.archivoId));
      return siguientes;
    });
  };

  return (
    <div
      {...propsZona}
      className={`rounded-xl border bg-white p-4 transition-colors ${
        arrastrando ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-[#d1e5ff]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">Fotos de la venta</p>
          <p className="text-[10px] text-gray-400">
            Cómo se vendió y cómo se entrega. Arrastrá, pegá con Ctrl+V o tocá Agregar.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirSelector}
          disabled={items.length >= MAX}
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-[#437EFF] px-2.5 text-[10px] font-medium text-[#437EFF] transition-colors hover:bg-[#437EFF]/5 disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Agregar
        </button>
      </div>

      {/* 🔴 SIN `capture`: con él, el celular abre la cámara directo y esconde
          la galería. Sin el atributo ofrece las dos y el usuario elige. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onInputChange}
      />

      {(items.length > 0 || enVuelo > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((i) => (
            <div key={i.archivoId} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-blue-400/40">
              <img
                src={i.urlThumbnail || i.url}
                alt={i.nombreOriginal ?? 'Foto de la venta'}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => quitar(i.archivoId)}
                title="Quitar"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-[10px] leading-none text-white hover:bg-black/75"
              >
                ×
              </button>
            </div>
          ))}
          {Array.from({ length: enVuelo }).map((_, i) => (
            <div
              key={`vuelo-${i}`}
              className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-gray-400 ring-1 ring-blue-400/40"
            >
              subiendo…
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-[6px] bg-amber-100 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
