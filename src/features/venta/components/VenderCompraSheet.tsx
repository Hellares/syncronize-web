'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompraDetalle, CompraListItem } from '@/core/types/compra';
import { getCompra, listarCompras } from '@/features/compras/services/compra-service';

interface Props {
  sedeId?: string;
  onClose: () => void;
  /** Las líneas listas para entrar al carrito, con su lote y su costo. */
  onElegir: (compra: CompraDetalle, lineas: LineaDeCompra[]) => void;
}

/** Una línea de la compra que TODAVÍA tiene mercadería para vender. */
export interface LineaDeCompra {
  productoId?: string;
  varianteId?: string;
  descripcion: string;
  /** Lo que QUEDA del lote, no lo que se compró: parte puede estar vendida. */
  cantidad: number;
  loteId: string;
  loteCodigo: string;
  costo: number;
}

const fmt = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (f?: string | null) =>
  f ? new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

/**
 * Vender una compra entera al costo de SUS lotes.
 *
 * 🔑 El caso: se le compró a un proveedor puntual para un cliente puntual. Sin
 * esto, el carrito se arma a mano producto por producto y el consumo FEFO
 * termina sacando la mercadería de la compra MÁS VIEJA — se le cobra el costo
 * equivocado al cliente y se descuenta la caja de otro.
 *
 * Se arma con lo que QUEDA de cada lote: si media compra ya se vendió, entran
 * las unidades que sobran, no las que se compraron.
 */
export default function VenderCompraSheet({ sedeId, onClose, onElegir }: Props) {
  const [compras, setCompras] = useState<CompraListItem[] | null>(null);
  const [buscando, setBuscando] = useState('');
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    listarCompras({ estado: 'CONFIRMADA', ...(sedeId ? { sedeId } : {}), limit: 40 })
      .then((c) => { if (vivo) setCompras(c); })
      .catch(() => { if (vivo) { setCompras([]); setError('No se pudieron cargar las compras'); } });
    return () => { vivo = false; };
  }, [sedeId]);

  const visibles = useMemo(() => {
    const q = buscando.trim().toLowerCase();
    if (!q) return compras ?? [];
    return (compras ?? []).filter(
      (c) =>
        c.codigo.toLowerCase().includes(q) ||
        (c.nombreProveedor ?? '').toLowerCase().includes(q),
    );
  }, [compras, buscando]);

  const abrir = async (id: string) => {
    setAbriendo(id);
    setError('');
    try {
      const compra = await getCompra(id);
      const lineas: LineaDeCompra[] = (compra.detalles ?? [])
        .filter((d) => d.lote && d.lote.cantidadActual > 0 && (d.productoId || d.varianteId))
        .map((d) => ({
          productoId: d.productoId ?? undefined,
          varianteId: d.varianteId ?? undefined,
          descripcion: d.descripcion,
          cantidad: d.lote!.cantidadActual,
          loteId: d.lote!.id,
          loteCodigo: d.lote!.codigo,
          costo: Number(d.lote!.precioCosto),
        }));
      if (!lineas.length) {
        setError('Esta compra ya no tiene mercadería en stock: sus lotes se agotaron.');
        setAbriendo(null);
        return;
      }
      onElegir(compra, lineas);
    } catch {
      setError('No se pudo abrir la compra');
      setAbriendo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-medium text-[#004A94]">Vender una compra</h3>
          <p className="text-[11px] text-gray-500">
            Trae sus productos al costo de esos lotes. Para lo que se compró por
            encargo: el cliente paga lo que costó SU mercadería.
          </p>
          <input
            className="mt-2 h-[30px] w-full rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 placeholder:text-zinc-500 placeholder:opacity-60"
            value={buscando} onChange={(e) => setBuscando(e.target.value)} autoFocus
            placeholder="Código o proveedor…" />
        </div>

        {error && <p className="px-4 py-2 text-[11px] font-medium text-red-600">{error}</p>}

        <div className="flex-1 overflow-y-auto">
          {compras === null ? (
            <p className="py-10 text-center text-xs text-gray-500">Cargando…</p>
          ) : visibles.length === 0 ? (
            <p className="py-10 text-center text-xs text-gray-500">
              {buscando ? 'Ninguna compra coincide.' : 'Sin compras confirmadas.'}
            </p>
          ) : (
            visibles.map((c) => (
              <button key={c.id} onClick={() => abrir(c.id)} disabled={!!abriendo}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-[#f5f9ff] disabled:opacity-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[#043261]">
                    {c.nombreProveedor}
                  </p>
                  <p className="truncate text-[10px] text-gray-500">
                    {c.codigo}
                    {c.fechaRecepcion && ` · ${fecha(c.fechaRecepcion)}`}
                    {c.documentoProveedor && ` · ${c.documentoProveedor}`}
                  </p>
                </div>
                {/* En la moneda de la compra: el total en soles no viene en el
                    listado, y convertirlo acá con el TC de hoy mentiría —el de
                    la compra está congelado. */}
                <span className="shrink-0 text-[12px] font-semibold text-gray-900">
                  {c.moneda === 'USD' ? '$' : 'S/'} {fmt(Number(c.total ?? 0))}
                </span>
                {abriendo === c.id && (
                  <span className="shrink-0 text-[10px] text-gray-400">abriendo…</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-2.5 text-right">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
