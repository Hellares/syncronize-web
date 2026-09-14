'use client';

import { useEffect, useState } from 'react';
import type { LoteSalida } from '@/core/types/lote';
import { diasParaVencer, formatearDiaCalendario } from '@/core/types/lote';
import * as stockService from '../services/stock-service';

interface Props {
  productoStockId: string;
  /** Unidades que salen, en positivo. */
  cantidad: number;
  /** El lote elegido, o null = automatico (FEFO). */
  value: string | null;
  onChange: (loteId: string | null) => void;
  inputClassName: string;
  labelClassName: string;
}

/**
 * De que lote sale un ajuste de salida (merma, perdida, baja, donacion...).
 *
 * 🔑 Sin esto la salida siempre tomaba el lote que FEFO pone primero, y quien
 * va al estante agarra una caja concreta: la merma de la caja rota tiene que
 * descontarse de ESE lote, no del mas viejo.
 *
 * Se muestra el reparto tambien en automatico: aunque no se elija, se ve de
 * que lotes van a salir las unidades antes de confirmar.
 *
 * Con el motor de lotes apagado el backend devuelve la lista vacia y esto no
 * se dibuja: sin conciliar, las cantidades de los lotes estan infladas.
 */
export default function LoteSalidaSelect({
  productoStockId, cantidad, value, onChange, inputClassName, labelClassName,
}: Props) {
  // El resultado lleva adentro el stock que se pidio: asi se sabe si lo que
  // hay en mano es de este producto o del anterior, sin limpiar el estado con
  // un setState sincronico dentro del efecto.
  const [resultado, setResultado] = useState<{ id: string; lotes: LoteSalida[] } | null>(null);

  useEffect(() => {
    let vivo = true;
    stockService.getLotesSalida(productoStockId)
      .then((r) => { if (vivo) setResultado({ id: productoStockId, lotes: r.motorActivo ? r.lotes : [] }); })
      // Sin lotes no hay selector: el ajuste sigue funcionando en automatico.
      .catch(() => { if (vivo) setResultado({ id: productoStockId, lotes: [] }); });
    return () => { vivo = false; };
  }, [productoStockId]);

  const lotes = resultado?.id === productoStockId ? resultado.lotes : [];
  if (!lotes.length) return null;

  const elegido = value ? lotes.find((l) => l.id === value) ?? null : null;

  // El mismo reparto que hace el backend: el elegido SOLO (si no alcanza se
  // rechaza), o los lotes en orden FEFO.
  const tramos: Array<{ codigo: string; cantidad: number }> = [];
  let resto = cantidad;
  for (const l of elegido ? [elegido] : lotes) {
    if (resto <= 0) break;
    const toma = Math.min(l.cantidadActual, resto);
    tramos.push({ codigo: l.codigo, cantidad: toma });
    resto -= toma;
  }
  const noAlcanza = elegido != null && elegido.cantidadActual < cantidad;

  return (
    <div>
      <label className={labelClassName}>Lote</label>
      <select className={inputClassName} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Automatico: sale primero el que vence antes</option>
        {lotes.map((l, i) => {
          const dias = diasParaVencer(l.fechaVencimiento);
          const partes = [
            l.codigo,
            `quedan ${l.cantidadActual}`,
            dias != null && dias < 0
              ? 'VENCIDO'
              : l.fechaVencimiento ? `vence ${formatearDiaCalendario(l.fechaVencimiento)}` : null,
            i === 0 ? 'sale primero' : null,
          ];
          return (
            <option key={l.id} value={l.id}>{partes.filter(Boolean).join(' · ')}</option>
          );
        })}
      </select>
      {cantidad > 0 && (
        <p className={noAlcanza ? 'mt-1 text-[11px] text-red-600' : 'mt-1 text-[11px] text-gray-600'}>
          {noAlcanza
            ? `El lote ${elegido.codigo} tiene ${elegido.cantidadActual}: no alcanza para ${cantidad}`
            : `Sale de: ${tramos.map((t) => `${t.codigo} (${t.cantidad})`).join(' + ')}${resto > 0 ? ` · ${resto} sin lote` : ''}`}
        </p>
      )}
    </div>
  );
}
