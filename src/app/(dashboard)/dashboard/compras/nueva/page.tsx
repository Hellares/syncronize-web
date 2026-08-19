'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  // Maestro-detalle: que linea se esta editando a la derecha.
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  // La cabecera arranca abierta y se pliega sola cuando ya esta completa: al
  // cargar 20 lineas esos campos no se vuelven a tocar y solo roban altura.
  const [cabeceraAbierta, setCabeceraAbierta] = useState(true);
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
    setSeleccionada(idx);
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
    setSeleccionada(idx);
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

  const agregarManual = () => {
    setSeleccionada(lineas.length);
    setLineas((l) => [...l, { descripcion: '', cantidad: '1', precioUnitario: '' }]);
  };
  const actualizar = (i: number, campo: keyof LineaForm, valor: string) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  const quitar = (i: number) => {
    setLineas((l) => l.filter((_, idx) => idx !== i));
    // Sin esto la seleccion queda apuntando a otra linea (o a ninguna) y el
    // detalle muestra la que no es.
    setSeleccionada((sel) => {
      if (sel == null) return null;
      if (sel === i) return null;
      return sel > i ? sel - 1 : sel;
    });
  };

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

  /** Margen con el que quedaria vendiendose DESPUES de esta compra. */
  const margenProyectadoPct = (l: LineaForm): number | null => {
    const costo = costoProyectado(l);
    const venta = precioVentaEfectivo(l);
    if (costo == null || costo <= 0 || venta == null || venta <= 0) return null;
    return ((venta - costo) / costo) * 100;
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

  const lineaSel = seleccionada != null ? lineas[seleccionada] : undefined;
  const proveedorNombre = proveedores.find((p) => p.id === proveedorId)?.nombre;
  const docTexto = [serie.trim(), numero.trim()].filter(Boolean).join('-');

  /** Estado de una linea: es lo que hace navegable la lista de la izquierda. */
  const estadoLinea = (l: LineaForm): { txt: string; color: string; borde: string } => {
    if (!l.descripcion.trim()) return { txt: 'SIN NOMBRE', color: 'text-gray-400', borde: 'border-l-gray-200' };
    if (sinCosto(l)) return { txt: 'SIN COSTO', color: 'text-amber-600', borde: 'border-l-amber-400' };
    if (superaPrecioVenta(l)) return { txt: 'BAJO COSTO', color: 'text-red-600', borde: 'border-l-red-500' };
    if (cantidadNoRepresentable(l)) return { txt: 'CANTIDAD', color: 'text-amber-600', borde: 'border-l-amber-400' };
    return { txt: 'OK', color: 'text-green-600', borde: 'border-l-green-500' };
  };

  return (
    <div className="p-4 md:p-6">
      {/* Barra superior: identidad de la compra, el total y la accion */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href="/dashboard/compras" className="shrink-0 text-xs text-[#437EFF]">← Compras</Link>
          <h1 className="shrink-0 text-lg font-semibold text-[#004A94]">Nueva compra</h1>
          <button
            onClick={() => setCabeceraAbierta((x) => !x)}
            className="flex min-w-0 items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-[#004A94] hover:bg-blue-100">
            <span className="truncate">{proveedorNombre ?? 'Elegí un proveedor'}{docTexto ? ` · ${docTexto}` : ''}</span>
            <span className="text-[#437EFF]">{cabeceraAbierta ? '▲' : '▼'}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total</p>
            <p className="text-xl font-bold leading-tight text-[#004A94]">{sim(moneda)} {total.toFixed(2)}</p>
          </div>
          <button onClick={guardar} disabled={guardando}
            className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
            {guardando ? 'Creando…' : 'Crear compra'}
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Cabecera plegable: se llena una vez y despues solo roba altura */}
      {cabeceraAbierta && (
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
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[450px_minmax(0,1fr)]">

        {/* MAESTRO */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="relative border-b border-gray-100 p-3">
            <input
              className={INPUT_STD}
              placeholder="Buscar producto para agregar…"
              value={q}
              onChange={(e) => { setQ(e.target.value); buscarProductos(e.target.value); }}
            />
            {(buscando || resultados.length > 0) && q.trim().length >= 2 && (
              <div className="absolute left-3 right-3 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {buscando && <div className="px-3 py-2 text-xs text-gray-400">Buscando…</div>}
                {!buscando && resultados.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>}
                {resultados.map((p) => (
                  <button key={p.id} onClick={() => agregarProducto(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                    <span className="font-mono text-[10px] text-gray-400">{p.codigoEmpresa}</span>
                    <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                    {p.tieneVariantes && (p.variantes?.length ?? 0) > 0 && (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#004A94]">
                        {particionarVariantes(p).comprables.length} {seCompraPorBulto(p) ? 'bultos' : 'variantes'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {lineas.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-gray-400">Buscá un producto para empezar la compra</p>
          )}

          {lineas.map((l, i) => {
            const est = estadoLinea(l);
            const activa = seleccionada === i;
            return (
              <button key={i} onClick={() => setSeleccionada(i)}
                className={`flex w-full items-center gap-3 border-b border-l-[3px] border-b-gray-50 px-3 py-2.5 text-left transition-colors ${est.borde} ${activa ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900">{l.descripcion || 'Línea nueva'}</p>
                  <p className="mt-0.5 truncate text-[10px] text-gray-500">
                    {numVal(l.cantidad) || 0}{l.simboloPres ? ` ${l.simboloPres}` : ''} × {sinCosto(l) ? '—' : `${sim(moneda)} ${numVal(l.precioUnitario).toFixed(2)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-gray-900">
                    {sinCosto(l) ? '—' : `${sim(moneda)} ${(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}`}
                  </p>
                  <p className={`mt-0.5 text-[9px] font-bold ${est.color}`}>{est.txt}</p>
                </div>
              </button>
            );
          })}

          <div className="p-3">
            <button onClick={agregarManual} className="text-xs font-semibold text-[#437EFF] hover:underline">+ Agregar línea manual</button>
          </div>
        </div>

        {/* DETALLE */}
        {lineaSel == null || seleccionada == null ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 p-8">
            <p className="max-w-xs text-center text-xs text-gray-400">
              Elegí una línea de la izquierda para editar su cantidad, su costo y el precio de venta que deja.
            </p>
          </div>
        ) : (() => {
          const l = lineaSel;
          const i = seleccionada;
          const conEmpaque = !!(l.unidadCompraNombre && l.factorProducto);
          const factorVigente = numVal(l.factor ?? '') || l.factorProducto || 0;
          const costoUnit = costoUnitarioVenta(l);
          const proy = costoProyectado(l);
          const margenAnt = margenActualPct(l);
          const margenProy = margenProyectadoPct(l);
          const mantener = sugerenciaMantenerMargen(l);
          const mas10 = sugerenciaMas10(l);
          const ultimoCosto = l.historial?.ultimoCosto ?? null;
          const variacion = costoUnit != null && ultimoCosto != null && Number(ultimoCosto) > 0
            ? ((costoUnit - Number(ultimoCosto)) / Number(ultimoCosto)) * 100 : null;
          const saltoCosto = proy != null && l.costoActual != null && l.costoActual > 0
            ? ((proy - l.costoActual) / l.costoActual) * 100 : null;

          return (
            <div className="flex flex-col gap-3">

              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <input
                      className={`${INPUT_STD} h-[34px] text-sm font-semibold`}
                      value={l.descripcion}
                      onChange={(e) => actualizar(i, 'descripcion', e.target.value)}
                      placeholder="Descripción de la línea" />
                    {l.varianteId && (
                      <p className="mt-1.5">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#004A94]">VARIANTE</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total de la línea</p>
                    <p className="text-xl font-bold text-[#004A94]">
                      {sinCosto(l)
                        ? <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-700">falta el costo</span>
                        : `${sim(moneda)} ${(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={LABEL}>Cantidad</label>
                    <input type="text" inputMode="decimal" className={`${INPUT_STD} text-right`}
                      value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', e.target.value)} />
                    <p className="mt-1 text-[10px] font-semibold text-[#004A94]">
                      {l.simboloPres ?? (conEmpaque && l.usaUnidadCompra ? l.unidadCompraNombre : 'unidades')}
                    </p>
                  </div>
                  <div>
                    <label className={LABEL}>Costo unitario</label>
                    <input type="text" inputMode="decimal" className={`${INPUT_STD} text-right`} placeholder="0.00"
                      value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', e.target.value)} />
                    <p className="mt-1 text-[10px] text-gray-400">
                      {sim(moneda)} por {l.simboloPres ?? (conEmpaque && l.usaUnidadCompra ? l.unidadCompraNombre : 'unidad')}
                    </p>
                  </div>
                  {conEmpaque && (
                    <div>
                      <label className={LABEL}>Empaque</label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <input type="checkbox" checked={!!l.usaUnidadCompra} className="accent-[#004A94]"
                            onChange={(e) => setLineas(ls => ls.map((x, idx) => idx === i ? { ...x, usaUnidadCompra: e.target.checked } : x))} />
                          {l.unidadCompraNombre}
                        </label>
                        {l.usaUnidadCompra && (
                          <input type="text" inputMode="decimal" className={`${INPUT_STD} w-16 px-2 text-right`}
                            value={l.factor ?? ''} onChange={(e) => actualizar(i, 'factor', e.target.value)} />
                        )}
                      </div>
                      {l.usaUnidadCompra && factorVigente > 0 && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          {numVal(l.cantidad) || 0} × {factorVigente} = {((numVal(l.cantidad) || 0) * factorVigente).toLocaleString('es-PE')} {l.unidadBaseNombre}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {l.productoId && (l.costoActual != null || l.precioVentaActual != null || proy != null) && (
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Qué le pasa al producto con esta compra</p>
                  <div className="grid gap-3 lg:grid-cols-3">

                    <div className="rounded-lg border border-gray-100 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Costo</p>
                      <p className="mt-2 flex items-baseline gap-2">
                        {l.costoActual != null && l.costoActual > 0 && (
                          <span className="text-xs text-gray-400 line-through">{sim(moneda)} {l.costoActual.toFixed(2)}</span>
                        )}
                        <span className="text-lg font-bold text-[#004A94]">
                          {proy != null ? `${sim(moneda)} ${proy.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}` : '—'}
                        </span>
                      </p>
                      {saltoCosto != null && Math.abs(saltoCosto) >= 0.5 && (
                        <p className={`mt-1 text-[11px] font-bold ${saltoCosto > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {saltoCosto > 0 ? '▲' : '▼'} {Math.abs(saltoCosto).toFixed(1)}% sobre el actual
                        </p>
                      )}
                      <p className="mt-1.5 text-[10px] leading-snug text-gray-400">
                        {l.stockActual != null && l.stockActual > 0
                          ? `Promedio ponderado entre ${l.stockActual.toLocaleString('es-PE')} que ya hay y lo que entra.`
                          : 'Sin stock previo: el costo es el de esta compra.'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Margen</p>
                      <p className="mt-2 flex items-baseline gap-2">
                        {margenAnt != null && <span className="text-xs text-gray-400 line-through">{margenAnt.toFixed(0)}%</span>}
                        <span className={`text-lg font-bold ${margenProy == null ? 'text-gray-400' : margenProy < 0 ? 'text-red-600' : margenProy < 10 ? 'text-orange-600' : 'text-green-700'}`}>
                          {margenProy != null ? `${margenProy.toFixed(0)}%` : '—'}
                        </span>
                      </p>
                      {margenAnt != null && margenProy != null && Math.abs(margenProy - margenAnt) >= 0.5 && (
                        <p className={`mt-1 text-[11px] font-bold ${margenProy < margenAnt ? 'text-orange-600' : 'text-green-700'}`}>
                          {margenProy < margenAnt ? 'se achica' : 'sube'} {Math.abs(margenProy - margenAnt).toFixed(0)} puntos
                        </p>
                      )}
                      <p className="mt-1.5 text-[10px] leading-snug text-gray-400">
                        {l.precioVentaActual != null && l.precioVentaActual > 0
                          ? `Vendiéndose a ${sim(moneda)} ${(l.precioVentaActual * factorPresentacion(l)).toFixed(2)}${l.simboloPres ? `/${l.simboloPres}` : ''}.`
                          : 'Este producto todavía no tiene precio de venta en la sede.'}
                      </p>
                    </div>

                    <div className={`rounded-lg border p-3 ${superaPrecioVenta(l) ? 'border-red-200 bg-red-50/50' : 'border-blue-200 bg-white'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#004A94]">Nuevo precio de venta</p>
                      <input type="text" inputMode="decimal" placeholder="—"
                        value={l.nuevoPrecioVenta ?? ''}
                        onChange={(e) => actualizar(i, 'nuevoPrecioVenta', e.target.value)}
                        className={`${INPUT_STD} mt-2 h-[36px] text-right text-base font-bold`} />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mantener != null && (
                          <button type="button" onClick={() => actualizar(i, 'nuevoPrecioVenta', String(mantener))}
                            className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-[#004A94] hover:bg-blue-100">
                            mantener {margenAnt != null ? `${margenAnt.toFixed(0)}%` : ''} → {sim(moneda)} {mantener.toFixed(2)}
                          </button>
                        )}
                        {mas10 != null && (
                          <button type="button" onClick={() => actualizar(i, 'nuevoPrecioVenta', String(mas10))}
                            className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-[#004A94] hover:bg-blue-100">
                            +10% → {sim(moneda)} {mas10.toFixed(2)}
                          </button>
                        )}
                      </div>
                      {superaPrecioVenta(l) ? (
                        <p className="mt-2 text-[10px] font-semibold leading-snug text-red-700">
                          ⛔ El costo que deja esta compra supera el precio de venta. No se puede guardar así.
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] leading-snug text-gray-400">
                          Se aplica al confirmar y queda en el historial de precios.
                        </p>
                      )}
                    </div>
                  </div>

                  {(ultimoCosto != null || variacion != null) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                      {ultimoCosto != null && (
                        <span>Último costo: <strong className="text-gray-700">{sim(moneda)} {Number(ultimoCosto).toFixed(2)}</strong>
                          {l.historial?.compras[0]?.proveedor ? ` (${l.historial.compras[0].proveedor})` : ''}</span>
                      )}
                      {variacion != null && Math.abs(variacion) >= 0.5 && (
                        <span className={`rounded px-1.5 py-0.5 font-bold ${variacion > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                          {variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(1)}% vs último costo
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(l.historial?.compras.length ?? 0) > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Últimas compras de este producto</p>
                    <span className="text-[11px] text-gray-400">{l.historial!.compras.length}</span>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      {l.historial!.compras.slice(0, 6).map((h, hi) => (
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
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">Por proveedor</p>
                      {l.historial!.proveedores.slice(0, 5).map((pv, pi) => (
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

              <div className="flex justify-end">
                <button onClick={() => quitar(i)} className="text-xs font-semibold text-red-500 hover:underline">Quitar esta línea</button>
              </div>
            </div>
          );
        })()}
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

      <p className="mt-3 text-right text-xs text-gray-400">Se crea en BORRADOR. Luego confirmás (con o sin pago) desde el detalle.</p>
    </div>
  );
}
