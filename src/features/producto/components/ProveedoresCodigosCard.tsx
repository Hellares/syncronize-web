'use client';

/**
 * A quién se le compra este producto, con qué código lo codifica cada uno y a
 * cuánto salió la última vez.
 *
 * 🔑 El código se aprende SOLO al confirmar una compra que lo traiga. Esta
 * card es donde se mira y se CORRIGE: la línea de una compra vieja guarda el
 * código congelado —lo que decía el papel— y la equivalencia viva vive acá.
 *
 * Se esconde sola si el producto no tiene proveedores registrados: un producto
 * recién creado no necesita un bloque diciendo que no tiene ninguno.
 */

import { useEffect, useState } from 'react';
import {
  getProveedoresDeProducto,
  guardarAliasProveedor,
} from '@/features/compras/services/compra-service';
import type { ProveedorDeProducto } from '@/core/types/compra';
import { INPUT_STD } from '@/components/ui/dialogo';

interface Props {
  productoId: string;
  /** Sin permiso de edición la card es solo de lectura. */
  puedeEditar?: boolean;
}

const sim = (m?: string | null) => (m === 'USD' ? '$' : 'S/');
const fecha = (f: string) =>
  new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });

export default function ProveedoresCodigosCard({ productoId, puedeEditar = false }: Props) {
  // `null` = cargando todavía; `[]` = llegó y no hay ninguno (o no hay permiso).
  const [filas, setFilas] = useState<ProveedorDeProducto[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    getProveedoresDeProducto(productoId)
      .then((d) => { if (vivo) setFilas(d); })
      // 403 sin `VIEW_COMPRAS`: la card simplemente no aparece.
      .catch(() => { if (vivo) setFilas([]); })
      ;
    return () => { vivo = false; };
  }, [productoId]);

  const guardar = async (fila: ProveedorDeProducto) => {
    setGuardando(true);
    setError(null);
    try {
      await guardarAliasProveedor(fila.proveedorId, [
        {
          productoId,
          varianteId: fila.varianteId ?? null,
          // Vacío = BORRAR el código. `null` explícito, no cadena vacía: el
          // backend distingue "borralo" de "no lo toques".
          codigoProveedor: borrador.trim() ? borrador.trim() : null,
        },
      ]);
      setFilas((fs) =>
        (fs ?? []).map((f) =>
          f.id === fila.id
            ? { ...f, codigoProveedor: borrador.trim().toUpperCase() || null }
            : f,
        ),
      );
      setEditando(null);
    } catch (e) {
      // El backend responde 400 cuando el código ya es de otro producto de ese
      // proveedor. Ese mensaje se muestra tal cual: explica qué pasó.
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg.join(', ') : msg) || 'No se pudo guardar el código.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (filas === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-4 w-44 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-3 w-full animate-pulse rounded bg-gray-50" />)}
        </div>
      </div>
    );
  }

  if (filas.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Proveedores y códigos</h3>
        <span className="ml-auto text-[11px] text-gray-400">
          {filas.length} {filas.length === 1 ? 'proveedor' : 'proveedores'}
        </span>
      </div>

      <p className="mt-1 text-[11px] text-gray-400">
        El código con el que cada uno lo identifica en su factura. Con él cargado,
        al buscar el producto en una compra alcanza con tipearlo.
      </p>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <div className="mt-3 divide-y divide-gray-100">
        {filas.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-800">
                {f.proveedorNombre || 'Sin nombre'}
                {f.varianteNombre && (
                  <span className="ml-1 rounded bg-blue-50 px-1 py-0.5 text-[10px] font-bold text-[#004A94]">
                    {f.varianteNombre}
                  </span>
                )}
              </p>
              {f.descripcionProveedor && (
                <p className="truncate text-[10px] text-gray-400">
                  Él lo llama: {f.descripcionProveedor}
                </p>
              )}
            </div>

            {/* Lo que salió la última vez: es el número con el que se compara
                un proveedor contra otro. */}
            {f.ultimoPrecio != null && (
              <span className="shrink-0 text-[11px] text-gray-500">
                {sim(f.ultimaMoneda)} <strong className="text-gray-800">{f.ultimoPrecio.toFixed(2)}</strong>
                {f.ultimaCompraAt && (
                  <span className="ml-1 text-[10px] text-gray-400">{fecha(f.ultimaCompraAt)}</span>
                )}
              </span>
            )}

            {editando === f.id ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="w-[120px]">
                  <input
                    className={`${INPUT_STD} uppercase`}
                    value={borrador}
                    autoFocus
                    onChange={(e) => setBorrador(e.target.value)}
                    placeholder="Sin código"
                  />
                </div>
                <button
                  onClick={() => guardar(f)}
                  disabled={guardando}
                  className="rounded-lg bg-[#004A94] px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                >
                  {guardando ? '…' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditando(null); setError(null); }}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!puedeEditar}
                onClick={() => {
                  setEditando(f.id);
                  setBorrador(f.codigoProveedor ?? '');
                  setError(null);
                }}
                title={puedeEditar ? 'Editar el código' : undefined}
                className={`shrink-0 rounded px-2 py-1 font-mono text-[11px] ${
                  f.codigoProveedor
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-300 italic'
                } ${puedeEditar ? 'hover:ring-1 hover:ring-blue-400' : 'cursor-default'}`}
              >
                {f.codigoProveedor ?? 'sin código'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
