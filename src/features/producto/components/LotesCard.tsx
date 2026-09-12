'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTrazabilidad } from '@/features/producto/services/bom-service';
import type { TrazabilidadProducto } from '@/core/types/bom';
import { diasParaVencer, formatearDiaCalendario } from '@/core/types/lote';

type Lote = TrazabilidadProducto['lotes'][number];

interface Props {
  productoId: string;
  /** Acota a una variante cuando el producto las tiene. */
  varianteId?: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fecha = (f: string) =>
  new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });

/**
 * El lote está FÍSICAMENTE en el depósito: cuenta para el stock y el consumo
 * lo puede tomar. Espejo de `ESTADOS_LOTE_PRESENTE` del backend — un VENCIDO
 * sigue en el estante hasta que alguien lo dé de baja.
 */
const PRESENTE = (l: Lote) =>
  (l.estado === 'ACTIVO' || l.estado === 'VENCIDO') && l.cantidadActual > 0;

/**
 * Orden en que van a SALIR. Espejo exacto de `planificarFefo` del backend:
 * primero lo que vence antes; los sin fecha al final, del más viejo al más
 * nuevo.
 *
 * 🔑 Que esto se vea es el punto de la tarjeta. El sistema decide qué unidades
 * descuenta, pero quien va al estante agarra una caja con la mano: sin saber
 * cuál toca, el FEFO es una ficción contable.
 */
function ordenFefo(a: Lote, b: Lote): number {
  const va = a.fechaVencimiento;
  const vb = b.fechaVencimiento;
  if (va && vb) return new Date(va).getTime() - new Date(vb).getTime();
  if (va) return -1;
  if (vb) return 1;
  return new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime();
}

export default function LotesCard({ productoId, varianteId }: Props) {
  // 🔴 El resultado lleva ADENTRO la clave de lo que se pidió. Limpiarlo con
  // un `setResultado(null)` al entrar al efecto sería un setState síncrono en
  // el cuerpo del efecto, que el compilador de React no acepta; comparando la
  // clave se sabe si lo que hay en mano es de la variante que se está mirando
  // o de la anterior.
  const clave = `${productoId}|${varianteId ?? ''}`;
  const [resultado, setResultado] = useState<{ clave: string; lotes: Lote[] } | null>(null);
  const [verAgotados, setVerAgotados] = useState(false);

  useEffect(() => {
    let vivo = true;
    getTrazabilidad(productoId, varianteId ?? undefined)
      .then((d) => { if (vivo) setResultado({ clave, lotes: d.lotes ?? [] }); })
      .catch(() => { if (vivo) setResultado({ clave, lotes: [] }); });
    return () => { vivo = false; };
  }, [productoId, varianteId, clave]);

  /** Lo que hay en mano corresponde a lo que se está mirando ahora. */
  const alDia = resultado?.clave === clave;

  const { enFila, agotados, hayVencimientos } = useMemo(() => {
    const todos = alDia ? resultado.lotes : [];
    return {
      enFila: todos.filter(PRESENTE).sort(ordenFefo),
      agotados: todos.filter((l) => !PRESENTE(l)),
      hayVencimientos: todos.some((l) => l.fechaVencimiento),
    };
  }, [resultado, alDia]);

  // Sin lotes no se dibuja nada: una tarjeta diciendo "sin lotes" no le sirve
  // a nadie, y la mayoría del catálogo todavía no tiene.
  if (!alDia || (!enFila.length && !agotados.length)) return null;

  return (
    <div className="rounded-xl border border-[#d1e5ff] bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-[#004A94]">Lotes en stock</h3>
        <p className="text-[11px] text-gray-500">
          {hayVencimientos
            ? 'Sale primero el que vence antes'
            : 'Sale primero el más antiguo'}
        </p>
      </div>

      {enFila.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {enFila.map((l, i) => {
            const dias = diasParaVencer(l.fechaVencimiento);
            const vencido = dias != null && dias < 0;
            const porVencer = dias != null && dias >= 0 && dias <= 30;
            return (
              <div
                key={l.id ?? l.codigo}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 ${
                  vencido
                    ? 'bg-red-50 ring-1 ring-red-200'
                    : porVencer
                      ? 'bg-amber-50 ring-1 ring-amber-200'
                      : i === 0
                        ? 'bg-[#f5f9ff] ring-1 ring-[#d1e5ff]'
                        : 'bg-gray-50'
                }`}
              >
                {/* El que va a salir en la próxima venta. Es el dato que se
                    busca al ir al estante. */}
                {i === 0 && (
                  <span className="rounded bg-[#043261] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
                    SALE PRIMERO
                  </span>
                )}
                <span className="font-mono text-[11px] font-medium text-[#043261]">
                  {l.codigo}
                </span>
                <span className="text-[12px] font-semibold text-gray-900">
                  {l.cantidadActual}
                  <span className="font-normal text-gray-400"> de {l.cantidadInicial}</span>
                </span>
                {l.precioCosto != null && (
                  <span className="text-[11px] text-gray-600">
                    S/ {fmt(Number(l.precioCosto))} c/u
                  </span>
                )}
                {l.fechaVencimiento ? (
                  <span
                    className={`text-[11px] font-medium ${
                      vencido ? 'text-red-700' : porVencer ? 'text-amber-800' : 'text-gray-600'
                    }`}
                  >
                    {vencido
                      ? `venció el ${formatearDiaCalendario(l.fechaVencimiento, { mes: 'short' })}`
                      : `vence ${formatearDiaCalendario(l.fechaVencimiento, { mes: 'short' })} · ${dias} ${dias === 1 ? 'día' : 'días'}`}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">sin vencimiento</span>
                )}
                <span className="ml-auto truncate text-[10px] text-gray-500">
                  {[l.proveedor, `ingresó ${fecha(l.fechaIngreso)}`, l.varianteNombre]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-gray-500">
          No queda stock con lote: todo se agotó.
        </p>
      )}

      {agotados.length > 0 && (
        <>
          <button
            onClick={() => setVerAgotados((v) => !v)}
            className="mt-3 text-[11px] font-medium text-[#437EFF] hover:underline"
          >
            {verAgotados ? 'Ocultar' : `Ver ${agotados.length} agotado${agotados.length === 1 ? '' : 's'}`}
          </button>
          {verAgotados && (
            <div className="mt-2 space-y-1">
              {agotados.map((l) => (
                <div
                  key={l.id ?? l.codigo}
                  className="flex flex-wrap items-center gap-x-3 rounded-lg bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500"
                >
                  <span className="font-mono">{l.codigo}</span>
                  <span>{l.cantidadInicial} entraron</span>
                  {l.precioCosto != null && <span>S/ {fmt(Number(l.precioCosto))} c/u</span>}
                  {l.fechaVencimiento && <span>vencía {formatearDiaCalendario(l.fechaVencimiento, { mes: 'short' })}</span>}
                  <span className="ml-auto">{l.estado?.toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
