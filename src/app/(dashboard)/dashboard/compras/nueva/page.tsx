'use client';

import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Proveedor } from '@/core/types/proveedor';
import type { CrearCompraLinea, HistorialComprasProducto } from '@/core/types/compra';
import { TIPOS_DOC_PROVEEDOR } from '@/core/types/compra';
import { getStockByProductoSede } from '@/features/stock/services/stock-service';
import { listarProveedores } from '@/features/proveedores/services/proveedor-service';
import { crearCompra, getHistorialComprasProducto } from '@/features/compras/services/compra-service';
import { getProductos } from '@/features/producto/services/producto-service';
import type { Producto, ProductoVariante } from '@/core/types/producto';
import SelectorVariantesCompra from '@/features/compras/components/SelectorVariantesCompra';
import { particionarVariantes, presentacionDeVariante, seCompraPorBulto, stockDeVarianteEnSede } from '@/features/compras/utils/variantes-comprables';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus),
// el mismo de `servicios/nueva` y `CotizacionForm`. El ring va BAKED porque
// este formulario no marca error por campo: el error es un banner arriba.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const TERMINOS = ['CONTADO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45', 'CREDITO_60', 'CREDITO_90', 'PERSONALIZADO'];

type LineaForm = {
  productoId?: string;
  /** Variante concreta que se compra. Sin esto la compra se cuelga del producto
   *  PADRE, y en un producto con variantes el stock vive en las filas de
   *  variante: quedaria un residual que no corresponde a nada vendible. */
  varianteId?: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  // Empaque variable (solo productos con unidad de compra configurada)
  unidadCompraNombre?: string;
  unidadBaseNombre?: string;
  factorProducto?: number;      // factor configurado en el producto
  usaUnidadCompra?: boolean;    // toggle "Comprar por {unidadCompra}"
  factor?: string;              // override editable por línea (default = factorProducto)
  nuevoPrecioVenta?: string;    // ajustar precio de venta al confirmar
  // Contexto (no viaja al backend): hint de costo + historial de compras
  /** Presentacion de la variante: la cantidad y el precio se ESCRIBEN en esta
   *  unidad (kg) y se convierten a la atomica (g) al guardar. Sin esto, S/11
   *  el kilo viajaria como S/11 el GRAMO. */
  factorPres?: number;
  simboloPres?: string;
  costoActual?: number | null;
  precioVentaActual?: number | null;
  /** Stock que YA hay en la sede, en unidad atomica. Sin esto no se puede
   *  proyectar el promedio ponderado. */
  stockActual?: number | null;
  historial?: HistorialComprasProducto | null;
  historialAbierto?: boolean;
};

export default function NuevaCompraPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [terminosPago, setTerminosPago] = useState('CONTADO');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipoDoc, setTipoDoc] = useState('FACTURA');
  const [serie, setSerie] = useState('');
  const [numero, setNumero] = useState('');
  const [diasCredito, setDiasCredito] = useState('');
  const [observaciones, setObservaciones] = useState('');
  // Los precios de las líneas YA incluyen IGV (default backend true: se EXTRAE, no se suma)
  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(true);
  // Cantidad/precio se editan como TEXTO (para permitir decimales y campo vacío);
  // se convierten a número al guardar.
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda de producto
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  // Producto con variantes esperando que se elija cual se compra.
  const [productoVariantes, setProductoVariantes] = useState<Producto | null>(null);
  const [buscando, setBuscando] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listarProveedores().then(setProveedores).catch(() => setProveedores([]));
  }, []);
  useEffect(() => {
    if (sedes.length && !sedeId) setSedeId(sedes[0].id);
  }, [sedes, sedeId]);

  const buscarProductos = useCallback((texto: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (texto.trim().length < 2) { setResultados([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await getProductos({ page: 1, limit: 12, search: texto.trim(), isActive: true } as never);
        setResultados(res.data ?? []);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 300);
  }, []);

  const agregarProducto = async (p: Producto) => {
    // Con variantes NO se compra el padre: hay que elegir cual. Se abre el
    // selector y el buscador se limpia, como hace la grilla del app.
    if (p.tieneVariantes && (p.variantes?.length ?? 0) > 0) {
      setProductoVariantes(p);
      setQ(''); setResultados([]);
      return;
    }
    const factor = p.factorCompra != null ? Number(p.factorCompra) : undefined;
    const conEmpaque = !!(p.unidadCompra && factor && factor > 0);
    const idx = lineas.length;
    setLineas((l) => [...l, {
      productoId: p.id,
      descripcion: p.nombre,
      cantidad: '1',
      precioUnitario: '',
      // Empaque variable disponible solo si el producto tiene unidad de compra + factor
      ...(conEmpaque ? {
        unidadCompraNombre: p.unidadCompra!.nombre,
        unidadBaseNombre: p.unidadMedida?.nombre ?? 'unid.',
        factorProducto: factor,
        usaUnidadCompra: true,
        factor: String(factor),
      } : {}),
    }]);
    setQ(''); setResultados([]);

    // Contexto asíncrono: costo actual en sede (precio default, paridad Flutter) + última compra
    if (sedeId) {
      getStockByProductoSede(p.id, sedeId)
        .then(stock => {
          const costo = stock?.precioCosto != null ? Number(stock.precioCosto) : null;
          const pv = stock?.precio != null ? Number(stock.precio) : null;
          setLineas(ls => ls.map((x, i2) => {
            if (i2 !== idx || x.productoId !== p.id) return x;
            // Default = costo actual: en unidad de compra si aplica empaque (costo × factor)
            const base = costo != null && costo > 0
              ? (x.usaUnidadCompra && x.factorProducto ? costo * x.factorProducto : costo)
              : null;
            return {
              ...x,
              costoActual: costo,
              precioVentaActual: pv,
              stockActual: stock?.stockActual != null ? Number(stock.stockActual) : null,
              ...(base != null && !x.precioUnitario ? { precioUnitario: base.toFixed(2) } : {}),
            };
          }));
        })
        .catch(() => {});
    }
    getHistorialComprasProducto(p.id, { limit: 10 })
      .then(hist => {
        setLineas(ls => ls.map((x, i2) => i2 === idx && x.productoId === p.id ? { ...x, historial: hist } : x));
      })
      .catch(() => {});
  };
  /**
   * Alta de una linea a partir de una VARIANTE elegida en el selector.
   *
   * 🔴 El costo sale de la variante y NO de `getStockByProductoSede`: en un
   * producto con variantes el costo del padre viene MEZCLADO del backend (la
   * ultima variante con precio configurado le pisa el valor), asi que cargaria
   * la compra al costo de otra variante sin ningun sintoma. El de la fila de la
   * variante si es exacto, y ya viene en la respuesta del buscador: no hace
   * falta ningun request.
   */
  const agregarVariante = (p: Producto, v: ProductoVariante) => {
    const info = stockDeVarianteEnSede(v, sedeId);
    const costo = info?.precioCosto != null ? Number(info.precioCosto) : null;
    const pres = presentacionDeVariante(p, v);
    // El precio se escribe en la unidad en la que se habla: un granel suelto se
    // compra en KILOS aunque el stock se guarde en gramos.
    const costoMostrado = costo != null && costo > 0
      ? costo * (pres.factor > 1 ? pres.factor : 1)
      : null;
    const idx = lineas.length;
    setLineas((l) => [...l, {
      productoId: p.id,
      varianteId: v.id,
      descripcion: `${p.nombre} - ${v.nombre}`,
      cantidad: '1',
      precioUnitario: costoMostrado != null ? costoMostrado.toFixed(2) : '',
      ...(pres.factor > 1 ? { factorPres: pres.factor, simboloPres: pres.simbolo } : {}),
      costoActual: costo,
      precioVentaActual: info?.precio != null ? Number(info.precio) : null,
      stockActual: info?.cantidad != null ? Number(info.cantidad) : null,
    }]);
    // El historial se pide POR VARIANTE: el del producto mezclaria hermanas.
    getHistorialComprasProducto(p.id, { varianteId: v.id, limit: 10 })
      .then(hist => {
        setLineas(ls => ls.map((x, i2) => i2 === idx && x.varianteId === v.id ? { ...x, historial: hist } : x));
      })
      .catch(() => {});
  };

  const agregarManual = () => setLineas((l) => [...l, { descripcion: '', cantidad: '1', precioUnitario: '' }]);
  const actualizar = (i: number, campo: keyof LineaForm, valor: string) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  const quitar = (i: number) => setLineas((l) => l.filter((_, idx) => idx !== i));

  const numVal = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

  /** Factor de EMPAQUE vigente de la linea (1 = no aplica). */
  const factorEmpaque = (l: LineaForm) =>
    l.usaUnidadCompra && l.factorProducto ? (numVal(l.factor ?? '') || l.factorProducto) : 1;
  /** Factor de PRESENTACION de la linea (1 = no aplica). */
  const factorPresentacion = (l: LineaForm) =>
    l.factorPres && l.factorPres > 1 ? l.factorPres : 1;

  /**
   * Costo por unidad de VENTA de la linea.
   *
   * Vive suelto porque lo usan el aviso de "supera el precio de venta" y la
   * guarda que impide guardar: si cada uno lo calculara por su cuenta podrian
   * discrepar, y el usuario veria un aviso que no bloquea o un bloqueo sin
   * aviso.
   */
  const costoUnitarioVenta = (l: LineaForm): number | null => {
    const precio = numVal(l.precioUnitario);
    if (precio <= 0) return null;
    return precio / (factorEmpaque(l) * factorPresentacion(l));
  };
  /** Cantidad de la linea en unidad ATOMICA, que es como se guarda el stock. */
  const cantidadAtomica = (l: LineaForm) =>
    numVal(l.cantidad) * factorEmpaque(l) * factorPresentacion(l);

  /**
   * Costo del producto DESPUES de recibir esta linea: promedio ponderado entre
   * lo que ya hay en la sede y lo que entra. El backend hace la misma cuenta al
   * confirmar; esto es el preview que deja decidir el precio de venta nuevo.
   *
   * 🔴 Es ESTE —y no el precio de la linea— el que hay que comparar contra la
   * venta: comprar caro 2 unidades cuando ya hay 500 baratas casi no mueve el
   * costo, y bloquear por el precio de la linea seria una falsa alarma. Al
   * reves, un lote grande y caro hunde el margen aunque la linea sola parezca
   * sana.
   */
  const costoProyectado = (l: LineaForm): number | null => {
    const precioNuevo = costoUnitarioVenta(l);
    const cantNueva = cantidadAtomica(l);
    if (precioNuevo == null || precioNuevo <= 0 || cantNueva <= 0) return l.costoActual ?? null;
    const stockPrev = l.stockActual ?? 0;
    const costoPrev = l.costoActual ?? 0;
    // Sin stock previo no hay nada que promediar: el costo es el que entra.
    if (stockPrev <= 0 || costoPrev <= 0) return precioNuevo;
    const ponderado = (stockPrev * costoPrev + cantNueva * precioNuevo) / (stockPrev + cantNueva);
    return Math.round(ponderado * 1e4) / 1e4;
  };

  /** Margen con el que se vende HOY, para poder sostenerlo sobre el costo nuevo. */
  const margenActualPct = (l: LineaForm): number | null => {
    const precio = l.precioVentaActual;
    const costo = l.costoActual;
    if (precio == null || costo == null || costo <= 0) return null;
    return ((precio - costo) / costo) * 100;
  };

  /**
   * A cuanto quedaria vendiendose tras esta compra, por unidad de VENTA.
   *
   * 🔑 Toma en cuenta el precio nuevo que el usuario acaba de escribir. Sin
   * esto, la guarda bloquea y escribir el precio nuevo NO la libera: el
   * formulario queda sin salida justo en el caso para el que existe.
   */
  const precioVentaEfectivo = (l: LineaForm): number | null => {
    const nuevo = numVal(l.nuevoPrecioVenta ?? '');
    if (nuevo > 0) return nuevo / factorPresentacion(l);
    return l.precioVentaActual ?? null;
  };

  /** 🔴 Se venderia con PERDIDA: el costo que DEJA esta compra supera la venta. */
  const superaPrecioVenta = (l: LineaForm): boolean => {
    if (costoUnitarioVenta(l) == null) return false; // todavia sin precio de compra
    const costo = costoProyectado(l);
    const venta = precioVentaEfectivo(l);
    if (costo == null || venta == null || venta <= 0) return false;
    return costo > venta;
  };

  /** Sugerencia: el precio que MANTIENE el margen actual sobre el costo nuevo. */
  const sugerenciaMantenerMargen = (l: LineaForm): number | null => {
    const margen = margenActualPct(l);
    const costoNuevo = costoProyectado(l);
    if (margen == null || costoNuevo == null) return null;
    // En la unidad en la que se ESCRIBE el campo (presentacion).
    return Math.round(costoNuevo * (1 + margen / 100) * factorPresentacion(l) * 100) / 100;
  };

  /** Sugerencia: costo nuevo + 10%. Siempre cubre el costo, a diferencia de
   *  basarse en la venta vieja, que ante un salto de costo queda por debajo. */
  const sugerenciaMas10 = (l: LineaForm): number | null => {
    const costoNuevo = costoProyectado(l);
    if (costoNuevo == null || costoNuevo <= 0) return null;
    return Math.round(costoNuevo * 1.1 * factorPresentacion(l) * 100) / 100;
  };
  /** Cantidad fraccionaria que NINGUN factor puede aplanar a entero. */
  const cantidadNoRepresentable = (l: LineaForm): boolean => {
    const cant = numVal(l.cantidad);
    if (Number.isInteger(cant)) return false;
    return !Number.isInteger(Math.round(cant * factorEmpaque(l) * factorPresentacion(l) * 1e6) / 1e6);
  };
  const lineasCargadas = () => lineas.filter((l) => l.descripcion.trim() && numVal(l.cantidad) > 0);
  const sinCosto = (l: LineaForm) => numVal(l.precioUnitario) <= 0;
  const total = lineas.reduce((s, l) => s + numVal(l.cantidad) * numVal(l.precioUnitario), 0);

  const guardar = async () => {
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (!sedeId) return setError('Seleccioná una sede');

    const cargadas = lineasCargadas();
    if (cargadas.length === 0) return setError('Agregá al menos un producto/línea con cantidad');

    const nombres = (ls: LineaForm[]) =>
      ls.map((l) => l.descripcion.trim() || '(sin descripción)').join(', ');

    // (3) Sin costo NO es costo cero: guardar asi registra la compra a S/0 y
    // el promedio ponderado del producto se desploma sin que nadie lo note.
    const faltaCosto = cargadas.filter(sinCosto);
    if (faltaCosto.length > 0) {
      return setError(`Falta el costo en ${faltaCosto.length} línea(s): ${nombres(faltaCosto)}`);
    }

    // (1) El backend valida la cantidad con @IsInt: una fraccion que ningun
    // factor pueda aplanar vuelve 400. Se avisa ACA, con el nombre de la
    // linea, en vez de truncarla en silencio (escribir 1.5 y guardar 1).
    const fraccion = cargadas.filter(cantidadNoRepresentable);
    if (fraccion.length > 0) {
      return setError(
        `La cantidad debe ser entera en ${fraccion.length} línea(s): ${nombres(fraccion)}. ` +
        'Para comprar fracciones, activá el empaque o usá una variante con presentación.',
      );
    }

    // (2) BLOQUEA, no avisa: guardar una linea cuyo costo supera el precio de
    // venta deja el producto vendiendose a perdida hasta que alguien mire el
    // cierre. Es el mismo criterio del app.
    const bajoCosto = cargadas.filter(superaPrecioVenta);
    if (bajoCosto.length > 0) {
      return setError(
        `El costo supera el precio de venta en ${bajoCosto.length} línea(s): ${nombres(bajoCosto)}. ` +
        'Ajustá el costo o cargá un nuevo precio de venta antes de guardar.',
      );
    }
    const detalles: CrearCompraLinea[] = cargadas.map((l) => {
        const fEmp = factorEmpaque(l);
        const cant = numVal(l.cantidad);
        // 🔴 Una cantidad fraccionaria en unidad de COMPRA se APLANA a unidad
        // atomica (1.5 sacos de 100 → 150 u a su costo equivalente) y viaja con
        // `usaUnidadCompra` apagado: es lo que la deja pasar el @IsInt.
        const aplana = fEmp > 1 && !Number.isInteger(cant);
        const usaEmpaque = fEmp > 1 && !aplana;
        const factorLinea = usaEmpaque ? fEmp : undefined;
        const nuevoPV = numVal(l.nuevoPrecioVenta ?? '');
        // 🔴 Presentacion → unidad ATOMICA, que es como se guarda el stock. La
        // cantidad se MULTIPLICA y el precio se DIVIDE: 15 kg a S/8.00 entran
        // como 15000 g a S/0.008. Va con 6 decimales porque a 2, S/6.7268/kg
        // quedaria en 0.01 el gramo — 48% de mas por cada gramo del saco.
        const fPres = factorPresentacion(l);
        // Lo que hay que aplanar: la presentacion siempre, el empaque solo si
        // la cantidad venia fraccionada.
        const fAplanado = fPres * (aplana ? fEmp : 1);
        const cantidadFinal = Math.round(cant * fAplanado);
        const precioFinal = fAplanado > 1
          ? round6(numVal(l.precioUnitario) / fAplanado)
          : numVal(l.precioUnitario);
        return {
          ...(l.productoId ? { productoId: l.productoId } : {}),
          ...(l.varianteId ? { varianteId: l.varianteId } : {}),
          descripcion: l.descripcion.trim(),
          // Con empaque: cantidad/precio van en unidad de COMPRA y el backend convierte con el factor
          cantidad: fAplanado > 1 ? cantidadFinal : Math.round(cant),
          precioUnitario: precioFinal,
          ...(usaEmpaque ? { usaUnidadCompra: true, factorCompra: factorLinea } : {}),
          // 🔴 Tambien por unidad de VENTA aunque el campo se escriba en
          // presentacion: sin dividir, S/9 el kilo se guarda como S/9 el GRAMO.
          ...(nuevoPV > 0
            ? { nuevoPrecioVenta: fPres > 1 ? round6(nuevoPV / fPres) : nuevoPV }
            : {}),
        };
      });
    if (detalles.length === 0) return setError('Agregá al menos un producto/línea con cantidad');
    setGuardando(true); setError(null);
    try {
      const compra = await crearCompra({
        sedeId, proveedorId, moneda, terminosPago, fechaRecepcion: fecha,
        ...(terminosPago === 'PERSONALIZADO' && parseInt(diasCredito) > 0 ? { diasCredito: parseInt(diasCredito) } : {}),
        tipoDocumentoProveedor: (serie.trim() || numero.trim()) ? tipoDoc : undefined,
        serieDocumentoProveedor: serie.trim() || undefined,
        numeroDocumentoProveedor: numero.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        precioIncluyeIgv,
        detalles,
      });
      router.push(`/dashboard/compras/${compra.id}`);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo crear la compra');
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/compras" className="text-xs text-[#437EFF]">← Volver a Compras</Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold text-[#004A94]">Nueva compra</h1>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Cabecera */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 md:grid-cols-3">
        <div>
          <label className={LABEL}>Proveedor *</label>
          <select className={INPUT_STD} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Sede *</label>
          <select className={INPUT_STD} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Términos de pago</label>
          <select className={INPUT_STD} value={terminosPago} onChange={(e) => setTerminosPago(e.target.value)}>
            {TERMINOS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Moneda</label>
          <select className={INPUT_STD} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            <option value="PEN">PEN (S/)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Fecha</label>
          <input type="date" className={INPUT_STD} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={LABEL}>Doc. proveedor</label>
            <select className={INPUT_STD} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
              {TIPOS_DOC_PROVEEDOR.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Serie</label>
            <input className={INPUT_STD} value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="F001" />
          </div>
          <div>
            <label className={LABEL}>N°</label>
            <input className={INPUT_STD} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="00012" />
          </div>
        </div>
        {terminosPago === 'PERSONALIZADO' && (
          <div>
            <label className={LABEL}>Días de crédito *</label>
            <input className={INPUT_STD} type="number" min="1" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value)} placeholder="Ej: 20" />
          </div>
        )}
        <div className="md:col-span-2">
          <label className={LABEL}>Observaciones</label>
          <input className={INPUT_STD} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
        </div>
        <label className="flex items-start gap-2 self-end pb-1 text-sm">
          <input type="checkbox" checked={precioIncluyeIgv} onChange={(e) => setPrecioIncluyeIgv(e.target.checked)}
            className="mt-0.5 accent-[#004A94]" />
          <span>
            <span className="font-medium text-gray-800">Precios YA incluyen IGV</span>
            <span className="block text-[10px] text-gray-500">Si lo desmarcas, el IGV se SUMA sobre los precios de las líneas.</span>
          </span>
        </label>
      </div>

      {/* Buscador de producto */}
      <div className="relative mb-3">
        <input
          className={INPUT_STD}
          placeholder="Buscar producto para agregar…"
          value={q}
          onChange={(e) => { setQ(e.target.value); buscarProductos(e.target.value); }}
        />
        {(buscando || resultados.length > 0) && q.trim().length >= 2 && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {buscando && <div className="px-3 py-2 text-xs text-gray-400">Buscando…</div>}
            {!buscando && resultados.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>}
            {resultados.map((p) => (
              <button key={p.id} onClick={() => agregarProducto(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span className="font-mono text-xs text-gray-400">{p.codigoEmpresa}</span>
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                {/* Se avisa ANTES de tocar que hay un paso mas, y con cuantas se
                    compran de verdad (no las 28 que puede tener). */}
                {p.tieneVariantes && (p.variantes?.length ?? 0) > 0 && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#004A94]">
                    {seCompraPorBulto(p)
                      ? `${particionarVariantes(p).comprables.length} bultos`
                      : `${particionarVariantes(p).comprables.length} variantes`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <button onClick={agregarManual} className="mt-2 text-xs text-[#437EFF] hover:underline">+ Agregar línea manual</button>
      </div>

      {productoVariantes && (
        <SelectorVariantesCompra
          producto={productoVariantes}
          sedeId={sedeId}
          moneda={moneda}
          yaAgregadas={lineas.map((l) => l.varianteId).filter(Boolean) as string[]}
          onElegir={(v) => agregarVariante(productoVariantes, v)}
          onCerrar={() => setProductoVariantes(null)}
        />
      )}

      {/* Líneas */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-2 py-2 text-right">Cant.</th>
              <th className="px-2 py-2 text-right">P. Unit.</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineas.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">Buscá un producto o agregá una línea manual.</td></tr>
            ) : lineas.map((l, i) => {
              const conEmpaque = !!l.unidadCompraNombre && !!l.factorProducto;
              const factorVigente = numVal(l.factor ?? '') || l.factorProducto || 0;
              return (
              <Fragment key={i}>
              <tr>
                <td className="px-3 py-1.5">
                  <input className={`${INPUT_STD} text-xs`} value={l.descripcion} onChange={(e) => actualizar(i, 'descripcion', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="numeric" className={`${INPUT_STD} w-16 px-2 text-right`} value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', e.target.value)} />
                  {conEmpaque && l.usaUnidadCompra && <p className="text-center text-[9px] text-gray-400">{l.unidadCompraNombre}</p>}
                  {l.simboloPres && <p className="text-center text-[9px] font-semibold text-[#004A94]">{l.simboloPres}</p>}
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="decimal" placeholder="0.00" className={`${INPUT_STD} w-24 px-2 text-right`} value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', e.target.value)} />
                  {conEmpaque && l.usaUnidadCompra && <p className="text-center text-[9px] text-gray-400">por {l.unidadCompraNombre}</p>}
                  {l.simboloPres && <p className="text-center text-[9px] font-semibold text-[#004A94]">por {l.simboloPres}</p>}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {/* Sin costo NO se muestra 0.00: un cero se lee como "sale
                      gratis" y la linea se guarda sin que nadie la revise. */}
                  {sinCosto(l) && l.descripcion.trim()
                    ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">falta</span>
                    : <>{sim(moneda)} {(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}</>}
                </td>
                <td className="px-2 py-1.5 text-right"><button onClick={() => quitar(i)} className="text-xs text-red-500 hover:underline">Quitar</button></td>
              </tr>
              {(conEmpaque || l.productoId) && (
                <tr className="bg-gray-50/50">
                  <td colSpan={5} className="px-3 pb-2 pt-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                      {conEmpaque && (
                        <>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!l.usaUnidadCompra}
                              onChange={(e) => setLineas(ls => ls.map((x, idx) => idx === i ? { ...x, usaUnidadCompra: e.target.checked } : x))}
                              className="accent-[#004A94]" />
                            <span className="text-gray-600">Comprar por <strong>{l.unidadCompraNombre}</strong></span>
                          </label>
                          {l.usaUnidadCompra && (
                            <span className="flex items-center gap-1 text-gray-500">
                              1 {l.unidadCompraNombre} =
                              <input type="text" inputMode="decimal" value={l.factor ?? ''}
                                onChange={(e) => actualizar(i, 'factor', e.target.value)}
                                className={`${INPUT_STD} w-16 px-2 text-right`} />
                              {l.unidadBaseNombre}
                              {factorVigente !== l.factorProducto && (
                                <button onClick={() => actualizar(i, 'factor', String(l.factorProducto))}
                                  className="text-[10px] text-[#437EFF] hover:underline" title={`Restablecer a ${l.factorProducto}`}>↺</button>
                              )}
                              {factorVigente > 0 && numVal(l.cantidad) > 0 && (
                                <span className="text-gray-400">
                                  → {Math.trunc(numVal(l.cantidad)) * factorVigente} {l.unidadBaseNombre} a {sim(moneda)} {(numVal(l.precioUnitario) / factorVigente).toFixed(4)} c/u
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      )}
                      {l.productoId && (
                        <label className="flex items-center gap-1.5 text-gray-600">
                          Nuevo precio venta al confirmar:
                          <input type="text" inputMode="decimal" placeholder="—" value={l.nuevoPrecioVenta ?? ''}
                            onChange={(e) => actualizar(i, 'nuevoPrecioVenta', e.target.value)}
                            className={`${INPUT_STD} w-20 px-2 text-right`}
                            title="Opcional: actualiza el precio de venta del producto al confirmar la compra (queda en el historial de precios)" />
                          {l.simboloPres && <span className="text-[10px] text-gray-400">por {l.simboloPres}</span>}
                          {/* Sugerencias sobre el COSTO NUEVO, no sobre el viejo:
                              ante un salto de costo, un precio calculado sobre
                              el costo anterior queda por debajo. */}
                          {(() => {
                            const mantener = sugerenciaMantenerMargen(l);
                            const mas10 = sugerenciaMas10(l);
                            const margen = margenActualPct(l);
                            if (mantener == null && mas10 == null) return null;
                            return (
                              <>
                                {mantener != null && (
                                  <button type="button"
                                    onClick={() => actualizar(i, 'nuevoPrecioVenta', String(mantener))}
                                    title={margen != null ? `Mantiene el margen actual (${margen.toFixed(1)}%) sobre el costo nuevo` : undefined}
                                    className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#004A94] hover:bg-blue-100">
                                    margen {margen != null ? `${margen.toFixed(0)}%` : ''} → {sim(moneda)} {mantener.toFixed(2)}
                                  </button>
                                )}
                                {mas10 != null && (
                                  <button type="button"
                                    onClick={() => actualizar(i, 'nuevoPrecioVenta', String(mas10))}
                                    title="Costo nuevo + 10%: siempre cubre el costo"
                                    className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#004A94] hover:bg-blue-100">
                                    +10% → {sim(moneda)} {mas10.toFixed(2)}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </label>
                      )}
                    </div>
                    {/* Hints de costo + historial (paridad historial_compras_producto_panel Flutter) */}
                    {l.productoId && (l.costoActual != null || l.precioVentaActual != null || l.historial) && (() => {
                      // Los mismos helpers que usa la guarda de `guardar()`:
                      // si se calcularan aparte, el aviso y el bloqueo podrian
                      // discrepar.
                      const costoUnitNuevo = costoUnitarioVenta(l);
                      const superaPV = superaPrecioVenta(l);
                      const ultimoCosto = l.historial?.ultimoCosto ?? null;
                      const variacion = costoUnitNuevo != null && ultimoCosto != null && ultimoCosto > 0
                        ? ((costoUnitNuevo - ultimoCosto) / ultimoCosto) * 100 : null;
                      return (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-gray-400">
                          {l.costoActual != null && l.costoActual > 0 && <span>Costo actual: {sim(moneda)} {l.costoActual.toFixed(2)}</span>}
                          {(() => {
                            // El numero que decide el precio de venta nuevo: a
                            // cuanto queda el costo del producto DESPUES de
                            // recibir esta linea (promedio ponderado con lo que
                            // ya hay), no lo que se paga en esta compra.
                            const proy = costoProyectado(l);
                            if (proy == null || proy <= 0 || costoUnitNuevo == null) return null;
                            const prev = l.costoActual ?? 0;
                            const salto = prev > 0 ? ((proy - prev) / prev) * 100 : null;
                            return (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-[#004A94]">
                                Costo nuevo: {sim(moneda)} {proy.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}
                                {salto != null && Math.abs(salto) >= 0.5 && ` (${salto > 0 ? '▲' : '▼'}${Math.abs(salto).toFixed(1)}%)`}
                              </span>
                            );
                          })()}
                          {l.precioVentaActual != null && l.precioVentaActual > 0 && <span>Precio venta: {sim(moneda)} {l.precioVentaActual.toFixed(2)}</span>}
                          {ultimoCosto != null && (
                            <span>
                              Último costo: {sim(moneda)} {Number(ultimoCosto).toFixed(2)}
                              {l.historial!.compras[0]?.proveedor ? ` (${l.historial!.compras[0].proveedor})` : ''}
                            </span>
                          )}
                          {variacion != null && Math.abs(variacion) >= 0.5 && (
                            <span className={`rounded px-1.5 py-0.5 font-semibold ${variacion > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                              {variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(1)}% vs último costo
                            </span>
                          )}
                          {(l.historial?.compras.length ?? 0) > 0 && (
                            <button type="button" onClick={() => setLineas(ls => ls.map((x, i2) => i2 === i ? { ...x, historialAbierto: !x.historialAbierto } : x))}
                              className="font-semibold text-[#437EFF] hover:underline">
                              📊 {l.historialAbierto ? 'Ocultar historial' : `Historial (${l.historial!.compras.length})`}
                            </button>
                          )}
                          {superaPV && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">
                              ⛔ El costo ({sim(moneda)} {costoUnitNuevo!.toFixed(2)}/u) supera el precio de venta — no se puede guardar así
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {/* Panel expandible: últimas compras + agregado por proveedor + MEJOR proveedor */}
                    {l.historialAbierto && l.historial && (
                      <div className="mt-2 grid gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Últimas compras</p>
                          <div className="space-y-1">
                            {l.historial.compras.slice(0, 6).map((h, hi) => (
                              <div key={`${h.compraId}-${hi}`} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="min-w-0 truncate text-gray-600">
                                  {new Date(h.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} · {h.proveedor}
                                  <span className="ml-1 text-gray-400">
                                    ×{h.usaUnidadCompra && h.cantidadOriginal != null ? `${h.cantidadOriginal} ${h.unidadOriginalSimbolo ?? 'paq.'}` : h.cantidad}
                                  </span>
                                </span>
                                <span className="shrink-0 font-medium text-gray-800">{sim(h.moneda)} {Number(h.costoUnitario).toFixed(2)}/u</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Por proveedor</p>
                          <div className="space-y-1">
                            {l.historial.proveedores.slice(0, 5).map((pv, pi) => (
                              <div key={`${pv.proveedorId ?? pv.proveedor}-${pi}`} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="min-w-0 truncate text-gray-600">
                                  {pv.proveedor}
                                  {pv.proveedorId != null && pv.proveedorId === l.historial!.mejorProveedorId && (
                                    <span className="ml-1 rounded bg-green-100 px-1 text-[8px] font-bold text-green-700" title="Menor costo promedio">MEJOR</span>
                                  )}
                                  <span className="ml-1 text-gray-400">({pv.veces}×)</span>
                                </span>
                                <span className="shrink-0 text-gray-800">
                                  prom {sim(moneda)} {Number(pv.costoPromedio).toFixed(2)}
                                  {pv.ultimoCosto != null && <span className="text-gray-400"> · últ {Number(pv.ultimoCosto).toFixed(2)}</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4">
        <div className="text-sm">Total: <span className="text-lg font-bold text-[#004A94]">{sim(moneda)} {total.toFixed(2)}</span></div>
        <button onClick={guardar} disabled={guardando} className="rounded-lg bg-[#004A94] px-5 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
          {guardando ? 'Creando…' : 'Crear compra (borrador)'}
        </button>
      </div>
      <p className="mt-2 text-right text-xs text-gray-400">Se crea en BORRADOR. Luego confirmás (con o sin pago) desde el detalle.</p>
    </div>
  );
}
