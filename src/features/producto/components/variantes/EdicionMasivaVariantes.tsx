'use client';

/**
 * Cargar stock, precios y mayoreo de TODAS las variantes en una grilla.
 *
 * Réplica de `edicion_masiva_stock_page.dart`. Nace de un pedido concreto de
 * JAYLI: cargar el precio por mayor de los edredones en bloque. Con 91
 * variantes, entrar a cada una no era una opción, y **no hay endpoint bulk de
 * niveles** — el de acá los mete en la misma transacción que stock y precios.
 *
 * Las tres cosas que hay que entender antes de tocar esto:
 *
 * 1. 🔴 **`+ Stock` es un DELTA, no el stock final.** Genera movimiento de
 *    kardex. Escribir 5 en una variante que tiene 20 la deja en 25.
 * 2. 🔴 **El mayoreo es GLOBAL a la variante.** `PrecioNivel` no tiene
 *    `sedeId`: precio y costo son de la sede elegida, pero el mayorista se
 *    aplica en todas. Por eso la confirmación lo dice explícito.
 * 3. 🔴 **Un mayorista bajo costo BLOQUEA** (decisión del user: bloquear, no
 *    avisar) y se compara contra el costo TECLEADO en esa misma fila si lo hay
 *    — cargando costo y mayorista juntos, comparar contra el viejo dejaría
 *    pasar el error. El "no baja del precio de lista" solo avisa: ese nivel es
 *    inofensivo, nada más que inútil, porque al cobrar gana el menor.
 */

import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import type { Producto, ProductoVariante, StockPorSedeInfo } from '@/core/types/producto';
import type { BulkEditarItem } from '@/core/types/stock';
import { bulkEditarStockPrecios } from '@/features/stock/services/stock-service';
import { UnidadPresentacion } from '@/core/utils/unidad-presentacion';
import { presentacionDeVariante } from '@/features/compras/utils/variantes-comprables';

const INPUT_CELDA =
  'h-[26px] w-full rounded-[4px] bg-white px-1.5 text-right text-[11px] text-[#004A94] ring-1 ring-blue-300 outline-none transition-shadow focus:ring-2 focus:ring-[#437EFF]';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Lo tecleado en una fila. Todo string: un input numérico vacío no es 0. */
interface Fila {
  agregarStock: string;
  precio: string;
  precioCosto: string;
  mayorDesde: string;
  mayorPrecio: string;
}

const FILA_VACIA: Fila = { agregarStock: '', precio: '', precioCosto: '', mayorDesde: '', mayorPrecio: '' };

const num = (s: string): number | null => {
  const v = parseFloat((s || '').replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

type Problema = 'bajoCosto' | 'inerte' | null;

interface Props {
  /** Hace falta para la presentacion: una variante sin la suya hereda la del producto. */
  producto: Producto;
  variantes: ProductoVariante[];
  sedeId: string;
  /** Para volver a pedir las variantes cuando se guarda. */
  onGuardado: () => void;
}

export default function EdicionMasivaVariantes({ producto, variantes, sedeId, onGuardado }: Props) {
  const [filas, setFilas] = useState<Record<string, Fila>>({});
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  // Lo que se aplica a todas de una: es lo que hace masiva la carga.
  const [todas, setTodas] = useState<Fila>(FILA_VACIA);

  // Cambiar de sede invalida lo tecleado: precio, costo y stock son de la sede
  // que estaba elegida, y aplicarlos a otra seria cargar numeros en la que no es.
  useEffect(() => { setFilas({}); }, [sedeId]);

  const stockDe = (v: ProductoVariante): StockPorSedeInfo | null =>
    v.stocksPorSede?.find(s => s.sedeId === sedeId) ?? null;

  const nivelDe = (v: ProductoVariante) =>
    (v.preciosNivel ?? []).find(n => n.tipoPrecio === 'PRECIO_FIJO' && n.precio != null) ?? null;

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return variantes;
    return variantes.filter(v =>
      `${v.nombre} ${v.sku} ${v.codigoEmpresa}`.toLowerCase().includes(t),
    );
  }, [variantes, busqueda]);

  const filaDe = (id: string): Fila => filas[id] ?? FILA_VACIA;

  const setCampo = (id: string, campo: keyof Fila, valor: string) =>
    setFilas(f => ({ ...f, [id]: { ...filaDe(id), [campo]: valor } }));

  /** Carga lo escrito arriba en todas las filas VISIBLES (respeta el filtro). */
  const aplicarATodas = () => {
    setFilas(f => {
      const siguiente = { ...f };
      for (const v of visibles) {
        const actual = siguiente[v.id] ?? FILA_VACIA;
        siguiente[v.id] = {
          agregarStock: todas.agregarStock || actual.agregarStock,
          precio: todas.precio || actual.precio,
          precioCosto: todas.precioCosto || actual.precioCosto,
          mayorDesde: todas.mayorDesde || actual.mayorDesde,
          mayorPrecio: todas.mayorPrecio || actual.mayorPrecio,
        };
      }
      return siguiente;
    });
  };

  /**
   * Qué problema tiene el mayorista de esta fila.
   *
   * El costo con el que compara es el TECLEADO si lo hay, no el vigente.
   */
  const problemaMayor = (v: ProductoVariante): Problema => {
    const f = filaDe(v.id);
    const mayor = num(f.mayorPrecio);
    if (mayor == null) return null;
    const st = stockDe(v);
    const costo = num(f.precioCosto) ?? (st?.precioCosto != null ? Number(st.precioCosto) : null);
    if (costo != null && mayor < costo) return 'bajoCosto';
    const lista = num(f.precio) ?? (st?.precio != null ? Number(st.precio) : null);
    if (lista != null && mayor >= lista) return 'inerte';
    return null;
  };

  const items: BulkEditarItem[] = useMemo(() => {
    const out: BulkEditarItem[] = [];
    for (const v of variantes) {
      const f = filas[v.id];
      if (!f) continue;
      const agregarStock = num(f.agregarStock);
      const precio = num(f.precio);
      const precioCosto = num(f.precioCosto);
      const mayorDesde = num(f.mayorDesde);
      const mayorPrecio = num(f.mayorPrecio);
      const algo = agregarStock || precio != null || precioCosto != null || (mayorDesde != null && mayorPrecio != null);
      if (!algo) continue;
      out.push({
        varianteId: v.id,
        ...(agregarStock ? { agregarStock } : {}),
        ...(precio != null ? { precio } : {}),
        ...(precioCosto != null ? { precioCosto } : {}),
        // Los dos juntos o ninguno: un "desde" sin precio no dice a cuánto.
        ...(mayorDesde != null && mayorPrecio != null
          ? { mayorCantidadMinima: mayorDesde, mayorPrecio }
          : {}),
      });
    }
    return out;
  }, [variantes, filas]);

  const bloqueadas = variantes.filter(v => problemaMayor(v) === 'bajoCosto');
  const inertes = variantes.filter(v => problemaMayor(v) === 'inerte');
  const conMayoreo = items.filter(i => i.mayorPrecio != null).length;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const r = await bulkEditarStockPrecios(sedeId, {
        items,
        motivo: 'Edición masiva de variantes desde la web',
      });
      setOk(`Listo: ${r.actualizados ?? items.length} variantes actualizadas.`);
      setFilas({});
      setTodas(FILA_VACIA);
      setConfirmar(false);
      onGuardado();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar');
      setConfirmar(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra: buscador + aplicar a todas */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-400/40">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Buscar variante</label>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, SKU o código…"
            className="h-[30px] w-full rounded-[6px] bg-zinc-100 px-3 text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200"
          />
        </div>

        <div className="flex flex-wrap items-end gap-1.5">
          <p className="mb-1.5 w-full text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Aplicar a las {visibles.length} visibles
          </p>
          {([
            ['agregarStock', '+ Stock'],
            ['precio', 'P.Venta'],
            ['precioCosto', 'Costo'],
            ['mayorDesde', 'Desde'],
            ['mayorPrecio', 'Mayor'],
          ] as Array<[keyof Fila, string]>).map(([campo, label]) => (
            <div key={campo} className="w-[74px]">
              <label className="mb-0.5 block text-[9px] text-gray-400">{label}</label>
              <input
                value={todas[campo]}
                onChange={e => setTodas(t => ({ ...t, [campo]: e.target.value }))}
                inputMode="decimal"
                className={INPUT_CELDA}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={aplicarATodas}
            className="inline-flex h-[26px] items-center rounded-[6px] bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]"
          >
            Aplicar
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-200"><p className="text-xs text-red-600">{error}</p></div>}
      {ok && <div className="rounded-lg bg-green-50 p-3 ring-1 ring-green-200"><p className="text-xs text-green-700">{ok}</p></div>}

      {bloqueadas.length > 0 && (
        <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-300">
          <p className="text-xs font-semibold text-red-700">
            {bloqueadas.length} {bloqueadas.length === 1 ? 'variante quedaría' : 'variantes quedarían'} con el precio por mayor BAJO SU COSTO
          </p>
          <p className="mt-0.5 text-[11px] text-red-600">
            No se puede guardar así. Están marcadas en rojo: {bloqueadas.slice(0, 4).map(v => v.nombre).join(' · ')}
            {bloqueadas.length > 4 ? ` y ${bloqueadas.length - 4} más` : ''}.
          </p>
        </div>
      )}
      {inertes.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-300">
          <p className="text-[11px] text-amber-800">
            {inertes.length} con un mayorista que <strong>no baja del precio de lista</strong>: se puede guardar, pero
            nunca se va a aplicar, porque al cobrar gana el menor.
          </p>
        </div>
      )}

      {/* La grilla */}
      <div className="overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-blue-400/40" style={{ maxHeight: 'calc(100vh - 24rem)' }}>
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 z-20 border-b border-[#cfe0f5] bg-[#eaf2fd]">
            <tr>
              <th className="w-px px-2 py-3 text-right font-medium text-[#004A94]">#</th>
              {/* La columna del nombre queda CONGELADA: con 91 variantes y seis
                  columnas de números, sin esto no se sabe qué fila se edita. */}
              <th className="sticky left-0 z-10 min-w-[220px] bg-[#eaf2fd] px-3 py-3 font-medium text-[#004A94]">Variante</th>
              <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Stock</th>
              <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">+ Stock</th>
              <th className="w-px whitespace-nowrap bg-green-100 px-2 py-3 text-center font-medium text-[#004A94]">P.Venta</th>
              <th className="w-px whitespace-nowrap bg-yellow-100 px-2 py-3 text-center font-medium text-[#004A94]">Costo</th>
              <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Desde</th>
              <th className="w-px whitespace-nowrap px-2 py-3 text-center font-medium text-[#004A94]">Mayor S/</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibles.map((v, i) => {
              const st = stockDe(v);
              const f = filaDe(v.id);
              const nivel = nivelDe(v);
              const problema = problemaMayor(v);
              // Un granel se guarda en gramos y se habla en kg: sin esto el
              // stock de la fila dice 28000 donde el app dice 28 kg.
              const dp = presentacionDeVariante(producto, v);
              const pres = new UnidadPresentacion(dp.factor, dp.simbolo);
              const tocada = !!filas[v.id];
              return (
                <tr
                  key={v.id}
                  className={
                    problema === 'bajoCosto'
                      ? 'bg-red-50'
                      : problema === 'inerte'
                        ? 'bg-amber-50/60'
                        : tocada
                          ? 'bg-blue-50/40'
                          : 'hover:bg-gray-50/50'
                  }
                >
                  <td className="px-2 py-1.5 text-right text-[10px] text-gray-300">{i + 1}</td>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 ${problema === 'bajoCosto' ? 'bg-red-50' : problema === 'inerte' ? 'bg-amber-50' : tocada ? 'bg-blue-50' : 'bg-white'}`}>
                    <p className="truncate font-medium text-gray-800">{v.nombre}</p>
                    <p className="truncate text-[10px] text-gray-400">
                      {v.sku}
                      {nivel && (
                        <span className="ml-1.5 rounded bg-violet-100 px-1 text-[9px] font-medium text-violet-700">
                          {nivel.cantidadMinima}+ {fmt(nivel.precio)}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center text-[11px] text-gray-600">
                    {st ? pres.cantidadTexto(st.cantidad ?? 0) : '—'}
                  </td>
                  <td className="px-2 py-1.5"><input value={f.agregarStock} onChange={e => setCampo(v.id, 'agregarStock', e.target.value)} inputMode="decimal" className={`${INPUT_CELDA} w-[68px]`} /></td>
                  <td className="bg-green-50 px-2 py-1.5">
                    <input value={f.precio} onChange={e => setCampo(v.id, 'precio', e.target.value)} inputMode="decimal" placeholder={st?.precio != null ? String(Number(st.precio)) : ''} className={`${INPUT_CELDA} w-[76px]`} />
                  </td>
                  <td className="bg-yellow-50 px-2 py-1.5">
                    <input value={f.precioCosto} onChange={e => setCampo(v.id, 'precioCosto', e.target.value)} inputMode="decimal" placeholder={st?.precioCosto != null ? String(Number(st.precioCosto)) : ''} className={`${INPUT_CELDA} w-[76px]`} />
                  </td>
                  <td className="px-2 py-1.5"><input value={f.mayorDesde} onChange={e => setCampo(v.id, 'mayorDesde', e.target.value)} inputMode="numeric" placeholder={nivel ? String(nivel.cantidadMinima) : ''} className={`${INPUT_CELDA} w-[62px]`} /></td>
                  <td className="px-2 py-1.5">
                    <input value={f.mayorPrecio} onChange={e => setCampo(v.id, 'mayorPrecio', e.target.value)} inputMode="decimal" placeholder={nivel?.precio != null ? String(Number(nivel.precio)) : ''} className={`${INPUT_CELDA} w-[76px] ${problema === 'bajoCosto' ? 'ring-red-500' : ''}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pie */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[11px] text-gray-500">
          {items.length === 0
            ? 'Todavía no cargaste nada.'
            : `${items.length} ${items.length === 1 ? 'variante' : 'variantes'} por actualizar${conMayoreo > 0 ? ` · ${conMayoreo} con mayoreo` : ''}.`}
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => { setFilas({}); setTodas(FILA_VACIA); }}
            disabled={items.length === 0 || guardando}
            className="inline-flex h-[30px] items-center rounded-[6px] px-3 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            disabled={items.length === 0 || bloqueadas.length > 0 || guardando}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[#004A94] px-3 text-[10px] font-medium text-white transition-colors hover:bg-[#003570] disabled:opacity-50"
            title={bloqueadas.length > 0 ? 'Hay variantes con el mayorista bajo costo' : undefined}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmar(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900">Guardar los cambios</h3>
            <p className="mt-2 text-[12px] text-gray-600">
              Se actualizan <strong>{items.length}</strong> {items.length === 1 ? 'variante' : 'variantes'} en esta sede.
            </p>
            {conMayoreo > 0 && (
              // 🔴 El aviso que no se puede sacar: el nivel no tiene sedeId.
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
                El precio por mayor de {conMayoreo} {conMayoreo === 1 ? 'variante' : 'variantes'} es
                <strong> global</strong>: se aplica en TODAS las sedes, no solo en esta. El stock, el precio y el costo
                sí son de la sede elegida.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmar(false)} disabled={guardando}
                className="inline-flex h-[30px] items-center rounded-[6px] px-3 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[#004A94] px-3 text-[10px] font-medium text-white hover:bg-[#003570] disabled:opacity-50">
                {guardando && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
