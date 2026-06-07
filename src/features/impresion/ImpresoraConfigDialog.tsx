'use client';

import { useState, useEffect } from 'react';
import { getImpresoraConfig, saveImpresoraConfig, clearImpresoraConfig, listarImpresoras, type ImpresoraWebConfig } from './qz-service';

interface Props {
  isOpen: boolean;
  onSaved: (config: ImpresoraWebConfig | null) => void;
  onClose: () => void;
}

/** Configura la impresora térmica del navegador (vía QZ Tray, paridad ImpresorasManager) */
export default function ImpresoraConfigDialog({ isOpen, onSaved, onClose }: Props) {
  const [impresoras, setImpresoras] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [autoImprimir, setAutoImprimir] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      // Hidratar config existente + listar impresoras del sistema (async, evita setState síncrono)
      await Promise.resolve();
      if (cancelled) return;
      const cfg = getImpresoraConfig();
      if (cfg) { setNombre(cfg.impresoraNombre); setPaperWidth(cfg.paperWidth); setAutoImprimir(cfg.autoImprimirVenta); }
      setError('');
      setIsLoading(true);
      try {
        const list = await listarImpresoras();
        if (cancelled) return;
        setImpresoras(list);
        if (!cfg && list.length) setNombre(list[0]);
      } catch {
        if (!cancelled) setError('No se pudo conectar con QZ Tray. ¿Está instalado y corriendo? (icono verde en la bandeja)');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const guardar = () => {
    if (!nombre) { setError('Selecciona la impresora'); return; }
    const config: ImpresoraWebConfig = { impresoraNombre: nombre, paperWidth, autoImprimirVenta: autoImprimir };
    saveImpresoraConfig(config);
    onSaved(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">🖨 Impresora térmica</h3>
        <p className="mt-0.5 text-[11px] text-gray-400">Requiere QZ Tray corriendo y la impresora instalada en Windows (emparejada por Bluetooth).</p>

        {isLoading ? (
          <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : error ? (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-700">{error}</p>
            <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-[#437EFF] hover:underline">
              Descargar QZ Tray →
            </a>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Impresora *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-[#437EFF]"
                value={nombre} onChange={e => setNombre(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {impresoras.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ancho de papel</label>
              <div className="flex gap-2">
                {([58, 80] as const).map(w => (
                  <button key={w} onClick={() => setPaperWidth(w)}
                    className={`flex-1 rounded-lg border p-2 text-xs font-medium ${paperWidth === w ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                    {w} mm
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={autoImprimir} onChange={e => setAutoImprimir(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#437EFF]" />
              Imprimir automáticamente al completar una venta
            </label>
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <button onClick={() => { clearImpresoraConfig(); onSaved(null); }}
            className="rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-50">Quitar config</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} disabled={isLoading || !!error}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
