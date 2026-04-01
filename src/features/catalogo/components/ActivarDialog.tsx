'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  maestroNombre: string;
  maestroDescripcion?: string;
  isLoading: boolean;
  onConfirm: (nombreLocal?: string, orden?: number) => void;
  onCancel: () => void;
}

export default function ActivarDialog({ isOpen, title, maestroNombre, maestroDescripcion, isLoading, onConfirm, onCancel }: Props) {
  const [personalizar, setPersonalizar] = useState(false);
  const [nombreLocal, setNombreLocal] = useState('');
  const [orden, setOrden] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>

        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
          <p className="text-sm font-medium text-blue-900">{maestroNombre}</p>
          {maestroDescripcion && <p className="text-xs text-blue-700 mt-1">{maestroDescripcion}</p>}
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={personalizar} onChange={(e) => setPersonalizar(e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Personalizar nombre
          </label>

          {personalizar && (
            <input
              type="text"
              value={nombreLocal}
              onChange={(e) => setNombreLocal(e.target.value)}
              placeholder="Nombre personalizado"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            />
          )}

          <input
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            placeholder="Orden (opcional)"
            min="1"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
          />
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(personalizar ? nombreLocal : undefined, orden ? parseInt(orden) : undefined)}
            disabled={isLoading}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50"
          >
            {isLoading ? 'Activando...' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}
