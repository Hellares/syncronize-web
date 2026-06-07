'use client';

import { useState, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import type { Producto } from '@/core/types/producto';
import type { ComponenteBOM, CalcularCostoBOMResponse, FabricarResponse } from '@/core/types/bom';
import * as bomService from '@/features/producto/services/bom-service';
import * as productoService from '@/features/producto/services/producto-service';
import * as stockService from '@/features/stock/services/stock-service';
import FabricarDialog from '@/features/producto/components/bom/FabricarDialog';
import AgregarComponenteBOMDialog from '@/features/producto/components/bom/AgregarComponenteBOMDialog';
import HistorialFabricaciones from '@/features/producto/components/bom/HistorialFabricaciones';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

const BASE_RECETA = '__BASE__';

export default function ComponentesProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productoId } = use(params);
  const { sedes } = useEmpresa();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const defaultSede = sedes.find(s => s.isActive && s.esPrincipal) || sedes.find(s => s.isActive);
  const [sedeId, setSedeId] = useState(defaultSede?.id ?? '');

  const [producto, setProducto] = useState<Producto | null>(null);
  const [varianteSel, setVarianteSel] = useState<string>(BASE_RECETA);
  const [componentes, setComponentes] = useState<ComponenteBOM[]>([]);
  const [costo, setCosto] = useState<CalcularCostoBOMResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ComponenteBOM | null>(null);
  const [editCantidad, setEditCantidad] = useState('');
  const [fabricarOpen, setFabricarOpen] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [copiarOpen, setCopiarOpen] = useState(false);
  const [aplicandoCosto, setAplicandoCosto] = useState(false);

  const varianteId = varianteSel === BASE_RECETA ? null : varianteSel;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [comps, c] = await Promise.all([
        bomService.getComponentes(productoId, sedeId || null, varianteId),
        sedeId ? bomService.calcularCosto(productoId, sedeId, varianteId).catch(() => null) : Promise.resolve(null),
      ]);
      setComponentes(comps);
      setCosto(c);
    } catch {
      setError('Error al cargar la receta');
    } finally {
      setIsLoading(false);
    }
  }, [productoId, sedeId, varianteId]);

  useEffect(() => {
    productoService.getProducto(productoId).then(p => {
      setProducto(p);
      // Si tiene variantes, arranca en la primera variante (la base es solo plantilla)
      if (p.tieneVariantes && p.variantes?.length) setVarianteSel(p.variantes[0].id);
    }).catch(() => setError('Producto no encontrado'));
  }, [productoId]);

  useEffect(() => { reload(); }, [reload]);

  const handleEditSave = async () => {
    if (!editTarget) return;
    const c = parseFloat(editCantidad);
    if (isNaN(c) || c <= 0) return;
    try {
      await bomService.actualizarComponente(productoId, editTarget.id, { cantidad: c });
      setEditTarget(null);
      reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al actualizar');
    }
  };

  const handleDelete = async (rowId: string) => {
    try {
      await bomService.eliminarComponente(productoId, rowId);
      reload();
    } catch {
      setError('Error al eliminar el componente');
    }
  };

  // Aplicar costo BOM al precioCosto del producto (paridad Flutter: confirm si stock>0)
  const handleAplicarCosto = async () => {
    if (!costo || !sedeId) return;
    setAplicandoCosto(true);
    setError(''); setInfo('');
    try {
      const stock = varianteId
        ? await stockService.getStockByVarianteSede(varianteId, sedeId)
        : await stockService.getStockByProductoSede(productoId, sedeId);
      const costoActual = stock.precioCosto != null ? Number(stock.precioCosto) : null;
      const cambia = costoActual == null || Math.abs(costoActual - costo.costoTotal) >= 0.01;
      if (!cambia) {
        setInfo('El costo del producto ya coincide con el de la receta.');
        return;
      }
      if ((stock.stockActual ?? 0) > 0) {
        const ok = window.confirm(
          `El producto tiene stock (${stock.stockActual}). Cambiar el costo de S/ ${costoActual?.toFixed(2) ?? '—'} a S/ ${costo.costoTotal.toFixed(2)} afecta la valorización. ¿Continuar?`
        );
        if (!ok) return;
      }
      await stockService.updatePrecios(stock.id, {
        precioCosto: costo.costoTotal,
        tipoCambio: 'COSTO',
        razon: `Recálculo desde ${costo.cantidadComponentes} componente(s) de la receta`,
      });
      setInfo(`Costo aplicado: S/ ${costo.costoTotal.toFixed(2)}`);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al aplicar el costo');
    } finally {
      setAplicandoCosto(false);
    }
  };

  const handleCopiar = async (destinoId: string, sobrescribir: boolean) => {
    try {
      const res = await bomService.copiarRecetaAVariante(productoId, { varianteId: destinoId, sobrescribir });
      setCopiarOpen(false);
      setInfo(`Receta copiada: ${res.copiados} componente(s)`);
      if (varianteId === destinoId) reload();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al copiar la receta');
    }
  };

  const handleFabricado = (res: FabricarResponse) => {
    setFabricarOpen(false);
    setInfo(`Lote ${res.numeroDocumento}: +${res.cantidadProducida} unidades (stock: ${res.stockFinalNuevo})${res.costoActualizado && res.precioCostoNuevo != null ? ` · costo nuevo S/ ${Number(res.precioCostoNuevo).toFixed(2)}` : ''}`);
    reload();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/productos/${productoId}`} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Receta / Componentes</h1>
            <p className="text-sm text-gray-500">{producto?.nombre ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {producto?.tieneVariantes && (producto.variantes?.length ?? 0) > 0 && (
            <select className={selectClass} value={varianteSel} onChange={e => setVarianteSel(e.target.value)}>
              <option value={BASE_RECETA}>Receta base (plantilla)</option>
              {producto.variantes!.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          )}
          {sedes.filter(s => s.isActive).length > 1 && (
            <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
              {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {canManage && (
          <button onClick={() => setAddOpen(true)}
            className="rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570]">
            + Agregar componente
          </button>
        )}
        {/* Fabricar: producto simple, o variante específica seleccionada (la receta base es solo plantilla) */}
        {canManage && componentes.length > 0 && producto && (!producto.tieneVariantes || varianteSel !== BASE_RECETA) && (
          <button onClick={() => setFabricarOpen(true)}
            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">
            🏭 Fabricar
          </button>
        )}
        {canManage && producto?.tieneVariantes && varianteSel === BASE_RECETA && componentes.length > 0 && (
          <button onClick={() => setCopiarOpen(true)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            📋 Copiar a variante
          </button>
        )}
        <button onClick={() => setHistorialOpen(true)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          🕐 Historial de fabricaciones
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {info && <div className="rounded-lg bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{info}</p></div>}

      {/* Costo total */}
      {costo && componentes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase text-gray-400">Costo de la receta (por unidad)</p>
              <p className="text-xl font-bold text-gray-900">S/ {costo.costoTotal.toFixed(2)}</p>
              {costo.componentesSinCosto.length > 0 && (
                <p className="text-[11px] text-amber-600">⚠ Sin costo (no contados): {costo.componentesSinCosto.map(c => c.nombre).join(', ')}</p>
              )}
            </div>
            {canManage && (
              <button onClick={handleAplicarCosto} disabled={aplicandoCosto || costo.costoTotal <= 0}
                className="rounded-lg border border-[#437EFF] px-3 py-2 text-xs font-medium text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">
                {aplicandoCosto ? 'Aplicando...' : 'Aplicar costo al producto'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de componentes */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : componentes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-2">🧩</p>
          <p className="text-gray-400">
            {producto?.tieneVariantes && varianteSel !== BASE_RECETA
              ? 'Esta variante no tiene receta. Crea componentes o copia la receta base.'
              : 'Sin componentes. Agrega los insumos que se consumen al fabricar 1 unidad.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Insumo</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Cant./unidad</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-right md:table-cell">Costo unit.</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Subtotal</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 text-center md:table-cell">Stock insumo</th>
                {canManage && <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {componentes.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {c.componente.nombre}
                      {c.componente.varianteNombre && <span className="ml-1 text-xs text-[#437EFF]">({c.componente.varianteNombre})</span>}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">{c.componente.codigoEmpresa}{c.notas ? ` · ${c.notas}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-gray-800">{Number(c.cantidad)} {c.componente.unidadMedida ?? ''}</span>
                    {c.componente.factorCompra && c.componente.unidadCompraSimbolo && Number(c.cantidad) >= Number(c.componente.factorCompra) && (
                      <p className="text-[10px] text-gray-400">({(Number(c.cantidad) / Number(c.componente.factorCompra)).toFixed(2)} {c.componente.unidadCompraSimbolo})</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right md:table-cell">
                    <span className="text-xs text-gray-500">{c.precioCostoUnitario != null ? `S/ ${Number(c.precioCostoUnitario).toFixed(4)}` : '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-gray-800">{c.subtotal != null ? `S/ ${Number(c.subtotal).toFixed(2)}` : '—'}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-center md:table-cell">
                    <span className={`text-xs font-medium ${(c.stockDisponible ?? 0) <= 0 ? 'text-red-500' : 'text-gray-600'}`}>
                      {c.stockDisponible ?? '—'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditTarget(c); setEditCantidad(String(c.cantidad)); }}
                          title="Editar cantidad" className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82l-3.46.952.952-3.46L16.862 4.487z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)}
                          title="Quitar de la receta" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editar cantidad */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900">Cantidad por unidad</h3>
            <p className="mt-1 text-xs text-gray-500">{editTarget.componente.nombre} ({editTarget.componente.unidadMedida ?? 'unid.'})</p>
            <input className={`${inputClass} mt-3`} type="number" step="0.0001" min="0.0001" value={editCantidad}
              onChange={e => setEditCantidad(e.target.value)} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEditSave} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Copiar receta a variante */}
      {copiarOpen && producto?.variantes && (
        <CopiarRecetaDialog variantes={producto.variantes.map(v => ({ id: v.id, nombre: v.nombre }))}
          onCopiar={handleCopiar} onClose={() => setCopiarOpen(false)} />
      )}

      {/* Agregar componente */}
      <AgregarComponenteBOMDialog
        isOpen={addOpen}
        productoId={productoId}
        varianteId={varianteId}
        sedeId={sedeId || null}
        componentesActuales={componentes}
        onAdded={() => { setAddOpen(false); reload(); }}
        onClose={() => setAddOpen(false)}
      />

      {/* Fabricar */}
      <FabricarDialog
        isOpen={fabricarOpen}
        productoId={productoId}
        productoNombre={producto?.nombre ?? ''}
        varianteId={varianteId}
        sedeId={sedeId}
        componentes={componentes}
        onFabricado={handleFabricado}
        onClose={() => setFabricarOpen(false)}
      />

      {/* Historial */}
      <HistorialFabricaciones
        isOpen={historialOpen}
        productoId={productoId}
        sedeId={sedeId || undefined}
        varianteId={varianteId || undefined}
        onClose={() => setHistorialOpen(false)}
      />
    </div>
  );
}

/* --- Copiar receta dialog --- */
function CopiarRecetaDialog({ variantes, onCopiar, onClose }: {
  variantes: Array<{ id: string; nombre: string }>;
  onCopiar: (varianteId: string, sobrescribir: boolean) => void;
  onClose: () => void;
}) {
  const [destino, setDestino] = useState(variantes[0]?.id ?? '');
  const [sobrescribir, setSobrescribir] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Copiar receta base a variante</h3>
        <select className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white" value={destino} onChange={e => setDestino(e.target.value)}>
          {variantes.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={sobrescribir} onChange={e => setSobrescribir(e.target.checked)} className="rounded border-gray-300 text-[#437EFF]" />
          Sobrescribir si la variante ya tiene receta
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => destino && onCopiar(destino, sobrescribir)} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Copiar</button>
        </div>
      </div>
    </div>
  );
}
