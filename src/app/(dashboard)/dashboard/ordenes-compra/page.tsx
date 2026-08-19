'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { OrdenCompra, EstadoOrdenCompra } from '@/core/types/compra';
import { ESTADO_OC_CONFIG } from '@/core/types/compra';
import type { Proveedor } from '@/core/types/proveedor';
import { listarOrdenesCompra } from '@/features/compras/services/orden-compra-service';
import { listarProveedores } from '@/features/proveedores/services/proveedor-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const num = (v: number | string) => Number(v ?? 0);
const fmtFecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—');

const FILTROS: { label: string; value?: EstadoOrdenCompra }[] = [
  { label: 'Todas' },
  { label: 'Borrador', value: 'BORRADOR' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Aprobadas', value: 'APROBADA' },
  { label: 'Parciales', value: 'PARCIAL' },
  { label: 'Completadas', value: 'COMPLETADA' },
];

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de los formularios del modulo. En la barra de filtros los controles NO
// son w-full: el ancho lo pone cada uno.
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';


export default function OrdenesCompraPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const [items, setItems] = useState<OrdenCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoOrdenCompra | undefined>(undefined);
  const [sedeId, setSedeId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { listarProveedores().then(setProveedores).catch(() => {}); }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listarOrdenesCompra({
        estado,
        sedeId: sedeId || undefined,
        proveedorId: proveedorId || undefined,
        search: search.trim() || undefined,
      }));
    } catch {
      setError('No se pudieron cargar las órdenes de compra');
    } finally {
      setLoading(false);
    }
  }, [estado, sedeId, proveedorId, search]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#004A94]">Órdenes de Compra</h1>
          <p className="text-xs text-gray-500">Pedidos al proveedor. Se reciben (parcial o total) generando compras.</p>
        </div>
        <button onClick={() => router.push('/dashboard/ordenes-compra/nueva')}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]">
          + Nueva orden
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button key={f.label} onClick={() => setEstado(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${estado === f.value ? 'bg-[#004A94] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)}
            className={INPUT_STD}>
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
          className={INPUT_STD}>
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input
          className={`${INPUT_STD} ml-auto w-full max-w-xs`}
          placeholder="Buscar por código o proveedor…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">Sin órdenes de compra.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-left">Emisión</th>
                <th className="px-3 py-2 text-left">Entrega esp.</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((o) => {
                const cfg = ESTADO_OC_CONFIG[o.estado];
                return (
                  <tr key={o.id} className="cursor-pointer hover:bg-gray-50/60" onClick={() => router.push(`/dashboard/ordenes-compra/${o.id}`)}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{o.codigo}</td>
                    <td className="px-3 py-2 text-gray-800">{o.nombreProveedor}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{fmtFecha(o.fechaEmision)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{fmtFecha(o.fechaEntregaEsperada)}</td>
                    <td className="px-3 py-2 text-right font-medium">{sim(o.moneda)} {num(o.total).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.style}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
