'use client';

// Error boundary de segmento (App Router). Antes no existía: cualquier error de
// cliente dejaba la pantalla en blanco sin mensaje. Caso común: tras un deploy,
// una pestaña cacheada pide chunks viejos (404) → ChunkLoadError → se auto-recarga.

import { useEffect } from 'react';

function esErrorDeChunk(error?: Error): boolean {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(error.message ?? '')
  );
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (esErrorDeChunk(error) && typeof window !== 'undefined') {
      const KEY = 'chunk-reload-ts';
      const last = Number(sessionStorage.getItem(KEY) ?? '0');
      // Evita bucle de recarga: como máximo una recarga cada 10s.
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  const chunk = esErrorDeChunk(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f7fa] p-6 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#437EFF] border-t-transparent" />
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {chunk ? 'Actualizando la aplicación…' : 'Algo salió mal'}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          {chunk
            ? 'Hay una versión nueva disponible. Recargando automáticamente…'
            : 'Ocurrió un error inesperado. Intenta recargar la página.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Reintentar
        </button>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
          Recargar
        </button>
      </div>
    </div>
  );
}
