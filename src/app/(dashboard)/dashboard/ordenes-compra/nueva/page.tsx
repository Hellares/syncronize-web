'use client';

import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Proveedor } from '@/core/types/proveedor';
import type { CrearOrdenCompraLinea } from '@/core/types/compra';
import { listarProveedores } from '@/features/proveedores/services/proveedor-service';
import { crearOrdenCompra } from '@/features/compras/services/orden-compra-service';
import { getProductos } from '@/features/producto/services/producto-service';
import type { Producto } from '@/core/types/producto';
import { nombreUnidad } from '@/core/types/producto';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de `servicios/nueva`, `CotizacionForm` y `compras/nueva`. El ring va
// BAKED porque aca el error es un banner arriba, no una marca por campo.
const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const TERMINOS = ['CONTADO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45', 'CREDITO_60', 'CREDITO_90', 'PERSONALIZADO'];

type LineaForm = {
  productoId?: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  unidadCompraNombre?: string;
  unidadBaseNombre?: string;
  usaUnidadCompra?: boolean;
};

export default function NuevaOrdenCompraPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [terminosPago, setTerminosPago] = useState('CONTADO');
  const [diasCredito, setDiasCredito] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [condiciones, setCondiciones] = useState('');

  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listarProveedores().then(setProveedores).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sedeId && sedes.length > 0) {
      const principal = sedes.find((s) => s.esPrincipal);
      setSedeId(principal?.id ?? sedes[0].id);
    }
  }, [sedes, sedeId]);

  const buscarProductos = useCallback((texto: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (texto.trim().length < 2) { setResultados([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await getProductos({ page: 1, limit: 12, search: texto.trim(), isActive: true });
        setResultados(res.data);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 300);
  }, []);

  const agregarProducto = (p: Producto) => {
    const factor = p.factorCompra != null ? Number(p.factorCompra) : undefined;
    const conEmpaque = !!(p.unidadCompra && factor && factor > 0);
    setLineas((l) => [...l, {
      productoId: p.id,
      descripcion: p.nombre,
      cantidad: '1',
      precioUnitario: '',
      ...(conEmpaque ? {
        unidadCompraNombre: nombreUnidad(p.unidadCompra) ?? 'paquete',
        unidadBaseNombre: nombreUnidad(p.unidadMedida) ?? 'unid.',
        usaUnidadCompra: true,
      } : {}),
    }]);
    setQ(''); setResultados([]);
  };
  const agregarManual = () => setLineas((l) => [...l, { descripcion: '', cantidad: '1', precioUnitario: '' }]);
  const actualizar = (i: number, campo: keyof LineaForm, valor: string | boolean) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  const quitar = (i: number) => setLineas((l) => l.filter((_, idx) => idx !== i));

  const numVal = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
  const total = lineas.reduce((s, l) => s + numVal(l.cantidad) * numVal(l.precioUnitario), 0);

  const guardar = async () => {
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (!sedeId) return setError('Seleccioná una sede');
    const detalles: CrearOrdenCompraLinea[] = lineas
      .filter((l) => l.descripcion.trim() && numVal(l.cantidad) > 0)
      .map((l) => ({
        ...(l.productoId ? { productoId: l.productoId } : {}),
        descripcion: l.descripcion.trim(),
        cantidad: Math.trunc(numVal(l.cantidad)),
        precioUnitario: numVal(l.precioUnitario),
        ...(l.usaUnidadCompra ? { usaUnidadCompra: true } : {}),
      }));
    if (detalles.length === 0) return setError('Agregá al menos una línea con cantidad');
    setGuardando(true); setError(null);
    try {
      const oc = await crearOrdenCompra({
        sedeId, proveedorId, moneda, terminosPago,
        ...(terminosPago === 'PERSONALIZADO' && parseInt(diasCredito) > 0 ? { diasCredito: parseInt(diasCredito) } : {}),
        fechaEntregaEsperada: fechaEntrega || undefined,
        observaciones: observaciones.trim() || undefined,
        condiciones: condiciones.trim() || undefined,
        detalles,
      });
      router.push(`/dashboard/ordenes-compra/${oc.id}`);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo crear la orden');
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/ordenes-compra" className="text-xs text-[#437EFF]">← Volver a Órdenes de Compra</Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold text-[#004A94]">Nueva orden de compra</h1>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

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
        {terminosPago === 'PERSONALIZADO' && (
          <div>
            <label className={LABEL}>Días de crédito *</label>
            <input className={INPUT_STD} type="number" min="1" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value)} />
          </div>
        )}
        <div>
          <label className={LABEL}>Moneda</label>
          <select className={INPUT_STD} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            <option value="PEN">PEN (S/)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Entrega esperada</label>
          <input type="date" className={INPUT_STD} value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Observaciones</label>
          <input className={INPUT_STD} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="md:col-span-2">
          <label className={LABEL}>Condiciones</label>
          <input className={INPUT_STD} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Condiciones comerciales, entrega, garantía… (van en el PDF/orden)" />
        </div>
      </div>

      <div className="relative mb-3">
        <input className={INPUT_STD} placeholder="Buscar producto para agregar…"
          value={q} onChange={(e) => { setQ(e.target.value); buscarProductos(e.target.value); }} />
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
            ) : lineas.map((l, i) => (
              <Fragment key={i}>
              <tr>
                <td className="px-3 py-1.5">
                  <input className={`${INPUT_STD} text-xs`} value={l.descripcion} onChange={(e) => actualizar(i, 'descripcion', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="numeric" className={`${INPUT_STD} w-16 px-2 text-right`} value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', e.target.value)} />
                  {l.unidadCompraNombre && l.usaUnidadCompra && <p className="text-center text-[9px] text-gray-400">{l.unidadCompraNombre}</p>}
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" inputMode="decimal" placeholder="0.00" className={`${INPUT_STD} w-24 px-2 text-right`} value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-right font-medium">{sim(moneda)} {(numVal(l.cantidad) * numVal(l.precioUnitario)).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right"><button onClick={() => quitar(i)} className="text-xs text-red-500 hover:underline">Quitar</button></td>
              </tr>
              {l.unidadCompraNombre && (
                <tr className="bg-gray-50/50">
                  <td colSpan={5} className="px-3 pb-2 pt-0">
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <input type="checkbox" checked={!!l.usaUnidadCompra}
                        onChange={(e) => actualizar(i, 'usaUnidadCompra', e.target.checked)}
                        className="accent-[#004A94]" />
                      Pedir por <strong>{l.unidadCompraNombre}</strong> (el backend convierte a {l.unidadBaseNombre} con el factor del producto)
                    </label>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4">
        <div className="text-sm">Total: <span className="text-lg font-bold text-[#004A94]">{sim(moneda)} {total.toFixed(2)}</span></div>
        <button onClick={guardar} disabled={guardando} className="rounded-lg bg-[#004A94] px-5 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60">
          {guardando ? 'Creando…' : 'Crear orden (borrador)'}
        </button>
      </div>
      <p className="mt-2 text-right text-xs text-gray-400">Flujo: BORRADOR → Enviar (PENDIENTE) → Aprobar → Recibir (genera compras).</p>
    </div>
  );
}
