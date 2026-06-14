'use client';

// Error boundary global: cubre errores lanzados en el propio root layout/providers.
// Reemplaza el layout raíz, por eso debe traer su propio <html>/<body>.

import { useEffect } from 'react';

function esErrorDeChunk(error?: Error): boolean {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(error.message ?? '')
  );
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (esErrorDeChunk(error) && typeof window !== 'undefined') {
      const KEY = 'chunk-reload-ts';
      const last = Number(sessionStorage.getItem(KEY) ?? '0');
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f5f7fa', padding: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Algo salió mal</h2>
          <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 360, margin: 0 }}>
            Ocurrió un error al cargar la aplicación. Intenta recargar la página.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => reset()} style={{ borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}>
              Reintentar
            </button>
            <button onClick={() => window.location.reload()} style={{ borderRadius: 8, border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 700, color: 'white', background: '#004A94', cursor: 'pointer' }}>
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
