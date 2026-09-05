'use client';

/**
 * Arma un catálogo de varios productos y lo comparte en PDF o por WhatsApp.
 *
 * El caso: el cliente pregunta por edredones. Se busca EDREDONES, entran sus
 * variantes CON STOCK ya tildadas, se destildan las que no van, se agregan
 * otros productos si hace falta y sale un PDF con foto, precio y
 * características de cada uno.
 *
 * 🔴 Las variantes SIN stock también se listan, en gris y destildadas: sirven
 * para ofrecer lo que se trae por encargo, pero no entran solas.
 *
 * Es la misma herramienta que el abanico flotante del app, con el MISMO
 * documento de salida (`catalogo-pdf.ts`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Producto } from '@/core/types/producto';
import { fotosDe, infoPrecioEfectivo } from '@/core/types/producto';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as productoService from '@/features/producto/services/producto-service';
import { resolverMarca } from '@/features/configuracion-documentos/marca';
import { cargarImagenParaPdf, cargarImagenesParaPdf } from '@/core/pdf/imagenes-pdf';
import {
  construirCatalogoPdf,
  tarjetasDe,
  type ItemCatalogo,
  type MarcaCatalogo,
} from '@/features/producto/components/catalogo-pdf';
import EnviarPorWhatsappDialog from '@/features/whatsapp/components/EnviarPorWhatsappDialog';

/**
 * Tope duro de ítems. Existe para que un descuido no arme un PDF de mil
 * páginas, no para acotar un catálogo real: un producto con 91 variantes tiene
 * que entrar entero.
 */
const MAX_ITEMS = 200;
/** A partir de acá se avisa antes de armar: son muchas páginas y varios MB. */
const AVISAR_DESDE = 60;

const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const CAJA = 'rounded-[6px] ring-1 ring-blue-400/40 shadow-sm bg-white';

export default function CatalogoCompartirPage() {
  const { empresa, sedes } = useEmpresa();
  // La misma decisión que toma el app y la lista de productos: la sede activa
  // es la principal, y si no hay, la primera.
  const sedeId = useMemo(
    () => sedes.find((s) => s.esPrincipal)?.id ?? sedes[0]?.id,
    [sedes],
  );
  const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre;

  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [incluirPrecio, setIncluirPrecio] = useState(true);
  const [incluirCaracteristicas, setIncluirCaracteristicas] = useState(true);
  const [incluirCodigo, setIncluirCodigo] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const elegidos = items.filter((i) => i.elegido);
  /**
   * Lo que de verdad va a salir: un ítem con varias fotos elegidas aporta una
   * tarjeta por foto. Los topes y los avisos cuentan TARJETAS, que son las que
   * ocupan hoja y pesan.
   */
  const tarjetas = tarjetasDe(items);

  // El buscador espera a que dejen de escribir: una llamada por tecla llena la
  // red de pedidos que ya no importan.
  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const id = setTimeout(() => {
      productoService
        .getProductos({ page: 1, limit: 12, search: termino, sedeId })
        .then((res) => {
          if (!cancelado) setResultados(res.data);
        })
        .catch(() => {
          if (!cancelado) setResultados([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [busqueda, sedeId]);

  /**
   * Las fotos ya listas para el ítem. Entran TODAS tildadas: si el usuario
   * subió cinco fotos del mismo producto es porque quiere mostrarlas.
   *
   * 🔴 Van las MINIATURAS: el catálogo las mete en 4 cm y las de tamaño
   * completo solo engordan el PDF.
   */
  const fotosItem = (p: Parameters<typeof fotosDe>[0]) =>
    fotosDe(p, { miniatura: true }).map((url) => ({ url, elegida: true }));

  /** La primera foto, para la miniatura del buscador. */
  const fotoDe = (p: Producto): string | null =>
    fotosDe(p, { miniatura: true })[0] ?? null;

  /**
   * Trae la ficha COMPLETA y la convierte en renglones.
   *
   * 🔴 La card del listado no tiene atributos ni variantes, y sin eso el
   * catálogo saldría sin características.
   */
  const agregarProducto = useCallback(
    async (productoId: string) => {
      setTrabajando(true);
      setError(null);
      try {
        const p = await productoService.getProducto(productoId);
        const stockDe = (stocks?: { sedeId: string }[]) =>
          stocks?.find((s) => s.sedeId === sedeId) ?? stocks?.[0];

        const nuevos: ItemCatalogo[] = [];
        const variantes = p.variantes ?? [];
        if (p.tieneVariantes && variantes.length) {
          for (const v of variantes) {
            const st = stockDe(v.stocksPorSede) as
              | NonNullable<typeof v.stocksPorSede>[number]
              | undefined;
            nuevos.push({
              id: v.id,
              titulo: v.nombre,
              codigo: v.codigoEmpresa,
              // La variante no tiene descripción propia: va la del padre.
              descripcion: p.descripcion,
              // Sin fotos propias hereda las del padre, como en la lista.
              fotos: fotosItem(v.archivos?.length ? v : p),
              precio: (st ? infoPrecioEfectivo(st) : 0) ?? 0,
              stock: st?.cantidad ?? 0,
              caracteristicas: (v.atributosValores ?? [])
                .filter((av) => av.valor?.trim())
                .map((av) => [av.atributo.nombre, av.valor] as [string, string]),
              elegido: (st?.cantidad ?? 0) > 0,
            });
          }
        } else {
          const st = stockDe(p.stocksPorSede) as
            | NonNullable<typeof p.stocksPorSede>[number]
            | undefined;
          nuevos.push({
            id: p.id,
            titulo: p.nombre,
            codigo: p.codigoEmpresa,
            descripcion: p.descripcion,
            fotos: fotosItem(p),
            precio: (st ? infoPrecioEfectivo(st) : 0) ?? 0,
            stock: st?.cantidad ?? 0,
            caracteristicas: (p.atributosValores ?? [])
              .filter((av) => av.valor?.trim())
              .map((av) => [av.atributo.nombre, av.valor] as [string, string]),
            elegido: (st?.cantidad ?? 0) > 0,
          });
        }

        setItems((previos) => {
          // Sin repetidos: agregar dos veces el mismo producto no duplica su ficha.
          const yaEstan = new Set(previos.map((i) => i.id));
          const aSumar = nuevos.filter((n) => !yaEstan.has(n.id));
          const espacio = MAX_ITEMS - previos.length;
          if (aSumar.length > espacio) {
            setError(`El catálogo llega hasta ${MAX_ITEMS} ítems.`);
          }
          return [...previos, ...aSumar.slice(0, Math.max(0, espacio))];
        });
      } catch {
        setError('No se pudo cargar ese producto.');
      } finally {
        setTrabajando(false);
      }
    },
    [sedeId],
  );

  /** La marca con la que se presenta la empresa, más el logo ya bajado. */
  const marcaDelCatalogo = useCallback(async (): Promise<MarcaCatalogo> => {
    const marca = await resolverMarca({ empresa, sedeId, sedeNombre });
    return {
      ...marca,
      logo: marca.logoUrl ? await cargarImagenParaPdf(marca.logoUrl, { maxLado: 400 }) : null,
    };
  }, [empresa, sedeId, sedeNombre]);

  /** Baja las fotos y dibuja el PDF. Devuelve el documento sin guardarlo. */
  const armarPdf = useCallback(async () => {
    const marca = await marcaDelCatalogo();
    setProgreso('Descargando imágenes…');
    const imagenes = await cargarImagenesParaPdf(
      tarjetasDe(items).map((t) => t.fotoUrl ?? '').filter(Boolean),
      { onProgreso: (listas, total) => setProgreso(`Imágenes ${listas} de ${total}…`) },
    );
    setProgreso('Armando el PDF…');
    return construirCatalogoPdf({
      items,
      marca,
      imagenes,
      opciones: { incluirPrecio, incluirCaracteristicas, incluirCodigo },
    });
  }, [items, marcaDelCatalogo, incluirPrecio, incluirCaracteristicas, incluirCodigo]);

  /** Con muchos ítems se avisa y se deja decidir, en vez de colgar la pantalla. */
  const confirmarSiEsGrande = () =>
    tarjetas.length < AVISAR_DESDE ||
    window.confirm(
      `Son ${tarjetas.length} tarjetas: unas ${Math.ceil(tarjetas.length / 4)} páginas. ` +
        'Si cada uno tiene su propia foto puede tardar y pesar bastante.',
    );

  const descargar = async () => {
    if (!tarjetas.length || !confirmarSiEsGrande()) return;
    setTrabajando(true);
    setError(null);
    try {
      const doc = await armarPdf();
      doc.save('catalogo.pdf');
    } catch {
      setError('No se pudo armar el catálogo.');
    } finally {
      setTrabajando(false);
      setProgreso('');
    }
  };

  const abrirEnvio = () => {
    if (!tarjetas.length || !confirmarSiEsGrande()) return;
    setEnviando(true);
  };

  return (
    <div className="p-6 font-sans">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo para compartir</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Elegí productos y salen en un PDF con foto, precio y características
            {sedeNombre ? ` · precios de ${sedeNombre}` : ''}
          </p>
        </div>
        <Link
          href="/dashboard/productos"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a productos
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Buscador ── */}
        <div className={`${CAJA} p-3`}>
          <label className="mb-1 block text-[11px] font-medium text-gray-600">
            Agregar productos
          </label>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, marca o categoría"
            className={`${INPUT_STD} w-full`}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Si el producto tiene variantes entran todas: las que tienen stock ya tildadas.
          </p>

          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {buscando && <p className="text-[11px] text-gray-400">Buscando…</p>}
            {!buscando && busqueda.trim().length >= 2 && !resultados.length && (
              <p className="text-[11px] text-gray-400">Nada con ese nombre.</p>
            )}
            {resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarProducto(p.id)}
                disabled={trabajando}
                className="flex w-full items-center gap-2 rounded-[6px] p-1.5 text-left transition-colors hover:bg-blue-50 disabled:opacity-50"
              >
                <img
                  src={fotoDe(p) ?? ''}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded object-cover ring-1 ring-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-gray-800">
                    {p.nombre}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {p.tieneVariantes ? 'Con variantes' : p.codigoEmpresa}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-[#004A94]">+</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Lo que va al catálogo ── */}
        <div className={`${CAJA} p-3`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-600">
              {elegidos.length} de {items.length} en el catálogo
              {tarjetas.length !== elegidos.length && ` · ${tarjetas.length} tarjetas`}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              {(
                [
                  ['Precio', incluirPrecio, setIncluirPrecio],
                  ['Características', incluirCaracteristicas, setIncluirCaracteristicas],
                  ['Código', incluirCodigo, setIncluirCodigo],
                ] as const
              ).map(([etiqueta, valor, set]) => (
                <label
                  key={etiqueta}
                  className="flex cursor-pointer items-center gap-1 text-[11px] text-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={valor}
                    onChange={(e) => set(e.target.checked)}
                    className="accent-[#004A94]"
                  />
                  {etiqueta}
                </label>
              ))}
              {items.length > 0 && (
                <button
                  onClick={() => setItems([])}
                  className="text-[11px] font-medium text-red-600 hover:underline"
                >
                  Vaciar
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="py-12 text-center text-xs text-gray-400">
              Todavía no agregaste productos. Buscá uno a la izquierda.
            </p>
          ) : (
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {items.map((it) => {
                const sinStock = it.stock <= 0;
                const fotosElegidas = it.fotos.filter((f) => f.elegida).length;
                return (
                  <div
                    key={it.id}
                    className="rounded-[6px] p-1.5 ring-1 ring-gray-100"
                  >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.elegido}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, elegido: e.target.checked } : x,
                          ),
                        )
                      }
                      className="accent-[#004A94]"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[11px] font-medium ${
                          sinStock ? 'text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {it.titulo}
                      </span>
                      <span
                        className={`block text-[10px] ${
                          sinStock ? 'text-amber-700' : 'text-gray-400'
                        }`}
                      >
                        {`S/ ${it.precio.toFixed(2)}`}
                        {' · '}
                        {/* 🔴 Lo que no tiene stock se ve distinto ANTES de mandarlo. */}
                        {sinStock ? 'sin stock' : `stock ${it.stock}`}
                        {it.caracteristicas.length
                          ? ` · ${it.caracteristicas.length} caract.`
                          : ''}
                      </span>
                    </span>
                    <button
                      onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                      className="px-1 text-xs text-gray-400 hover:text-red-600"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 🔴 Con VARIAS fotos, cada una es un color o un dibujo del
                      mismo producto: sale una tarjeta por foto tildada, con los
                      mismos datos. Acá se elige cuáles van. */}
                  {it.fotos.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6">
                      {it.fotos.map((f, i) => (
                        <button
                          key={f.url}
                          onClick={() =>
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id
                                  ? {
                                      ...x,
                                      fotos: x.fotos.map((y, j) =>
                                        j === i ? { ...y, elegida: !y.elegida } : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          title={f.elegida ? 'Sale en el catálogo' : 'No sale'}
                          className={`h-11 w-11 overflow-hidden rounded ring-2 transition-all ${
                            f.elegida
                              ? 'ring-[#004A94] opacity-100'
                              : 'ring-gray-200 opacity-40 grayscale'
                          }`}
                        >
                          <img src={f.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                      <span className="text-[10px] text-gray-400">
                        {fotosElegidas > 1
                          ? `${fotosElegidas} tarjetas, una por diseño`
                          : 'una tarjeta'}
                      </span>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
          {progreso && <p className="mt-2 text-[11px] text-gray-500">{progreso}</p>}

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={descargar}
              disabled={trabajando || !tarjetas.length}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
            >
              {trabajando ? 'Armando…' : `Descargar PDF (${tarjetas.length})`}
            </button>
            <button
              onClick={abrirEnvio}
              disabled={trabajando || !tarjetas.length}
              className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#1da851] disabled:opacity-50"
            >
              Enviar por WhatsApp
            </button>
          </div>
        </div>
      </div>

      {enviando && (
        <EnviarPorWhatsappDialog
          titulo="Enviar catálogo"
          textoInicial="Hola, te comparto nuestro catálogo de productos."
          ayudaNumero="El catálogo se manda a quien pregunta: no hace falta que sea un cliente registrado."
          adjunto={{
            nombre: 'catalogo.pdf',
            detalle: `${tarjetas.length} ${tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'}`,
            tipo: 'pdf',
            // Se arma al enviar: si cancelan, no se bajó una sola foto de más.
            construir: async () => (await armarPdf()).output('blob'),
          }}
          onClose={() => {
            setEnviando(false);
            setProgreso('');
          }}
        />
      )}
    </div>
  );
}
