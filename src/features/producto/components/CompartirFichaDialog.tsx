'use client';

/**
 * Vista previa de la ficha de un producto y su envío.
 *
 * 🔑 La vista previa NO es una aproximación: el `<canvas>` que se ve ES la
 * imagen que se manda. Lo que el cliente recibe es exactamente esto.
 *
 * Los interruptores dejan sacar el precio, las características o el código sin
 * tocar el diseño — la misma pantalla que el app.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductoVariante } from '@/core/types/producto';
import { fotosDe, infoPrecioEfectivo } from '@/core/types/producto';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as productoService from '@/features/producto/services/producto-service';
import { resolverMarca } from '@/features/configuracion-documentos/marca';
import EnviarPorWhatsappDialog from '@/features/whatsapp/components/EnviarPorWhatsappDialog';
import { dibujarFicha, fichaABlob, type DatosFicha } from './ficha-canvas';

interface Props {
  /** Un producto, por id: la fila del listado no trae la ficha completa. */
  productoId?: string;
  /**
   * O una VARIANTE ya cargada, que es lo que se comparte cuando el producto
   * tiene variantes: es la que tiene el precio y los atributos que preguntaron.
   * La lista ya la trae entera, así que acá no se pide nada.
   */
  variante?: ProductoVariante | null;
  /** Los precios y el stock son DE UNA SEDE. */
  sedeId?: string;
  sedeNombre?: string | null;
  onClose: () => void;
}

export default function CompartirFichaDialog({
  productoId,
  variante,
  sedeId,
  sedeNombre,
  onClose,
}: Props) {
  const { empresa } = useEmpresa();
  const lienzo = useRef<HTMLCanvasElement>(null);

  const [datos, setDatos] = useState<DatosFicha | null>(null);
  /**
   * Todas las fotos del producto y cuál se manda.
   *
   * 🔴 Con varias, cada una suele ser un COLOR o un DIBUJO distinto del mismo
   * artículo. Antes se mandaba la primera sin preguntar y el resto no existía.
   */
  const [fotos, setFotos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incluirPrecio, setIncluirPrecio] = useState(true);
  const [incluirCaracteristicas, setIncluirCaracteristicas] = useState(true);
  const [incluirCodigo, setIncluirCodigo] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // 🔴 La fila del listado NO trae atributos: se pide la ficha completa, igual
  // que hace el botón de stock. Sin esto la imagen saldría sin características.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        // 🔴 El precio sale del stock de la SEDE elegida; si esa sede no tiene
        // precio, cae al primer stock que sí lo tenga. Sin eso, algo con precio
        // solo en otra sede se compartiría en S/ 0.
        const stockDe = (stocks?: { sedeId: string; precio?: number }[]) =>
          stocks?.find((s) => s.sedeId === sedeId && s.precio != null) ??
          stocks?.find((s) => s.precio != null) ??
          stocks?.[0];

        const marca = await resolverMarca({ empresa, sedeId, sedeNombre });
        // La variante ya viene entera de la lista; el producto hay que pedirlo.
        const p = variante ?? (productoId ? await productoService.getProducto(productoId) : null);
        if (cancelado || !p) return;

        const st = stockDe(p.stocksPorSede) as
          | NonNullable<typeof p.stocksPorSede>[number]
          | undefined;
        const precio = (st ? infoPrecioEfectivo(st) : 0) ?? 0;
        const lista = st?.precio;
        const sinRepetir = fotosDe(p);
        setFotos(sinRepetir);
        setDatos({
          titulo: p.nombre,
          codigo: p.codigoEmpresa,
          fotoUrl: sinRepetir[0] ?? null,
          precio,
          // Solo si hay rebaja vigente: es lo que se tacha.
          precioAnterior: lista != null && lista > precio ? lista : null,
          caracteristicas: (p.atributosValores ?? [])
            .filter((av) => av.valor?.trim())
            .map((av) => [av.atributo.nombre, av.valor] as [string, string]),
          marca: {
            nombre: marca.nombre,
            telefono: marca.telefono,
            textoPie: marca.textoPie,
            color: marca.color,
            logoUrl: marca.logoUrl,
          },
        });
      } catch {
        if (!cancelado) setError('No se pudo cargar el producto.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [productoId, variante, sedeId, sedeNombre, empresa]);

  // Se redibuja con cada interruptor: la vista previa y el archivo son lo mismo.
  useEffect(() => {
    if (!datos || !lienzo.current) return;
    let cancelado = false;
    dibujarFicha(lienzo.current, datos, {
      incluirPrecio,
      incluirCaracteristicas,
      incluirCodigo,
    }).catch(() => {
      if (!cancelado) setError('No se pudo dibujar la ficha.');
    });
    return () => {
      cancelado = true;
    };
  }, [datos, incluirPrecio, incluirCaracteristicas, incluirCodigo]);

  const descargar = async () => {
    if (!lienzo.current) return;
    const blob = await fichaABlob(lienzo.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(datos?.titulo ?? 'ficha').slice(0, 40).replace(/[^\w\s-]/g, '')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const construirAdjunto = useCallback(async () => {
    if (!lienzo.current) throw new Error('La ficha no está lista');
    return fichaABlob(lienzo.current);
  }, []);

  // 🔴 El cuadro de envío NO reemplaza a este: se dibuja ENCIMA y la ficha
  // queda montada, escondida. Devolviendo solo el otro, React desmonta el
  // `<canvas>`, `lienzo.current` pasa a null y el adjunto sale vacío. De paso,
  // cancelar el envío devuelve la ficha con sus interruptores como estaban.
  const envio =
    enviando && datos ? (
      <EnviarPorWhatsappDialog
        titulo="Enviar ficha"
        textoInicial={
          incluirPrecio && datos.precio > 0
            ? `Hola, te comparto *${datos.titulo}*.\nPrecio: S/ ${datos.precio.toFixed(2)}`
            : `Hola, te comparto *${datos.titulo}*.`
        }
        ayudaNumero="La ficha se manda a quien pregunta: no hace falta que sea un cliente registrado."
        adjunto={{
          nombre: 'ficha.png',
          detalle: 'La ficha se envía con el mensaje',
          tipo: 'imagen',
          construir: construirAdjunto,
        }}
        onClose={() => setEnviando(false)}
      />
    ) : null;

  return (
    <>
      {envio}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${
          enviando ? 'hidden' : ''
        }`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Compartir ficha del producto"
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 font-sans shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-gray-900">Compartir producto</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Esto es exactamente la imagen que va a recibir el cliente
            {sedeNombre ? ` · precio de ${sedeNombre}` : ''}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
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
          </div>

          {fotos.length > 1 && (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-medium text-gray-600">
                Cuál foto se manda
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fotos.map((url) => (
                  <button
                    key={url}
                    onClick={() => setDatos((d) => (d ? { ...d, fotoUrl: url } : d))}
                    className={`h-12 w-12 overflow-hidden rounded ring-2 transition-all ${
                      datos?.fotoUrl === url
                        ? 'ring-[#004A94]'
                        : 'opacity-50 ring-gray-200 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                Para mandar varios diseños de una, armá un catálogo: ahí sale una tarjeta por foto.
              </p>
            </div>
          )}

          <div className="mt-3 flex justify-center rounded-[6px] bg-gray-100 p-3">
            {cargando ? (
              <p className="py-20 text-xs text-gray-400">Preparando la ficha…</p>
            ) : (
              <canvas ref={lienzo} className="rounded shadow-md" />
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              onClick={descargar}
              disabled={cargando || !!error}
              className="rounded-lg border border-[#004A94] px-4 py-2 text-sm font-medium text-[#004A94] hover:bg-blue-50 disabled:opacity-50"
            >
              Descargar
            </button>
            <button
              onClick={() => setEnviando(true)}
              disabled={cargando || !!error}
              className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#1da851] disabled:opacity-50"
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
