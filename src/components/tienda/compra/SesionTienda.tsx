'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Carrito, ErrorApi, GrupoCarrito, UsuarioComprador, api, mkt } from '@/lib/tienda-compra';
import { IngresoModal } from './IngresoModal';

interface SesionTiendaValor {
  subdominio: string;
  /** undefined mientras se pregunta; null sin sesión. */
  usuario: UsuarioComprador | null | undefined;
  /** Lo de ESTA tienda en el carrito (el carrito del comprador es de todas las tiendas). */
  grupo: GrupoCarrito | null;
  /** false hasta la primera carga del carrito: evita mostrar "vacío" de más. */
  carritoCargado: boolean;
  cantidad: number;
  recargarCarrito: () => Promise<void>;
  /** Agrega al carrito; sin sesión abre el ingreso y agrega al terminar. Devuelve si quedó agregado. */
  agregar: (productoId: string, varianteId: string | null, cantidad: number) => Promise<boolean>;
  /** Abre el ingreso; `alTerminar` corre con la sesión ya abierta. */
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

export function SesionTiendaProvider({ subdominio, children }: { subdominio: string; children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioComprador | null | undefined>(undefined);
  const [grupo, setGrupo] = useState<GrupoCarrito | null>(null);
  const [carritoCargado, setCarritoCargado] = useState(false);
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

  useEffect(() => {
    let vivo = true;
    api<{ usuario: UsuarioComprador | null }>('/sesion')
      .then((r) => { if (vivo) setUsuario(r.usuario); })
      .catch(() => { if (vivo) setUsuario(null); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const t = setTimeout(() => void recargarCarrito(), 0);
    return () => clearTimeout(t);
  }, [usuario, recargarCarrito]);

  const pedirIngreso = useCallback((alTerminar?: () => void) => {
    alTerminarRef.current = alTerminar ?? null;
    setIngresoAbierto(true);
  }, []);

  const agregarConSesion = useCallback(async (productoId: string, varianteId: string | null, cantidad: number) => {
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
  }, [recargarCarrito, mostrarAviso]);

  const agregar = useCallback(async (productoId: string, varianteId: string | null, cantidad: number) => {
    if (usuario) return agregarConSesion(productoId, varianteId, cantidad);
    return new Promise<boolean>((resolver) => {
      pedirIngreso(() => { void agregarConSesion(productoId, varianteId, cantidad).then(resolver); });
    });
  }, [usuario, agregarConSesion, pedirIngreso]);

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
    // Tras el render con la sesión: `agregar` necesita el usuario nuevo.
    if (siguiente) setTimeout(siguiente, 0);
  };

  // Sin sesión no hay carrito, aunque quede el de la sesión anterior en memoria.
  const grupoVisible = usuario ? grupo : null;
  const cantidad = grupoVisible?.items.reduce((n, i) => n + i.cantidad, 0) ?? 0;

  return (
    <Ctx.Provider
      value={{ subdominio, usuario, grupo: grupoVisible, carritoCargado, cantidad, recargarCarrito, agregar, pedirIngreso, salir, aviso, mostrarAviso }}
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
