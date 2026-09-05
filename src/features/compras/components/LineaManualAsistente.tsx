'use client';

/**
 * Lo que aparece bajo una línea de compra SIN producto.
 *
 * Existe por un caso real del 05-09: se confirmó una compra cuya única línea
 * era manual y **no entró nada al inventario**. No fue un bug —
 * `compra.service.ts:485` saltea a propósito las líneas sin producto, que son
 * para servicios y cargos (un flete, una comisión)— pero el formulario no lo
 * decía en ningún lado, así que la impresora quedó comprada y en ningún lado.
 *
 * Entonces esta línea ahora hace tres cosas:
 *
 * 1. **Avisa** que así no entra al inventario.
 * 2. **Busca parecidos** mientras se escribe, y con un toque la línea se canjea
 *    por el producto del catálogo. Es el mismo aviso que la cotización, con la
 *    misma normalización a propósito.
 * 3. Ofrece **crear el producto** ahí mismo, que es lo que hace el app.
 */

import { useEffect, useState } from 'react';
import type { Producto } from '@/core/types/producto';
import { getProductos } from '@/features/producto/services/producto-service';
import { FILTROS_COMPRA } from './filtros-compra';

/**
 * Para comparar nombres "a ojo": sin mayúsculas, sin tildes y con los espacios
 * de más colapsados.
 *
 * 🔑 Es la MISMA normalización que usa el backend para llenar
 * `Producto.textoBusqueda` (`lower(unaccent(...))`) y la misma que
 * `CotizacionForm`. Si allá cambia, esto también.
 */
function normalizarNombre(v: string) {
  return v.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');
}

function miniatura(p: Producto): string | null {
  if (p.archivos?.length) return p.archivos[0].urlThumbnail || p.archivos[0].url;
  if (p.imagenes?.length) return p.imagenes[0];
  return null;
}

interface Props {
  descripcion: string;
  /** Canjea la línea manual por este producto del catálogo. */
  onUsar: (producto: Producto) => void;
  /** Abre el alta rápida con lo que ya escribió. */
  onCrear: () => void;
  /** Crear un producto pide `canManageProducts`. */
  puedeCrear: boolean;
  /** Para avisar cuál de los parecidos ya está cargado en esta misma compra. */
  yaEnLaCompra: (producto: Producto) => boolean;
}

export default function LineaManualAsistente({ descripcion, onUsar, onCrear, puedeCrear, yaEnLaCompra }: Props) {
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);

  /**
   * 🔴 Nada de `setState` en el cuerpo del efecto: la regla del compilador de
   * React lo rechaza (`react-hooks/set-state-in-effect`). Todo pasa DENTRO del
   * timeout, que ya es el rebote de 400 ms que hace falta igual para no
   * consultar en cada tecla.
   */
  useEffect(() => {
    const termino = descripcion.trim();
    let cancelado = false;
    // Corre también al PEGAR: el `onChange` del input dispara igual.
    const t = setTimeout(() => {
      if (termino.length < 3) { setResultados([]); setBuscando(false); return; }
      setBuscando(true);
      getProductos({ page: 1, limit: 6, search: termino, ...FILTROS_COMPRA })
        .then(r => { if (!cancelado) setResultados(r.data ?? []); })
        .catch(() => { if (!cancelado) setResultados([]); })
        .finally(() => { if (!cancelado) setBuscando(false); });
    }, 400);
    return () => { cancelado = true; clearTimeout(t); };
  }, [descripcion]);

  const exacto = resultados.find(
    p => normalizarNombre(p.nombre) === normalizarNombre(descripcion),
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-800">Esta línea no entra al inventario</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-amber-700">
            Sin producto, al confirmar la compra no se crea stock ni lote: sirve para un servicio o
            un cargo del proveedor. Si es mercadería, elegí uno de abajo o creá el producto.
          </p>
        </div>
      </div>

      {buscando && descripcion.trim().length >= 3 && (
        <p className="text-[10px] text-gray-400">Buscando en el catálogo…</p>
      )}

      {resultados.length > 0 && (
        <div className={`rounded-lg border p-2 ${exacto ? 'border-amber-300 bg-amber-50/60' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-[10px] font-semibold ${exacto ? 'text-amber-800' : 'text-gray-500'}`}>
            {exacto
              ? `"${exacto.nombre}" YA EXISTE en el catálogo`
              : 'Parecidos que ya están en el catálogo:'}
          </p>

          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {resultados.map(p => {
              const img = miniatura(p);
              const cargado = yaEnLaCompra(p);
              const conVariantes = p.tieneVariantes && (p.variantes?.length ?? 0) > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUsar(p)}
                  title={cargado ? 'Ya está en esta compra: se le suma la cantidad' : 'Usar este producto en lugar de la línea manual'}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:border-[#437EFF] hover:bg-blue-50/40"
                >
                  {img ? (
                    <img src={img} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8" />
                      </svg>
                    </div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-gray-800">{p.nombre}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[9px] text-gray-400">{p.codigoEmpresa}</span>
                      {cargado && (
                        <span className="rounded-full bg-blue-50 px-1.5 text-[9px] font-bold text-[#004A94]">ya en la compra</span>
                      )}
                      {conVariantes && (
                        <span className="rounded-full bg-purple-50 px-1.5 text-[9px] font-bold text-purple-700">variantes</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {puedeCrear && (
        <button
          type="button"
          onClick={onCrear}
          disabled={!descripcion.trim()}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[#004A94] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#003570] disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Crear este producto
        </button>
      )}
    </div>
  );
}
