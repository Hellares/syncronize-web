'use client';

import { useRef, useState } from 'react';
import { subirEvidencia, type EvidenciaVenta } from '../services/venta-service';

/**
 * Fotos de la venta: cómo se vendió el producto y cómo se entrega.
 *
 * 🔴 Cada foto se sube APENAS se elige, no al confirmar la venta. En el
 * mostrador la foto se saca mientras se cobra; dejar la subida para el final
 * pone al cliente a esperar frente a la caja mientras el archivo sale por
 * datos móviles. El botón de cobrar solo espera si queda alguna en vuelo
 * (`subiendo`), que es lo que el padre consulta.
 *
 * Es evidencia INTERNA: no viaja al comprobante ni al ticket del cliente.
 */

const MAX = 6;
/** Lo que el navegador acepta antes de mandarlo. El backend valida igual. */
const MAX_MB = 10;

interface Props {
  /** Ids ya subidos, para que el padre los mande en `evidenciaIds`. */
  onChange: (ids: string[]) => void;
  /** Sube mientras haya alguna en vuelo: el padre bloquea el cobro con esto. */
  onSubiendoChange?: (subiendo: boolean) => void;
}

type Item = EvidenciaVenta & { local?: string };

export default function EvidenciaVentaCard({ onChange, onSubiendoChange }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [enVuelo, setEnVuelo] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const emitir = (siguientes: Item[]) => {
    setItems(siguientes);
    onChange(siguientes.map((i) => i.archivoId));
  };

  const marcarVuelo = (delta: number) => {
    setEnVuelo((n) => {
      const v = Math.max(0, n + delta);
      onSubiendoChange?.(v > 0);
      return v;
    });
  };

  const elegir = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const disponibles = MAX - items.length;
    const lote = Array.from(files).slice(0, Math.max(0, disponibles));
    if (files.length > lote.length) {
      setError(`Máximo ${MAX} fotos por venta.`);
    }

    for (const file of lote) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" pesa más de ${MAX_MB} MB.`);
        continue;
      }
      marcarVuelo(1);
      try {
        const subida = await subirEvidencia(file);
        setItems((prev) => {
          const siguientes = [...prev, subida];
          onChange(siguientes.map((i) => i.archivoId));
          return siguientes;
        });
      } catch {
        setError('No se pudo subir una de las fotos. Probá de nuevo.');
      } finally {
        marcarVuelo(-1);
      }
    }
    // Sin esto, elegir el MISMO archivo dos veces seguidas no dispara change.
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = (archivoId: string) => {
    // Solo se saca de la lista: la venta todavía no existe, así que el archivo
    // queda huérfano y lo levanta la limpieza, igual que si se abandona el cobro.
    emitir(items.filter((i) => i.archivoId !== archivoId));
  };

  return (
    <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">Fotos de la venta</p>
          <p className="text-[10px] text-gray-400">
            Cómo se vendió y cómo se entrega. No se le envían al cliente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
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

      {/* `capture` deja que el celular abra la cámara directo; en la PC del
          mostrador el mismo input abre el explorador. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => void elegir(e.target.files)}
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
