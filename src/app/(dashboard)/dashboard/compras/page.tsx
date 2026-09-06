'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CompraListItem, EstadoCompra } from '@/core/types/compra';
import type { Proveedor } from '@/core/types/proveedor';
import { listarCompras } from '@/features/compras/services/compra-service';
import { listarProveedores } from '@/features/proveedores/services/proveedor-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const sim = (m: string) => (m === 'USD' ? '$' : m === 'PEN' ? 'S/' : `${m} `);
const num = (v: number | string) => Number(v ?? 0);
const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '');

const ESTADO_STYLE: Record<EstadoCompra, string> = {
  BORRADOR: 'bg-amber-50 text-amber-700',
  CONFIRMADA: 'bg-green-50 text-green-700',
  ANULADA: 'bg-gray-100 text-gray-500',
};

const FILTROS: { label: string; value?: EstadoCompra }[] = [
  { label: 'Todas' },
  { label: 'Borrador', value: 'BORRADOR' },
  { label: 'Confirmadas', value: 'CONFIRMADA' },
  { label: 'Anuladas', value: 'ANULADA' },
];

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de los formularios del modulo. En la barra de filtros los controles NO
// son w-full: el ancho lo pone cada uno.
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
// Los filtros van un escalon por debajo del buscador --26 px y 10 px--, igual
// que en Productos: el buscador es donde se escribe y estos son de apoyo.
const SELECT_FILTRO =
  'bg-zinc-100 text-[#004A94] font-sans text-[10px] ring-1 ring-blue-400 outline-none transition-all duration-300 rounded-[6px] h-[26px] px-2.5 shadow-md focus:shadow-lg focus:shadow-blue-200';


/**
 * Lo que se le debe al proveedor por esta compra.
 *
 * 🔴 NO se lee `pagoPendiente`: ese flag dice "la compra entra al circuito de
 * cuentas por pagar" y NO se apaga al saldarla --queda prendido a proposito
 * para que la compra siga en el historial de CxP--. Leyendolo como si fuera la
 * deuda, una compra pagada por completo decia "pendiente" para siempre,
 * mientras Cuentas por pagar --que si hace la cuenta-- la mostraba PAGADA.
 *
 * El saldo lo calcula el backend en el listado: `total - pagos no anulados`.
 */
function EstadoPago({ compra }: { compra: CompraListItem }) {
  if (compra.estado !== 'CONFIRMADA') return null;

  // Contado pagado al confirmar: nunca entro a CxP y no tiene pagos que sumar.
  if (!compra.pagoPendiente) return <span className="text-green-600">pagada</span>;

  const saldo = compra.saldoPendiente != null ? Number(compra.saldoPendiente) : null;
  // Backend viejo (sin el campo): se dice lo unico que se sabe, que esta en CxP.
  if (saldo == null || Number.isNaN(saldo)) return <span className="text-amber-600">en CxP</span>;

  if (saldo <= 0) return <span className="text-green-600">pagada</span>;

  const pagado = compra.totalPagado != null ? Number(compra.totalPagado) : 0;
  if (pagado > 0) {
    return (
      <span className="text-amber-600" title={`Pagado ${sim(compra.moneda)} ${pagado.toFixed(2)} de ${sim(compra.moneda)} ${num(compra.total).toFixed(2)}`}>
        parcial · falta {sim(compra.moneda)} {saldo.toFixed(2)}
      </span>
    );
  }
  return <span className="text-amber-600">pendiente</span>;
}

export default function ComprasPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const [items, setItems] = useState<CompraListItem[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoCompra | undefined>(undefined);
  const [sedeId, setSedeId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { listarProveedores().then(setProveedores).catch(() => {}); }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listarCompras({
        estado,
        sedeId: sedeId || undefined,
        proveedorId: proveedorId || undefined,
        search: search.trim() || undefined,
      }));
    } catch {
      setError('No se pudieron cargar las compras');
    } finally {
      setLoading(false);
    }
  }, [estado, sedeId, proveedorId, search]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#004A94]">Compras</h1>
          <p className="text-xs text-gray-500">Recepciones de compra. Al confirmar generan stock y, según el pago, van a Cuentas por Pagar.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/compras/nueva')}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-md bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva compra
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* La misma pastilla gris con el elegido en blanco que usan los chips
            de estado de Productos. */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.label}
              onClick={() => setEstado(f.value)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
                estado === f.value ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)}
            className={SELECT_FILTRO}>
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
          className={SELECT_FILTRO}>
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input
          className={`${INPUT_STD} ml-auto w-full max-w-xs`}
          placeholder="Buscar por código o proveedor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">Sin compras.</div>
      ) : (
        // Misma firma que Productos, Ventas y Cotizaciones: ring azul --el
        // borde gris no se ve sobre el #f5f7fa del dashboard--, cabecera
        // #eaf2fd fija y 12 px.
        <div className="max-h-[calc(100vh-22rem)] min-h-[16rem] overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
              <tr>
                <th className="px-3 py-3 font-medium text-[#004A94]">Código</th>
                <th className="px-3 py-3 font-medium text-[#004A94]">Proveedor</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-[#004A94]">Fecha</th>
                <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-[#004A94]">Total</th>
                <th className="px-3 py-3 text-center font-medium text-[#004A94]">Estado</th>
                <th className="px-3 py-3 text-center font-medium text-[#004A94]">CxP</th>
                <th className="px-3 py-3 text-right font-medium text-[#004A94]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((c) => (
                <tr key={c.id} className="cursor-pointer transition-colors hover:bg-gray-50/50" onClick={() => router.push(`/dashboard/compras/${c.id}`)}>
                  <td className="px-3 py-2 text-[11px] tracking-tight text-gray-500">{c.codigo}</td>
                  <td className="px-3 py-2 text-gray-800">{c.nombreProveedor}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{fmtFecha(c.fechaRecepcion)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[13px] font-semibold text-[#004A94]">{sim(c.moneda)} {num(c.total).toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_STYLE[c.estado]}`}>{c.estado}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <EstadoPago compra={c} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs text-[#004A94] hover:underline">Ver</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
