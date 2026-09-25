'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Carrito, ErrorApi, GrupoCarrito, ItemCarrito, UsuarioComprador, api, mkt } from '@/lib/tienda-compra';
import { IngresoModal } from './IngresoModal';
import { InfoProductoLocal, ItemLocal, guardarCarritoLocal, idLocal, leerCarritoLocal } from './carrito-local';

interface SesionTiendaValor {
  subdominio: string;
  /** undefined mientras se pregunta; null sin sesión. */
  usuario: UsuarioComprador | null | undefined;
  /** Lo de ESTA tienda en el carrito (el carrito del comprador es de todas las tiendas). Sin sesión, el del navegador. */
  grupo: GrupoCarrito | null;
  /** false hasta la primera carga del carrito: evita mostrar "vacío" de más. */
  carritoCargado: boolean;
  cantidad: number;
  recargarCarrito: () => Promise<void>;
  /**
   * Agrega al carrito. Sin sesión lo guarda en el navegador (con `info` para
   * poder mostrarlo) y el DNI se pide recién al continuar la compra.
   */
  agregar: (productoId: string, varianteId: string | null, cantidad: number, info?: InfoProductoLocal) => Promise<boolean>;
  /** Cambia la cantidad de una línea (0 = quitar), del servidor o del navegador. */
  cambiarCantidad: (item: ItemCarrito, cantidad: number) => Promise<void>;
  /** Abre el ingreso; `alTerminar` corre con la sesión ya abierta y el carrito del navegador ya subido. */
  pedirIngreso: (alTerminar?: () => void) => void;
  salir: () => Promise<void>;
  aviso: string | null;
  mostrarAviso: (texto: string) => void;
}

const Ctx = createContext<SesionTiendaValor | null>(null);

export function useSesionTienda() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSesionTienda fuera de SesionTiendaProvider');
  return v;
}

/** El carrito del navegador con la forma del del servidor, para que las vistas no distingan. */
function grupoLocal(subdominio: string, items: ItemLocal[]): GrupoCarrito | null {
  if (!items.length) return null;
  const empresa = { id: '', nombre: '', logo: null, subdominio };
  const lineas: ItemCarrito[] = items.map((i) => ({
    id: idLocal(i.productoId, i.varianteId),
    productoId: i.productoId,
    varianteId: i.varianteId,
    empresaId: '',
    cantidad: i.cantidad,
    productoNombre: i.nombre,
    varianteNombre: i.varianteNombre ?? null,
    precioUnitario: i.precio,
    precioNormal: i.precio,
    subtotal: i.precio * i.cantidad,
    imagenUrl: i.imagenUrl ?? null,
    stockDisponible: i.stockMax ?? 999,
    disponible: true,
    empresa,
  }));
  return { empresa, items: lineas, subtotal: lineas.reduce((s, l) => s + l.subtotal, 0) };
}

export function SesionTiendaProvider({ subdominio, children }: { subdominio: string; children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioComprador | null | undefined>(undefined);
  const [grupo, setGrupo] = useState<GrupoCarrito | null>(null);
  const [carritoCargado, setCarritoCargado] = useState(false);
  const [local, setLocal] = useState<ItemLocal[]>([]);
  const [ingresoAbierto, setIngresoAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const alTerminarRef = useRef<(() => void) | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarAviso = useCallback((texto: string) => {
    setAviso(texto);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 3500);
  }, []);

  const recargarCarrito = useCallback(async () => {
    try {
      const c = await mkt<Carrito>('/carrito');
      setGrupo(c.empresas.find((g) => g.empresa.subdominio === subdominio) ?? null);
    } catch {
      setGrupo(null);
    } finally {
      setCarritoCargado(true);
    }
  }, [subdominio]);

  const cambiarLocal = useCallback((cambio: (items: ItemLocal[]) => ItemLocal[]) => {
    setLocal((prev) => {
      const nuevo = cambio(prev);
      guardarCarritoLocal(subdominio, nuevo);
      return nuevo;
    });
  }, [subdominio]);

  useEffect(() => {
    let vivo = true;
    api<{ usuario: UsuarioComprador | null }>('/sesion')
      .then((r) => { if (vivo) setUsuario(r.usuario); })
      .catch(() => { if (vivo) setUsuario(null); });
    return () => { vivo = false; };
  }, []);

  // Sin sesión el carrito es el del navegador: ya está "cargado".
  useEffect(() => {
    if (usuario !== null) return;
    const t = setTimeout(() => {
      setLocal(leerCarritoLocal(subdominio));
      setCarritoCargado(true);
    }, 0);
    return () => clearTimeout(t);
  }, [usuario, subdominio]);

  /**
   * Con sesión: sube lo que se agregó sin sesión y recién después carga el
   * carrito del servidor. Lo que el servidor rechaza (sin stock, producto
   * dado de baja) se avisa y se descarta.
   */
  const subiendoRef = useRef<Promise<void> | null>(null);
  const subirCarritoLocal = useCallback(() => {
    const subir = async () => {
      const pendientes = leerCarritoLocal(subdominio);
      if (!pendientes.length) return;
      const rechazados: string[] = [];
      for (const i of pendientes) {
        try {
          await mkt('/carrito', {
            method: 'POST',
            body: JSON.stringify({ productoId: i.productoId, ...(i.varianteId && { varianteId: i.varianteId }), cantidad: i.cantidad }),
          });
        } catch (e) {
          if (e instanceof ErrorApi && e.status === 401) return; // se queda en el navegador
          rechazados.push(i.nombre);
        }
      }
      guardarCarritoLocal(subdominio, []);
      setLocal([]);
      if (rechazados.length) mostrarAviso(`No se pudo agregar: ${rechazados.join(', ')}`);
    };
    // Un solo envío a la vez: el efecto puede correr dos veces (StrictMode) y duplicaría cantidades.
    subiendoRef.current ??= subir().finally(() => { subiendoRef.current = null; });
    return subiendoRef.current;
  }, [subdominio, mostrarAviso]);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    setCarritoCargado(false);
    void subirCarritoLocal().then(() => { if (vivo) void recargarCarrito(); });
    return () => { vivo = false; };
  }, [usuario, subirCarritoLocal, recargarCarrito]);

  const pedirIngreso = useCallback((alTerminar?: () => void) => {
    alTerminarRef.current = alTerminar ?? null;
    setIngresoAbierto(true);
  }, []);

  const agregar = useCallback(async (productoId: string, varianteId: string | null, cantidad: number, info?: InfoProductoLocal) => {
    if (!usuario) {
      if (!info) {
        // Sin datos para mostrarlo no se puede guardar en el navegador.
        return new Promise<boolean>((resolver) => { pedirIngreso(() => resolver(false)); });
      }
      cambiarLocal((prev) => {
        const i = prev.findIndex((x) => x.productoId === productoId && x.varianteId === varianteId);
        const tope = info.stockMax ?? Infinity;
        if (i < 0) return [...prev, { ...info, productoId, varianteId, cantidad: Math.min(cantidad, tope) }];
        return prev.map((x, j) => (j === i ? { ...x, ...info, cantidad: Math.min(x.cantidad + cantidad, tope) } : x));
      });
      mostrarAviso('Agregado al carrito');
      return true;
    }
    try {
      await mkt('/carrito', {
        method: 'POST',
        body: JSON.stringify({ productoId, ...(varianteId && { varianteId }), cantidad }),
      });
      await recargarCarrito();
      mostrarAviso('Agregado al carrito');
      return true;
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 401) {
        setUsuario(null);
        return false;
      }
      mostrarAviso(e instanceof Error ? e.message : 'No se pudo agregar');
      return false;
    }
  }, [usuario, cambiarLocal, pedirIngreso, recargarCarrito, mostrarAviso]);

  const cambiarCantidad = useCallback(async (item: ItemCarrito, cantidad: number) => {
    if (!usuario) {
      cambiarLocal((prev) => prev
        .map((x) => (idLocal(x.productoId, x.varianteId) === item.id ? { ...x, cantidad } : x))
        .filter((x) => x.cantidad > 0));
      return;
    }
    try {
      if (cantidad <= 0) await mkt(`/carrito/${item.id}`, { method: 'DELETE' });
      else await mkt(`/carrito/${item.id}`, { method: 'PUT', body: JSON.stringify({ cantidad }) });
      await recargarCarrito();
    } catch (e) {
      mostrarAviso(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }, [usuario, cambiarLocal, recargarCarrito, mostrarAviso]);

  const salir = useCallback(async () => {
    await api('/auth/salir', { method: 'POST' }).catch(() => null);
    setUsuario(null);
    setGrupo(null);
  }, []);

  const alIngresar = (u: UsuarioComprador) => {
    setUsuario(u);
    setIngresoAbierto(false);
    const siguiente = alTerminarRef.current;
    alTerminarRef.current = null;
    // Tras el render con la sesión: el carrito del navegador se sube en el efecto de `usuario`.
    if (siguiente) setTimeout(siguiente, 0);
  };

  // Sin sesión se muestra el carrito del navegador, no el de la sesión anterior que quede en memoria.
  const grupoVisible = usuario ? grupo : usuario === null ? grupoLocal(subdominio, local) : null;
  const cantidad = grupoVisible?.items.reduce((n, i) => n + i.cantidad, 0) ?? 0;

  return (
    <Ctx.Provider
      value={{ subdominio, usuario, grupo: grupoVisible, carritoCargado, cantidad, recargarCarrito, agregar, cambiarCantidad, pedirIngreso, salir, aviso, mostrarAviso }}
    >
      {children}
      {ingresoAbierto && (
        <IngresoModal
          onCerrar={() => { setIngresoAbierto(false); alTerminarRef.current = null; }}
          onIngreso={alIngresar}
        />
      )}
      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg">
          {aviso}
        </div>
      )}
    </Ctx.Provider>
  );
}
