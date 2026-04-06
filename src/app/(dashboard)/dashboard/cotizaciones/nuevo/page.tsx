'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import * as productoService from '@/features/producto/services/producto-service';
import type { CreateCotizacionDto, CreateCotizacionDetalleDto } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';
import ClienteSelector from '@/features/cotizacion/components/ClienteSelector';

// ─── Constants ────────────────────────────────────────────────────────────────

const IGV_RATE = 0.18;
const STEPS = ['Cliente', 'Items', 'Condiciones'] as const;

// ─── Item type ────────────────────────────────────────────────────────────────

interface ItemLinea {
  key: string;
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number; // percentage
  porcentajeIGV: number;
  tipoAfectacion: string;
}

function calcItem(item: ItemLinea) {
  const baseAmount = item.cantidad * item.precioUnitario;
  const descAmount = baseAmount * (item.descuento || 0) / 100;
  const subtotal = baseAmount - descAmount;
  const igv = subtotal * (item.porcentajeIGV / 100);
  const total = subtotal + igv;
  return { baseAmount, descAmount, subtotal, igv, total };
}

function genKey() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((label, i) => {
        const isActive = i === current;
        const isCompleted = i < current;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`h-0.5 w-10 sm:w-16 ${
                  i <= current ? 'bg-[#004A94]' : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-[#004A94] text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-[#004A94]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { sedes, empresa } = useEmpresa();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Step 1: Cliente ─────────────────────────────────────────────────────────
  const [sedeId, setSedeId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');

  // ── Step 2: Items ───────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemLinea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Step 3: Condiciones ─────────────────────────────────────────────────────
  const [moneda, setMoneda] = useState('PEN');
  const [tipoCambio, setTipoCambio] = useState<number | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [condiciones, setCondiciones] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // ── Submission ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Validation errors per step ──────────────────────────────────────────────
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // ── Set default sede ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sedeId && sedes.length > 0) {
      const principal = sedes.find((s) => s.esPrincipal);
      setSedeId(principal?.id || sedes[0].id);
    }
  }, [sedes, sedeId]);

  // ── Close search results on outside click ───────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Product search with debounce ────────────────────────────────────────────
  const searchProducts = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await productoService.getProductos({
          page: 1,
          limit: 10,
          search: q,
          sedeId: sedeId || undefined,
        });
        setSearchResults(res.data);
        setShowResults(true);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    },
    [sedeId],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => searchProducts(value), 300);
    },
    [searchProducts],
  );

  // ── Add product to items ────────────────────────────────────────────────────
  const addProductItem = useCallback((producto: any) => {
    // Determine price: try stocksPorSede price first, then fallback
    let precio = 0;
    if (producto.stocksPorSede?.length) {
      const sedeStock = producto.stocksPorSede.find((s: any) => s.sedeId === sedeId);
      precio = sedeStock?.precio ?? producto.stocksPorSede[0]?.precio ?? 0;
    }

    const newItem: ItemLinea = {
      key: genKey(),
      productoId: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precioUnitario: precio,
      descuento: 0,
      porcentajeIGV: producto.impuestoPorcentaje ?? 18,
      tipoAfectacion: '10', // Gravado - Operacion Onerosa
    };
    setItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, [sedeId]);

  // ── Add manual item ─────────────────────────────────────────────────────────
  const addManualItem = useCallback(() => {
    const newItem: ItemLinea = {
      key: genKey(),
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      porcentajeIGV: 18,
      tipoAfectacion: '10',
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  // ── Update item field ───────────────────────────────────────────────────────
  const updateItem = useCallback((key: string, field: keyof ItemLinea, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }, []);

  // ── Remove item ─────────────────────────────────────────────────────────────
  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal += c.subtotal;
      acc.descuento += c.descAmount;
      acc.igv += c.igv;
      acc.total += c.total;
      return acc;
    },
    { subtotal: 0, descuento: 0, igv: 0, total: 0 },
  );

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    const errors: Record<string, string> = {};
    if (s === 0) {
      if (!sedeId) errors.sedeId = 'Seleccione una sede';
      if (!nombreCliente.trim()) errors.nombreCliente = 'El nombre del cliente es requerido';
    }
    if (s === 1) {
      if (items.length === 0) errors.items = 'Agregue al menos un item';
      items.forEach((item) => {
        if (!item.descripcion.trim()) errors[`desc_${item.key}`] = 'Descripción requerida';
        if (item.cantidad <= 0) errors[`cant_${item.key}`] = 'Cantidad inválida';
        if (item.precioUnitario < 0) errors[`precio_${item.key}`] = 'Precio inválido';
      });
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 2));
    }
  }

  function handleBack() {
    setStepErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validateStep(2)) return;

    if (authState.status !== 'authenticated') {
      setError('No se pudo identificar al usuario. Inicie sesión nuevamente.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const detalles: CreateCotizacionDetalleDto[] = items.map((item) => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        porcentajeIGV: item.porcentajeIGV,
        tipoAfectacion: item.tipoAfectacion,
      }));

      const dto: CreateCotizacionDto = {
        sedeId,
        vendedorId: authState.user.id,
        nombreCliente: nombreCliente.trim(),
        documentoCliente: documentoCliente.trim() || undefined,
        emailCliente: emailCliente.trim() || undefined,
        telefonoCliente: telefonoCliente.trim() || undefined,
        direccionCliente: direccionCliente.trim() || undefined,
        moneda,
        tipoCambio: moneda === 'USD' && tipoCambio ? Number(tipoCambio) : undefined,
        observaciones: observaciones.trim() || undefined,
        condiciones: condiciones.trim() || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
        detalles,
      };

      const created = await cotizacionService.createCotizacion(dto);
      router.push(`/dashboard/cotizaciones/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al crear la cotización');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading guard ───────────────────────────────────────────────────────────
  if (!empresa) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#004A94] border-t-transparent" />
      </div>
    );
  }

  // ── Format currency ─────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva Cotización</h1>
          <p className="text-sm text-gray-500">Complete los datos para crear una cotización</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ─── STEP 1: CLIENTE ──────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          {/* Sede */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sede <span className="text-red-500">*</span>
            </label>
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] ${
                stepErrors.sedeId ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccione una sede</option>
              {sedes
                .filter((s: any) => s.isActive)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.esPrincipal ? ' (Principal)' : ''}
                  </option>
                ))}
            </select>
            {stepErrors.sedeId && (
              <p className="mt-1 text-xs text-red-500">{stepErrors.sedeId}</p>
            )}
          </div>

          {/* Cliente Selector */}
          <ClienteSelector
            initialNombre={nombreCliente}
            initialDocumento={documentoCliente}
            onClienteSelected={(data) => {
              setNombreCliente(data.nombreCliente);
              setDocumentoCliente(data.documentoCliente ?? '');
              setEmailCliente(data.emailCliente ?? '');
              setTelefonoCliente(data.telefonoCliente ?? '');
              setDireccionCliente(data.direccionCliente ?? '');
            }}
          />
          {stepErrors.nombreCliente && (
            <p className="text-xs text-red-500">{stepErrors.nombreCliente}</p>
          )}
        </div>
      )}

      {/* ─── STEP 2: ITEMS ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Search + add manual */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Productos y Servicios</h2>
              <button
                type="button"
                onClick={addManualItem}
                className="rounded-lg border border-dashed border-[#004A94] px-3 py-1.5 text-sm font-medium text-[#004A94] hover:bg-[#004A94]/5"
              >
                + Agregar item manual
              </button>
            </div>

            {/* Product search */}
            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  placeholder="Buscar producto por nombre o SKU..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#004A94] border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {searchResults.map((p) => {
                    const sedeStock = p.stocksPorSede?.find((s: any) => s.sedeId === sedeId);
                    const precio = sedeStock?.precio ?? p.stocksPorSede?.[0]?.precio ?? 0;
                    const stock = sedeStock?.cantidad ?? 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductItem(p)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {p.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.sku || p.codigoEmpresa}
                            {sedeStock ? ` · Stock: ${stock}` : ''}
                          </p>
                        </div>
                        <span className="ml-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                          S/ {fmt(precio)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {showResults && searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 shadow-lg">
                  No se encontraron productos
                </div>
              )}
            </div>

            {stepErrors.items && (
              <p className="text-xs text-red-500">{stepErrors.items}</p>
            )}
          </div>

          {/* Items table */}
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-3 text-sm text-gray-500">
                Agregue productos o servicios a la cotización
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                      <th className="px-3 py-3 text-center font-medium text-gray-600 w-24">Cant.</th>
                      <th className="px-3 py-3 text-right font-medium text-gray-600 w-28">P. Unit.</th>
                      <th className="px-3 py-3 text-center font-medium text-gray-600 w-20">Desc%</th>
                      <th className="px-3 py-3 text-right font-medium text-gray-600 w-24">IGV</th>
                      <th className="px-3 py-3 text-right font-medium text-gray-600 w-28">Subtotal</th>
                      <th className="px-3 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const c = calcItem(item);
                      return (
                        <tr key={item.key} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => updateItem(item.key, 'descripcion', e.target.value)}
                              placeholder="Descripción del item"
                              className={`w-full rounded border px-2 py-1.5 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] ${
                                stepErrors[`desc_${item.key}`] ? 'border-red-400' : 'border-gray-200'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0.01}
                              step="any"
                              value={item.cantidad}
                              onChange={(e) =>
                                updateItem(item.key, 'cantidad', parseFloat(e.target.value) || 0)
                              }
                              className={`w-full rounded border px-2 py-1.5 text-center text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] ${
                                stepErrors[`cant_${item.key}`] ? 'border-red-400' : 'border-gray-200'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.precioUnitario}
                              onChange={(e) =>
                                updateItem(
                                  item.key,
                                  'precioUnitario',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className={`w-full rounded border px-2 py-1.5 text-right text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] ${
                                stepErrors[`precio_${item.key}`] ? 'border-red-400' : 'border-gray-200'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={item.descuento}
                              onChange={(e) =>
                                updateItem(
                                  item.key,
                                  'descuento',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600">
                            {fmt(c.igv)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                            {fmt(c.total)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              title="Eliminar"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map((item) => {
                  const c = calcItem(item);
                  return (
                    <div key={item.key} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => updateItem(item.key, 'descripcion', e.target.value)}
                          placeholder="Descripción"
                          className={`flex-1 rounded border px-2 py-1.5 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] ${
                            stepErrors[`desc_${item.key}`] ? 'border-red-400' : 'border-gray-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Cant.</label>
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={item.cantidad}
                            onChange={(e) =>
                              updateItem(item.key, 'cantidad', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">P. Unit.</label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.precioUnitario}
                            onChange={(e) =>
                              updateItem(item.key, 'precioUnitario', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Desc%</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={item.descuento}
                            onChange={(e) =>
                              updateItem(item.key, 'descuento', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">IGV: {fmt(c.igv)}</span>
                        <span className="font-semibold text-gray-900">Total: {fmt(c.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals bar */}
              <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
                <div className="flex flex-col items-end gap-1.5 text-sm">
                  <div className="flex w-full max-w-xs justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-medium text-gray-700">{moneda === 'USD' ? '$' : 'S/'} {fmt(totals.subtotal)}</span>
                  </div>
                  {totals.descuento > 0 && (
                    <div className="flex w-full max-w-xs justify-between">
                      <span className="text-gray-500">Descuento:</span>
                      <span className="font-medium text-red-600">-{moneda === 'USD' ? '$' : 'S/'} {fmt(totals.descuento)}</span>
                    </div>
                  )}
                  <div className="flex w-full max-w-xs justify-between">
                    <span className="text-gray-500">IGV (18%):</span>
                    <span className="font-medium text-gray-700">{moneda === 'USD' ? '$' : 'S/'} {fmt(totals.igv)}</span>
                  </div>
                  <div className="flex w-full max-w-xs justify-between border-t border-gray-300 pt-1.5">
                    <span className="font-bold text-gray-900">TOTAL:</span>
                    <span className="font-bold text-gray-900">{moneda === 'USD' ? '$' : 'S/'} {fmt(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 3: CONDICIONES ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Condiciones</h2>

            {/* Moneda + Tipo cambio */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                >
                  <option value="PEN">PEN - Soles</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </div>
              {moneda === 'USD' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo de cambio
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={tipoCambio}
                    onChange={(e) =>
                      setTipoCambio(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="Ej: 3.750"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
                  />
                </div>
              )}
            </div>

            {/* Fecha de vencimiento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Notas internas o para el cliente..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] resize-none"
              />
            </div>

            {/* Condiciones */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Condiciones</label>
              <textarea
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                rows={3}
                placeholder="Condiciones comerciales, garantía, tiempo de entrega..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94] resize-none"
              />
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Resumen</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#004A94]">{items.length}</p>
                <p className="text-xs text-gray-500">Items</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#004A94]">
                  {moneda === 'USD' ? '$' : 'S/'} {fmt(totals.subtotal)}
                </p>
                <p className="text-xs text-gray-500">Subtotal</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#004A94]">
                  {moneda === 'USD' ? '$' : 'S/'} {fmt(totals.igv)}
                </p>
                <p className="text-xs text-gray-500">IGV</p>
              </div>
              <div className="rounded-lg bg-[#004A94]/5 p-3 text-center">
                <p className="text-2xl font-bold text-[#004A94]">
                  {moneda === 'USD' ? '$' : 'S/'} {fmt(totals.total)}
                </p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── NAVIGATION ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Anterior
            </button>
          )}
        </div>
        <div>
          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-[#004A94] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003570]"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-[#004A94] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Creando...' : 'Crear Cotización'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
