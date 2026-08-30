'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import * as cotizacionService from '../services/cotizacion-service';
import * as productoService from '@/features/producto/services/producto-service';
import * as precioNivelService from '@/features/producto/services/precio-nivel-service';
import * as comboService from '@/features/producto/services/combo-service';
import type { CreateCotizacionDto, CreateCotizacionDetalleDto, Cotizacion, CompatibilidadResult } from '@/core/types/cotizacion';
import type { Producto, ProductoVariante, StockPorSedeInfo } from '@/core/types/producto';
import { infoPrecioEfectivo, infoLiquidacionActiva } from '@/core/types/producto';
import type { NivelPrecio } from '@/core/types/venta';
import { nivelAplicable, precioConNivel, cantidadesGrupoMayoreo, tituloYContextoLinea } from '@/core/types/venta';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import { useAuth } from '@/core/auth/auth-context';
import ClienteSelector from './ClienteSelector';
import ProductGrid from '@/features/producto/components/ProductGrid';
import VarianteSelector from '@/features/producto/components/VarianteSelector';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Cliente', 'Items', 'Condiciones', 'Resumen'] as const;

const TIPO_AFECTACION_OPTIONS = [
  { value: '10', label: 'Gravado' },
  { value: '20', label: 'Exonerado' },
  { value: '30', label: 'Inafecto' },
];

// Estilo de input estándar (look mono + ring + sombra al focus). Altura 30px,
// radio 6px, ring 1.5px al focus. Agregar el color de ring (ring-blue-400 / ring-red-400).
const INPUT_STD = 'bg-zinc-100 text-[#004A94] font-sans ring-1 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
// Variante para textarea (sin altura fija)
const INPUT_STD_TA = 'bg-zinc-100 text-[#004A94] font-sans ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200';

// ─── Item type ────────────────────────────────────────────────────────────────

interface ItemLinea {
  key: string;
  productoId?: string;
  varianteId?: string;
  servicioId?: string;
  descripcion: string;
  /** Producto y variante por SEPARADO: la lista muestra el eje que distingue
   *  la línea y baja el resto a contexto (lo mismo que el carrito de VR). */
  productoNombre?: string;
  varianteNombre?: string;
  cantidad: number;
  precioUnitario: number;
  /** Descuento por línea en PORCENTAJE (calcItem usa /100). */
  descuento: number;
  porcentajeIGV: number;
  tipoAfectacion: string;
  icbper: number;
  /** El precio en mostrador YA incluye IGV (estilo POS Perú): S/50 → total S/50, no S/59.
   *  Viene del stock del producto por sede; items manuales = true (paridad Flutter). */
  precioIncluyeIgv: boolean;
  // ── Contexto local (no viaja tal cual al backend) ──
  /** Precio sin nivel (efectivo: liquidación > oferta > base) para recalcular por cantidad. */
  precioBase: number;
  niveles: NivelPrecio[];
  nivelAplicado?: string | null;
  /** El usuario editó el precio a mano → no recalcular por niveles. */
  precioManual?: boolean;
  enLiquidacion?: boolean;
  origenComboId?: string;
  origenComboNombre?: string;
}

/** Recalcula precioUnitario por niveles para la cantidad (paridad recalcularPorNiveles de VR;
 *  liquidación o precio manual mantienen el precio). */
function recalcItemNiveles(
  item: ItemLinea,
  cantidad: number,
  cantidadesGrupo?: Map<string, number>,
): ItemLinea {
  const cant = Math.max(0, cantidad);
  if (item.precioManual || item.enLiquidacion) {
    return { ...item, cantidad: cant };
  }
  const nivel = nivelAplicable(item.niveles, cant, {
    cantidadesGrupo,
    // Solo las lineas de VARIANTE combinan, igual que en el backend.
    productoId: item.varianteId ? item.productoId : null,
  });
  const precio = precioConNivel(item.precioBase, nivel);
  return {
    ...item,
    cantidad: cant,
    precioUnitario: precio,
    nivelAplicado: precio < item.precioBase ? nivel?.nombre ?? null : null,
  };
}

/**
 * Reprecia la cotizacion ENTERA aplicando MAYOREO COMBINADO: 3 disenos
 * distintos del mismo producto que comparten "Por Mayor >= 3" cobran por mayor
 * los tres. El precio de una linea depende de las OTRAS, asi que cada vez que
 * se agrega, quita o cambia una cantidad hay que pasar la lista completa.
 *
 * Quedan afuera los componentes de combo (su precio lo fija el prorrateo) y las
 * lineas con precio tecleado a mano.
 */
function recalcNivelesEnLote(items: ItemLinea[]): ItemLinea[] {
  const grupos = cantidadesGrupoMayoreo(items);
  return items.map((it) => (
    it.origenComboId || it.precioManual ? it : recalcItemNiveles(it, it.cantidad, grupos)
  ));
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
  const permissions = usePermissions();

  // Autorización de descuentos (paridad VR): sin canManageDiscounts un admin desbloquea una vez.
  const [descuentoDesbloqueado, setDescuentoDesbloqueado] = useState(false);
  const [authDescuentoOpen, setAuthDescuentoOpen] = useState(false);
  const puedeDescuento = permissions.canManageDiscounts || descuentoDesbloqueado;

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Step 1: Cliente ─────────────────────────────────────────────────────────
  const [sedeId, setSedeId] = useState(initialData?.sedeId || '');
  const [clienteId, setClienteId] = useState<string | undefined>(initialData?.clienteId);
  // Persona y empresa son tablas DISTINTAS con su propia FK: mandar el id de
  // una empresa como `clienteId` reventaba el create con 500.
  const [clienteEmpresaId, setClienteEmpresaId] = useState<string | undefined>(
    initialData?.clienteEmpresaId ?? undefined,
  );
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
        // El precio guardado se respeta (manual): no recalcular por niveles al editar.
        precioBase: d.precioUnitario,
        niveles: [],
        precioManual: true,
        enLiquidacion: false,
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

  // ── Reserva de stock + adelanto (solo al CREAR, paridad cotización rápida Flutter) ──
  const [reservarStock, setReservarStock] = useState(false);
  const [adelantoMonto, setAdelantoMonto] = useState('');
  const [cajaActiva, setCajaActiva] = useState<{ id: string; codigo?: string } | null>(null);
  const [cajaChecked, setCajaChecked] = useState(false);

  // Caja abierta del usuario: requisito para registrar el adelanto en caja
  useEffect(() => {
    if (mode !== 'create') return;
    import('@/features/caja/services/caja-service')
      .then(svc => svc.getCajaActiva())
      .then(c => setCajaActiva(c ? { id: c.id, codigo: (c as { codigo?: string }).codigo } : null))
      .catch(() => setCajaActiva(null))
      .finally(() => setCajaChecked(true));
  }, [mode]);

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
  const [variantePicker, setVariantePicker] = useState<Producto | null>(null);
  const [loadingVariantes, setLoadingVariantes] = useState(false);

  // Precio/flag de la sede activa desde stocksPorSede
  const stockDeSede = useCallback((stocks?: StockPorSedeInfo[]) => {
    if (!stocks?.length) return null;
    return stocks.find(s => s.sedeId === sedeId) ?? stocks[0];
  }, [sedeId]);

  // ── Expandir combo en componentes con prorrateo (paridad Venta Rápida) ───────
  const expandirCombo = useCallback(async (producto: Producto) => {
    try {
      const combo = await comboService.getComboCompleto(producto.id, sedeId);
      if (combo.stockDisponible <= 0) {
        setError(`"${producto.nombre}" sin stock para armar (componentes insuficientes)`);
        return;
      }
      const lineas = combo.componentes.map(c => ({
        productoId: c.componenteProductoId,
        varianteId: c.componenteVarianteId,
        descripcion: c.componenteInfo?.nombre ?? 'Componente',
        cantidad: Number(c.cantidad),
        precioUnit: Number(c.precioEnCombo ?? c.componenteInfo?.precio ?? 0),
      }));
      const sumaLineas = lineas.reduce((a, l) => a + l.precioUnit * l.cantidad, 0);
      // Precio objetivo: oferta activa > FIJO/C_DESC (precio) > CALCULADO (suma)
      const objetivo = combo.ofertaActiva && combo.precioOferta != null
        ? Number(combo.precioOferta)
        : combo.tipoPrecioCombo === 'CALCULADO'
          ? Number(combo.precioCalculado ?? sumaLineas)
          : Number(combo.precio ?? sumaLineas);
      const descTotal = Math.max(0, sumaLineas - objetivo);
      let acumulado = 0;
      const igvP = producto.impuestoPorcentaje ?? 18;
      const nuevos: ItemLinea[] = lineas.map((l, i) => {
        const bruto = l.precioUnit * l.cantidad;
        let descMonto = sumaLineas > 0 ? Math.round((descTotal * bruto / sumaLineas) * 100) / 100 : 0;
        if (i === lineas.length - 1) descMonto = Math.round((descTotal - acumulado) * 100) / 100;
        acumulado += descMonto;
        // Cotización maneja descuento en %: convertir el monto prorrateado a porcentaje de la línea
        const pct = bruto > 0 ? Math.min(100, Math.round((descMonto / bruto) * 10000) / 100) : 0;
        return {
          key: genKey(),
          productoId: l.productoId,
          varianteId: l.varianteId,
          descripcion: l.descripcion,
          productoNombre: l.descripcion,
          cantidad: l.cantidad,
          precioBase: l.precioUnit,
          precioUnitario: l.precioUnit,
          descuento: pct,
          porcentajeIGV: igvP,
          tipoAfectacion: '10',
          icbper: 0,
          precioIncluyeIgv: true,
          niveles: [],          // los combos no aplican niveles por mayor (paridad Flutter)
          precioManual: true,
          enLiquidacion: false,
          origenComboId: producto.id,
          origenComboNombre: producto.nombre,
        };
      });
      setItems(prev => recalcNivelesEnLote([...prev, ...nuevos]));
      setCompatibilidad(null);
    } catch {
      setError(`No se pudo cargar el combo "${producto.nombre}"`);
    }
  }, [sedeId]);

  // ── Add product (combo → expandir; variantes → selector; simple → con niveles) ──
  const addProductItem = useCallback(async (producto: Producto) => {
    setCompatibilidad(null);

    // Combo → expandir en sus componentes
    if (producto.esCombo) { await expandirCombo(producto); return; }

    // Producto con variantes → abrir selector (paridad Flutter CotizacionItemSelector)
    if (producto.tieneVariantes) {
      if (!producto.variantes?.length) {
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
    const precioBase = sedeStock ? Number(infoPrecioEfectivo(sedeStock) ?? sedeStock.precio ?? 0) : 0;
    const enLiq = sedeStock ? infoLiquidacionActiva(sedeStock) : false;
    const key = genKey();
    const newItem: ItemLinea = {
      key,
      productoId: producto.id,
      descripcion: producto.nombre,
      productoNombre: producto.nombre,
      cantidad: 1,
      precioBase,
      precioUnitario: precioBase,
      descuento: 0,
      porcentajeIGV: producto.impuestoPorcentaje ?? 18,
      tipoAfectacion: producto.tipoAfectacionIgv === 'EXONERADO' ? '20' : producto.tipoAfectacionIgv === 'INAFECTO' ? '30' : '10',
      icbper: producto.aplicaIcbper ? 0.5 : 0,
      precioIncluyeIgv: sedeStock?.precioIncluyeIgv ?? true,
      niveles: [],
      enLiquidacion: enLiq,
    };
    setItems(prev => {
      const idx = prev.findIndex(it => it.productoId === producto.id && !it.varianteId && !it.origenComboId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return recalcNivelesEnLote(next);
      }
      return recalcNivelesEnLote([...prev, newItem]);
    });
    // Niveles por mayor (async): al llegar, recalcular el precio a la cantidad actual
    if (!enLiq) {
      try {
        const niveles = await precioNivelService.getNivelesByProducto(producto.id);
        if (niveles.length) {
          setItems(prev => recalcNivelesEnLote(
            prev.map(it => (it.key === key ? { ...it, niveles } : it))));
        }
      } catch { /* sin niveles */ }
    }
  }, [stockDeSede, expandirCombo]);

  /** Lo que ya está cotizado por variante: el selector lo descuenta del stock
   *  que muestra, porque agregar no cierra el diálogo. */
  const cantidadesPorVariante = useMemo(() => {
    const out: Record<string, number> = {};
    for (const it of items) {
      if (!it.varianteId) continue;
      out[it.varianteId] = (out[it.varianteId] ?? 0) + it.cantidad;
    }
    return out;
  }, [items]);

  // ── Add variante seleccionada ───────────────────────────────────────────────
  const addVarianteItem = useCallback(async (producto: Producto, variante: ProductoVariante, cantidad: number = 1) => {
    const sedeStock = stockDeSede(variante.stocksPorSede);
    const precioBase = sedeStock ? Number(infoPrecioEfectivo(sedeStock) ?? sedeStock.precio ?? 0) : 0;
    const enLiq = sedeStock ? infoLiquidacionActiva(sedeStock) : false;
    const key = genKey();
    const newItem: ItemLinea = {
      key,
      productoId: producto.id,
      varianteId: variante.id,
      descripcion: `${producto.nombre} - ${variante.nombre}`,
      productoNombre: producto.nombre,
      varianteNombre: variante.nombre,
      cantidad,
      precioBase,
      precioUnitario: precioBase,
      descuento: 0,
      porcentajeIGV: producto.impuestoPorcentaje ?? 18,
      tipoAfectacion: producto.tipoAfectacionIgv === 'EXONERADO' ? '20' : producto.tipoAfectacionIgv === 'INAFECTO' ? '30' : '10',
      icbper: producto.aplicaIcbper ? 0.5 : 0,
      precioIncluyeIgv: sedeStock?.precioIncluyeIgv ?? true,
      niveles: [],
      enLiquidacion: enLiq,
    };
    setItems(prev => {
      const idx = prev.findIndex(it => it.productoId === producto.id && it.varianteId === variante.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
        return recalcNivelesEnLote(next);
      }
      return recalcNivelesEnLote([...prev, newItem]);
    });
    // 🔑 El selector NO se cierra al agregar, igual que en Venta Rapida: con 91
    // combinaciones el caso normal es llevarse varias, y cerrarlo obligaba a
    // reabrirlo y volver a buscar desde cero. Se cierra con la X o tocando
    // afuera, que es lo que hace onClose.
    if (!enLiq) {
      try {
        const niveles = await precioNivelService.getNivelesByVariante(variante.id);
        if (niveles.length) {
          setItems(prev => recalcNivelesEnLote(
            prev.map(it => (it.key === key ? { ...it, niveles } : it))));
        }
      } catch { /* sin niveles */ }
    }
  }, [stockDeSede]);

  // ── Add manual item ─────────────────────────────────────────────────────────
  const addManualItem = useCallback(() => {
    setItems(prev => [...prev, {
      key: genKey(),
      descripcion: '',
      cantidad: 1,
      precioBase: 0,
      precioUnitario: 0,
      descuento: 0,
      porcentajeIGV: 18,
      tipoAfectacion: '10',
      icbper: 0,
      // Items manuales: el precio ingresado es el FINAL al cliente (paridad Flutter)
      precioIncluyeIgv: true,
      niveles: [],
      precioManual: true,
      enLiquidacion: false,
    }]);
    setCompatibilidad(null);
  }, []);

  const updateItem = useCallback((key: string, field: keyof ItemLinea, value: string | number | boolean) => {
    setItems(prev => prev.map(item => (item.key === key ? ({ ...item, [field]: value } as ItemLinea) : item)));
    if (field === 'tipoAfectacion' || field === 'productoId') setCompatibilidad(null);
  }, []);

  // Cantidad: recalcula precio por niveles (salvo precio manual o liquidación)
  const setCantidad = useCallback((key: string, n: number) => {
    setItems(prev => recalcNivelesEnLote(
      prev.map(it => (it.key === key ? { ...it, cantidad: Math.max(0, n) } : it))));
    setCompatibilidad(null);
  }, []);

  // Precio editable: marca el ítem como manual (deja de auto-recalcular niveles)
  const setPrecio = useCallback((key: string, v: number) => {
    setItems(prev => prev.map(it => it.key === key
      ? { ...it, precioUnitario: Math.max(0, v || 0), precioManual: true, nivelAplicado: null }
      : it));
  }, []);

  // Descuento por línea en % (gated por autorización vía la UI)
  const setDescuentoPct = useCallback((key: string, v: number) => {
    const pct = Math.min(100, Math.max(0, v || 0));
    setItems(prev => prev.map(it => it.key === key ? { ...it, descuento: pct } : it));
  }, []);

  const removeItem = useCallback((key: string) => {
    // Sacar una linea puede dejar al grupo por debajo del minimo.
    setItems(prev => recalcNivelesEnLote(prev.filter(item => item.key !== key)));
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
        // Hubo rebaja por nivel/mayorista → informar el precio regular ("Cliente ahorra")
        precioRegular: item.nivelAplicado && item.precioBase > item.precioUnitario ? item.precioBase : undefined,
      }));

      const adelanto = parseFloat(adelantoMonto) || 0;
      const dto: CreateCotizacionDto = {
        sedeId,
        vendedorId: authState.user.id,
        clienteId,
        clienteEmpresaId,
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
        ...(mode === 'create' && reservarStock ? { reservarStock: true } : {}),
        ...(mode === 'create' && adelanto > 0 && cajaActiva ? { adelantoMonto: adelanto, cajaId: cajaActiva.id } : {}),
      };

      if (mode === 'edit' && cotizacionId) {
        const updated = await cotizacionService.updateCotizacion(cotizacionId, dto);
        router.push(`/dashboard/cotizaciones/${updated.id}`);
      } else {
        const created = await cotizacionService.createCotizacion(dto);
        router.push(`/dashboard/cotizaciones/${created.id}`);
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : err instanceof Error ? err.message : undefined;
      setError(msg || `Error al ${mode === 'edit' ? 'actualizar' : 'crear'} la cotizacion`);
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
                  className={`${INPUT_STD} w-full text-xs ${stepErrors.sedeId ? 'ring-red-400' : 'ring-blue-400'}`}
                >
                  <option value="">Seleccione una sede</option>
                  {sedes
                    .filter(s => s.isActive)
                    .map(s => (
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
                  className={`${INPUT_STD} w-full text-xs ring-blue-400 cursor-not-allowed`}
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
                className={`${INPUT_STD} w-full text-xs ring-blue-400`}
              />
            </div>
          </div>

          {/* Cliente Selector */}
          <ClienteSelector
            initialNombre={nombreCliente}
            initialDocumento={documentoCliente}
            onClienteSelected={data => {
              // Solo uno de los dos queda seteado: el otro se limpia, o al
              // cambiar de empresa a persona viajarian los dos.
              const esEmpresa = data.tipoCliente === 'empresa';
              setClienteId(esEmpresa ? undefined : data.clienteId);
              setClienteEmpresaId(esEmpresa ? data.clienteId : undefined);
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
            <ProductGrid sedeId={sedeId} onSelect={addProductItem} colsClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" maxHeightClass="max-h-[calc(100vh-15rem)]" />
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
                {!puedeDescuento && (
                  <button
                    type="button"
                    onClick={() => setAuthDescuentoOpen(true)}
                    className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                  >
                    🔒 Autorizar descuentos
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
              {/* Lista de items (card compacta: descripción arriba; cant/precio/desc/total abajo) */}
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const c = calcItem(item);
                  // Item manual: sin producto, servicio ni variante detrás.
                  const esManual = !item.productoId && !item.varianteId && !item.servicioId;
                  const { titulo, contexto } = tituloYContextoLinea(item);
                  const conNivel = item.precioUnitario < item.precioBase;
                  return (
                    <div key={item.key} className={`px-3 py-2.5 ${item.origenComboId ? 'bg-purple-50/40' : 'hover:bg-gray-50/60'}`}>

                      {/* Fila 1: qué es y cuánto suma */}
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {esManual ? (
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={e => updateItem(item.key, 'descripcion', e.target.value)}
                              placeholder="Descripcion"
                              className={`${INPUT_STD} w-full text-xs ${stepErrors[`desc_${item.key}`] ? 'ring-red-400' : 'ring-blue-400'}`}
                            />
                          ) : (
                            <>
                              <p className="truncate text-[13px] font-semibold text-[#043261]">
                                {item.origenComboId && <span className="mr-1 rounded bg-purple-100 px-1 text-[9px] font-bold text-purple-700">COMBO</span>}
                                {titulo}
                              </p>
                              {contexto && <p className="truncate text-[10px] text-gray-500">{contexto}</p>}
                            </>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[15px] font-bold leading-tight text-gray-900">{currSymbol} {fmt(c.total)}</p>
                          <p className={`text-[11px] font-medium ${conNivel ? 'text-blue-700' : 'text-gray-500'}`}>
                            {currSymbol} {fmt(item.precioUnitario)} c/u
                          </p>
                        </div>
                        <button type="button" onClick={() => removeItem(item.key)} title="Quitar"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Fila 2: cantidad, descuento y lo que explica el precio */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {/* Stepper con el número EDITABLE: un granel se cotiza en
                            decimales y con ± solo no se puede teclear 1.5 kg. */}
                        <div className="flex h-8 items-center overflow-hidden rounded-full border border-gray-200 bg-white">
                          <button type="button" onClick={() => setCantidad(item.key, Math.max(0.01, item.cantidad - 1))}
                            className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-100">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 12h12" /></svg>
                          </button>
                          <input type="number" min={0.01} step="any" value={item.cantidad}
                            onChange={e => setCantidad(item.key, parseFloat(e.target.value) || 0)}
                            className="w-12 border-0 bg-transparent p-0 text-center text-[13px] font-bold text-[#043261] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                          <button type="button" onClick={() => setCantidad(item.key, item.cantidad + 1)}
                            className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-100">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
                          </button>
                        </div>

                        <label
                          title={puedeDescuento ? 'Descuento de esta línea' : 'Requiere autorización (botón "Autorizar descuentos")'}
                          className={`flex h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] ${item.descuento > 0
                            ? 'border-amber-300 bg-amber-50 font-bold text-amber-700'
                            : 'border-gray-200 text-gray-500'} ${puedeDescuento ? '' : 'opacity-50'}`}>
                          <input type="number" min={0} max={100} step="any" value={item.descuento || ''}
                            disabled={!puedeDescuento}
                            onChange={e => setDescuentoPct(item.key, parseFloat(e.target.value))}
                            placeholder="0"
                            className="w-8 border-0 bg-transparent p-0 text-right text-[11px] font-inherit outline-none [appearance:textfield] disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none" />
                          % desc
                        </label>

                        {/* El P.U. del catálogo NO se teclea: sale del precio de la
                            sede y de sus niveles. Tocarlo a mano desengancha la
                            línea del mayoreo. Las manuales sí, no hay de dónde. */}
                        {esManual && (
                          <label className="flex h-8 items-center gap-1 rounded-full border border-gray-200 px-2.5 text-[11px] text-gray-500">
                            P.U
                            <input type="number" min={0} step="any" value={item.precioUnitario}
                              onChange={e => setPrecio(item.key, parseFloat(e.target.value))}
                              className="w-16 border-0 bg-transparent p-0 text-right text-[11px] font-semibold text-[#043261] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                          </label>
                        )}

                        {item.nivelAplicado && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-blue-700">{item.nivelAplicado}</span>
                        )}
                        {item.enLiquidacion && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600">LIQUIDACIÓN</span>
                        )}
                        {item.origenComboNombre && (
                          <span className="truncate text-[10px] text-purple-600">{item.origenComboNombre}</span>
                        )}
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
                  className={`${INPUT_STD} w-full text-xs ring-blue-400`}
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
                    className={`${INPUT_STD} w-full text-xs ring-blue-400`}
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
                className={`${INPUT_STD} w-full text-xs ring-blue-400`}

/>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Notas internas o para el cliente..."
                className={`${INPUT_STD_TA} w-full text-xs resize-none`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Condiciones</label>
              <textarea
                value={condiciones}
                onChange={e => setCondiciones(e.target.value)}
                rows={3}
                placeholder="Condiciones comerciales, garantia, tiempo de entrega..."
                className={`${INPUT_STD_TA} w-full text-xs resize-none`}
              />
            </div>
          </div>

          {/* Reserva de stock + adelanto (solo crear; el backend los procesa en el POST) */}
          {mode === 'create' && (
            <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-green-800">🔖 Reserva y adelanto (opcional)</h2>

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={reservarStock} onChange={e => setReservarStock(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span>
                  <span className="font-medium text-gray-800">Reservar stock para el cliente</span>
                  <span className="block text-xs text-gray-500">
                    Aparta las unidades del catálogo (no se pueden vender a otros). Se libera sola si la cotización vence sin adelanto; con adelanto la liberación es manual.
                  </span>
                </span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Adelanto del cliente (S/)</label>
                <input
                  type="number" min={0} step="0.01" value={adelantoMonto}
                  onChange={e => setAdelantoMonto(e.target.value)}
                  placeholder="0.00"
                  disabled={!cajaActiva}
                  className={`${INPUT_STD} w-full text-xs ring-blue-400 disabled:opacity-50`}
                />
                {cajaChecked && !cajaActiva && (
                  <p className="mt-1 text-[11px] text-amber-600">⚠ Necesitas una caja abierta para registrar un adelanto (se registra como ADELANTO_COTIZACION).</p>
                )}
                {cajaActiva && (
                  <p className="mt-1 text-[11px] text-gray-400">Se registrará como ingreso ADELANTO_COTIZACION en tu caja abierta.</p>
                )}
              </div>
            </div>
          )}
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

      {/* ─── NAVIGATION ─────────────────────────────────────────────────────
           Pegada abajo: en el paso de items la lista crece y el botón quedaba
           a un scroll largo del final. */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-2px_10px_rgba(9,20,38,.05)] backdrop-blur">
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
        <VarianteSelector producto={variantePicker} sedeId={sedeId} accent="#004A94" cantidadesEnCarrito={cantidadesPorVariante}
          onClose={() => setVariantePicker(null)}
          onConfirm={(v, c) => { void addVarianteItem(variantePicker, v, c); }} />
      )}

      {/* Autorización para habilitar descuentos (paridad VR, operacion APLICAR_DESCUENTO) */}
      <AutorizacionDialog
        isOpen={authDescuentoOpen}
        operacion="APLICAR_DESCUENTO"
        titulo="Autorizar descuentos"
        descripcion="Un administrador debe autorizar la aplicación de descuentos en esta cotización."
        onAuthorized={() => { setAuthDescuentoOpen(false); setDescuentoDesbloqueado(true); }}
        onClose={() => setAuthDescuentoOpen(false)}
      />
    </div>
  );
}
