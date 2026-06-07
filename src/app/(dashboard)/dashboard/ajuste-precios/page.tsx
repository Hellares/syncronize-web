'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import * as stockService from '@/features/stock/services/stock-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";
const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function AjustePreciosPage() {
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState(defaultSede?.id ?? '');
  const [tipo, setTipo] = useState<'PORCENTAJE' | 'MONTO_FIJO'>('PORCENTAJE');
  const [operacion, setOperacion] = useState<'AUMENTAR' | 'DISMINUIR'>('AUMENTAR');
  const [aplicarA, setAplicarA] = useState<'PRECIO' | 'PRECIO_COSTO'>('PRECIO');
  const [valor, setValor] = useState('');
  const [alcance, setAlcance] = useState<'TODOS' | 'SIN_COMBOS' | 'SOLO_COMBOS'>('SIN_COMBOS');

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);

  const sedeNombre = sedes.find(s => s.id === sedeId)?.nombre ?? '';
  const valorNum = parseFloat(valor);
  const resumen = `${operacion === 'AUMENTAR' ? 'Aumentar' : 'Disminuir'} el ${aplicarA === 'PRECIO' ? 'precio de venta' : 'precio de costo'} en ${tipo === 'PORCENTAJE' ? `${valor}%` : `S/ ${valor}`} para ${alcance === 'TODOS' ? 'TODOS los productos' : alcance === 'SIN_COMBOS' ? 'todos los productos (sin combos)' : 'solo combos de precio fijo'} de la sede ${sedeNombre}`;

  const handlePreSubmit = () => {
    setError('');
    setResultado(null);
    if (!sedeId) { setError('Selecciona una sede'); return; }
    if (!valor || isNaN(valorNum) || valorNum <= 0) { setError('Ingresa un valor mayor a 0'); return; }
    if (tipo === 'PORCENTAJE' && operacion === 'DISMINUIR' && valorNum >= 100) {
      setError('No puedes disminuir 100% o más'); return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await stockService.ajusteMasivoPrecios(sedeId, {
        tipo,
        valor: valorNum,
        aplicarA,
        operacion,
        excluirCombos: alcance === 'SIN_COMBOS' ? true : undefined,
        soloCombos: alcance === 'SOLO_COMBOS' ? true : undefined,
      });
      setResultado(res.actualizados ?? 0);
      setShowConfirm(false);
      setValor('');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al aplicar el ajuste masivo');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!permissions.canManageProducts) {
    return <p className="py-20 text-center text-gray-400">No tienes permisos para ajustar precios.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ajuste Masivo de Precios</h1>
        <p className="text-sm text-gray-500">Aplica un ajuste a todos los productos de una sede en una sola operación</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Sede *</label>
          <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}{s.esPrincipal ? ' (Principal)' : ''}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Operación</label>
            <div className="grid grid-cols-2 gap-2">
              {(['AUMENTAR', 'DISMINUIR'] as const).map(op => (
                <button key={op} type="button" onClick={() => setOperacion(op)}
                  className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${operacion === op
                    ? op === 'AUMENTAR' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {op === 'AUMENTAR' ? '▲ Aumentar' : '▼ Disminuir'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Aplicar a</label>
            <div className="grid grid-cols-2 gap-2">
              {(['PRECIO', 'PRECIO_COSTO'] as const).map(c => (
                <button key={c} type="button" onClick={() => setAplicarA(c)}
                  className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${aplicarA === c
                    ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {c === 'PRECIO' ? 'Precio venta' : 'Costo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de ajuste</label>
            <select className={selectClass} value={tipo} onChange={e => setTipo(e.target.value as 'PORCENTAJE' | 'MONTO_FIJO')}>
              <option value="PORCENTAJE">Porcentaje (%)</option>
              <option value="MONTO_FIJO">Monto fijo (S/)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Valor *</label>
            <input className={inputClass} type="number" step="0.01" min="0" value={valor}
              onChange={e => setValor(e.target.value)} placeholder={tipo === 'PORCENTAJE' ? 'Ej: 10 (= 10%)' : 'Ej: 5.00'} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Alcance</label>
          <select className={selectClass} value={alcance} onChange={e => setAlcance(e.target.value as typeof alcance)}>
            <option value="SIN_COMBOS">Todos los productos (excluir combos)</option>
            <option value="TODOS">Todos (incluir combos)</option>
            <option value="SOLO_COMBOS">Solo combos de precio fijo</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {resultado != null && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-700">✓ Ajuste aplicado: <strong>{resultado}</strong> productos actualizados. El cambio quedó auditado en el Historial de Precios.</p>
          </div>
        )}

        <button onClick={handlePreSubmit} disabled={isSubmitting}
          className="w-full rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          Aplicar ajuste masivo
        </button>
      </div>

      {/* Confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">⚠ Confirmar ajuste masivo</h3>
            <p className="mt-2 text-sm text-gray-600">{resumen}.</p>
            <p className="mt-2 text-xs text-amber-600">Esta operación modifica precios en lote y no se puede deshacer automáticamente (queda auditada en el historial).</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} disabled={isSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Aplicando...' : 'Sí, aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
