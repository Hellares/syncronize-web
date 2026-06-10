'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as cotizacionService from '../services/cotizacion-service';
import * as productoService from '@/features/producto/services/producto-service';
import type { CreateCotizacionDto, CreateCotizacionDetalleDto, Cotizacion, CompatibilidadResult } from '@/core/types/cotizacion';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';
import ClienteSelector from './ClienteSelector';
import ProductGrid from '@/features/producto/components/ProductGrid';
import VarianteSelector from '@/features/producto/components/VarianteSelector';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Cliente', 'Items', 'Condiciones', 'Resumen'] as const;

const TIPO_AFECTACION_OPTIONS = [
  { value: '10', label: 'Gravado' },
  { value: '20', label: 'Exonerado' },
  { value: '30', label: 'Inafecto' },
];

// Estilo de input estándar (look mono + ring + sombra al focus). Altura 30px,
// radio 6px, ring 1.5px al focus. Agregar el color de ring (ring-zinc-400 / ring-red-400).
const INPUT_STD = 'bg-zinc-200 text-zinc-700 font-mono ring-1 focus:ring-[1.5px] focus:ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
// Variante para textarea (sin altura fija)
const INPUT_STD_TA = 'bg-zinc-200 text-zinc-700 font-mono ring-1 ring-zinc-400 focus:ring-[1.5px] focus:ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200';

// ─── Item type ────────────────────────────────────────────────────────────────

interface ItemLinea {
  key: string;
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  porcentajeIGV: number;
  tipoAfectacion: string;
  icbper: number;
  /** El precio en mostrador YA incluye IGV (estilo POS Perú): S/50 → total S/50, no S/59.
   *  Viene del stock del producto por sede; items manuales = true (paridad Flutter). */
  precioIncluyeIgv: boolean;
}

function calcItem(item: ItemLinea) {
  const bruto = item.cantidad * item.precioUnitario;
  const descAmount = bruto * (item.descuento || 0) / 100;
  const igvRate = item.tipoAfectacion === '10' ? item.porcentajeIGV / 100 : 0;
  const icbperTotal = item.icbper * item.cantidad;

  let subtotal: number; // base imponible (sin IGV)
  let igv: number;
  if (igvRate > 0 && item.precioIncluyeIgv) {
    // El precio ya trae el IGV adentro: se EXTRAE, no se suma (paridad Flutter)
    const neto = bruto - descAmount;
    subtotal = neto / (1 + igvRate);
    igv = neto - subtotal;
  } else {
    subtotal = bruto - descAmount;
    igv = subtotal * igvRate;
  }
  const total = subtotal + igv + icbperTotal;
  return { baseAmount: bruto, descAmount, subtotal, igv, icbperTotal, total };
}

function genKey() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CotizacionFormProps {
  mode: 'create' | 'edit';
  cotizacionId?: string;
  initialData?: Cotizacion;
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
              <div className={`h-0.5 w-8 sm:w-12 ${i <= current ? 'bg-[#004A94]' : 'bg-gray-200'}`} />
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
              <span className={`text-xs font-medium ${isActive ? 'text-[#004A94]' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CotizacionForm({ mode, cotizacionId, initialData }: CotizacionFormProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { sedes, empresa } = useEmpresa();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Step 1: Cliente ─────────────────────────────────────────────────────────
  const [sedeId, setSedeId] = useState(initialData?.sedeId || '');
  const [clienteId, setClienteId] = useState<string | undefined>(initialData?.clienteId);
  const [nombreCotizacion, setNombreCotizacion] = useState(initialData?.nombre || '');
  const [nombreCliente, setNombreCliente] = useState(initialData?.nombreCliente || '');
  const [documentoCliente, setDocumentoCliente] = useState(initialData?.documentoCliente || '');
  const [emailCliente, setEmailCliente] = useState(initialData?.emailCliente || '');
  const [telefonoCliente, setTelefonoCliente] = useState(initialData?.telefonoCliente || '');
  const [direccionCliente, setDireccionCliente] = useState(initialData?.direccionCliente || '');

  // ── Step 2: Items ───────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemLinea[]>(() => {
    if (initialData?.detalles) {
      return initialData.detalles.map(d => ({
        key: genKey(),
        productoId: d.productoId,
        varianteId: d.varianteId,
        servicioId: d.servicioId,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
        porcentajeIGV: d.porcentajeIGV,
        tipoAfectacion: d.tipoAfectacion || '10',
        icbper: d.icbper || 0,
        // Detalles guardados: subtotal ya viene sin IGV → reconstruir el flag
        // comparando si el total coincide con precio×cant (incluye) o con base+igv (no incluye)
        precioIncluyeIgv: (d as { precioIncluyeIgv?: boolean }).precioIncluyeIgv ?? true,
      }));
    }
    return [];
  });
  // ── Compatibilidad ──────────────────────────────────────────────────────────
  const [compatibilidad, setCompatibilidad] = useState<CompatibilidadResult | null>(null);
  const [checkingCompat, setCheckingCompat] = useState(false);

  // ── Step 3: Condiciones ─────────────────────────────────────────────────────
  const [moneda, setMoneda] = useState(initialData?.moneda || 'PEN');
  const [tipoCambio, setTipoCambio] = useState<number | ''>(initialData?.tipoCambio || '');
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || '');
  const [condiciones, setCondiciones] = useState(initialData?.condiciones || '');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    initialData?.fechaVencimiento ? initialData.fechaVencimiento.slice(0, 10) : '',
  );

  // ── Submission ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // ── Set default sede ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sedeId && sedes.length > 0) {
      const principal = sedes.find((s) => s.esPrincipal);
      setSedeId(principal?.id || sedes[0].id);
    }
  }, [sedes, sedeId]);

  // ── Variantes: selector (los productos con variantes no tienen precio/stock propio) ──
  const [variantePicker, setVariantePicker] = useState<any | null>(null);
  const [loadingVariantes, setLoadingVariantes] = useState(false);

  // Precio/flag de la sede activa desde stocksPorSede
  const stockDeSede = useCallback((stocks?: any[]) => {
    if (!stocks?.length) return null;
    return stocks.find((s: any) => s.sedeId === sedeId) ?? stocks[0];
  }, [sedeId]);

  // ── Add product ─────────────────────────────────────────────────────────────
  const addProductItem = useCallback(async (producto: any) => {
    setCompatibilidad(null);

    // Producto con variantes → abrir selector (paridad Flutter CotizacionItemSelector)
    if (producto.tieneVariantes) {
      if (!producto.variantes?.length) {
        // La búsqueda no siempre trae las variantes: cargar detalle completo
        setLoadingVariantes(true);
        try {
          const full = await productoService.getProducto(producto.id);
          setVariantePicker(full);
        } catch { /* ignore */ } finally { setLoadingVariantes(false); }
      } else {
        setVariantePicker(producto);
      }
      return;
    }

    const sedeStock = stockDeSede(producto.stocksPorSede);
    const newItem: ItemLinea = {
      key: genKey(),
      productoId: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precioUnitario: sedeStock?.precio ?? 0,
      descuento: 0,
      porcentajeIGV: producto.impuestoPorcentaje ?? 18,
      tipoAfectacion: producto.tipoAfectacion || '10',
      icbper: producto.icbper ?? 0,
      precioIncluyeIgv: sedeStock?.precioIncluyeIgv ?? true,
    };
    // Si ya está en la lista (mismo producto sin variante) → incrementar cantidad
    setItems(prev => {
      const idx = prev.findIndex(it => it.productoId === producto.id && !it.varianteId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, newItem];
    });
  }, [sedeId, stockDeSede]);

  // ── Add variante seleccionada ───────────────────────────────────────────────
  const addVarianteItem = useCallback((producto: any, variante: any, cantidad: number = 1) => {
    const sedeStock = stockDeSede(variante.stocksPorSede);
    const newItem: ItemLinea = {
      key: genKey(),
      productoId: producto.id,
      varianteId: variante.id,
      descripcion: `${producto.nombre} - ${variante.nombre}`,
      cantidad,
      precioUnitario: sedeStock?.precio ?? 0,
      descuento: 0,
      porcentajeIGV: producto.impuestoPorcentaje ?? 18,
      tipoAfectacion: producto.tipoAfectacion || '10',
      icbper: producto.icbper ?? 0,
      precioIncluyeIgv: sedeStock?.precioIncluyeIgv ?? true,
    };
    // Si ya está (mismo producto + misma variante) → incrementar cantidad
    setItems(prev => {
      const idx = prev.findIndex(it => it.productoId === producto.id && it.varianteId === variante.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
        return next;
      }
      return [...prev, newItem];
    });
    setVariantePicker(null);
  }, [stockDeSede]);

  // ── Add manual item ─────────────────────────────────────────────────────────
  const addManualItem = useCallback(() => {
    setItems(prev => [...prev, {
      key: genKey(),
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      porcentajeIGV: 18,
      tipoAfectacion: '10',
      icbper: 0,
      // Items manuales: el precio ingresado es el FINAL al cliente (paridad Flutter:
      // "Mesa S/800 → total S/800; si fuera false sumaría 18% y daría S/944")
      precioIncluyeIgv: true,
    }]);
    setCompatibilidad(null);
  }, []);

  const updateItem = useCallback((key: string, field: keyof ItemLinea, value: any) => {
    setItems(prev => prev.map(item => (item.key === key ? { ...item, [field]: value } : item)));
    if (field === 'tipoAfectacion' || field === 'productoId') setCompatibilidad(null);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(item => item.key !== key));
    setCompatibilidad(null);
  }, []);

  // ── Check compatibilidad ────────────────────────────────────────────────────
  const checkCompatibilidad = useCallback(async () => {
    if (items.length < 2) {
      setCompatibilidad({ compatible: true, conflictos: [] });
      return;
    }
    setCheckingCompat(true);
    try {
      const detalles: CreateCotizacionDetalleDto[] = items.map(item => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        servicioId: item.servicioId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      }));
      const result = await cotizacionService.validarCompatibilidad(detalles);
      setCompatibilidad(result);
    } catch {
      // ignore
    } finally {
      setCheckingCompat(false);
    }
  }, [items]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal += c.subtotal;
      acc.descuento += c.descAmount;
      acc.igv += c.igv;
      acc.icbper += c.icbperTotal;
      acc.total += c.total;
      return acc;
    },
    { subtotal: 0, descuento: 0, igv: 0, icbper: 0, total: 0 },
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
      items.forEach(item => {
        if (!item.descripcion.trim()) errors[`desc_${item.key}`] = 'Descripcion requerida';
        if (item.cantidad <= 0) errors[`cant_${item.key}`] = 'Cantidad invalida';
        if (item.precioUnitario < 0) errors[`precio_${item.key}`] = 'Precio invalido';
      });
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 3));
  }

  function handleBack() {
    setStepErrors({});
    setStep(s => Math.max(s - 1, 0));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (authState.status !== 'authenticated') {
      setError('No se pudo identificar al usuario. Inicie sesion nuevamente.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const detalles: CreateCotizacionDetalleDto[] = items.map(item => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        servicioId: item.servicioId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        porcentajeIGV: item.porcentajeIGV,
        precioIncluyeIgv: item.precioIncluyeIgv,
        tipoAfectacion: item.tipoAfectacion,
        icbper: item.icbper || undefined,
      }));

      const dto: CreateCotizacionDto = {
        sedeId,
        vendedorId: authState.user.id,
        clienteId,
        nombre: nombreCotizacion.trim() || undefined,
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

      if (mode === 'edit' && cotizacionId) {
        const updated = await cotizacionService.updateCotizacion(cotizacionId, dto);
        router.push(`/dashboard/cotizaciones/${updated.id}`);
      } else {
        const created = await cotizacionService.createCotizacion(dto);
        router.push(`/dashboard/cotizaciones/${created.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || `Error al ${mode === 'edit' ? 'actualizar' : 'crear'} la cotizacion`);
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

  const fmt = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currSymbol = moneda === 'USD' ? '$' : 'S/';
  const vendedorNombre = authState.status === 'authenticated'
    ? `${authState.user.nombres} ${authState.user.apellidos}`
    : '-';
  const sedeNombre = sedes.find(s => s.id === sedeId)?.nombre || '-';

  return (
    <div className={`mx-auto space-y-6 pb-10 ${step === 1 ? 'max-w-none' : 'max-w-4xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === 'edit' ? 'Editar Cotizacion' : 'Nueva Cotizacion'}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === 'edit' ? 'Modifique los datos de la cotizacion' : 'Complete los datos para crear una cotizacion'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ─── STEP 1: CLIENTE ──────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            {/* Sede + Vendedor en una sola fila */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Sede */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sede <span className="text-red-500">*</span>
                </label>
                <select
                  value={sedeId}
                  onChange={e => setSedeId(e.target.value)}
                  className={`${INPUT_STD} w-full text-sm ${stepErrors.sedeId ? 'ring-red-400' : 'ring-zinc-400'}`}
                >
                  <option value="">Seleccione una sede</option>
                  {sedes
                    .filter((s: any) => s.isActive)
                    .map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}{s.esPrincipal ? ' (Principal)' : ''}
                      </option>
                    ))}
                </select>
                {stepErrors.sedeId && <p className="mt-1 text-xs text-red-500">{stepErrors.sedeId}</p>}
              </div>

              {/* Vendedor */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vendedor</label>
                <input
                  type="text"
                  value={vendedorNombre}
                  disabled
                  className={`${INPUT_STD} w-full text-sm ring-zinc-400 cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Nombre cotizacion */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre de la cotizacion</label>
              <input
                type="text"
                value={nombreCotizacion}
                onChange={e => setNombreCotizacion(e.target.value)}
                placeholder="Ej: Propuesta equipos oficina (opcional)"
                className={`${INPUT_STD} w-full text-sm ring-zinc-400`}
              />
            </div>
          </div>

          {/* Cliente Selector */}
          <ClienteSelector
            initialNombre={nombreCliente}
            initialDocumento={documentoCliente}
            onClienteSelected={data => {
              setClienteId(data.clienteId);
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
          {/* Compatibilidad banner */}
          {compatibilidad && (
            <div className={`rounded-lg border p-3 flex items-start gap-2 ${
              compatibilidad.compatible
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              {compatibilidad.compatible ? (
                <>
                  <svg className="h-5 w-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-700">Todos los items son compatibles</p>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-700">Conflictos de compatibilidad</p>
                    <ul className="mt-1 text-xs text-amber-600 list-disc list-inside">
                      {compatibilidad.conflictos.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
          {/* IZQUIERDA: catálogo de productos (como Venta Rápida) */}
          <div className="space-y-3 lg:col-span-3">
            <ProductGrid sedeId={sedeId} onSelect={addProductItem} colsClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" maxHeightClass="max-h-[calc(100vh-15rem)]" />
          </div>

          {/* DERECHA: carrito de la cotización (panel angosto) */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">Items ({items.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {items.length >= 2 && (
                  <button
                    type="button"
                    onClick={checkCompatibilidad}
                    disabled={checkingCompat}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {checkingCompat ? 'Verificando...' : 'Compatibilidad'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={addManualItem}
                  className="rounded-lg border border-dashed border-[#004A94] px-2.5 py-1 text-xs font-medium text-[#004A94] hover:bg-[#004A94]/5"
                >
                  + Item manual
                </button>
              </div>
            </div>

            {stepErrors.items && <p className="text-xs text-red-500">{stepErrors.items}</p>}

          {/* Items table */}
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-3 text-sm text-gray-500">Agregue productos o servicios a la cotizacion</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="max-h-[34rem] overflow-y-auto">
              {/* Lista de items estilo carrito (como Venta Rápida) */}
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const c = calcItem(item);
                  return (
                    <div key={item.key} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={e => updateItem(item.key, 'descripcion', e.target.value)}
                          placeholder="Descripcion"
                          className={`${INPUT_STD} flex-1 text-sm ${stepErrors[`desc_${item.key}`] ? 'ring-red-400' : 'ring-zinc-400'}`}
                        />
                        <button type="button" onClick={() => removeItem(item.key)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="w-20 shrink-0">
                          <label className="mb-0.5 block text-[11px] text-gray-500">Cant.</label>
                          <input type="number" min={0.01} step="any" value={item.cantidad}
                            onChange={e => updateItem(item.key, 'cantidad', parseFloat(e.target.value) || 0)}
                            className={`${INPUT_STD} w-full text-center text-sm ring-zinc-400`}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500">P. Unit.</p>
                          <p className="text-sm font-medium text-gray-700">{currSymbol} {fmt(item.precioUnitario)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500">Total</p>
                          <p className="text-sm font-semibold text-gray-900">{currSymbol} {fmt(c.total)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              </div>{/* /scroll items */}

              {/* Totals bar */}
              <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
                <div className="flex flex-col items-end gap-1.5 text-sm">
                  <div className="flex w-full max-w-xs justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-medium text-gray-700">{currSymbol} {fmt(totals.subtotal)}</span>
                  </div>
                  {totals.descuento > 0 && (
                    <div className="flex w-full max-w-xs justify-between">
                      <span className="text-gray-500">Descuento:</span>
                      <span className="font-medium text-red-600">-{currSymbol} {fmt(totals.descuento)}</span>
                    </div>
                  )}
                  <div className="flex w-full max-w-xs justify-between">
                    <span className="text-gray-500">IGV:</span>
                    <span className="font-medium text-gray-700">{currSymbol} {fmt(totals.igv)}</span>
                  </div>
                  {totals.icbper > 0 && (
                    <div className="flex w-full max-w-xs justify-between">
                      <span className="text-gray-500">ICBPER:</span>
                      <span className="font-medium text-gray-700">{currSymbol} {fmt(totals.icbper)}</span>
                    </div>
                  )}
                  <div className="flex w-full max-w-xs justify-between border-t border-gray-300 pt-1.5">
                    <span className="font-bold text-gray-900">TOTAL:</span>
                    <span className="font-bold text-gray-900">{currSymbol} {fmt(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>{/* /columna derecha (items) */}
          </div>{/* /grid 2 columnas */}
        </div>
      )}

      {/* ─── STEP 3: CONDICIONES ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Condiciones</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
                <select
                  value={moneda}
                  onChange={e => setMoneda(e.target.value)}
                  className={`${INPUT_STD} w-full text-sm ring-zinc-400`}
                >
                  <option value="PEN">PEN - Soles</option>
                  <option value="USD">USD - Dolares</option>
                </select>
              </div>
              {moneda === 'USD' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de cambio</label>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={tipoCambio}
                    onChange={e => setTipoCambio(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ej: 3.750"
                    className={`${INPUT_STD} w-full text-sm ring-zinc-400`}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de vencimiento</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                className={`${INPUT_STD} w-full text-sm ring-zinc-400`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Notas internas o para el cliente..."
                className={`${INPUT_STD_TA} w-full text-sm resize-none`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Condiciones</label>
              <textarea
                value={condiciones}
                onChange={e => setCondiciones(e.target.value)}
                rows={3}
                placeholder="Condiciones comerciales, garantia, tiempo de entrega..."
                className={`${INPUT_STD_TA} w-full text-sm resize-none`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: RESUMEN ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Info general */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Informacion General</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {nombreCotizacion && (
                <div>
                  <span className="text-gray-500">Nombre:</span>{' '}
                  <span className="font-medium">{nombreCotizacion}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Sede:</span>{' '}
                <span className="font-medium">{sedeNombre}</span>
              </div>
              <div>
                <span className="text-gray-500">Vendedor:</span>{' '}
                <span className="font-medium">{vendedorNombre}</span>
              </div>
              <div>
                <span className="text-gray-500">Moneda:</span>{' '}
                <span className="font-medium">{moneda}</span>
              </div>
              {fechaVencimiento && (
                <div>
                  <span className="text-gray-500">Vencimiento:</span>{' '}
                  <span className="font-medium">{new Date(fechaVencimiento).toLocaleDateString('es-PE')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
            <p className="text-base font-bold text-gray-900">{nombreCliente}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {documentoCliente && (
                <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{documentoCliente}</span></div>
              )}
              {emailCliente && (
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{emailCliente}</span></div>
              )}
              {telefonoCliente && (
                <div><span className="text-gray-500">Telefono:</span> <span className="font-medium">{telefonoCliente}</span></div>
              )}
              {direccionCliente && (
                <div className="col-span-2"><span className="text-gray-500">Direccion:</span> <span className="font-medium">{direccionCliente}</span></div>
              )}
            </div>
          </div>

          {/* Items resumen */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Items ({items.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-2 text-center w-10">#</th>
                    <th className="px-4 py-2 text-left">Descripcion</th>
                    <th className="px-4 py-2 text-right">Cant.</th>
                    <th className="px-4 py-2 text-right">P. Unit.</th>
                    <th className="px-4 py-2 text-center">Afect.</th>
                    <th className="px-4 py-2 text-right">IGV</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const c = calcItem(item);
                    const afect = TIPO_AFECTACION_OPTIONS.find(o => o.value === item.tipoAfectacion);
                    return (
                      <tr key={item.key} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-center text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{item.descripcion || '(Sin descripcion)'}</td>
                        <td className="px-4 py-2 text-right">{item.cantidad}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.precioUnitario)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.tipoAfectacion === '10' ? 'bg-blue-50 text-blue-600' :
                            item.tipoAfectacion === '20' ? 'bg-green-50 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {afect?.label || item.tipoAfectacion}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{fmt(c.igv)}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(c.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
              <div className="flex flex-col items-end space-y-1 text-sm">
                <div className="flex w-64 justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{currSymbol} {fmt(totals.subtotal)}</span>
                </div>
                {totals.descuento > 0 && (
                  <div className="flex w-64 justify-between">
                    <span className="text-gray-500">Descuento</span>
                    <span className="font-medium text-red-600">-{currSymbol} {fmt(totals.descuento)}</span>
                  </div>
                )}
                <div className="flex w-64 justify-between">
                  <span className="text-gray-500">IGV</span>
                  <span className="font-medium">{currSymbol} {fmt(totals.igv)}</span>
                </div>
                {totals.icbper > 0 && (
                  <div className="flex w-64 justify-between">
                    <span className="text-gray-500">ICBPER</span>
                    <span className="font-medium">{currSymbol} {fmt(totals.icbper)}</span>
                  </div>
                )}
                <div className="flex w-64 justify-between border-t border-gray-300 pt-2">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">{currSymbol} {fmt(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones & Condiciones */}
          {(observaciones || condiciones) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {observaciones && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">Observaciones</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{observaciones}</p>
                </div>
              )}
              {condiciones && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">Condiciones</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{condiciones}</p>
                </div>
              )}
            </div>
          )}
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
          {step < 3 ? (
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
              {submitting
                ? (mode === 'edit' ? 'Guardando...' : 'Creando...')
                : (mode === 'edit' ? 'Guardar Cambios' : 'Crear Cotizacion')
              }
            </button>
          )}
        </div>
      </div>

      {/* ─── Selector de variantes (paridad Flutter) ──────────────────────── */}
      {loadingVariantes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl bg-white p-5 shadow-xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
          </div>
        </div>
      )}
      {variantePicker && (
        <VarianteSelector producto={variantePicker} sedeId={sedeId} accent="#004A94"
          onClose={() => setVariantePicker(null)}
          onConfirm={(v, c) => addVarianteItem(variantePicker, v, c)} />
      )}
    </div>
  );
}
