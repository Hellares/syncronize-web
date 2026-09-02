'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { Producto } from '@/core/types/producto';
import * as productoService from '@/features/producto/services/producto-service';
import * as stockService from '@/features/stock/services/stock-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem, UnidadMedida } from '@/features/catalogo/services/catalogo-service';
import NumeroInput from '@/components/ui/NumeroInput';

/**
 * Alta de un producto SIN salir de donde se está trabajando.
 *
 * Nace para la cotización: el cliente cotiza cosas que todavía no están en el
 * inventario --productos nuevos en el mercado-- y las carga como ítem manual.
 * Desde ahí se registra el producto con lo que ya escribió, en vez de abrir el
 * formulario completo y volver a tipear todo.
 *
 * Son cuatro llamadas, porque el precio y el stock NO viven en Producto sino en
 * `ProductoStock`, que es por sede:
 *
 *   1. `POST /productos`                 crea el producto y su fila de stock
 *   2. `GET  producto-stock/producto/..` trae el id de esa fila
 *   3. `PATCH producto-stock/:id/precios` deja el precio de venta
 *   4. `PUT   producto-stock/:id/ajustar` carga el stock inicial (si hay)
 *
 * 🔴 Si el paso 1 sale bien y falla uno de los siguientes, el producto YA
 * existe: se avisa explícitamente y se cierra devolviéndolo, porque reintentar
 * crearía un duplicado.
 */

const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

interface Props {
  empresaId: string;
  sedeId: string;
  /** Lo que ya escribió en la línea. */
  nombreInicial: string;
  precioInicial: number;
  cantidadInicial: number;
  onClose: () => void;
  /** El producto creado, para enganchar la línea. */
  onCreado: (producto: Producto, precio: number) => void;
}

export default function CrearProductoRapidoDialog({
  empresaId,
  sedeId,
  nombreInicial,
  precioInicial,
  cantidadInicial,
  onClose,
  onCreado,
}: Props) {
  const [nombre, setNombre] = useState(nombreInicial.trim());
  const [precio, setPrecio] = useState(precioInicial);
  // Precargado con lo cotizado pero EDITABLE, incluso a 0: cotizar no es
  // comprar, y si la cotización no se cierra ese stock queda inventado.
  const [stock, setStock] = useState(cantidadInicial);
  const [categoriaId, setCategoriaId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [verOpcionales, setVerOpcionales] = useState(false);

  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [parecidos, setParecidos] = useState<Producto[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaCreado, setYaCreado] = useState<Producto | null>(null);

  useEffect(() => {
    catalogoService.getCategorias().then(setCategorias).catch(() => {});
    catalogoService.getUnidadesMedida().then(setUnidades).catch(() => {});
  }, []);

  // Aviso de duplicados: no bloquea --puede haber dos cosas con nombre
  // parecido-- pero evita el segundo "CAJA CHINA" sin que nadie se entere.
  useEffect(() => {
    const termino = nombre.trim();
    if (termino.length < 3) { setParecidos([]); return; }
    let cancelado = false;
    const t = setTimeout(() => {
      productoService
        .getProductos({ page: 1, limit: 4, search: termino, isActive: true })
        .then(r => { if (!cancelado) setParecidos(r.data); })
        .catch(() => { if (!cancelado) setParecidos([]); });
    }, 400);
    return () => { cancelado = true; clearTimeout(t); };
  }, [nombre]);

  const crear = useCallback(async () => {
    const nom = nombre.trim();
    if (!nom) { setError('Ponele un nombre al producto'); return; }
    if (precio <= 0) { setError('El precio de venta tiene que ser mayor a 0'); return; }

    setGuardando(true);
    setError(null);
    let producto = yaCreado;
    try {
      // 1. El producto. Si un intento anterior ya lo creó, no se repite.
      if (!producto) {
        producto = await productoService.createProducto({
          empresaId,
          nombre: nom,
          sedesIds: [sedeId],
          ...(categoriaId ? { empresaCategoriaId: categoriaId } : {}),
          ...(unidadId ? { unidadMedidaId: unidadId } : {}),
        });
        setYaCreado(producto);
      }

      // 2. La fila de stock de la sede, que el backend ya creó junto al producto.
      const fila = await stockService.getStockByProductoSede(producto.id, sedeId);

      // 3. Precio de venta.
      // 🔴 `precioIncluyeIgv: true` porque el precio del ítem manual es el
      // FINAL al cliente (así lo arma la cotización). Guardarlo como neto haría
      // que la próxima venta le sume el IGV encima.
      await stockService.updatePrecios(fila.id, {
        precio,
        precioIncluyeIgv: true,
        razon: 'Alta rápida desde una cotización',
      });

      // 4. Stock inicial, solo si se pidió alguno.
      if (stock > 0) {
        // `AJUSTE_ENTRADA`, no `ENTRADA_AJUSTE`: el segundo esta marcado como
        // DEPRECADO en el schema. El signo lo pone la CANTIDAD --el servicio
        // hace `stockActual + cantidad`--, el tipo solo queda en el kardex.
        await stockService.ajustarStock(fila.id, {
          tipo: 'AJUSTE_ENTRADA',
          cantidad: stock,
          motivo: 'Stock inicial al registrar el producto desde una cotización',
        });
      }

      onCreado(producto, precio);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      const detalle = Array.isArray(msg) ? msg.join(', ') : msg;
      setError(
        producto
          // El producto quedó creado: reintentar desde cero lo duplicaría.
          ? `El producto se creó, pero falló el precio o el stock: ${detalle || 'error'}. `
            + 'Reintentá acá o completalo desde Inventario.'
          : detalle || 'No se pudo crear el producto',
      );
    } finally {
      setGuardando(false);
    }
  }, [nombre, precio, stock, categoriaId, unidadId, empresaId, sedeId, yaCreado, onCreado]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Crear producto</h3>
        <p className="mt-1 text-sm text-gray-500">
          Se registra en el inventario de esta sede con lo que escribiste en la línea.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Nombre</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre del producto"
              className={`${INPUT_STD} w-full`}
            />
          </div>

          {parecidos.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-[11px] font-semibold text-amber-800">
                Ya hay productos con un nombre parecido:
              </p>
              <ul className="mt-1 space-y-0.5">
                {parecidos.map(p => (
                  <li key={p.id} className="truncate text-[11px] text-amber-700">• {p.nombre}</li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-amber-600">
                Si es uno de esos, cancelá y buscalo en el catálogo en vez de crearlo de nuevo.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Precio de venta
              </label>
              <NumeroInput value={precio} onChange={setPrecio} ocultarSi={0} placeholder="0.00"
                className={`${INPUT_STD} w-full`} />
              <p className="mt-1 text-[10px] text-gray-400">Es el precio final al cliente, con IGV.</p>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Stock inicial
              </label>
              <NumeroInput value={stock} onChange={setStock} ocultarSi={0} placeholder="0"
                className={`${INPUT_STD} w-full`} />
              <p className="mt-1 text-[10px] text-gray-400">
                Viene de la cantidad cotizada. Dejalo en 0 si todavía no lo tenés.
              </p>
            </div>
          </div>

          {!verOpcionales ? (
            <button
              type="button"
              onClick={() => setVerOpcionales(true)}
              className="text-[11px] font-medium text-[#004A94] hover:underline"
            >
              + Categoría y unidad (opcional)
            </button>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Categoría</label>
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                  className={`${INPUT_STD} w-full`}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-gray-600">Unidad</label>
                <select value={unidadId} onChange={e => setUnidadId(e.target.value)}
                  className={`${INPUT_STD} w-full`}>
                  <option value="">Sin unidad</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.abreviatura || u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando}
            className="flex items-center gap-2 rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50"
          >
            {guardando && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {guardando ? 'Creando…' : yaCreado ? 'Reintentar' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
