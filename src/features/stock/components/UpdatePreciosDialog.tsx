'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { ProductoStock, UpdatePreciosStockDto, TipoCambioPrecioSede } from '@/core/types/stock';
import { nombreProductoStock, isLiquidacionActiva } from '@/core/types/stock';
import type { PrecioNivel } from '@/core/types/precio';
import * as stockService from '../services/stock-service';
import * as precioNivelService from '@/features/producto/services/precio-nivel-service';
import GestionarLiquidacionDialog from './GestionarLiquidacionDialog';

interface Props {
  isOpen: boolean;
  stock: ProductoStock | null;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

// Motivos de cambio de costo (paridad _MotivoCambioCostoDialog Flutter)
const TIPOS_CAMBIO_COSTO: { value: TipoCambioPrecioSede; label: string }[] = [
  { value: 'CORRECCION', label: 'Corrección de error' },
  { value: 'COSTO', label: 'Cambio de costo del proveedor' },
  { value: 'COMPETENCIA', label: 'Ajuste por competencia' },
  { value: 'AJUSTE_MERCADO', label: 'Ajuste de mercado' },
  { value: 'MANUAL', label: 'Otro (manual)' },
];

interface NivelForm {
  id?: string;
  nombre: string;
  cantidadMinima: string;
  cantidadMaxima: string;
  precio: string;
}

const NIVEL_VACIO: NivelForm = { nombre: '', cantidadMinima: '', cantidadMaxima: '', precio: '' };

/**
 * Dialog unificado de precios por sede — paridad con ConfigurarPreciosDialog de Flutter:
 * base/costo (con auditoría de cambio), oferta con fechas, liquidación, niveles inline (solo PRECIO_FIJO),
 * IGV, ubicación y min/max.
 */
export default function UpdatePreciosDialog({ isOpen, stock, onSuccess, onClose }: Props) {
  const [precio, setPrecio] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [costoOriginal, setCostoOriginal] = useState('');
  const [tipoCambioCosto, setTipoCambioCosto] = useState<TipoCambioPrecioSede>('CORRECCION');
  const [razonCosto, setRazonCosto] = useState('');
  const [precioOferta, setPrecioOferta] = useState('');
  const [enOferta, setEnOferta] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(true);
  const [ubicacion, setUbicacion] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [stockMaximo, setStockMaximo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Liquidación
  const [showLiquidacion, setShowLiquidacion] = useState(false);

  // Niveles
  const [niveles, setNiveles] = useState<PrecioNivel[]>([]);
  const [nivelForm, setNivelForm] = useState<NivelForm | null>(null);
  const [nivelSaving, setNivelSaving] = useState(false);
  const [nivelError, setNivelError] = useState('');

  const liquidacionActiva = stock ? isLiquidacionActiva(stock) : false;
  const costoChanged = precioCosto !== costoOriginal;

  const loadNiveles = useCallback(async () => {
    if (!stock) return;
    try {
      const data = stock.varianteId
        ? await precioNivelService.getNivelesByVariante(stock.varianteId)
        : stock.productoId
          ? await precioNivelService.getNivelesByProducto(stock.productoId)
          : [];
      setNiveles(data);
    } catch {
      // niveles no críticos para el dialog
    }
  }, [stock]);

  useEffect(() => {
    if (isOpen && stock) {
      setPrecio(stock.precio != null ? String(stock.precio) : '');
      const costo = stock.precioCosto != null ? String(stock.precioCosto) : '';
      setPrecioCosto(costo);
      setCostoOriginal(costo);
      setTipoCambioCosto('CORRECCION');
      setRazonCosto('');
      setPrecioOferta(stock.precioOferta != null ? String(stock.precioOferta) : '');
      setEnOferta(stock.enOferta);
      setFechaInicio(stock.fechaInicioOferta?.split('T')[0] ?? '');
      setFechaFin(stock.fechaFinOferta?.split('T')[0] ?? '');
      setPrecioIncluyeIgv(stock.precioIncluyeIgv);
      setUbicacion(stock.ubicacion ?? '');
      setStockMinimo(stock.stockMinimo != null ? String(stock.stockMinimo) : '');
      setStockMaximo(stock.stockMaximo != null ? String(stock.stockMaximo) : '');
      setError('');
      setNivelForm(null);
      setNivelError('');
      loadNiveles();
    }
  }, [isOpen, stock, loadNiveles]);

  // Validaciones con paridad Flutter (configurar_precios_dialog.dart:437-696)
  const validate = (): string | null => {
    const p = precio ? parseFloat(precio) : null;
    const c = precioCosto ? parseFloat(precioCosto) : null;
    const o = precioOferta ? parseFloat(precioOferta) : null;
    if (p != null && c != null && p < c) {
      return 'El precio de venta no puede ser menor al costo';
    }
    if (liquidacionActiva && p != null && stock?.precioLiquidacion != null && p < Number(stock.precioLiquidacion)) {
      return 'El precio de venta no puede ser menor al precio de liquidación activo';
    }
    if (enOferta) {
      if (o == null) return 'Ingresa el precio de oferta';
      if (p != null && o >= p) return 'El precio de oferta debe ser menor al precio base';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!stock) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const data: UpdatePreciosStockDto = {
        ...(precio && { precio: parseFloat(precio) }),
        ...(precioCosto && { precioCosto: parseFloat(precioCosto) }),
        ...(precioOferta && { precioOferta: parseFloat(precioOferta) }),
        enOferta,
        ...(fechaInicio && { fechaInicioOferta: fechaInicio }),
        ...(fechaFin && { fechaFinOferta: fechaFin }),
        precioIncluyeIgv,
        // Auditoría: solo cuando el costo cambió (paridad _MotivoCambioCostoDialog)
        ...(costoChanged && precioCosto && { tipoCambio: tipoCambioCosto, ...(razonCosto.trim() && { razon: razonCosto.trim() }) }),
        ...(ubicacion && { ubicacion }),
        ...(stockMinimo && { stockMinimo: parseInt(stockMinimo) }),
        ...(stockMaximo && { stockMaximo: parseInt(stockMaximo) }),
      };
      await stockService.updatePrecios(stock.id, data);
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al actualizar precios');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Niveles inline (solo PRECIO_FIJO, igual que Flutter) ---

  const handleGuardarNivel = async () => {
    if (!stock || !nivelForm) return;
    const cantMin = parseInt(nivelForm.cantidadMinima);
    const precioNivel = parseFloat(nivelForm.precio);
    if (!nivelForm.nombre.trim()) { setNivelError('Nombre requerido'); return; }
    if (isNaN(cantMin) || cantMin < 1) { setNivelError('Cantidad mínima inválida'); return; }
    if (isNaN(precioNivel) || precioNivel <= 0) { setNivelError('Precio inválido'); return; }
    setNivelSaving(true);
    setNivelError('');
    try {
      const dto = {
        nombre: nivelForm.nombre.trim(),
        cantidadMinima: cantMin,
        cantidadMaxima: nivelForm.cantidadMaxima ? parseInt(nivelForm.cantidadMaxima) : undefined,
        tipoPrecio: 'PRECIO_FIJO' as const,
        precio: precioNivel,
      };
      if (nivelForm.id) {
        await precioNivelService.updateNivel(nivelForm.id, dto);
      } else if (stock.varianteId) {
        await precioNivelService.createNivelVariante(stock.varianteId, dto);
      } else if (stock.productoId) {
        await precioNivelService.createNivelProducto(stock.productoId, dto);
      }
      setNivelForm(null);
      loadNiveles();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setNivelError(msg || 'Error al guardar el nivel');
    } finally {
      setNivelSaving(false);
    }
  };

  const handleEliminarNivel = async (nivelId: string) => {
    try {
      await precioNivelService.deleteNivel(nivelId);
      loadNiveles();
    } catch {
      setNivelError('Error al eliminar el nivel');
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900">Configurar Precios y Stock</h3>
          <p className="mt-1 text-xs text-gray-500">{nombreProductoStock(stock)}</p>

          <div className="mt-4 space-y-4">
            {/* Precios */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Precio Venta</label>
                <input className={inputClass} type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Precio Costo</label>
                <input className={inputClass} type="number" step="0.01" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Precio Oferta</label>
                <input className={inputClass} type="number" step="0.01" value={precioOferta} onChange={e => setPrecioOferta(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {/* Auditoría de cambio de costo */}
            {costoChanged && precioCosto && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-700">Cambio de costo detectado — indica el motivo (auditoría)</p>
                <div className="grid grid-cols-2 gap-2">
                  <select className={selectClass} value={tipoCambioCosto} onChange={e => setTipoCambioCosto(e.target.value as TipoCambioPrecioSede)}>
                    {TIPOS_CAMBIO_COSTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input className={inputClass} value={razonCosto} onChange={e => setRazonCosto(e.target.value)} placeholder="Razón (opcional)" />
                </div>
              </div>
            )}

            {/* Oferta */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">En oferta</label>
              <button type="button" onClick={() => setEnOferta(!enOferta)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enOferta ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enOferta ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {enOferta && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Inicio Oferta</label>
                  <input className={inputClass} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Fin Oferta</label>
                  <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                </div>
              </div>
            )}

            {/* Liquidación */}
            <div className={`rounded-lg border p-3 ${liquidacionActiva ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    Liquidación
                    {liquidacionActiva && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        ACTIVA · S/ {Number(stock.precioLiquidacion).toFixed(2)}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {liquidacionActiva
                      ? (stock.fechaFinLiquidacion ? `Vence ${new Date(stock.fechaFinLiquidacion).toLocaleDateString('es-PE')}` : 'Sin vencimiento')
                      : 'Remate bajo costo — requiere autorización gerencial'}
                  </p>
                </div>
                <button type="button" onClick={() => setShowLiquidacion(true)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${liquidacionActiva ? 'border border-red-300 text-red-600 hover:bg-red-100' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                  {liquidacionActiva ? 'Gestionar' : 'Activar'}
                </button>
              </div>
            </div>

            {/* Niveles de precio por volumen */}
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">Precios por volumen</p>
                {!nivelForm && (
                  <button type="button" onClick={() => setNivelForm(NIVEL_VACIO)}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                    + Agregar nivel
                  </button>
                )}
              </div>

              {niveles.length === 0 && !nivelForm && (
                <p className="text-[11px] text-gray-400">Sin niveles configurados.</p>
              )}

              {niveles.map(n => (
                <div key={n.id} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5">
                  <div className="min-w-0 text-xs">
                    <span className="font-medium text-gray-800">{n.nombre}</span>
                    <span className="ml-2 text-gray-400">{n.cantidadMinima}{n.cantidadMaxima ? `–${n.cantidadMaxima}` : '+'} unid.</span>
                    <span className="ml-2 font-medium text-green-600">
                      {n.tipoPrecio === 'PRECIO_FIJO' ? `S/ ${Number(n.precio).toFixed(2)}` : `${n.porcentajeDesc}% desc.`}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {n.tipoPrecio === 'PRECIO_FIJO' ? (
                      <>
                        <button type="button" title="Editar"
                          onClick={() => setNivelForm({ id: n.id, nombre: n.nombre, cantidadMinima: String(n.cantidadMinima), cantidadMaxima: n.cantidadMaxima != null ? String(n.cantidadMaxima) : '', precio: n.precio != null ? String(n.precio) : '' })}
                          className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82l-3.46.952.952-3.46L16.862 4.487z" /></svg>
                        </button>
                        <button type="button" title="Eliminar" onClick={() => handleEliminarNivel(n.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </>
                    ) : (
                      // Niveles porcentuales: solo lectura (vienen de la configuración de precios del producto)
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-500">config</span>
                    )}
                  </div>
                </div>
              ))}

              {nivelForm && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputClass} value={nivelForm.nombre} onChange={e => setNivelForm({ ...nivelForm, nombre: e.target.value })} placeholder="Nombre (ej: Por Mayor)" />
                    <input className={inputClass} type="number" step="0.01" value={nivelForm.precio} onChange={e => setNivelForm({ ...nivelForm, precio: e.target.value })} placeholder="Precio fijo S/" />
                    <input className={inputClass} type="number" min="1" value={nivelForm.cantidadMinima} onChange={e => setNivelForm({ ...nivelForm, cantidadMinima: e.target.value })} placeholder="Cant. mínima" />
                    <input className={inputClass} type="number" min="1" value={nivelForm.cantidadMaxima} onChange={e => setNivelForm({ ...nivelForm, cantidadMaxima: e.target.value })} placeholder="Cant. máx (vacío = ∞)" />
                  </div>
                  {nivelError && <p className="text-[11px] text-red-600">{nivelError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setNivelForm(null); setNivelError(''); }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
                    <button type="button" onClick={handleGuardarNivel} disabled={nivelSaving}
                      className="rounded-lg bg-[#004A94] px-3 py-1 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
                      {nivelSaving ? 'Guardando...' : nivelForm.id ? 'Actualizar' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* IGV */}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={precioIncluyeIgv} onChange={e => setPrecioIncluyeIgv(e.target.checked)}
                className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
              Precio incluye IGV
            </label>

            {/* Ubicación */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ubicación</label>
              <input className={inputClass} value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Pasillo A, Estante 3" />
            </div>

            {/* Min/Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stock Mínimo</label>
                <input className={inputClass} type="number" min="0" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stock Máximo</label>
                <input className={inputClass} type="number" min="0" value={stockMaximo} onChange={e => setStockMaximo(e.target.value)} placeholder="0" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <GestionarLiquidacionDialog
        isOpen={showLiquidacion}
        stock={stock}
        onSuccess={() => { setShowLiquidacion(false); onClose(); onSuccess(); }}
        onClose={() => setShowLiquidacion(false)}
      />
    </>
  );
}
