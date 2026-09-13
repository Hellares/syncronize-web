'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompraDetalle, CompraListItem } from '@/core/types/compra';
import { getCompra, listarComprasPagina } from '@/features/compras/services/compra-service';

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

/** De a 10: lo que entra en pantalla sin scrollear a ciegas. */
const PAGINA = 10;

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
 *
 * 🔴 Trae las 10 ÚLTIMAS y sigue de a 10 con el cursor. Una empresa con mil
 * compras no puede bajarlas todas cada vez que se abre el diálogo, y la que se
 * busca casi siempre es la de recién.
 */
export default function VenderCompraSheet({ sedeId, onClose, onElegir }: Props) {
  const [compras, setCompras] = useState<CompraListItem[] | null>(null);
  const [buscando, setBuscando] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [trayendoMas, setTrayendoMas] = useState(false);
  const [total, setTotal] = useState(0);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const q = buscando.trim();
  const filtros = useMemo(
    () => ({
      estado: 'CONFIRMADA' as const,
      ...(sedeId ? { sedeId } : {}),
      ...(q ? { search: q } : {}),
      limit: PAGINA,
    }),
    [sedeId, q],
  );

  /*
   * La primera tanda, y la de cada búsqueda.
   *
   * 🔴 El texto viaja al SERVIDOR: con 10 filas en memoria, filtrarlas acá
   * buscaría dentro de esas 10 nomás y la compra de hace un mes no aparecería
   * nunca. La pausa de 350 ms evita una consulta por tecla.
   */
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const pagina = await listarComprasPagina(filtros);
        if (!vivo) return;
        setCompras(pagina.items);
        setCursor(pagina.nextCursor);
        setHayMas(pagina.hasMore);
        setTotal(pagina.total);
        setError('');
      } catch {
        if (!vivo) return;
        setCompras([]);
        setHayMas(false);
        setError('No se pudieron cargar las compras');
      }
    }, q ? 350 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [filtros, q]);

  const verMas = async () => {
    if (!cursor || trayendoMas) return;
    setTrayendoMas(true);
    try {
      const pagina = await listarComprasPagina(filtros, cursor);
      setCompras((prev) => [...(prev ?? []), ...pagina.items]);
      setCursor(pagina.nextCursor);
      setHayMas(pagina.hasMore);
      setTotal(pagina.total);
      setError('');
    } catch {
      setError('No se pudieron traer más compras');
    } finally {
      setTrayendoMas(false);
    }
  };

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

  const listadas = compras?.length ?? 0;

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
          ) : listadas === 0 ? (
            <p className="py-10 text-center text-xs text-gray-500">
              {q ? 'Ninguna compra coincide.' : 'Sin compras confirmadas.'}
            </p>
          ) : (
            <>
              {compras.map((c) => (
                <button key={c.id} onClick={() => abrir(c.id)} disabled={!!abriendo}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left hover:bg-[#f5f9ff] disabled:opacity-50">
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
              ))}
              {hayMas && (
                <div className="px-4 py-3 text-center">
                  <button onClick={verMas} disabled={trayendoMas}
                    className="rounded-lg border border-[#d1e5ff] px-3 py-1.5 text-[11px] font-medium text-[#004A94] hover:bg-[#f5f9ff] disabled:opacity-50">
                    {trayendoMas ? 'Trayendo…' : `Ver ${PAGINA} más`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
          <span className="text-[10px] text-gray-500">
            {listadas > 0 && `${listadas} de ${Math.max(total, listadas)}`}
          </span>
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
