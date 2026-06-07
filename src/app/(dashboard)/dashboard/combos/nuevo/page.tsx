'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import * as comboService from '@/features/producto/services/combo-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

const TIPOS: { value: 'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO'; label: string; hint: string }[] = [
  { value: 'FIJO', label: 'Precio Fijo', hint: 'Tú defines el precio del combo' },
  { value: 'CALCULADO', label: 'Calculado', hint: 'Suma de los componentes' },
  { value: 'CALCULADO_CON_DESCUENTO', label: 'Calculado c/ Descuento', hint: 'Suma de componentes menos un %' },
];

export default function NuevoComboPage() {
  const router = useRouter();
  const { empresa, sedes } = useEmpresa();

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'FIJO' | 'CALCULADO' | 'CALCULADO_CON_DESCUENTO'>('CALCULADO');
  const [precioFijo, setPrecioFijo] = useState('');
  const [descuento, setDescuento] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [visibleMarketplace, setVisibleMarketplace] = useState(true);

  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    catalogoService.getCategorias().then(setCategorias).catch(() => {});
    catalogoService.getMarcas().then(setMarcas).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!empresa) return;
    setError('');
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    if (tipo === 'FIJO' && (!precioFijo || parseFloat(precioFijo) <= 0)) { setError('Ingresa el precio fijo del combo'); return; }
    if (tipo === 'CALCULADO_CON_DESCUENTO') {
      const d = parseFloat(descuento);
      if (!descuento || isNaN(d) || d < 1 || d > 100) { setError('El descuento debe estar entre 1 y 100%'); return; }
    }
    setIsSubmitting(true);
    try {
      const combo = await comboService.createCombo({
        empresaId: empresa.id,
        sedeId: defaultSede?.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipoPrecioCombo: tipo,
        precioFijo: tipo === 'FIJO' ? parseFloat(precioFijo) : undefined,
        descuentoPorcentaje: tipo === 'CALCULADO_CON_DESCUENTO' ? parseFloat(descuento) : undefined,
        empresaCategoriaId: categoriaId || undefined,
        empresaMarcaId: marcaId || undefined,
        visibleMarketplace,
      });
      // Igual que Flutter: tras crear navega al detalle para agregar componentes
      router.replace(`/dashboard/combos/${combo.id}?sedeId=${defaultSede?.id ?? ''}`);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al crear el combo');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/combos" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nuevo Combo</h1>
          <p className="text-sm text-gray-500">Crea el combo y luego agrega sus componentes</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
          <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: COMBO OFICINA COMPLETO" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
          <textarea className={`${inputClass} min-h-[60px]`} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Qué incluye el combo..." />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de precio *</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TIPOS.map(t => (
              <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${tipo === t.value ? 'border-[#437EFF] bg-[#437EFF]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className={`text-xs font-semibold ${tipo === t.value ? 'text-[#437EFF]' : 'text-gray-700'}`}>{t.label}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {tipo === 'FIJO' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Precio fijo del combo *</label>
            <input className={inputClass} type="number" step="0.01" min="0" value={precioFijo} onChange={e => setPrecioFijo(e.target.value)} placeholder="0.00" />
          </div>
        )}
        {tipo === 'CALCULADO_CON_DESCUENTO' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Descuento % (1-100) *</label>
            <input className={inputClass} type="number" step="0.01" min="1" max="100" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="Ej: 10" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
            <select className={selectClass} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
            <select className={selectClass} value={marcaId} onChange={e => setMarcaId(e.target.value)}>
              <option value="">Sin marca</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visibleMarketplace} onChange={e => setVisibleMarketplace(e.target.checked)}
            className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
          Visible en Marketplace
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/combos" className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Creando...' : 'Crear Combo'}
          </button>
        </div>
      </div>
    </div>
  );
}
