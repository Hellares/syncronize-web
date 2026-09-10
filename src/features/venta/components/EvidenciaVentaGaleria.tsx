'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adjuntarEvidencia,
  eliminarEvidencia,
  getEvidencias,
  type EvidenciaVenta,
} from '../services/venta-service';
import { useCapturaImagenes } from './useCapturaImagenes';

/**
 * Las fotos de una venta ya hecha, con la opción de sumar más.
 *
 * Que se puedan agregar DESPUÉS no es un extra: la entrega suele pasar horas
 * después del cobro, y esa —"así se lo entregué"— es justo la foto que sirve
 * ante un reclamo.
 *
 * Entran igual que en el cobro: botón (cámara o galería en el celular),
 * arrastrar y Ctrl+V. Es evidencia INTERNA: no viaja al comprobante.
 */
export default function EvidenciaVentaGaleria({ ventaId }: { ventaId: string }) {
  const [items, setItems] = useState<EvidenciaVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [zoom, setZoom] = useState<EvidenciaVenta | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await getEvidencias(ventaId));
    } catch {
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [ventaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const subir = useCallback(
    (file: File) => adjuntarEvidencia(ventaId, file),
    [ventaId],
  );
  const onSubidaOk = useCallback((item: EvidenciaVenta) => {
    setItems((prev) => [...prev, item]);
  }, []);

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
    setError,
    abrirSelector,
  } = useCapturaImagenes<EvidenciaVenta>({ subir, onSubidaOk });

  const quitar = async (archivoId: string) => {
    // Optimista: la foto desaparece al toque y vuelve si el borrado falla.
    const antes = items;
    setItems((prev) => prev.filter((i) => i.archivoId !== archivoId));
    try {
      await eliminarEvidencia(ventaId, archivoId);
    } catch {
      setItems(antes);
      setError('No se pudo quitar la foto.');
    }
  };

  return (
    <div
      {...propsZona}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        arrastrando ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-100'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-[13px]">📷</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Fotos de la venta</p>
            <p className="text-[10px] text-gray-400">Uso interno. No se le envían al cliente.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={abrirSelector}
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-[#437EFF] px-2.5 text-[10px] font-medium text-[#437EFF] transition-colors hover:bg-[#437EFF]/5"
        >
          + Agregar
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

      {cargando ? (
        <p className="text-[11px] text-gray-400">Cargando…</p>
      ) : items.length === 0 && enVuelo === 0 ? (
        <p className="text-[11px] text-gray-400">
          Sin fotos. Arrastrá una acá, pegá con Ctrl+V o tocá Agregar. Sirven de
          respaldo ante un reclamo: cómo se vendió y cómo se entregó.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <div key={i.archivoId} className="group relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-blue-400/40">
              <img
                src={i.urlThumbnail || i.url}
                alt={i.nombreOriginal ?? 'Foto de la venta'}
                onClick={() => setZoom(i)}
                className="h-full w-full cursor-zoom-in object-cover"
              />
              <button
                type="button"
                onClick={() => void quitar(i.archivoId)}
                title="Quitar"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-[10px] leading-none text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          {Array.from({ length: enVuelo }).map((_, i) => (
            <div
              key={`vuelo-${i}`}
              className="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-gray-400 ring-1 ring-blue-400/40"
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

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom.url}
            alt={zoom.nombreOriginal ?? 'Foto de la venta'}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
