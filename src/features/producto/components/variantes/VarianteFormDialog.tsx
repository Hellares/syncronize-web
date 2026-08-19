'use client';

import { useState, useEffect } from 'react';
import type { ProductoVariante, ProductoAtributo, CreateVarianteDto } from '@/core/types/producto';
import type { EmpresaUnidadMedida } from '@/core/types/catalogo';
import { getUnidadesEmpresa } from '@/features/catalogo/services/catalogo-service';

interface Props {
  isOpen: boolean;
  variante?: ProductoVariante | null;
  atributosDisponibles: ProductoAtributo[];
  productoIsActive: boolean;
  /** Hermanas: el destino de una apertura tiene que ser otra variante del MISMO producto. */
  hermanas?: ProductoVariante[];
  isSubmitting: boolean;
  onSave: (data: CreateVarianteDto) => void;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";

export default function VarianteFormDialog({
  isOpen, variante, atributosDisponibles, productoIsActive, isSubmitting, onSave, onClose,
  hermanas = [],
}: Props) {
  const isEditing = !!variante;

  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [peso, setPeso] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [atributos, setAtributos] = useState<Record<string, string>>({});
  // Unidad, presentacion y apertura: los campos que el app si tiene y sin los
  // cuales un par SACO->GRANEL no se puede configurar desde la web.
  const [unidadMedidaId, setUnidadMedidaId] = useState('');
  const [unidadPresentacionId, setUnidadPresentacionId] = useState('');
  const [factorPresentacion, setFactorPresentacion] = useState('');
  const [varianteAperturaId, setVarianteAperturaId] = useState('');
  const [rendimientoApertura, setRendimientoApertura] = useState('');
  const [unidades, setUnidades] = useState<EmpresaUnidadMedida[]>([]);
  /**
   * Ids de los atributos PUESTOS en esta variante, en orden.
   *
   * 🔴 No se listan los `atributosDisponibles` enteros: son los de la EMPRESA
   * y pueden ser decenas. Se muestran los que la variante tiene y se agregan de
   * a uno, igual que el app (variante_atributos_section).
   */
  const [ejesPuestos, setEjesPuestos] = useState<string[]>([]);
  const [agregando, setAgregando] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (variante) {
        setNombre(variante.nombre);
        setSku(variante.sku);
        setCodigoBarras(variante.codigoBarras || '');
        setPeso(variante.peso != null ? String(variante.peso) : '');
        setIsActive(variante.isActive);
        const attrMap: Record<string, string> = {};
        variante.atributosValores.forEach(av => { attrMap[av.atributoId] = av.valor; });
        setAtributos(attrMap);
        setEjesPuestos(variante.atributosValores.map((av) => av.atributoId));
        setUnidadMedidaId(variante.unidadMedidaId ?? '');
        setUnidadPresentacionId(variante.unidadPresentacionId ?? '');
        setFactorPresentacion(variante.factorPresentacion != null ? String(variante.factorPresentacion) : '');
        setVarianteAperturaId(variante.varianteAperturaId ?? '');
        setRendimientoApertura(variante.rendimientoApertura != null ? String(variante.rendimientoApertura) : '');
      } else {
        setNombre('');
        setSku('');
        setCodigoBarras('');
        setPeso('');
        setIsActive(true);
        setAtributos({});
        // Una variante nueva arranca con los ejes que YA usa el producto: si
        // le falta uno que sus hermanas tienen, queda inalcanzable al vender.
        setEjesPuestos(ejesDelProducto);
        setUnidadMedidaId('');
        setUnidadPresentacionId('');
        setFactorPresentacion('');
        setVarianteAperturaId('');
        setRendimientoApertura('');
      }
      setAgregando('');
      setErrors({});
    }
    // ejesDelProducto se deriva de `hermanas`, que el padre recrea en cada
    // render: ponerlo en las dependencias reabriria el formulario en loop. Solo
    // hace falta al ABRIR el dialogo, que es lo que este efecto observa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, variante]);

  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    getUnidadesEmpresa()
      .then((u) => { if (vivo) setUnidades(u.filter((x) => x.isActive)); })
      .catch(() => { if (vivo) setUnidades([]); });
    return () => { vivo = false; };
  }, [isOpen]);

  /**
   * Ejes que YA usa el producto, sacados de sus hermanas. Es lo que hace que
   * una variante nueva nazca con los mismos y no quede coja.
   */
  const ejesDelProducto: string[] = [];
  for (const h of hermanas) {
    for (const av of h.atributosValores) {
      if (!ejesDelProducto.includes(av.atributoId)) ejesDelProducto.push(av.atributoId);
    }
  }

  /** Como se llama una unidad, con el mismo orden que resuelve el backend. */
  const nombreUni = (u: EmpresaUnidadMedida) =>
    u.nombrePersonalizado ?? u.nombreLocal ?? u.unidadMaestra?.nombre ?? u.id;

  const generateSku = () => {
    const prefix = nombre.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'VAR';
    const ts = String(Date.now()).slice(-4);
    setSku(`${prefix}-VAR-${ts}`);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!sku.trim()) newErrors.sku = 'El SKU es requerido';
    // 🔴 El destino de la apertura exige rendimiento: sin el, el vinculo queda
    // a medias y la apertura no se puede ejecutar (la regla del granel lo
    // considera "no es un bulto").
    if (varianteAperturaId && !(parseFloat(rendimientoApertura) > 0)) {
      newErrors.rendimientoApertura = 'Indicá cuánto rinde al abrir 1 unidad';
    }
    if (unidadPresentacionId && !(parseFloat(factorPresentacion) > 1)) {
      newErrors.factorPresentacion = 'El factor tiene que ser mayor a 1 (ej: 1000 para kg→g)';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const atributosEstructurados = Object.entries(atributos)
      .filter(([, valor]) => valor.trim())
      .map(([atributoId, valor]) => ({ atributoId, valor: valor.trim() }));

    const data: CreateVarianteDto = {
      nombre: nombre.trim(),
      sku: sku.trim(),
      ...(codigoBarras.trim() && { codigoBarras: codigoBarras.trim() }),
      ...(peso && { peso: parseFloat(peso) }),
      isActive,
      ...(atributosEstructurados.length > 0 && { atributosEstructurados }),
      // Se mandan SIEMPRE, incluso en null: el update del backend usa
      // `if (x !== undefined)`, asi que omitirlos impide APAGAR una unidad o
      // desarmar un vinculo de apertura ya cargado.
      unidadMedidaId: unidadMedidaId || null,
      unidadPresentacionId: unidadPresentacionId || null,
      factorPresentacion: unidadPresentacionId ? parseFloat(factorPresentacion) : null,
      varianteAperturaId: varianteAperturaId || null,
      rendimientoApertura: varianteAperturaId ? parseFloat(rendimientoApertura) : null,
    };
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">
          {isEditing ? 'Editar Variante' : 'Nueva Variante'}
        </h3>

        <div className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rojo - Talla M" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* SKU */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
            <div className="flex gap-2">
              <input className={`${inputClass} flex-1`} value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-VAR-001" />
              <button onClick={generateSku} type="button" className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50" title="Auto-generar SKU">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
          </div>

          {/* Código de Barras y Peso */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Código de Barras</label>
              <input className={inputClass} value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} placeholder="7750000000000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Peso (kg)</label>
              <input className={inputClass} type="number" step="0.001" value={peso} onChange={e => setPeso(e.target.value)} placeholder="0.000" />
            </div>
          </div>

          {/* UNIDAD Y PRESENTACION PROPIAS
              Sin esto no se puede armar un par SACO->GRANEL desde la web: el
              saco necesita su unidad (und) bajo un producto en gramos, y el
              granel necesita su presentacion (kg x1000) para que el precio se
              cobre por kilo y no por gramo. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Unidad y presentación</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Unidad propia</label>
                <select className={inputClass} value={unidadMedidaId} onChange={e => setUnidadMedidaId(e.target.value)}>
                  <option value="">Hereda la del producto</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{nombreUni(u)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Se habla en</label>
                <select className={inputClass} value={unidadPresentacionId} onChange={e => setUnidadPresentacionId(e.target.value)}>
                  <option value="">Sin presentación</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{nombreUni(u)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Equivale a</label>
                <input
                  className={inputClass}
                  type="number"
                  step="any"
                  value={factorPresentacion}
                  onChange={e => setFactorPresentacion(e.target.value)}
                  placeholder="1000"
                  disabled={!unidadPresentacionId}
                />
                {errors.factorPresentacion && <p className="mt-1 text-[11px] text-red-500">{errors.factorPresentacion}</p>}
              </div>
            </div>
            {unidadPresentacionId && (
              <p className="mt-2 text-[11px] text-gray-500">
                1 {unidades.find(u => u.id === unidadPresentacionId) ? nombreUni(unidades.find(u => u.id === unidadPresentacionId)!) : '—'}
                {' = '}{factorPresentacion || '…'}{' '}
                {unidadMedidaId && unidades.find(u => u.id === unidadMedidaId) ? nombreUni(unidades.find(u => u.id === unidadMedidaId)!) : 'unidades de venta'}
              </p>
            )}
          </div>

          {/* APERTURA DE BULTO
              Un SACO apunta al GRANEL en el que se convierte al abrirlo. Es lo
              que distingue lo que se COMPRA de lo que entra al abrir, y sin
              esto la regla del granel no se puede configurar desde la web. */}
          {hermanas.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Apertura de bulto</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Al abrirla se convierte en</label>
                  <select className={inputClass} value={varianteAperturaId} onChange={e => setVarianteAperturaId(e.target.value)}>
                    <option value="">No se abre</option>
                    {hermanas.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Rinde (por unidad)</label>
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    value={rendimientoApertura}
                    onChange={e => setRendimientoApertura(e.target.value)}
                    placeholder="15000"
                    disabled={!varianteAperturaId}
                  />
                  {errors.rendimientoApertura && <p className="mt-1 text-[11px] text-red-500">{errors.rendimientoApertura}</p>}
                </div>
              </div>
              {varianteAperturaId && (
                <p className="mt-2 text-[11px] text-gray-500">
                  Abrir 1 de esta variante suma {rendimientoApertura || '…'} al stock de{' '}
                  <strong className="text-gray-700">{hermanas.find(h => h.id === varianteAperturaId)?.nombre ?? '—'}</strong>,
                  y esta variante deja de estar comprable como granel.
                </p>
              )}
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Estado activo</label>
            <button
              type="button"
              onClick={() => productoIsActive && setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-[#437EFF]' : 'bg-gray-300'} ${!productoIsActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {!productoIsActive && (
            <p className="text-xs text-amber-600">No se puede activar porque el producto padre está inactivo.</p>
          )}

          {/* ATRIBUTOS: solo los que la variante TIENE, mas un selector para
              sumar de los que faltan. Listar los de la empresa enteros llenaba
              el dialogo de campos vacios que nadie va a completar. */}
          {atributosDisponibles.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-xs font-semibold text-gray-700">Atributos</label>
                {ejesPuestos.length > 0 && (
                  <span className="text-[11px] text-gray-400">{ejesPuestos.length} puestos</span>
                )}
              </div>

              {ejesPuestos.length === 0 && (
                <p className="mb-2 text-[11px] text-gray-400">
                  Sin atributos. Una variante a la que le falta un atributo que sus hermanas
                  tienen no se puede elegir al vender.
                </p>
              )}

              <div className="space-y-3">
                {ejesPuestos.map(id => {
                  const attr = atributosDisponibles.find(a => a.id === id);
                  if (!attr) return null;
                  return (
                    <div key={attr.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs text-gray-500">{attr.nombre}{attr.unidad ? ` (${attr.unidad})` : ''}</label>
                        <button
                          type="button"
                          onClick={() => {
                            setEjesPuestos(prev => prev.filter(x => x !== attr.id));
                            setAtributos(prev => { const n = { ...prev }; delete n[attr.id]; return n; });
                          }}
                          className="text-[11px] text-gray-400 transition-colors hover:text-red-500"
                        >
                          Quitar
                        </button>
                      </div>
                      {attr.valores.length > 0 ? (
                        <select
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white"
                          value={atributos[attr.id] || ''}
                          onChange={e => setAtributos(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        >
                          <option value="">Seleccionar</option>
                          {attr.valores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <input
                          className={inputClass}
                          value={atributos[attr.id] || ''}
                          onChange={e => setAtributos(prev => ({ ...prev, [attr.id]: e.target.value }))}
                          placeholder={`Valor de ${attr.nombre}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Solo se ofrecen los que NO estan puestos todavia */}
              {(() => {
                const faltantes = atributosDisponibles.filter(a => !ejesPuestos.includes(a.id));
                if (faltantes.length === 0) {
                  return <p className="mt-2 text-[11px] text-gray-400">Ya están todos los atributos disponibles.</p>;
                }
                return (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
                      value={agregando}
                      onChange={e => setAgregando(e.target.value)}
                    >
                      <option value="">Agregar atributo…</option>
                      {faltantes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={!agregando}
                      onClick={() => { setEjesPuestos(prev => [...prev, agregando]); setAgregando(''); }}
                      className="shrink-0 rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#003570] disabled:opacity-40"
                    >
                      Agregar
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> El precio se hereda del producto base. El stock se configura desde inventario.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Variante'}
          </button>
        </div>
      </div>
    </div>
  );
}
