'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import type { Proveedor } from '@/core/types/proveedor';
import type { CrearCompraLinea } from '@/core/types/compra';
import { listarProveedores } from '@/features/proveedores/services/proveedor-service';
import { crearCompra } from '@/features/compras/services/compra-service';
import { getProductos } from '@/features/producto/services/producto-service';
import type { Producto } from '@/core/types/producto';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const TERMINOS = ['CONTADO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45', 'CREDITO_60', 'CREDITO_90', 'PERSONALIZADO'];

export default function NuevaCompraPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [terminosPago, setTerminosPago] = useState('CONTADO');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [serie, setSerie] = useState('');
  const [numero, setNumero] = useState('');
  const [lineas, setLineas] = useState<CrearCompraLinea[]>([]);
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

  const agregarProducto = (p: Producto) => {
    setLineas((l) => [...l, { productoId: p.id, descripcion: p.nombre, cantidad: 1, precioUnitario: 0 }]);
    setQ(''); setResultados([]);
  };
  const agregarManual = () => setLineas((l) => [...l, { descripcion: '', cantidad: 1, precioUnitario: 0 }]);
  const actualizar = (i: number, campo: keyof CrearCompraLinea, valor: string | number) =>
    setLineas((l) => l.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  const quitar = (i: number) => setLineas((l) => l.filter((_, idx) => idx !== i));

  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);

  const guardar = async () => {
    if (!proveedorId) return setError('Seleccioná un proveedor');
    if (!sedeId) return setError('Seleccioná una sede');
    const detalles = lineas
      .filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0)
      .map((l) => ({ ...l, cantidad: Math.trunc(Number(l.cantidad)), precioUnitario: Number(l.precioUnitario) || 0 }));
    if (detalles.length === 0) return setError('Agregá al menos un producto/línea con cantidad');
    setGuardando(true); setError(null);
    try {
      const compra = await crearCompra({
        sedeId, proveedorId, moneda, terminosPago, fechaRecepcion: fecha,
        serieDocumentoProveedor: serie.trim() || undefined,
        numeroDocumentoProveedor: numero.trim() || undefined,
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Serie doc.</label>
            <input className={inputClass} value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="F001" />
          </div>
          <div>
            <label className={labelClass}>N° doc.</label>
            <input className={inputClass} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="00012" />
          </div>
        </div>
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
            ) : lineas.map((l, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  <input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={l.descripcion} onChange={(e) => actualizar(i, 'descripcion', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={1} className="w-16 rounded border border-gray-200 px-2 py-1 text-right text-sm" value={l.cantidad} onChange={(e) => actualizar(i, 'cantidad', Number(e.target.value))} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} step="0.01" className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm" value={l.precioUnitario} onChange={(e) => actualizar(i, 'precioUnitario', Number(e.target.value))} />
                </td>
                <td className="px-2 py-1.5 text-right font-medium">{sim(moneda)} {((Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0)).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right"><button onClick={() => quitar(i)} className="text-xs text-red-500 hover:underline">Quitar</button></td>
              </tr>
            ))}
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
