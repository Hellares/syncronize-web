'use client';

import { useState, useEffect } from 'react';
import type { PrecioNivel, CreatePrecioNivelDto, TipoPrecioNivel } from '@/core/types/precio';
import { UnidadPresentacion } from '@/core/utils/unidad-presentacion';

interface Props {
  isOpen: boolean;
  nivel?: PrecioNivel | null;
  isSubmitting: boolean;
  /**
   * Unidad en la que se teclea. El nivel se GUARDA en unidad de venta: para un
   * granel en gramos, un "desde 3 kg" tiene que viajar como 3000 y su precio
   * como S/0.008. Sin esto el formulario cargaria mayoreo a los 3 GRAMOS.
   */
  presentacion?: UnidadPresentacion;
  onSave: (data: CreatePrecioNivelDto) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function PrecioNivelFormDialog({ isOpen, nivel, isSubmitting, presentacion, onSave, onClose }: Props) {
  const u = presentacion ?? UnidadPresentacion.ninguna();
  const simbolo = u.simboloVisible ?? '';
  // 🔴 Primitivo y no el objeto: `presentacion` se construye en el llamador y
  // es una instancia nueva por render, asi que como dependencia del efecto
  // reiniciaria los campos en cada tecla.
  const factor = u.activa ? u.factor : 1;
  const [nombre, setNombre] = useState('');
  const [cantidadMinima, setCantidadMinima] = useState('');
  const [cantidadMaxima, setCantidadMaxima] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecioNivel>('PRECIO_FIJO');
  const [precio, setPrecio] = useState('');
  const [porcentajeDesc, setPorcentajeDesc] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (nivel) {
        setNombre(nivel.nombre);
        setCantidadMinima(String(factor > 1 ? nivel.cantidadMinima / factor : nivel.cantidadMinima));
        setCantidadMaxima(
          nivel.cantidadMaxima == null
            ? ''
            : String(factor > 1 ? nivel.cantidadMaxima / factor : nivel.cantidadMaxima),
        );
        setTipoPrecio(nivel.tipoPrecio);
        setPrecio(
          nivel.precio == null
            ? ''
            : factor > 1 ? (Number(nivel.precio) * factor).toFixed(2) : String(nivel.precio),
        );
        setPorcentajeDesc(nivel.porcentajeDesc != null ? String(nivel.porcentajeDesc) : '');
        setDescripcion(nivel.descripcion || '');
      } else {
        setNombre(''); setCantidadMinima(''); setCantidadMaxima(''); setTipoPrecio('PRECIO_FIJO');
        setPrecio(''); setPorcentajeDesc(''); setDescripcion('');
      }
      setErrors({});
    }
  }, [isOpen, nivel, factor]);

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'Requerido';
    // 🔴 Lo tecleado esta en presentacion; lo que se guarda va en unidad de
    // venta y es un entero. "1.5 kg" son 1500 g; "0.0005 kg" no llega a 1 g.
    const minVenta = u.activa
      ? Math.round(u.cantidadAUnidadDeVenta(parseFloat(cantidadMinima)))
      : parseInt(cantidadMinima);
    const maxVenta = !cantidadMaxima ? undefined
      : u.activa ? Math.round(u.cantidadAUnidadDeVenta(parseFloat(cantidadMaxima))) : parseInt(cantidadMaxima);
    if (!cantidadMinima || isNaN(minVenta) || minVenta < 1) {
      errs.cantidadMinima = simbolo ? `Muy chica para ${simbolo}` : 'Debe ser >= 1';
    }
    if (maxVenta != null && (isNaN(maxVenta) || maxVenta <= minVenta)) {
      errs.cantidadMaxima = 'Debe ser mayor a la mínima';
    }
    if (tipoPrecio === 'PRECIO_FIJO' && (!precio || parseFloat(precio) <= 0)) errs.precio = 'Requerido';
    if (tipoPrecio === 'PORCENTAJE_DESCUENTO' && (!porcentajeDesc || parseFloat(porcentajeDesc) <= 0)) errs.porcentajeDesc = 'Requerido';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    onSave({
      nombre: nombre.trim(),
      cantidadMinima: minVenta,
      ...(maxVenta != null && { cantidadMaxima: maxVenta }),
      tipoPrecio,
      ...(tipoPrecio === 'PRECIO_FIJO' && { precio: u.precioAUnidadDeVenta(parseFloat(precio)) }),
      ...(tipoPrecio === 'PORCENTAJE_DESCUENTO' && { porcentajeDesc: parseFloat(porcentajeDesc) }),
      ...(descripcion && { descripcion }),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{nivel ? 'Editar Nivel de Precio' : 'Nuevo Nivel de Precio'}</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Precio por Mayor" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad Mín *{simbolo && ` (${simbolo})`}</label>
              <input className={inputClass} type="number" min="0" step={u.activa ? 'any' : '1'} value={cantidadMinima} onChange={e => setCantidadMinima(e.target.value)} placeholder="1" />
              {errors.cantidadMinima && <p className="mt-1 text-xs text-red-500">{errors.cantidadMinima}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad Máx{simbolo && ` (${simbolo})`}</label>
              <input className={inputClass} type="number" min="0" step={u.activa ? 'any' : '1'} value={cantidadMaxima} onChange={e => setCantidadMaxima(e.target.value)} placeholder="Sin límite" />
              {errors.cantidadMaxima && <p className="mt-1 text-xs text-red-500">{errors.cantidadMaxima}</p>}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Tipo de Precio</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={tipoPrecio === 'PRECIO_FIJO'} onChange={() => setTipoPrecio('PRECIO_FIJO')} className="text-[#437EFF] focus:ring-[#437EFF]" />
                Precio Fijo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={tipoPrecio === 'PORCENTAJE_DESCUENTO'} onChange={() => setTipoPrecio('PORCENTAJE_DESCUENTO')} className="text-[#437EFF] focus:ring-[#437EFF]" />
                % Descuento
              </label>
            </div>
          </div>
          {tipoPrecio === 'PRECIO_FIJO' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Precio *{simbolo && ` (por ${simbolo})`}</label>
              <input className={inputClass} type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" />
              {errors.precio && <p className="mt-1 text-xs text-red-500">{errors.precio}</p>}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Descuento % *</label>
              <input className={inputClass} type="number" step="0.1" min="0" max="100" value={porcentajeDesc} onChange={e => setPorcentajeDesc(e.target.value)} placeholder="10" />
              {errors.porcentajeDesc && <p className="mt-1 text-xs text-red-500">{errors.porcentajeDesc}</p>}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
            <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : nivel ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
