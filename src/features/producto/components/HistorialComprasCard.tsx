'use client';

import { useEffect, useMemo, useState } from 'react';
import { getHistorialComprasProducto } from '@/features/compras/services/compra-service';
import type { HistorialComprasProducto } from '@/core/types/compra';

interface Props {
  productoId: string;
  /**
   * Presentacion del producto. El backend devuelve los costos por unidad
   * ATOMICA (gramo); sin convertir, un granel muestra "S/ 0.006818" al lado de
   * un precio de venta por kilo.
   */
  factorPresentacion?: number | null;
  simboloPresentacion?: string | null;
}

const sim = (m: string) => (m === 'USD' ? '$' : 'S/');
const fecha = (f: string) =>
  new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });

export default function HistorialComprasCard({ productoId, factorPresentacion, simboloPresentacion }: Props) {
  // Un solo estado con el resultado: `null` = todavia cargando, `[]` vacio =
  // llego y no hay compras. Con dos estados separados hacia falta ponerlos en
  // true al entrar al efecto, que es un setState sincrono dentro del efecto.
  const [resultado, setResultado] = useState<{ data: HistorialComprasProducto | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    getHistorialComprasProducto(productoId, { limit: 12 })
      .then((d) => { if (vivo) setResultado({ data: d }); })
      .catch(() => { if (vivo) setResultado({ data: null }); });
    return () => { vivo = false; };
  }, [productoId]);

  const cargando = resultado === null;
  const data = resultado?.data ?? null;

  const fp = factorPresentacion != null && Number(factorPresentacion) > 1 ? Number(factorPresentacion) : 1;
  const uni = fp > 1 ? (simboloPresentacion ?? 'unidad') : 'unidad';

  const resumen = useMemo(() => {
    if (!data?.compras.length) return null;
    const costos = data.compras.map((c) => Number(c.costoUnitario) * fp);
    const minimo = Math.min(...costos);
    const maximo = Math.max(...costos);
    const ultimo = data.ultimoCosto != null ? Number(data.ultimoCosto) * fp : costos[0];
    // Contra la compra ANTERIOR, no contra el promedio: lo que interesa es si
    // el proveedor viene subiendo.
    const previo = costos.length > 1 ? costos[1] : null;
    const variacion = previo != null && previo > 0 ? ((ultimo - previo) / previo) * 100 : null;
    return { minimo, maximo, ultimo, variacion, hayRango: maximo - minimo > 0.0001 };
  }, [data, fp]);

  if (cargando) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-3 w-full animate-pulse rounded bg-gray-50" />)}
        </div>
      </div>
    );
  }

  // Sin compras no se muestra una card vacia: un producto recien creado no
  // necesita un bloque diciendo que no tiene historial.
  if (!data?.compras.length || !resumen) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Historial de compras</h3>
        <span className="text-[11px] text-gray-400">
          {data.compras.length} {data.compras.length === 1 ? 'compra' : 'compras'}
        </span>
      </div>

      {/* Lo que se viene a saber: a cuanto se compro la ultima vez y como
          viene la tendencia. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-slate-50/70 px-3.5 py-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Último costo</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#004A94]">{sim('PEN')} {resumen.ultimo.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400">/{uni}</span>
            {resumen.variacion != null && Math.abs(resumen.variacion) >= 0.5 && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                resumen.variacion > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}>
                {resumen.variacion > 0 ? '▲' : '▼'} {Math.abs(resumen.variacion).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        {resumen.hayRango && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Rango pagado</p>
            <p className="mt-0.5 text-xs text-gray-600">
              <strong className="text-green-700">{sim('PEN')} {resumen.minimo.toFixed(2)}</strong>
              <span className="mx-1 text-gray-300">—</span>
              <strong className="text-red-600">{sim('PEN')} {resumen.maximo.toFixed(2)}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* Ultimas compras */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Últimas compras</p>
          <div className="grid grid-cols-[66px_minmax(0,1fr)_66px_74px] gap-2 border-b border-gray-100 pb-1 text-[10px] font-semibold uppercase text-gray-400">
            <span>Fecha</span>
            <span>Proveedor</span>
            <span className="text-right">Cant.</span>
            <span className="text-right">Costo</span>
          </div>
          {data.compras.slice(0, 6).map((c, i) => {
            const costo = Number(c.costoUnitario) * fp;
            const esMinimo = resumen.hayRango && Math.abs(costo - resumen.minimo) < 0.0001;
            return (
              <div key={`${c.compraId}-${i}`} className="grid grid-cols-[66px_minmax(0,1fr)_66px_74px] items-center gap-2 border-b border-gray-50 py-1.5 text-[11px]">
                <span className="text-gray-500">{fecha(c.fecha)}</span>
                <span className="min-w-0 truncate text-gray-700">{c.proveedor}</span>
                <span className="text-right text-gray-500">
                  {c.usaUnidadCompra && c.cantidadOriginal != null
                    ? `${c.cantidadOriginal} ${c.unidadOriginalSimbolo ?? 'paq.'}`
                    : fp > 1 ? (c.cantidad / fp).toLocaleString('es-PE') : c.cantidad}
                </span>
                <span className={`text-right font-semibold ${esMinimo ? 'text-green-700' : 'text-gray-800'}`}>
                  {sim(c.moneda)} {costo.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Por proveedor */}
        {data.proveedores.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">A quién le comprás</p>
            <div className="flex flex-col gap-1.5">
              {data.proveedores.slice(0, 5).map((pv, i) => {
                const esMejor = pv.proveedorId != null && pv.proveedorId === data.mejorProveedorId;
                return (
                  <div
                    key={`${pv.proveedorId ?? pv.proveedor}-${i}`}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                      esMejor ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
                    }`}
                  >
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
                      <p className="text-[11px] font-bold text-gray-800">
                        {sim('PEN')} {(Number(pv.costoPromedio) * fp).toFixed(2)}
                      </p>
                      <p className="text-[9px] text-gray-400">promedio</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
