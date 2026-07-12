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
import type { Producto } from '@/core/types/producto';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const TERMINOS = ['CONTADO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45', 'CREDITO_60', 'CREDITO_90', 'PERSONALIZADO'];

type LineaForm = {
  productoId?: string;
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
  costoActual?: number | null;
  precioVentaActual?: number | null;
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
  const agregarManual = () => setLineas((l) => [...l, { descripcion: '', cantidad: '1', precioUnitario: '' }]);
  const actualizar = (i: number, campo: keyof LineaForm, valor: string) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  const quitar = (i: number) => setLineas((l) => l.filter((_, idx) => idx !== i));

  const numVal = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
  const total = lineas.reduce((s, l) => s + numVal(l.cantidad) * numVal(l.precioUnitario), 0);

  const guardar = async () => {
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (!sedeId) return setError('Seleccioná una sede');
    const detalles: CrearCompraLinea[] = lineas
      .filter((l) => l.descripcion.trim() && numVal(l.cantidad) > 0)
      .map((l) => {
        const usaEmpaque = !!(l.usaUnidadCompra && l.factorProducto);
        const factorLinea = usaEmpaque ? (numVal(l.factor ?? '') || l.factorProducto!) : undefined;
        const nuevoPV = numVal(l.nuevoPrecioVenta ?? '');
        return {
          ...(l.productoId ? { productoId: l.productoId } : {}),
          descripcion: l.descripcion.trim(),
          // Con empaque: cantidad/precio van en unidad de COMPRA y el backend convierte con el factor
          cantidad: Math.trunc(numVal(l.cantidad)),
          precioUnitario: numVal(l.precioUnitario),
          ...(usaEmpaque ? { usaUnidadCompra: true, factorCompra: factorLinea } : {}),
          ...(nuevoPV > 0 ? { nuevoPrecioVenta: nuevoPV } : {}),
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
          <label className={labelClass}>Proveedor *</label>
          <select className={inputClass} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sede *</label>
          <select className={inputClass} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Términos de pago</label>
          <select className={inputClass} value={terminosPago} onChange={(e) => setTerminosPago(e.target.value)}>
            {TERMINOS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Moneda</label>
          <select className={inputClass} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            <option value="PEN">PEN (S/)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Doc. proveedor</label>
            <select className={inputClass} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
              {TIPOS_DOC_PROVEEDOR.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Serie</label>
            <input className={inputClass} value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="F001" />
          </div>
          <div>
            <label className={labelClass}>N°</label>
            <input className={inputClass} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="00012" />
          </div>
        </div>
        {terminosPago === 'PERSONALIZADO' && (
          <div>
            <label className={labelClass}>Días de crédito *</label>
            <input className={inputClass} type="number" min="1" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value)} placeholder="Ej: 20" />
          </div>
        )}
        <div className="md:col-span-2">
          <label className={labelClass}>Observaciones</label>
          <input className={inputClass} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
        </div>
        <label className="flex items-start gap-2 self-end pb-1 text-sm">
          <input type="checkbox" checked={precioIncluyeIgv} onChange={(e) => setPrecioIncluyeIgv(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
          <span>
            <span className="font-medium text-gray-800">Precios YA incluyen IGV</span>
            <span className="block text-[10px] text-gray-500">Si lo desmarcas, el IGV se SUMA sobre los precios de las líneas.</span>
          </span>
        </label>
      </div>

      {/* Buscador de producto */}
      <div className="relative mb-3">
        <input
          className={inputClass}
          placeholder="Buscar producto para agregar…"
          value={q}
          onChange={(e) => { setQ(e.target.value); buscarProductos(e.target.value); }}
        />
        {(buscando || resultados.length > 0) && q.trim().length >= 2 && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {buscando && <div className="px-3 py-2 text-xs text-gray-400">Buscando…</div>}
            {!buscando && resultados.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>}
            {resultados.map((p) => (
              <button key={p.id} onClick={() => agregarProducto(p)} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span className="font-mono text-xs text-gray-400">{p.codigoEmpresa}</span> {p.nombre}
              </button>
            ))}
          </div>
        )}
        <button onClick={agregarManual} className="mt-2 text-xs text-[#437EFF] hover:underline">+ Agregar línea manual</button>
      </div>

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
                  <input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={l.descripcion} onChange={(e) => actualizar(i, 'descripcion', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="numeric" className="w-16 rounded border border-gray-200 px-2 py-1 text-right text-sm" value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', e.target.value)} />
                  {conEmpaque && l.usaUnidadCompra && <p className="text-center text-[9px] text-gray-400">{l.unidadCompraNombre}</p>}
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="decimal" placeholder="0.00" className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm" value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', e.target.value)} />
                  {conEmpaque && l.usaUnidadCompra && <p className="text-center text-[9px] text-gray-400">por {l.unidadCompraNombre}</p>}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">{sim(moneda)} {(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}</td>
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
                              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
                            <span className="text-gray-600">Comprar por <strong>{l.unidadCompraNombre}</strong></span>
                          </label>
                          {l.usaUnidadCompra && (
                            <span className="flex items-center gap-1 text-gray-500">
                              1 {l.unidadCompraNombre} =
                              <input type="text" inputMode="decimal" value={l.factor ?? ''}
                                onChange={(e) => actualizar(i, 'factor', e.target.value)}
                                className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-right text-[11px]" />
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
                            className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-right text-[11px]"
                            title="Opcional: actualiza el precio de venta del producto al confirmar la compra (queda en el historial de precios)" />
                        </label>
                      )}
                    </div>
                    {/* Hints de costo + historial (paridad historial_compras_producto_panel Flutter) */}
                    {l.productoId && (l.costoActual != null || l.precioVentaActual != null || l.historial) && (() => {
                      const factorVig = l.usaUnidadCompra ? (numVal(l.factor ?? '') || l.factorProducto || 1) : 1;
                      const costoUnitNuevo = numVal(l.precioUnitario) > 0 ? numVal(l.precioUnitario) / factorVig : null;
                      const superaPV = costoUnitNuevo != null && l.precioVentaActual != null && l.precioVentaActual > 0 && costoUnitNuevo > l.precioVentaActual;
                      const ultimoCosto = l.historial?.ultimoCosto ?? null;
                      const variacion = costoUnitNuevo != null && ultimoCosto != null && ultimoCosto > 0
                        ? ((costoUnitNuevo - ultimoCosto) / ultimoCosto) * 100 : null;
                      return (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-gray-400">
                          {l.costoActual != null && l.costoActual > 0 && <span>Costo actual: {sim(moneda)} {l.costoActual.toFixed(2)}</span>}
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
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                              ⚠ El costo ({sim(moneda)} {costoUnitNuevo!.toFixed(2)}/u) supera el precio de venta — ajusta el precio de venta
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
