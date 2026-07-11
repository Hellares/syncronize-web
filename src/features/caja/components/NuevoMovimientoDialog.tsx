'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { TipoMovimientoCaja, CategoriaMovimientoCaja, MetodoPagoVenta, CategoriaGasto } from '@/core/types/caja';
import {
  CATEGORIA_MOVIMIENTO_LABEL, METODO_PAGO_LABEL,
  CATEGORIAS_INGRESO_MANUAL, CATEGORIAS_EGRESO_MANUAL, CATEGORIAS_CON_GASTO_PERSONALIZADO,
} from '@/core/types/caja';
import * as cajaService from '../services/caja-service';

interface Props {
  isOpen: boolean;
  cajaId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'CREDITO'];

export default function NuevoMovimientoDialog({ isOpen, cajaId, onSuccess, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>('EGRESO');
  const [categoria, setCategoria] = useState<CategoriaMovimientoCaja>('GASTO_OPERATIVO');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>('EFECTIVO');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriasGasto, setCategoriasGasto] = useState<CategoriaGasto[]>([]);
  const [categoriaGastoId, setCategoriaGastoId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTipo('EGRESO'); setCategoria('GASTO_OPERATIVO'); setMetodoPago('EFECTIVO');
      setMonto(''); setDescripcion(''); setCategoriaGastoId(''); setError('');
    }
  }, [isOpen]);

  const categorias = tipo === 'INGRESO' ? CATEGORIAS_INGRESO_MANUAL : CATEGORIAS_EGRESO_MANUAL;
  const permiteGastoPersonalizado = CATEGORIAS_CON_GASTO_PERSONALIZADO.includes(categoria);

  // Categorías de gasto personalizadas del tipo actual (solo si la categoría las admite)
  useEffect(() => {
    if (!isOpen || !permiteGastoPersonalizado) return;
    cajaService.getCategoriasGasto(tipo)
      .then(list => setCategoriasGasto(list.filter(c => c.isActive !== false)))
      .catch(() => setCategoriasGasto([]));
  }, [isOpen, tipo, permiteGastoPersonalizado]);

  const handleTipo = (t: TipoMovimientoCaja) => {
    setTipo(t);
    setCategoria(t === 'INGRESO' ? 'OTRO_INGRESO' : 'GASTO_OPERATIVO');
    setCategoriaGastoId('');
  };

  const handleSubmit = async () => {
    setError('');
    const m = parseFloat(monto);
    if (!monto || isNaN(m) || m <= 0) { setError('Ingresa un monto mayor a 0'); return; }
    setIsSubmitting(true);
    try {
      await cajaService.crearMovimiento(cajaId, {
        tipo,
        categoria,
        metodoPago,
        monto: m,
        descripcion: descripcion.trim() || undefined,
        categoriaGastoId: permiteGastoPersonalizado && categoriaGastoId ? categoriaGastoId : undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al registrar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Nuevo movimiento de caja</h3>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleTipo('INGRESO')}
              className={`rounded-lg border p-2 text-center text-xs font-medium ${tipo === 'INGRESO' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              ▲ Ingreso
            </button>
            <button type="button" onClick={() => handleTipo('EGRESO')}
              className={`rounded-lg border p-2 text-center text-xs font-medium ${tipo === 'EGRESO' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              ▼ Egreso
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Categoría *</label>
            <select className={selectClass} value={categoria} onChange={e => { setCategoria(e.target.value as CategoriaMovimientoCaja); setCategoriaGastoId(''); }}>
              {categorias.map(c => <option key={c} value={c}>{CATEGORIA_MOVIMIENTO_LABEL[c]}</option>)}
            </select>
          </div>

          {permiteGastoPersonalizado && categoriasGasto.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Categoría de gasto (opcional)</label>
              <select className={selectClass} value={categoriaGastoId} onChange={e => setCategoriaGastoId(e.target.value)}>
                <option value="">Sin categoría específica</option>
                {categoriasGasto.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Método *</label>
              <select className={selectClass} value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPagoVenta)}>
                {METODOS.map(mp => <option key={mp} value={mp}>{METODO_PAGO_LABEL[mp]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
              <input className={inputClass} type="number" step="0.01" min="0.01" value={monto}
                onChange={e => setMonto(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
            <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalle del movimiento (opcional)" />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${tipo === 'INGRESO' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {isSubmitting ? 'Registrando...' : `Registrar ${tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
