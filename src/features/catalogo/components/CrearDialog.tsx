'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  isLoading: boolean;
  showSimbolo?: boolean;
  onConfirm: (data: { nombre: string; descripcion?: string; simbolo?: string; orden?: number }) => void;
  onCancel: () => void;
}

export default function CrearDialog({ isOpen, title, isLoading, showSimbolo, onConfirm, onCancel }: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [orden, setOrden] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    onConfirm({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      simbolo: simbolo.trim() || undefined,
      orden: orden ? parseInt(orden) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>

        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-700">Esta será exclusiva de tu empresa y no aparecerá en el catálogo global.</p>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(''); }}
              placeholder="Nombre personalizado"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] min-h-[60px]"
            />
          </div>

          {showSimbolo && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Símbolo *</label>
              <input
                type="text"
                value={simbolo}
                onChange={(e) => setSimbolo(e.target.value)}
                placeholder="kg, m, L..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Orden</label>
            <input
              type="number"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              placeholder="Orden (opcional)"
              min="1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isLoading} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {isLoading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
