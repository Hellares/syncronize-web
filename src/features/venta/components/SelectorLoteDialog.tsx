'use client';

import { useMemo } from 'react';
import type { LoteVendible } from '@/core/types/venta';

interface Props {
  titulo: string;
  /** Unidades de la línea: define si un lote alcanza solo o arrastra otro. */
  cantidad: number;
  lotes: LoteVendible[] | undefined;
  cargando: boolean;
  /** El lote elegido a mano, o null si la línea va en automático. */
  elegido: string | null;
  onElegir: (lote: LoteVendible | null) => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dia = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

/** Días que faltan para el vencimiento. Negativo = ya venció. */
function diasPara(iso: string | null): number | null {
  if (!iso) return null;
  const hoy = new Date(new Date().toDateString()).getTime();
  return Math.round((new Date(iso).getTime() - hoy) / 86_400_000);
}

/**
 * Elegir de QUÉ lote sale esta línea.
 *
 * 🔑 El caso: se compró a dos proveedores para dos clientes distintos. FEFO
 * parte de que una unidad es intercambiable con otra, y cuando la mercadería
 * se compró por encargo eso deja de ser cierto: esa caja tiene dueño y su
 * costo es otro. Sin esto, al cliente de la compra cara se le cobra el costo
 * de la barata y se le descuenta la mercadería al otro.
 *
 * 🔴 No es un permiso para saltear vencimientos. Se listan también los
 * VENCIDOS —siguen siendo mercadería del estante y el cajero tiene que verlos
 * para entender por qué la venta le pide autorización— y se avisa cuando la
 * elección deja atrás algo que caduca antes.
 */
export default function SelectorLoteDialog({
  titulo, cantidad, lotes, cargando, elegido, onElegir, onClose,
}: Props) {
  // El que FEFO tomaría primero: el primero de la lista, que ya viene ordenada.
  const primeroFefo = lotes?.[0] ?? null;

  const aviso = useMemo(() => {
    if (!elegido || !lotes?.length) return null;
    const el = lotes.find((l) => l.loteId === elegido);
    if (!el) return null;
    // ¿Hay alguno que caduca ANTES del elegido y se queda en el estante?
    const antes = lotes.filter((l) => {
      if (l.loteId === el.loteId || !l.fechaVencimiento) return false;
      if (!el.fechaVencimiento) return true;
      return new Date(l.fechaVencimiento) < new Date(el.fechaVencimiento);
    });
    if (!antes.length) return null;
    return `Quedan ${antes.length === 1 ? 'un lote que caduca' : `${antes.length} lotes que caducan`} antes en el estante`;
  }, [elegido, lotes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}>

        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#004A94]">De qué lote sale</h3>
          <p className="truncate text-[11px] text-gray-600">{titulo}</p>
          <p className="text-[10px] text-gray-400">
            {cantidad} {cantidad === 1 ? 'unidad' : 'unidades'} · el costo cambia con el lote
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargando && !lotes ? (
            <p className="py-10 text-center text-xs text-gray-500">Cargando lotes…</p>
          ) : !lotes?.length ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">
              Este producto no tiene lotes con mercadería en esta sede.
            </p>
          ) : (
            <>
              {/* Volver a FEFO. Va PRIMERO y marcado como lo normal: elegir a
                  mano es la excepción, no el camino que se recorre siempre. */}
              <button onClick={() => onElegir(null)}
                className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left hover:bg-[#f5f9ff] ${!elegido ? 'bg-[#f0f6ff]' : ''}`}>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${!elegido ? 'border-[#004A94] bg-[#004A94]' : 'border-gray-300'}`}>
                  {!elegido && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-[#043261]">Automático</span>
                  <span className="block text-[10px] text-gray-500">
                    Sale primero lo que vence antes
                    {primeroFefo && ` · hoy sería ${primeroFefo.codigo}`}
                  </span>
                </span>
              </button>

              {lotes.map((l, i) => {
                const dias = diasPara(l.fechaVencimiento);
                const vencido = dias != null && dias < 0;
                const porVencer = dias != null && dias >= 0 && dias <= 30;
                const sel = elegido === l.loteId;
                const alcanza = l.cantidadActual >= cantidad;
                return (
                  <button key={l.loteId} onClick={() => onElegir(l)}
                    className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-[#f5f9ff] ${sel ? 'bg-[#f0f6ff]' : ''}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${sel ? 'border-[#004A94] bg-[#004A94]' : 'border-gray-300'}`}>
                      {sel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-[11px] font-medium text-[#043261]">{l.codigo}</span>
                        {i === 0 && (
                          <span className="shrink-0 rounded bg-[#e8f2ff] px-1 py-px text-[8px] font-bold uppercase tracking-wide text-[#004A94]">
                            sale primero
                          </span>
                        )}
                        {vencido && (
                          <span className="shrink-0 rounded bg-red-50 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-red-600">
                            vencido
                          </span>
                        )}
                        {porVencer && (
                          <span className="shrink-0 rounded bg-amber-50 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-amber-700">
                            {dias === 0 ? 'vence hoy' : `${dias}d`}
                          </span>
                        )}
                      </span>

                      <span className="block truncate text-[10px] text-gray-500">
                        {[
                          l.proveedorNombre,
                          l.documentoProveedor ?? l.compraCodigo,
                          dia(l.fechaIngreso),
                          l.fechaVencimiento && !vencido && !porVencer ? `vence ${dia(l.fechaVencimiento)}` : null,
                          l.cantidadBonificada > 0 ? `${l.cantidadBonificada} de regalo en el costo` : null,
                        ].filter(Boolean).join(' · ')}
                      </span>

                      {/* 🔴 Un lote que no alcanza no es un error, pero el
                          cajero tiene que saber que el resto sale por FEFO y a
                          otro costo ANTES de prometerle un precio al cliente. */}
                      {!alcanza && (
                        <span className="block text-[10px] font-medium text-amber-700">
                          Alcanza para {l.cantidadActual} de {cantidad}: el resto sale del siguiente
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[12px] font-semibold text-gray-900">S/ {fmt(l.costoUnitario)}</span>
                      <span className="block text-[10px] text-gray-400">quedan {l.cantidadActual}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {aviso && (
          <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[10px] text-amber-800">
            {aviso}. Si no es mercadería encargada, conviene sacar eso primero.
          </p>
        )}

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
