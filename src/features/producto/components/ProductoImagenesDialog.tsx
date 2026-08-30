'use client';

import { useEffect, useState } from 'react';
import ImageUploader from './ImageUploader';
import * as productoService from '../services/producto-service';
import * as varianteService from '../services/variante-service';
import type { Producto, ProductoVariante } from '@/core/types/producto';

interface Props {
  /** El padre lo monta con `key`: así cada uno entra con estado limpio y el
   *  efecto no tiene que resetear nada a mano. */
  producto: Producto | ProductoVariante;
  /**
   * Las imágenes son de una VARIANTE. Cambia con qué entidad se guardan y de
   * dónde se leen las existentes.
   */
  esVariante?: boolean;
  empresaId?: string;
  onClose: () => void;
  /** Se llama al cerrar SI hubo cambios, para refrescar la lista. */
  onChanged: () => void;
}

/**
 * Subir imágenes de un producto desde la lista, sin entrar a editarlo
 * (paridad con el botón del clip de la card del app).
 *
 * Se carga el producto de nuevo al abrir: la fila del listado trae la imagen
 * principal pero no necesariamente la galería completa, y abrir el diálogo con
 * media galería haría creer que se perdieron.
 */
export default function ProductoImagenesDialog({ producto, esVariante = false, empresaId, onClose, onChanged }: Props) {
  const [imagenes, setImagenes] = useState<{ id: string; url: string; urlThumbnail?: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubocambios, setHuboCambios] = useState(false);

  useEffect(() => {
    let cancelado = false;
    // Se recarga la entidad al abrir: la fila del listado trae la imagen
    // principal pero no siempre la galería completa.
    const traer = esVariante
      ? varianteService.getVariante(producto.id)
      : productoService.getProducto(producto.id);
    traer
      .then((p) => {
        if (cancelado) return;
        setImagenes(
          (p.archivos ?? []).map((a) => ({ id: a.id, url: a.url, urlThumbnail: a.urlThumbnail })),
        );
      })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar las imágenes'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [producto, esVariante]);

  const cerrar = () => {
    if (hubocambios) onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={cerrar}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">
          {esVariante ? 'Imágenes de la variante' : 'Imágenes del producto'}
        </h3>
        <p className="mt-1 truncate text-xs text-gray-500">{producto.nombre}</p>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-4">
          {cargando ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
            </div>
          ) : (
            empresaId && (
              <ImageUploader
                empresaId={empresaId}
                productoId={esVariante ? undefined : producto.id}
                varianteId={esVariante ? producto.id : undefined}
                nombreProducto={producto.nombre}
                initialImages={imagenes}
                onChange={() => setHuboCambios(true)}
              />
            )
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={cerrar}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
