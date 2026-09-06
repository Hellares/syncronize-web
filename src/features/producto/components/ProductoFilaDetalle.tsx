'use client';

/**
 * Lo que se ve al desplegar una fila de la lista de productos.
 *
 * Nace de dos agujeros de la tabla:
 *
 * 1. Las columnas que se ocultan por ancho (Código en `md`, Categoría y Marca
 *    en `lg`) simplemente DESAPARECÍAN: en un celular no había forma de ver el
 *    código de un producto sin entrar al detalle.
 * 2. El precio y el stock de la fila son los de UNA sede, y en la tabla no se
 *    ve de cuál ni cuánto hay en las otras. Acá se listan todas las que trae
 *    el listado.
 *
 * Casi todo sale del `Producto` que ya está en memoria. La única llamada son
 * los NIVELES DE PRECIO, que el listado no trae: se piden al desplegar, una vez
 * por producto abierto. Por eso el componente se monta recién al abrir la fila
 * --si estuviera montado y escondido, entrar a la pantalla dispararía 20
 * requests que nadie pidió--.
 */

import Link from 'next/link';
import type { Producto, StockPorSedeInfo } from '@/core/types/producto';
import { infoLiquidacionActiva, infoOfertaActiva, simboloUnidad } from '@/core/types/producto';
import { presentacionPlana } from '@/core/utils/unidad-presentacion';
import { usePrecioNiveles } from '../hooks/use-precio-niveles';
import type { AccionMenu } from '@/components/ui/MenuAcciones';

interface Props {
  producto: Producto;
  /** La sede activa: la que manda en el bloque de precios. */
  sedeId?: string;
  /**
   * Todas las acciones de la fila. Se dibujan como botones con texto SOLO en
   * pantalla chica: ahí los iconos de 28 px de la fila no se pueden apuntar
   * con el dedo, y el menú "⋯" obliga a dos toques para cada cosa.
   */
  acciones?: AccionMenu[];
  /** El costo es plata que no todos pueden ver. */
  puedeVerCosto?: boolean;
}

function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 leading-7">
      <span className="w-[86px] shrink-0 text-[11px] text-gray-400">{etiqueta}</span>
      <span className={`text-[11px] font-medium text-gray-700 ${mono ? 'font-mono' : ''}`}>
        {valor || <span className="font-sans text-gray-300">—</span>}
      </span>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    // El ring gris casi no se ve sobre el fondo del desplegable: degradado y
    // borde azules, como los bloques de cuentas por cobrar y cotizaciones.
    <div className="rounded-lg bg-gradient-to-br from-white to-blue-100 p-3 shadow-sm ring-1 ring-[#004A94]/50">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#004A94]">{titulo}</p>
      {children}
    </div>
  );
}

export default function ProductoFilaDetalle({ producto: p, sedeId, acciones = [], puedeVerCosto = false }: Props) {
  const pres = presentacionPlana(p);
  const sedes: StockPorSedeInfo[] = p.stocksPorSede ?? [];
  const deLaSede = (sedeId ? sedes.find((s) => s.sedeId === sedeId) : sedes[0]) ?? null;

  const enLiq = deLaSede ? infoLiquidacionActiva(deLaSede) : false;
  const enOferta = deLaSede ? infoOfertaActiva(deLaSede) : false;

  // Un producto CON variantes no tiene precio propio: el suyo vive en cada
  // variante. Mostrar el de la primera sería un número que no representa nada
  // --el mismo motivo por el que la columna Precio de la fila dice "—"--.
  const precioPorVariante = p.tieneVariantes;

  /**
   * Los niveles NO vienen en el listado: se piden acá, y solo cuando la fila se
   * despliega --este componente se monta recién ahí--.
   *
   * En un producto con variantes se pasa `null` a propósito: sus niveles son de
   * cada variante, y los del padre serían una lista vacía o, peor, la que se
   * copió a las 91 variantes al generarlas. El hook con `null` no llama a nada.
   */
  const { niveles, isLoading: cargandoNiveles } = usePrecioNiveles(p.tieneVariantes ? null : p.id);
  // Un nivel apagado no se cobra: mostrarlo haría creer que sí.
  const nivelesActivos = niveles
    .filter((n) => n.isActive)
    .sort((a, b) => a.orden - b.orden || a.cantidadMinima - b.cantidadMinima);

  return (
    <div className="bg-[#f9fbff] px-4 pb-4 pt-1 sm:pl-12">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Grupo titulo="Ficha">
          <Dato etiqueta="Código" valor={p.codigoEmpresa} mono />
          {p.sku && <Dato etiqueta="SKU" valor={p.sku} mono />}
          {p.codigoBarras && <Dato etiqueta="Cód. barras" valor={p.codigoBarras} mono />}
          <Dato etiqueta="Categoría" valor={p.categoria?.nombre} />
          <Dato etiqueta="Marca" valor={p.marca?.nombre} />
          <Dato
            etiqueta="Presentación"
            valor={pres.activa ? `${pres.simboloVisible} (${pres.factor} ${simboloUnidad(p.unidadMedida) ?? ''})` : simboloUnidad(p.unidadMedida)}
          />
        </Grupo>

        <Grupo titulo="Stock por sede">
          {sedes.length ? (
            <div className="flex flex-wrap gap-1.5">
              {sedes.map((s) => (
                <span
                  key={s.sedeId}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${
                    s.sedeId === sedeId ? 'bg-white text-[#004A94] ring-1 ring-[#004A94]/40' : 'bg-white/70 text-slate-600'
                  }`}
                  title={s.ubicacion ? `Ubicación: ${s.ubicacion}` : undefined}
                >
                  {s.sedeNombre}
                  <strong className="font-bold text-slate-900">{pres.cantidadTexto(s.cantidad ?? 0)}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">Sin stock cargado en ninguna sede.</p>
          )}
          <div className="mt-2">
            <Dato
              etiqueta="Mínimo"
              valor={deLaSede?.stockMinimo != null ? pres.cantidadTexto(deLaSede.stockMinimo) : 'sin definir'}
            />
            {deLaSede?.ubicacion && <Dato etiqueta="Ubicación" valor={deLaSede.ubicacion} />}
          </div>
        </Grupo>

        <Grupo titulo={deLaSede ? `Precios · ${deLaSede.sedeNombre}` : 'Precios'}>
          {precioPorVariante ? (
            <p className="text-[11px] text-gray-500">
              El precio vive en cada variante.{' '}
              <Link href={`/dashboard/productos/${p.id}/variantes`} className="font-medium text-[#437EFF] hover:underline">
                Ver las variantes
              </Link>
            </p>
          ) : (
            <>
              <Dato
                etiqueta="Venta"
                valor={deLaSede?.precio != null ? pres.precioTexto(Number(deLaSede.precio)) : null}
              />
              {enLiq && deLaSede?.precioLiquidacion != null && (
                <Dato etiqueta="Liquidación" valor={pres.precioTexto(Number(deLaSede.precioLiquidacion))} />
              )}
              {enOferta && deLaSede?.precioOferta != null && (
                <Dato etiqueta="Oferta" valor={pres.precioTexto(Number(deLaSede.precioOferta))} />
              )}
              {puedeVerCosto && (
                <Dato
                  etiqueta="Costo"
                  valor={deLaSede?.precioCosto != null ? pres.precioTexto(Number(deLaSede.precioCosto)) : null}
                />
              )}
              {deLaSede && !deLaSede.precioConfigurado && (
                <p className="mt-1 text-[10px] text-amber-600">Esta sede todavía no tiene precio configurado.</p>
              )}
            </>
          )}
        </Grupo>

        {/* 🔴 El nivel es GLOBAL: `PrecioNivel` no tiene `sedeId`, así que el
            mayorista es el mismo en todas las sedes --por eso este bloque no
            dice de qué sede es, a diferencia del de al lado--. */}
        <Grupo titulo="Niveles de precio">
          {precioPorVariante ? (
            <p className="text-[11px] text-gray-500">
              Los niveles son de cada variante.{' '}
              <Link href={`/dashboard/productos/${p.id}/mayoreo`} className="font-medium text-[#437EFF] hover:underline">
                Ver el mayoreo
              </Link>
            </p>
          ) : cargandoNiveles ? (
            <div className="flex items-center gap-2 py-1 text-[11px] text-gray-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-[#437EFF]" />
              Cargando…
            </div>
          ) : nivelesActivos.length === 0 ? (
            <p className="text-[11px] text-gray-400">Sin niveles: se vende siempre al precio de lista.</p>
          ) : (
            <div className="space-y-1">
              {nivelesActivos.map((n) => (
                <div key={n.id} className="flex items-baseline gap-2 text-[11px] leading-6">
                  <span className="min-w-0 flex-1 truncate text-gray-700">{n.nombre}</span>
                  {/* El rango se lee en la unidad de PRESENTACIÓN, igual que el
                      stock: en un granel "desde 5" son 5 kg, no 5 gramos. */}
                  <span className="shrink-0 whitespace-nowrap text-gray-400">
                    {pres.cantidadTexto(n.cantidadMinima)}
                    {n.cantidadMaxima ? `–${pres.cantidadTexto(n.cantidadMaxima)}` : '+'}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-medium">
                    {n.tipoPrecio === 'PRECIO_FIJO' ? (
                      <span className="text-green-600">{pres.precioTexto(Number(n.precio))}</span>
                    ) : (
                      <span className="text-blue-600">{n.porcentajeDesc}% desc.</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Grupo>
      </div>

      {/* Los mismos botones de la fila, con texto y área de dedo. Solo en
          pantalla chica: en grande ya están arriba como iconos. */}
      {acciones.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:hidden">
          {acciones.map((a) => {
            const clases = `inline-flex h-11 items-center justify-center gap-2 rounded-[6px] bg-white px-3 text-[11px] font-medium ring-1 transition-colors ${
              a.peligro ? 'text-red-700 ring-red-200' : 'text-gray-700 ring-[#dbe4f0] hover:ring-blue-400'
            }`;
            const contenido = (
              <>
                <span className={a.peligro ? 'text-red-400' : 'text-gray-400'}>{a.icono}</span>
                {a.label}
              </>
            );
            return a.href ? (
              <Link key={a.id} href={a.href} className={clases}>
                {contenido}
              </Link>
            ) : (
              <button key={a.id} type="button" onClick={a.onClick} className={clases}>
                {contenido}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
