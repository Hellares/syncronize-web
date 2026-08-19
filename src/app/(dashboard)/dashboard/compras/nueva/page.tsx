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
import { nombreUnidad, simboloUnidad } from '@/core/types/producto';
import SelectorVariantesCompra from '@/features/compras/components/SelectorVariantesCompra';
import { particionarVariantes, presentacionDeVariante, seCompraPorBulto, stockDeVarianteEnSede } from '@/features/compras/utils/variantes-comprables';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus),
// el mismo de `servicios/nueva` y `CotizacionForm`. El ring va BAKED porque
// este formulario no marca error por campo: el error es un banner arriba.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
/** Numero con separador de miles y sin ceros de relleno: 66 · 66.5 · 6.8182 */
const sinCeros = (n: number, maxDecimales: number) =>
  n.toLocaleString('es-PE', { maximumFractionDigits: maxDecimales });
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
  /** Simbolo corto de la unidad de VENTA (g, und): el que va en la
   *  equivalencia "entran 66000 g". El nombre largo se lee mal ahi. */
  unidadVentaSimbolo?: string;
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
        unidadCompraNombre: nombreUnidad(p.unidadCompra) ?? 'paquete',
        unidadBaseNombre: nombreUnidad(p.unidadMedida) ?? 'unid.',
        unidadVentaSimbolo: simboloUnidad(p.unidadMedida) ?? nombreUnidad(p.unidadMedida) ?? 'u',
        factorProducto: factor,
        usaUnidadCompra: true,
        factor: String(factor),
      } : {}),
      // Presentacion del PRODUCTO (RICOCAT: se vende en gramos y se habla en
      // kg). Sin esto la linea muestra el costo y el precio de venta por
      // GRAMO —S/ 0.0067— y pide la cantidad en gramos al apagar el empaque.
      ...(Number(p.factorPresentacion ?? 0) > 1 ? {
        factorPres: Number(p.factorPresentacion),
        simboloPres: p.unidadPresentacionSimbolo ?? undefined,
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
  /**
   * Factor de PRESENTACION de la linea (1 = no aplica).
   *
   * 🔴 Se apaga cuando el toggle de EMPAQUE esta prendido: los dos re-expresan
   * el mismo campo y solo puede haber uno. Comprando por SACO, la cantidad y el
   * precio se escriben por saco y los convierte el backend con el factorCompra;
   * aplicar ademas la presentacion los convertiria DOS veces.
   */
  const factorPresentacion = (l: LineaForm) =>
    !l.usaUnidadCompra && l.factorPres && l.factorPres > 1 ? l.factorPres : 1;

  /**
   * Factor de presentacion para MOSTRAR precios del producto (costo actual,
   * precio de venta, historial, sugerencias).
   *
   * 🔑 A diferencia de `factorPresentacion`, este NO se apaga con el empaque:
   * la presentacion es como se HABLA del producto (RICOCAT se habla en kg) y
   * el empaque es como se COMPRA esta vez (por saco). Comprar por saco no
   * cambia que su precio de venta se exprese por kilo.
   */
  const factorDisplay = (l: LineaForm) =>
    l.factorPres && l.factorPres > 1 ? l.factorPres : 1;

  /**
   * Elegir la unidad de carga NO toca los numeros: solo cambia que significan.
   *
   * Decision del user (19-08): los chips son un indicador de que hay que
   * escribir en cada campo, no una calculadora. Eligiendo SACO, en Cantidad van
   * 1/2/3 sacos y el empaque dice cuantos gramos trae cada uno.
   *
   * 🔑 Es seguro porque la equivalencia de abajo ("Entran 66 000 g @ ...")
   * muestra SIEMPRE lo que va a entrar al stock: si el numero quedo con el
   * significado viejo, se ve ahi antes de guardar.
   *
   * (El editor del app SI convierte, en su `_cambiarUnidad`. Aca se eligio lo
   * otro a proposito.)
   */
  const toggleEmpaque = (i: number, prendido: boolean) => {
    setLineas((ls) => ls.map((x, idx) => idx === i ? { ...x, usaUnidadCompra: prendido } : x));
  };

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
    if (nuevo > 0) return nuevo / factorDisplay(l);
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
    return Math.round(costoNuevo * (1 + margen / 100) * factorDisplay(l) * 100) / 100;
  };

  /** Sugerencia: costo nuevo + 10%. Siempre cubre el costo, a diferencia de
   *  basarse en la venta vieja, que ante un salto de costo queda por debajo. */
  const sugerenciaMas10 = (l: LineaForm): number | null => {
    const costoNuevo = costoProyectado(l);
    if (costoNuevo == null || costoNuevo <= 0) return null;
    return Math.round(costoNuevo * 1.1 * factorDisplay(l) * 100) / 100;
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
        const fDisp = factorDisplay(l);
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
            ? { nuevoPrecioVenta: fDisp > 1 ? round6(nuevoPV / fDisp) : nuevoPV }
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
                // La fila elegida se trae a la vista sola: con 20 lineas, la que
                // se acaba de agregar queda abajo y fuera de pantalla.
                ref={activa ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                className={`relative flex w-full items-center gap-3 border-b border-l-[3px] border-b-gray-50 py-2.5 pr-3 text-left transition-colors ${est.borde} ${
                  activa ? 'bg-blue-50 pl-4' : 'pl-3 hover:bg-gray-50'
                }`}>
                {/* Barra de seleccion: va a la DERECHA del borde de estado, que
                    ya usa el color para decir OK / sin costo / bajo costo. */}
                {activa && <span className="absolute inset-y-0 left-0 w-1 bg-[#004A94]" />}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${activa ? 'text-[#004A94]' : 'text-gray-900'}`}>
                    {l.descripcion || 'Línea nueva'}
                  </p>
                  <p className={`mt-0.5 truncate text-[10px] ${activa ? 'text-[#437EFF]' : 'text-gray-500'}`}>
                    {numVal(l.cantidad) || 0}{l.simboloPres ? ` ${l.simboloPres}` : ''} × {sinCosto(l) ? '—' : `${sim(moneda)} ${numVal(l.precioUnitario).toFixed(2)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-bold ${activa ? 'text-[#004A94]' : 'text-gray-900'}`}>
                    {sinCosto(l) ? '—' : `${sim(moneda)} ${(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}`}
                  </p>
                  <p className={`mt-0.5 text-[9px] font-bold ${est.color}`}>{est.txt}</p>
                </div>
                {/* La flecha dice cual esta abierta a la derecha, sin depender
                    solo del color de fondo. */}
                <span className={`shrink-0 text-sm leading-none ${activa ? 'text-[#004A94]' : 'text-transparent'}`}>›</span>
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
          // Todo lo de PRECIO se muestra en la unidad en la que se escribe: el
          // backend guarda por unidad de venta (gramo) y el usuario habla en kg.
          const fpres = factorDisplay(l);
          // En que unidad se estan escribiendo cantidad y costo AHORA mismo.
          const simboloCarga = l.usaUnidadCompra
            ? (l.unidadCompraNombre ?? 'unidad')
            : (l.simboloPres ?? l.unidadVentaSimbolo ?? 'unidades');
          // Lo que realmente entra al stock, en la unidad en la que se guarda.
          const entranAlStock = Math.round(cantidadAtomica(l));
          const costoAtomico = costoUnitarioVenta(l);
          // La equivalencia se muestra en la unidad en la que se HABLA del
          // producto (kg): "66 kg a S/ 6.8182" se lee, "66 000 g a S/ 0.006818"
          // hay que traducirlo mentalmente cada vez.
          const unidadEquiv = l.simboloPres ?? l.unidadVentaSimbolo;
          // Costo por EMPAQUE. Usa `factorVigente` y no `factorEmpaque()`,
          // que da 1 con el toggle apagado: comprando en kg tambien se quiere
          // saber a cuanto sale el saco, que es como lo cotiza el proveedor.
          const costoPorEmpaque = costoAtomico != null && conEmpaque && factorVigente > 1
            ? costoAtomico * factorVigente
            : null;
          const fmtMon = (n: number) => `${sim(moneda)} ${n.toFixed(2)}`;
          const costoActualMostrado = l.costoActual != null && l.costoActual > 0
            ? l.costoActual * fpres : null;
          const ventaActualMostrada = l.precioVentaActual != null && l.precioVentaActual > 0
            ? l.precioVentaActual * fpres : null;
          const ventaEscrita = numVal(l.nuevoPrecioVenta ?? '');
          const ventaNueva = ventaEscrita > 0 ? ventaEscrita : null;
          const deltaVenta = ventaNueva != null && ventaActualMostrada != null && ventaActualMostrada > 0
            ? ((ventaNueva - ventaActualMostrada) / ventaActualMostrada) * 100 : null;

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
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total de la línea</p>
                      <p className="text-xl font-bold text-[#004A94]">
                        {sinCosto(l)
                          ? <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-700">falta el costo</span>
                          : `${sim(moneda)} ${(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}`}
                      </p>
                    </div>
                    {/* Quitar la linea desde arriba: el boton del pie queda
                        lejos cuando el detalle trae historial. */}
                    <button type="button" onClick={() => quitar(i)}
                      title="Quitar esta línea de la compra"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* COMO ESTA HOY el producto en la sede: es lo primero que hay
                    que ver al elegirlo, antes de tocar nada. */}
                {l.productoId && (costoActualMostrado != null || ventaActualMostrada != null || l.stockActual != null) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Hoy</span>
                    <span className="text-[11px] text-gray-500">
                      Costo <strong className="text-sm text-gray-800">{costoActualMostrado != null ? fmtMon(costoActualMostrado) : '—'}</strong>
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Se vende a <strong className="text-sm text-gray-800">{ventaActualMostrada != null ? fmtMon(ventaActualMostrada) : 'sin precio'}</strong>
                      {l.simboloPres && ventaActualMostrada != null && <span className="text-[10px] text-gray-400">/{l.simboloPres}</span>}
                    </span>
                    {margenAnt != null && (
                      <span className="text-[11px] text-gray-500">
                        Margen <strong className={margenAnt < 10 ? 'text-sm text-orange-600' : 'text-sm text-green-700'}>{margenAnt.toFixed(0)}%</strong>
                      </span>
                    )}
                    {l.stockActual != null && (
                      <span className="text-[11px] text-gray-500">
                        Stock <strong className="text-sm text-gray-800">{(fpres > 1 ? l.stockActual / fpres : l.stockActual).toLocaleString('es-PE')}</strong>
                        <span className="text-[10px] text-gray-400"> {l.simboloPres ?? 'und'}</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Cantidad</label>
                    <input type="text" inputMode="decimal" className={`${INPUT_STD} text-right`}
                      value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', e.target.value)} />
                    <p className="mt-1 text-[10px] font-semibold text-[#004A94]">{simboloCarga}</p>
                  </div>
                  <div>
                    <label className={LABEL}>Costo unitario</label>
                    <input type="text" inputMode="decimal" className={`${INPUT_STD} text-right`} placeholder="0.00"
                      value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', e.target.value)} />
                    <p className="mt-1 text-[10px] text-gray-400">{sim(moneda)} por {simboloCarga}</p>
                  </div>
                </div>

                {/* "Comprar por": el mismo selector del app. Un saco y la unidad
                    en la que se le habla al usuario (kg) son dos formas de
                    cargar LO MISMO; el chip dice cual esta activa y su
                    equivalencia, que es lo que evita cargar 22 000 donde va 1. */}
                {(conEmpaque || factorDisplay(l) > 1) && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#004A94]">Comprar por</p>

                    {/* Todo en una fila: los chips, el empaque de este lote y
                        la equivalencia. Apilado ocupaba tres alturas para tres
                        datos cortos. */}
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {conEmpaque && (
                        <>
                          <button type="button" onClick={() => toggleEmpaque(i, true)}
                            className={`w-[118px] shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                              l.usaUnidadCompra ? 'border-[#004A94] bg-white shadow-sm' : 'border-gray-200 bg-white/60 hover:bg-white'
                            }`}>
                            <p className={`truncate text-xs font-bold ${l.usaUnidadCompra ? 'text-[#004A94]' : 'text-gray-600'}`}>
                              {l.unidadCompraNombre}
                            </p>
                            <p className="truncate text-[10px] text-gray-500">
                              ×{sinCeros(factorVigente, 3)} {l.unidadVentaSimbolo}
                            </p>
                          </button>
                          <button type="button" onClick={() => toggleEmpaque(i, false)}
                            className={`w-[118px] shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                              !l.usaUnidadCompra ? 'border-[#004A94] bg-white shadow-sm' : 'border-gray-200 bg-white/60 hover:bg-white'
                            }`}>
                            <p className={`truncate text-xs font-bold ${!l.usaUnidadCompra ? 'text-[#004A94]' : 'text-gray-600'}`}>
                              {l.simboloPres ?? l.unidadVentaSimbolo}
                            </p>
                            <p className="truncate text-[10px] text-gray-500">
                              {fpres > 1 ? `×${sinCeros(fpres, 3)} ${l.unidadVentaSimbolo}` : '×1'}
                            </p>
                          </button>
                        </>
                      )}

                      {/* El empaque real de ESTE lote: el saco pudo venir con
                          otra cantidad que la configurada en el producto. */}
                      {conEmpaque && l.usaUnidadCompra && (
                        <div className="w-[118px] shrink-0">
                          <label className="mb-1 block truncate text-[10px] font-semibold text-gray-600">
                            {l.unidadVentaSimbolo} por {l.unidadCompraNombre}
                          </label>
                          <input type="text" inputMode="decimal"
                            className={`${INPUT_STD} text-right`}
                            placeholder={String(l.factorProducto ?? '')}
                            value={l.factor ?? ''} onChange={(e) => actualizar(i, 'factor', e.target.value)} />
                        </div>
                      )}

                      {/* Lo que REALMENTE entra al stock. Sin esto, cargar 3
                          sacos y ver 66 kg recien en el detalle asusta. */}
                      {entranAlStock > 0 && costoAtomico != null && (
                        <p className="ml-auto flex flex-wrap items-baseline justify-end gap-x-2 text-right text-[11px] font-semibold leading-tight text-green-800">
                          <span>
                            Entran {sinCeros(entranAlStock / fpres, 3)} {unidadEquiv} @ {sim(moneda)} {sinCeros(costoAtomico * fpres, 4)}/{unidadEquiv}
                          </span>
                          {costoPorEmpaque != null && (
                            <>
                              <span className="text-green-600/60">·</span>
                              <span>{sim(moneda)} {sinCeros(costoPorEmpaque, 2)} por {l.unidadCompraNombre}</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {conEmpaque && l.usaUnidadCompra && l.factorProducto != null
                      && Math.abs(factorVigente - l.factorProducto) > 1e-9 && (
                      <p className="mt-1.5 text-[10px] leading-snug text-orange-700">
                        Empaque distinto al configurado ({sinCeros(l.factorProducto, 3)}). Aplica solo a esta compra.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {l.productoId && (l.costoActual != null || l.precioVentaActual != null || proy != null) && (
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">Qué le pasa al producto con esta compra</p>
                  <div className="grid gap-3 lg:grid-cols-3">

                    <div className="rounded-lg border border-gray-100 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Costo del producto</p>
                      {/* 🔴 El costo se guarda por unidad ATOMICA (gramo). El
                          titular va en la unidad en la que se habla del
                          producto; el desglose de abajo da las otras. */}
                      <p className="mt-2 flex items-baseline gap-2">
                        {costoActualMostrado != null && (
                          <span className="text-xs text-gray-400 line-through">{fmtMon(costoActualMostrado)}</span>
                        )}
                        <span className="text-lg font-bold text-[#004A94]">
                          {proy != null ? `${sim(moneda)} ${sinCeros(proy * fpres, 4)}` : '—'}
                        </span>
                        {proy != null && <span className="text-[10px] text-gray-400">/{unidadEquiv}</span>}
                      </p>
                      {saltoCosto != null && Math.abs(saltoCosto) >= 0.5 && (
                        <p className={`mt-1 text-[11px] font-bold ${saltoCosto > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {saltoCosto > 0 ? '▲' : '▼'} {Math.abs(saltoCosto).toFixed(1)}% sobre el actual
                        </p>
                      )}

                      {/* El mismo costo en las tres unidades que se usan: la de
                          stock (gramo), la que se habla (kilo) y la que cotiza
                          el proveedor (saco). Evita hacer la regla de tres a
                          mano para cruzarlo contra la factura. */}
                      {proy != null && (fpres > 1 || costoPorEmpaque != null) && (
                        <div className="mt-2 flex flex-col gap-0.5 border-t border-gray-200/70 pt-2">
                          {fpres > 1 && (
                            <div className="flex items-baseline justify-between text-[10px]">
                              <span className="text-gray-400">por {l.unidadVentaSimbolo}</span>
                              <span className="font-semibold text-gray-600">{sim(moneda)} {sinCeros(proy, 6)}</span>
                            </div>
                          )}
                          <div className="flex items-baseline justify-between text-[10px]">
                            <span className="text-gray-400">por {unidadEquiv}</span>
                            <span className="font-semibold text-gray-700">{sim(moneda)} {sinCeros(proy * fpres, 4)}</span>
                          </div>
                          {conEmpaque && factorVigente > 1 && (
                            <div className="flex items-baseline justify-between text-[10px]">
                              <span className="text-gray-400">por {l.unidadCompraNombre}</span>
                              <span className="font-semibold text-gray-700">{sim(moneda)} {sinCeros(proy * factorVigente, 2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="mt-1.5 text-[10px] leading-snug text-gray-400">
                        {l.stockActual != null && l.stockActual > 0
                          ? `Promedio ponderado entre ${sinCeros(l.stockActual / fpres, 3)} ${unidadEquiv} que ya hay y lo que entra.`
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
                          ? `Vendiéndose a ${sim(moneda)} ${(l.precioVentaActual * factorDisplay(l)).toFixed(2)}${l.simboloPres ? `/${l.simboloPres}` : ''}.`
                          : 'Este producto todavía no tiene precio de venta en la sede.'}
                      </p>
                    </div>

                    <div className={`rounded-lg border p-3 ${superaPrecioVenta(l) ? 'border-red-200 bg-red-50/50' : 'border-blue-200 bg-white'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#004A94]">Precio de venta</p>

                      {/* ACTUAL vs NUEVO, explicito. Antes el actual vivia en gris
                          chico dentro de la tarjeta de margen y no se podia
                          comparar contra lo que se estaba por escribir. */}
                      <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500">Hoy se vende a</span>
                        <span className={`text-sm font-bold ${ventaNueva != null ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {ventaActualMostrada != null ? fmtMon(ventaActualMostrada) : 'sin precio'}
                        </span>
                      </div>

                      <div className="mt-2">
                        <label className="mb-1 block text-[10px] font-semibold text-gray-500">
                          {ventaActualMostrada != null ? 'Cambiarlo a' : 'Establecer precio'}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400">{sim(moneda)}</span>
                          <input type="text" inputMode="decimal" placeholder={ventaActualMostrada != null ? 'sin cambios' : '0.00'}
                            value={l.nuevoPrecioVenta ?? ''}
                            onChange={(e) => actualizar(i, 'nuevoPrecioVenta', e.target.value)}
                            className={`${INPUT_STD} h-[36px] text-right text-base font-bold`} />
                          {l.simboloPres && <span className="shrink-0 text-[10px] text-gray-400">/{l.simboloPres}</span>}
                        </div>
                      </div>

                      {/* El efecto del cambio, en una linea */}
                      {ventaNueva != null && ventaActualMostrada != null && ventaActualMostrada > 0 && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px]">
                          <span className="text-gray-400">{fmtMon(ventaActualMostrada)}</span>
                          <span className="text-gray-400">→</span>
                          <strong className="text-[#004A94]">{fmtMon(ventaNueva)}</strong>
                          {Math.abs(deltaVenta ?? 0) >= 0.05 && (
                            <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${(deltaVenta ?? 0) > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {(deltaVenta ?? 0) > 0 ? '▲' : '▼'} {Math.abs(deltaVenta ?? 0).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                      {ventaNueva == null && ventaActualMostrada != null && (
                        <p className="mt-1.5 text-[10px] text-gray-400">
                          Vacío = se queda en {fmtMon(ventaActualMostrada)}.
                        </p>
                      )}

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
                        {ventaNueva != null && (
                          <button type="button" onClick={() => actualizar(i, 'nuevoPrecioVenta', '')}
                            className="rounded px-2 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-100">
                            dejar como está
                          </button>
                        )}
                      </div>

                      {superaPrecioVenta(l) ? (
                        <p className="mt-2 text-[10px] font-semibold leading-snug text-red-700">
                          ⛔ El costo que deja esta compra supera el precio de venta. No se puede guardar así.
                        </p>
                      ) : ventaNueva != null ? (
                        <p className="mt-2 text-[10px] leading-snug text-gray-400">
                          Se aplica al confirmar la compra y queda en el historial de precios.
                        </p>
                      ) : null}
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

              {(l.historial?.compras.length ?? 0) > 0 && (() => {
                const h = l.historial!;
                // El historial viene en unidad ATOMICA; el usuario escribe en la
                // suya (kg). Sin convertir, compararia S/0.008 contra S/8.00.
                const fp = factorDisplay(l);
                const uni = l.simboloPres ?? 'unidad';
                const costos = h.compras.map((c) => Number(c.costoUnitario) * fp);
                const minimo = Math.min(...costos);
                const maximo = Math.max(...costos);
                const hoy = costoUnit != null ? costoUnit * fp : null;
                const hayRango = maximo - minimo > 0.0001;
                // Donde cae lo que estas pagando dentro de lo que pagaste antes.
                const posicion = hoy != null && hayRango
                  ? Math.min(100, Math.max(0, ((hoy - minimo) / (maximo - minimo)) * 100))
                  : null;
                const vsMinimo = hoy != null && minimo > 0 ? ((hoy - minimo) / minimo) * 100 : null;
                const fmt = (n: number) => `${sim(moneda)} ${n.toFixed(2)}`;
                const fecha = (f: string) => new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });

                return (
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Historial de compras</p>
                      <span className="text-[11px] text-gray-400">
                        {h.compras.length} {h.compras.length === 1 ? 'compra' : 'compras'} registradas
                      </span>
                    </div>

                    {/* Veredicto: lo unico que el usuario quiere saber mirando esto */}
                    {hoy != null && (
                      <div className="mt-3 rounded-lg border border-gray-100 bg-slate-50/60 p-3">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-xs text-gray-500">Estás pagando</span>
                          <span className="text-base font-bold text-[#004A94]">{fmt(hoy)}</span>
                          <span className="text-[11px] text-gray-400">por {uni}</span>
                        </div>

                        {hayRango ? (
                          <>
                            <div className="relative mt-2.5 h-1.5 rounded-full bg-gradient-to-r from-green-200 via-amber-200 to-red-200">
                              <span
                                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#004A94] shadow"
                                style={{ left: `${posicion}%` }} />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
                              <span>más barato <strong className="text-green-700">{fmt(minimo)}</strong></span>
                              <span>más caro <strong className="text-red-600">{fmt(maximo)}</strong></span>
                            </div>
                          </>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-gray-500">
                            Siempre lo compraste a <strong className="text-gray-700">{fmt(minimo)}</strong>.
                          </p>
                        )}

                        {vsMinimo != null && Math.abs(vsMinimo) >= 0.5 && (
                          <p className={`mt-2 text-[11px] font-semibold ${vsMinimo > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                            {vsMinimo > 0
                              ? `Es ${vsMinimo.toFixed(1)}% más caro que lo más barato que pagaste.`
                              : `Es ${Math.abs(vsMinimo).toFixed(1)}% más barato que tu mejor precio hasta ahora.`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Ultimas compras, con encabezados de verdad */}
                    <div className="mt-4">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Últimas compras</p>
                      <div className="grid grid-cols-[76px_minmax(0,1fr)_86px_92px] gap-2 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase text-gray-400">
                        <span>Fecha</span>
                        <span>Proveedor</span>
                        <span className="text-right">Cantidad</span>
                        <span className="text-right">Costo por {uni}</span>
                      </div>
                      {h.compras.slice(0, 6).map((c, ci) => {
                        const costo = Number(c.costoUnitario) * fp;
                        const esMinimo = hayRango && Math.abs(costo - minimo) < 0.0001;
                        return (
                          <div key={`${c.compraId}-${ci}`}
                            className="grid grid-cols-[76px_minmax(0,1fr)_86px_92px] items-center gap-2 border-b border-gray-50 py-1.5 text-[11px]">
                            <span className="text-gray-500">{fecha(c.fecha)}</span>
                            <span className="min-w-0 truncate text-gray-700">{c.proveedor}</span>
                            <span className="text-right text-gray-500">
                              {c.usaUnidadCompra && c.cantidadOriginal != null
                                ? `${c.cantidadOriginal} ${c.unidadOriginalSimbolo ?? 'paq.'}`
                                : `${fp > 1 ? (c.cantidad / fp).toLocaleString('es-PE') : c.cantidad} ${uni === 'unidad' ? 'und' : uni}`}
                            </span>
                            <span className={`text-right font-semibold ${esMinimo ? 'text-green-700' : 'text-gray-800'}`}>
                              {sim(c.moneda)} {(Number(c.costoUnitario) * fp).toFixed(2)}
                              {esMinimo && <span className="ml-1 text-[9px] font-bold">↓</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* A quien le compras */}
                    {h.proveedores.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">A quién le comprás</p>
                        <div className="flex flex-col gap-1.5">
                          {h.proveedores.slice(0, 5).map((pv, pi) => {
                            const esMejor = pv.proveedorId != null && pv.proveedorId === h.mejorProveedorId;
                            return (
                              <div key={`${pv.proveedorId ?? pv.proveedor}-${pi}`}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${esMejor ? 'border-green-200 bg-green-50/50' : 'border-gray-100 bg-white'}`}>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-semibold text-gray-800">{pv.proveedor}</p>
                                  <p className="mt-0.5 text-[10px] text-gray-500">
                                    {pv.veces} {pv.veces === 1 ? 'compra' : 'compras'}
                                    {pv.ultimaFecha ? ` · última el ${fecha(pv.ultimaFecha)}` : ''}
                                  </p>
                                </div>
                                {esMejor && (
                                  <span className="shrink-0 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    MÁS BARATO
                                  </span>
                                )}
                                <div className="shrink-0 text-right">
                                  <p className="text-[11px] font-bold text-gray-800">{fmt(Number(pv.costoPromedio) * fp)}</p>
                                  <p className="text-[9px] text-gray-400">promedio</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}


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
