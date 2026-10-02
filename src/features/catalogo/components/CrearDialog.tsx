'use client';

import { useState } from 'react';
import { INPUT_STD, INPUT_STD_TA, LABEL, DIALOG_PANEL_RELIEVE_MD, DIALOG_HEAD, DIALOG_BODY, DIALOG_FOOT } from '@/components/ui/dialogo';

interface Props {
  isOpen: boolean;
  title: string;
  isLoading: boolean;
  showSimbolo?: boolean;
  /** El rechazo del servidor (nombre repetido, sin permiso), si lo hubo. */
  errorServidor?: string | null;
  onConfirm: (data: { nombre: string; descripcion?: string; simbolo?: string; orden?: number }) => void;
  onCancel: () => void;
}

export default function CrearDialog({ isOpen, title, isLoading, showSimbolo, errorServidor, onConfirm, onCancel }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={title} className={DIALOG_PANEL_RELIEVE_MD} onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">{title}</h3>
          <p className="text-[11px] text-gray-500">Será exclusiva de tu empresa: no aparece en el catálogo global.</p>
        </div>

        <div className={DIALOG_BODY}>
          <div className="space-y-3 pb-3 pt-1">
            <div>
              <label className={LABEL}>Nombre *</label>
              <input
                type="text"
                autoFocus
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nombre personalizado"
                className={INPUT_STD}
              />
              {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
            </div>

            <div>
              <label className={LABEL}>Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción (opcional)"
                maxLength={200}
                className={`${INPUT_STD_TA} min-h-[60px]`}
              />
            </div>

            {showSimbolo && (
              <div>
                <label className={LABEL}>Símbolo *</label>
                <input
                  type="text"
                  value={simbolo}
                  onChange={(e) => setSimbolo(e.target.value)}
                  placeholder="kg, m, L..."
                  className={INPUT_STD}
                />
              </div>
            )}

            <div>
              <label className={LABEL}>Orden</label>
              <input
                type="number"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                placeholder="Orden (opcional)"
                min="1"
                className={INPUT_STD}
              />
            </div>

            {errorServidor && <p className="text-[11px] text-red-500">{errorServidor}</p>}
          </div>
        </div>

        <div className={DIALOG_FOOT}>
          <button onClick={onCancel} disabled={isLoading} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isLoading} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {isLoading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
