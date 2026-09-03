import type { EmpresaPermissions } from '@/core/types/empresa';

/**
 * El menú de la web es una RÉPLICA del drawer del app
 * (`syncronize-app/lib/features/empresa/presentation/widgets/empresa_drawer.dart`).
 *
 * Mismas secciones, mismo orden, mismos nombres, mismas condiciones de
 * permiso y mismos `ocultableId`. Quien conoce el menú del celular tiene que
 * encontrar cada cosa en el mismo lugar acá.
 *
 * 🔴 Al tocar el drawer del app, tocar ESTE archivo. Son dos catálogos escritos
 * a mano en dos lenguajes distintos: nada avisa cuando se separan.
 *
 * 🚧 `enConstruccion` marca el ítem cuyo módulo todavía no existe en la web.
 * Se muestra igual —el menú es el mapa completo del sistema— y su `href` es la
 * ruta DEFINITIVA que va a tener. Mientras no exista, la atiende el catch-all
 * `app/(dashboard)/dashboard/[...slug]`; el día que se cree la página real,
 * Next la prefiere sobre el catch-all y acá solo hay que borrar el flag.
 *
 * 🔴 Por eso ningún `href` en construcción puede chocar con una ruta dinámica
 * existente: `/dashboard/ventas/nueva` lo comería `/dashboard/ventas/[id]` y
 * mostraría el detalle de una venta llamada "nueva". Va `/dashboard/venta-avanzada`.
 */

/** Un permiso, o varios en OR (igual que el `||` de las condiciones del app). */
export type CondicionPermiso = keyof EmpresaPermissions | (keyof EmpresaPermissions)[];

export interface SidebarItem {
  label: string;
  /**
   * Etiqueta para la cabecera, donde el ancho es escaso. Cae en `label`.
   *
   * Solo la usa el texto visible: el `title` sigue diciendo el nombre completo,
   * asi que abreviar no le esconde a nadie a donde va el boton.
   */
  labelCorto?: string;
  href: string;
  /** Clave de `ICONOS`. */
  icon: string;
  permission?: CondicionPermiso;
  /**
   * Id del catálogo de elementos ocultables (`accesosRapidosOcultos`).
   *
   * Los del dashboard van sin prefijo (`venta-rapida`), los que solo viven en
   * el menú van con `menu.`. Los strings son los MISMOS que el app: un id que
   * no coincida deja el ítem visible acá y oculto allá.
   */
  ocultableId?: string;
  /** El módulo todavía no existe en la web. */
  enConstruccion?: boolean;
  /** No está en el drawer del app: es una pantalla que solo tiene la web. */
  soloWeb?: boolean;
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  permission?: CondicionPermiso;
  items: SidebarItem[];
}

export type SidebarNode =
  | { kind: 'tile'; item: SidebarItem }
  | { kind: 'section'; section: SidebarSection }
  | { kind: 'divider' };

/** ¿El permiso alcanza? Sin condición, sí. Con lista, basta uno (OR). */
export function tienePermiso(
  permissions: EmpresaPermissions,
  cond?: CondicionPermiso,
): boolean {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.some((k) => Boolean(permissions[k]));
  return Boolean(permissions[cond]);
}

/**
 * Trazos de los iconos (24×24, stroke). Se comparten entre ítems que en el app
 * usan el mismo `Icons.*`, para que el menú se lea como un sistema y no como
 * una colección de dibujos sueltos.
 */
export const ICONOS: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  tendencia: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  delivery: 'M3 6h11v11H3zM14 9h4l3 3v5h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  caja: 'M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8zM3.3 7 12 12l8.7-5M12 22V12',
  capas: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  etiqueta: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8zM7 7h.01',
  carpeta: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  regla: 'M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  plantilla: 'M3 3h7v9H3zM14 3h7v5h-7M14 12h7v9h-7M3 16h7v5H3z',
  grafico: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14h1M14 20h3M20 17v4',
  porcentaje: 'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  papelera: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  subir: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  almacen: 'M22 8.4V21H2V8.4a2 2 0 0 1 1.2-1.8l8-3.4a2 2 0 0 1 1.6 0l8 3.4A2 2 0 0 1 22 8.4zM6 18v-6h12v6M6 14h12',
  campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  intercambio: 'M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4',
  alerta: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  reporte: 'M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6',
  historial: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  fabrica: 'M2 20h20M4 20V9l5 3V9l5 3V9l5 3v8M9 16h.01M14 16h.01',
  expandir: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  arbol: 'M9 3h6v4H9zM3 17h6v4H3zM15 17h6v4h-6zM12 7v4M6 17v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2',
  ubicacion: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  roto: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 15l4-4 3 3M14 12l3-3 4 4',
  dinero: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  carrito: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4M9 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  rotacion: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  pulso: 'M22 12h-4l-3 9L9 3l-3 9H2',
  rayo: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  ticket: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM9 8h6M9 12h6',
  cotizacion: 'M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4v2h6V4M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4',
  cola: 'M4 6h16M4 12h16M4 18h10',
  devolucion: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1',
  barras: 'M12 20V10M18 20V4M6 20v-4',
  cambio: 'M4 8h13l-3-3M20 16H7l3 3',
  servicio: 'M2 17h20M4 17a8 8 0 0 1 16 0M12 5V3M12 5a3 3 0 0 0-3 3',
  calendario: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  calendarioX: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM10 14l4 4M14 14l-4 4',
  personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  enlace: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  bolsa: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  documento: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  pago: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M6 15h4',
  alcancia: 'M2 12a6 6 0 0 1 6-6h6a5 5 0 0 1 5 5v1h2v3h-2a6 6 0 0 1-3 3.5V21h-3v-2H9v2H6v-3.5A6 6 0 0 1 2 12zM15 10h.01',
  banco: 'M3 21h18M4 10h16M5 10V6l7-4 7 4v4M7 10v11M11 10v11M15 10v11M19 10v11',
  billetera: 'M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13v4M3 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4h-5a2 2 0 0 1 0-4h5',
  repetir: 'M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  recibo: 'M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5zM8 8h8M8 12h8M8 16h5',
  auto: 'M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M3 17v-4l2-5h11l3 5v4M3 13h18',
  cancelar: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM5.5 5.5l13 13',
  numeros: 'M9 6h12M9 12h12M9 18h12M3 5h1v4M3 13h2l-2 3h2',
  libro: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  fuego: 'M12 2c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3s2-1 2-3c0-2-1-4-1-6z',
  bandera: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  megafono: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  pregunta: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM10 8.5a2 2 0 1 1 2.7 1.9c-.4.2-.7.6-.7 1.1M12 14h.01',
  estrella: 'M12 2l3 6.5 7 1-5 5 1.2 7-6.2-3.3L5.8 21.5 7 14.5l-5-5 7-1z',
  tienda: 'M3 9h18l-1.5-5.2A1 1 0 0 0 18.5 3h-13a1 1 0 0 0-1 .8zM5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M9 21v-6h6v6',
  regalo: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  credencial: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 16c.7-1.5 1.7-2 3-2s2.3.5 3 2M15 10h4M15 14h4',
  reloj: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  huella: 'M12 11a2 2 0 0 1 2 2c0 3-1 5-1 5M8 14c0-2 0-6 4-6s4 3 4 5M5 12a7 7 0 0 1 14 0M9 20c1-2 1-4 1-6',
  empresa: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  maletin: 'M3 7h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20',
  engranaje: 'M10.3 4.3c.4-1.7 2.9-1.7 3.4 0a1.7 1.7 0 0 0 2.5 1.1c1.6-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1.1 2.5c1.7.4 1.7 2.9 0 3.4a1.7 1.7 0 0 0-1.1 2.5c.9 1.6-.8 3.3-2.4 2.4a1.7 1.7 0 0 0-2.5 1.1c-.4 1.7-2.9 1.7-3.4 0a1.7 1.7 0 0 0-2.5-1.1c-1.6.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1.1-2.5c-1.7-.4-1.7-2.9 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  robot: 'M12 2v3M5 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM9 13h.01M15 13h.01M9 17h6',
  paleta: 'M12 2a10 10 0 1 0 0 20c1 0 2-1 2-2s-1-2-1-3 1-2 2-2h2a5 5 0 0 0 5-5c0-5-4.5-8-10-8zM7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
  persona: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  impresora: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  balanza: 'M12 3v18M8 21h8M3 7h18M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z',
};

export const SIDEBAR_NODES: SidebarNode[] = [
  // ───────────────── Nivel raíz: los dashboards ─────────────────
  { kind: 'tile', item: { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' } },
  {
    kind: 'tile',
    item: {
      label: 'Mi Dashboard',
      href: '/dashboard/mi-dashboard',
      icon: 'tendencia',
      permission: 'canViewVentas',
      enConstruccion: true,
    },
  },
  // Pool de entregas: la home del REPARTIDOR. En el app se muestra por ROL, no
  // por permiso; acá no hay equivalente en `EmpresaPermissions`, así que se
  // resuelve con `userRoles` en el Sidebar (ver `ROLES_DELIVERY`).
  {
    kind: 'tile',
    item: {
      label: 'Delivery',
      href: '/dashboard/delivery',
      icon: 'delivery',
      enConstruccion: true,
    },
  },

  // ───────────────── Productos ─────────────────
  {
    kind: 'section',
    section: {
      id: 'productos',
      label: 'Productos',
      icon: 'caja',
      permission: 'canManageProducts',
      items: [
        { label: 'Productos', href: '/dashboard/productos', icon: 'caja', ocultableId: 'productos' },
        { label: 'Combos', href: '/dashboard/combos', icon: 'capas' },
        { label: 'Categorías', href: '/dashboard/categorias', icon: 'carpeta' },
        { label: 'Marcas', href: '/dashboard/marcas', icon: 'etiqueta' },
        { label: 'Unidades de Medida', href: '/dashboard/unidades', icon: 'regla' },
        { label: 'Atributos', href: '/dashboard/atributos', icon: 'sliders' },
        { label: 'Plantillas de Atributos', href: '/dashboard/plantillas-atributos', icon: 'plantilla', enConstruccion: true },
        { label: 'Configuraciones de Precio', href: '/dashboard/configuraciones-precio', icon: 'grafico' },
        { label: 'Configuración de Códigos', href: '/dashboard/configuracion-codigos', icon: 'qr', enConstruccion: true },
        { label: 'Ajuste Masivo de Precios', href: '/dashboard/ajuste-precios', icon: 'porcentaje' },
        { label: 'Reglas de Compatibilidad', href: '/dashboard/compatibilidad', icon: 'check' },
        { label: 'Productos Eliminados', href: '/dashboard/productos/papelera', icon: 'papelera' },
        { label: 'Carga Masiva', href: '/dashboard/productos/bulk', icon: 'subir', soloWeb: true },
      ],
    },
  },

  // ───────────────── Inventario ─────────────────
  {
    kind: 'section',
    section: {
      id: 'inventario',
      label: 'Inventario',
      icon: 'almacen',
      permission: 'canManageProducts',
      items: [
        { label: 'Stock por Sede', href: '/dashboard/stock', icon: 'caja', ocultableId: 'menu.inventario.stock-sede' },
        { label: 'Alertas de Stock', href: '/dashboard/alertas-stock', icon: 'campana', ocultableId: 'menu.inventario.alertas-stock' },
        { label: 'Transferencias', href: '/dashboard/transferencias', icon: 'intercambio', ocultableId: 'menu.inventario.transferencias' },
        { label: 'Incidencias de Transferencia', href: '/dashboard/transferencias/incidencias', icon: 'alerta', ocultableId: 'menu.inventario.incidencias-transferencia' },
        { label: 'Reportes de Incidencia', href: '/dashboard/reportes-incidencia', icon: 'reporte', ocultableId: 'menu.inventario.reportes-incidencia', enConstruccion: true },
        { label: 'Kardex', href: '/dashboard/kardex', icon: 'historial', ocultableId: 'menu.inventario.kardex', enConstruccion: true },
        { label: 'Producción (lotes fabricados)', href: '/dashboard/produccion', icon: 'fabrica', ocultableId: 'menu.inventario.produccion' },
        { label: 'Abrir bultos', href: '/dashboard/abrir-bultos', icon: 'expandir', ocultableId: 'menu.inventario.abrir-bultos', enConstruccion: true },
        { label: 'Trazabilidad de producto', href: '/dashboard/trazabilidad', icon: 'arbol', ocultableId: 'menu.inventario.trazabilidad' },
        { label: 'Inventario Físico', href: '/dashboard/inventarios', icon: 'check', ocultableId: 'menu.inventario.inventario-fisico' },
        { label: 'Stock por Ubicación', href: '/dashboard/stock-ubicacion', icon: 'ubicacion', ocultableId: 'menu.inventario.stock-ubicacion', enConstruccion: true },
        { label: 'Gestión Ubicaciones', href: '/dashboard/ubicaciones-almacen', icon: 'almacen', ocultableId: 'menu.inventario.gestion-ubicaciones', enConstruccion: true },
        // La web ya la tenía como `/dashboard/inventario-fisico`, cuyo título
        // real es "Configurar Stock Mínimo/Máximo": es esta, no el conteo.
        { label: 'Stock Min/Max', href: '/dashboard/inventario-fisico', icon: 'sliders', ocultableId: 'menu.inventario.stock-min-max' },
        { label: 'Merma y Pérdida', href: '/dashboard/merma', icon: 'roto', ocultableId: 'menu.inventario.merma' },
        { label: 'Valorización', href: '/dashboard/valorizacion', icon: 'dinero', ocultableId: 'menu.inventario.valorizacion', enConstruccion: true },
        { label: 'Reorden', href: '/dashboard/reorden', icon: 'carrito', ocultableId: 'menu.inventario.reorden', enConstruccion: true },
        { label: 'Rotación', href: '/dashboard/rotacion', icon: 'rotacion', ocultableId: 'menu.inventario.rotacion', enConstruccion: true },
        { label: 'Historial de Precios', href: '/dashboard/historial-precios', icon: 'grafico', ocultableId: 'menu.inventario.historial-precios' },
        { label: 'Monitor Productos', href: '/dashboard/monitor-productos', icon: 'pulso', ocultableId: 'monitor-productos' },
        { label: 'Códigos de Barras', href: '/dashboard/codigos-barras', icon: 'qr', ocultableId: 'menu.inventario.codigos-barras', enConstruccion: true },
        { label: 'Reportes de Inventario', href: '/dashboard/reportes-inventario', icon: 'barras', soloWeb: true },
        { label: 'Verificación de Precios', href: '/dashboard/verificacion-precios', icon: 'check', soloWeb: true },
      ],
    },
  },

  // ───────────────── Ventas ─────────────────
  {
    kind: 'section',
    section: {
      id: 'ventas',
      label: 'Ventas',
      icon: 'ticket',
      permission: ['canViewCotizaciones', 'canViewVentas', 'canViewDevoluciones', 'canViewDiscounts', 'canViewReports'],
      items: [
        // Van primero porque son la operación diaria.
        { label: 'Venta Rápida', href: '/dashboard/venta-rapida', icon: 'rayo', permission: 'canManageVentas', ocultableId: 'venta-rapida' },
        { label: 'Venta Avanzada', href: '/dashboard/venta-avanzada', icon: 'ticket', permission: 'canManageVentas', ocultableId: 'venta-avanzada', enConstruccion: true },
        { label: 'Cotizaciones', href: '/dashboard/cotizaciones', icon: 'cotizacion', permission: 'canViewCotizaciones', ocultableId: 'cotizaciones' },
        { label: 'Ventas', href: '/dashboard/ventas', icon: 'ticket', permission: 'canViewVentas', ocultableId: 'ventas' },
        { label: 'Cola POS', href: '/dashboard/pos', icon: 'cola', permission: 'canViewVentas', ocultableId: 'cola-pos' },
        { label: 'Devoluciones', href: '/dashboard/devoluciones', icon: 'devolucion', permission: 'canViewDevoluciones', ocultableId: 'menu.ventas.devoluciones' },
        { label: 'Reportes Ventas', href: '/dashboard/reportes-ventas', icon: 'barras', permission: 'canViewStatistics', ocultableId: 'menu.ventas.reportes' },
        // En la web la pantalla se llamó "Políticas VIP", pero es el mismo
        // módulo: pega contra `/politicas-descuento`.
        { label: 'Políticas de Descuento', href: '/dashboard/politicas-vip', icon: 'porcentaje', permission: 'canViewDiscounts', ocultableId: 'menu.ventas.politicas-descuento' },
        { label: 'Tipo de Cambio', href: '/dashboard/tipo-cambio', icon: 'cambio', permission: 'canViewVentas', ocultableId: 'menu.ventas.tipo-cambio', enConstruccion: true },
      ],
    },
  },

  // ───────────────── Servicios ─────────────────
  {
    kind: 'section',
    section: {
      id: 'servicios',
      label: 'Servicios',
      icon: 'servicio',
      permission: ['canViewServices', 'canManageOrders', 'canManageServices', 'canManageSettings'],
      items: [
        // 🔴 Cruzado a propósito: en la web `/dashboard/servicios` es la
        // bandeja de ÓRDENES y el catálogo vive en `/dashboard/catalogo-servicios`.
        { label: 'Servicios', href: '/dashboard/catalogo-servicios', icon: 'servicio', permission: 'canViewServices', ocultableId: 'servicios' },
        { label: 'Órdenes de Servicio', href: '/dashboard/servicios', icon: 'reporte', permission: 'canManageOrders', ocultableId: 'ordenes-servicio' },
        { label: 'Citas', href: '/dashboard/citas', icon: 'calendario', permission: 'canManageOrders', ocultableId: 'menu.servicios.citas', enConstruccion: true },
        { label: 'Historial por Cliente', href: '/dashboard/citas/clientes', icon: 'personas', permission: 'canManageOrders', ocultableId: 'menu.servicios.historial-cliente', enConstruccion: true },
        { label: 'Plantillas de Servicio', href: '/dashboard/plantillas-servicio', icon: 'lista', permission: 'canManageServices', ocultableId: 'menu.servicios.plantillas' },
        { label: 'Tercerización B2B', href: '/dashboard/tercerizacion', icon: 'intercambio', permission: 'canManageOrders', ocultableId: 'menu.servicios.tercerizacion' },
        { label: 'Vinculaciones B2B', href: '/dashboard/vinculacion', icon: 'enlace', permission: 'canManageSettings', ocultableId: 'menu.servicios.vinculaciones', enConstruccion: true },
        { label: 'Campos de Servicio', href: '/dashboard/campos-servicio', icon: 'sliders', permission: 'canViewServices', soloWeb: true },
      ],
    },
  },

  // ───────────────── Compras ─────────────────
  {
    kind: 'section',
    section: {
      id: 'compras',
      label: 'Compras',
      icon: 'bolsa',
      permission: 'canViewCompras',
      items: [
        { label: 'OC', href: '/dashboard/ordenes-compra', icon: 'documento' },
        { label: 'Recepcion/Compras', href: '/dashboard/compras', icon: 'delivery' },
        // `/dashboard/compras/lotes` lo comería `/dashboard/compras/[id]`.
        { label: 'Lotes', href: '/dashboard/lotes', icon: 'capas', enConstruccion: true },
        { label: 'Cuentas por Pagar', href: '/dashboard/cuentas-pagar', icon: 'pago' },
      ],
    },
  },

  // ───────────────── Tesorería ─────────────────
  {
    kind: 'section',
    section: {
      id: 'tesoreria',
      label: 'Tesorería',
      icon: 'alcancia',
      permission: ['canViewCaja', 'canManageCaja', 'canViewReports', 'canManageSettings'],
      items: [
        { label: 'Caja', href: '/dashboard/caja', icon: 'ticket', permission: 'canViewCaja', ocultableId: 'caja' },
        { label: 'Monitor Cajas', href: '/dashboard/caja/monitor', icon: 'pulso', permission: 'canViewCaja', ocultableId: 'monitor-cajas' },
        { label: 'Historial de Cajas', href: '/dashboard/caja/historial', icon: 'historial', permission: 'canViewCaja', ocultableId: 'historial-cajas' },
        { label: 'Tesorería', href: '/dashboard/tesoreria', icon: 'banco', permission: 'canViewCaja', ocultableId: 'tesoreria' },
        { label: 'Tesorería Consolidado', href: '/dashboard/tesoreria/consolidado', icon: 'alcancia', permission: 'canViewCaja', ocultableId: 'menu.tesoreria.consolidado' },
        { label: 'Caja Chica', href: '/dashboard/caja-chica', icon: 'billetera', permission: 'canManageCaja', ocultableId: 'caja-chica', enConstruccion: true },
        { label: 'Gastos Recurrentes', href: '/dashboard/gastos-recurrentes', icon: 'repetir', permission: 'canViewGastosRecurrentes', ocultableId: 'menu.tesoreria.gastos-recurrentes', enConstruccion: true },
        { label: 'Cuentas Bancarias', href: '/dashboard/cuentas-bancarias', icon: 'banco', permission: 'canViewReports', ocultableId: 'menu.tesoreria.cuentas-bancarias', enConstruccion: true },
        { label: 'Cuentas de Recaudación', href: '/dashboard/cuentas-recaudacion', icon: 'intercambio', permission: 'canViewReports', ocultableId: 'menu.tesoreria.cuentas-recaudacion', enConstruccion: true },
        { label: 'Agentes Bancarios', href: '/dashboard/agentes-bancarios', icon: 'banco', permission: 'canManageSettings', ocultableId: 'menu.tesoreria.agentes-bancarios', enConstruccion: true },
        { label: 'Cuentas por Cobrar', href: '/dashboard/cuentas-cobrar', icon: 'billetera', permission: 'canViewReports', ocultableId: 'cuentas-por-cobrar' },
      ],
    },
  },

  // ───────────────── Facturación SUNAT ─────────────────
  {
    kind: 'section',
    section: {
      id: 'facturacion',
      // `canManageInvoices` además de reportes: quien EMITE comprobantes —el
      // cajero— tiene que poder ver el estado de lo que emite. Adentro, los
      // ítems sensibles piden `canManageSettings` por su cuenta.
      label: 'Facturación SUNAT',
      icon: 'recibo',
      permission: ['canManageInvoices', 'canViewReports'],
      items: [
        { label: 'Monitor Facturación', href: '/dashboard/facturacion', icon: 'recibo', permission: 'canManageInvoices', ocultableId: 'facturacion' },
        { label: 'Guías de Remisión', href: '/dashboard/guias-remision', icon: 'delivery', permission: 'canManageInvoices', ocultableId: 'guias-remision', enConstruccion: true },
        { label: 'Catálogos GRE', href: '/dashboard/guias-remision/catalogos', icon: 'auto', permission: 'canManageSettings', ocultableId: 'menu.facturacion.catalogos-gre', enConstruccion: true },
        { label: 'Anulaciones SUNAT', href: '/dashboard/anulaciones', icon: 'cancelar', permission: 'canManageSettings', ocultableId: 'menu.facturacion.anulaciones', enConstruccion: true },
        { label: 'Flujo Documentos', href: '/dashboard/flujo-documentos', icon: 'arbol', permission: 'canViewVentas', ocultableId: 'flujo-docs', enConstruccion: true },
        { label: 'Reporte Correlativos', href: '/dashboard/facturacion/correlativos', icon: 'numeros', permission: 'canViewReports', ocultableId: 'menu.facturacion.correlativos' },
      ],
    },
  },

  // ───────────────── Finanzas ─────────────────
  {
    kind: 'section',
    section: {
      id: 'finanzas',
      label: 'Finanzas',
      icon: 'grafico',
      permission: ['canViewReports', 'canManageSettings'],
      items: [
        { label: 'Resumen Financiero', href: '/dashboard/resumen-financiero', icon: 'grafico', permission: 'canViewReports', ocultableId: 'finanzas' },
        { label: 'Libro Contable', href: '/dashboard/libro-contable', icon: 'libro', permission: 'canViewReports', enConstruccion: true },
        { label: 'Liquidaciones y pérdidas', href: '/dashboard/liquidaciones', icon: 'fuego', permission: 'canViewReports' },
        { label: 'Registro de Ventas (SUNAT)', href: '/dashboard/registro-ventas', icon: 'recibo', permission: 'canViewReports', enConstruccion: true },
        { label: 'Flujo Proyectado', href: '/dashboard/flujo-proyectado', icon: 'pulso', permission: 'canViewReports', enConstruccion: true },
        { label: 'Préstamos', href: '/dashboard/prestamos', icon: 'billetera', permission: 'canViewReports', enConstruccion: true },
        { label: 'Metas Financieras', href: '/dashboard/metas-financieras', icon: 'bandera', permission: 'canViewReports', enConstruccion: true },
        { label: 'Categorías de Gasto', href: '/dashboard/categorias-gasto', icon: 'carpeta', permission: 'canManageSettings', enConstruccion: true },
      ],
    },
  },

  // ───────────────── Marketing & Canales ─────────────────
  {
    kind: 'section',
    section: {
      id: 'marketing',
      label: 'Marketing & Canales',
      icon: 'megafono',
      permission: ['canManageProducts', 'canViewVentas', 'canViewCotizaciones'],
      items: [
        { label: 'Promociones', href: '/dashboard/promociones', icon: 'megafono', permission: 'canManageProducts', enConstruccion: true },
        { label: 'Preguntas de Clientes', href: '/dashboard/preguntas-producto', icon: 'pregunta', permission: 'canManageProducts', enConstruccion: true },
        { label: 'Opiniones de Clientes', href: '/dashboard/opiniones-producto', icon: 'estrella', permission: 'canManageProducts', enConstruccion: true },
        { label: 'Pedidos Marketplace', href: '/dashboard/pedidos-marketplace', icon: 'tienda', permission: 'canViewVentas', enConstruccion: true },
        { label: 'Sorteos', href: '/dashboard/sorteos', icon: 'regalo', permission: 'canViewVentas', ocultableId: 'sorteos', enConstruccion: true },
        { label: 'Solicitudes Clientes', href: '/dashboard/solicitudes-cotizacion', icon: 'cotizacion', permission: 'canViewCotizaciones', enConstruccion: true },
      ],
    },
  },

  // ───────────────── Recursos Humanos ─────────────────
  {
    kind: 'section',
    section: {
      id: 'rrhh',
      label: 'Recursos Humanos',
      icon: 'personas',
      permission: ['canViewEmpleados', 'canViewAsistencia', 'canViewPlanilla'],
      items: [
        { label: 'Dashboard RRHH', href: '/dashboard/rrhh', icon: 'dashboard', permission: 'canViewEmpleados', enConstruccion: true },
        { label: 'Empleados', href: '/dashboard/rrhh/empleados', icon: 'credencial', permission: 'canViewEmpleados', enConstruccion: true },
        { label: 'Turnos y Horarios', href: '/dashboard/rrhh/turnos', icon: 'reloj', permission: 'canViewEmpleados', enConstruccion: true },
        { label: 'Asistencia', href: '/dashboard/rrhh/asistencia', icon: 'huella', permission: 'canViewAsistencia', enConstruccion: true },
        { label: 'Incidencias', href: '/dashboard/rrhh/incidencias', icon: 'calendarioX', permission: 'canViewAsistencia', enConstruccion: true },
        { label: 'Planilla', href: '/dashboard/rrhh/planilla', icon: 'recibo', permission: 'canViewPlanilla', enConstruccion: true },
        { label: 'Adelantos', href: '/dashboard/rrhh/adelantos', icon: 'dinero', permission: 'canViewPlanilla', enConstruccion: true },
      ],
    },
  },

  // ───────────────── Catálogos ─────────────────
  {
    kind: 'section',
    section: {
      id: 'catalogos',
      label: 'Catálogos',
      icon: 'carpeta',
      permission: ['canManageSedes', 'canViewClients', 'canViewProveedores'],
      items: [
        { label: 'Sedes', href: '/dashboard/sedes', icon: 'tienda', permission: 'canManageSedes', enConstruccion: true },
        { label: 'Clientes', href: '/dashboard/clientes', icon: 'personas', permission: 'canViewClients' },
        { label: 'Proveedores', href: '/dashboard/proveedores', icon: 'empresa', permission: 'canViewProveedores' },
      ],
    },
  },

  // ───────────────── Administración ─────────────────
  {
    kind: 'section',
    section: {
      id: 'administracion',
      label: 'Administración',
      icon: 'escudo',
      permission: ['canManageSettings', 'canViewUsers'],
      items: [
        { label: 'Perfil de Empresa', href: '/dashboard/perfil-empresa', icon: 'maletin', permission: 'canManageSettings', enConstruccion: true },
        // La web ya tenía esta pantalla colgada de Facturación.
        { label: 'Configuración Fiscal', href: '/dashboard/facturacion/configuracion', icon: 'engranaje', permission: 'canManageSettings', ocultableId: 'config' },
        { label: 'Configuración Documentos', href: '/dashboard/configuracion-documentos', icon: 'documento', permission: 'canManageSettings' },
        { label: 'QR de cobro Yape/Plin', href: '/dashboard/qr-cobro', icon: 'qr', permission: 'canManageSettings', enConstruccion: true },
        { label: 'Integración Yape', href: '/dashboard/integraciones/yape', icon: 'intercambio', permission: 'canManageSettings' },
        { label: 'WhatsApp de la empresa', href: '/dashboard/whatsapp', icon: 'chat', permission: 'canManageSettings', enConstruccion: true },
        { label: 'Agente IA (WhatsApp)', href: '/dashboard/agente-ia', icon: 'robot', permission: 'canManageSettings', enConstruccion: true },
        { label: 'Usuarios', href: '/dashboard/usuarios', icon: 'personas', permission: 'canViewUsers', enConstruccion: true },
        { label: 'Personalización', href: '/dashboard/personalizacion', icon: 'paleta', permission: 'canManageSettings', enConstruccion: true },
      ],
    },
  },

  // ───────────────── Mi cuenta + periféricos ─────────────────
  { kind: 'divider' },
  { kind: 'tile', item: { label: 'Mi Perfil', href: '/dashboard/perfil', icon: 'persona', enConstruccion: true } },
  { kind: 'tile', item: { label: 'Ir a Marketplace', href: '/dashboard/marketplace', icon: 'tienda', enConstruccion: true } },
  // Impresoras y balanzas son periféricos del mostrador, no módulos de la
  // empresa: por eso van acá abajo y no en un módulo operativo.
  { kind: 'tile', item: { label: 'Impresoras', href: '/dashboard/impresoras', icon: 'impresora', permission: 'canManageCaja', enConstruccion: true } },
  { kind: 'tile', item: { label: 'Balanzas', href: '/dashboard/balanzas', icon: 'balanza', permission: 'canManageCaja', enConstruccion: true } },
];

/** Roles que ven el pool de entregas. Espeja la condición del drawer del app. */
export const ROLES_DELIVERY = ['REPARTIDOR', 'EMPRESA_ADMIN', 'SUPER_ADMIN'];

/** Solo las secciones colapsables, en orden. */
export const SIDEBAR_SECTIONS: SidebarSection[] = SIDEBAR_NODES.flatMap((n) =>
  n.kind === 'section' ? [n.section] : [],
);

/** Todos los ítems del menú, secciones y tiles sueltos por igual. */
export const SIDEBAR_ITEMS: SidebarItem[] = SIDEBAR_NODES.flatMap((n) => {
  if (n.kind === 'tile') return [n.item];
  if (n.kind === 'section') return n.section.items;
  return [];
});

/**
 * Qué ítem del menú corresponde a una ruta.
 *
 * Gana el href MÁS LARGO: `/dashboard/compras/nueva` tiene que resolver a la
 * entrada de Compras y no quedarse con `/dashboard`, que también es prefijo.
 * Lo usan la cabecera (para el título) y la pantalla "en construcción".
 */
export function buscarPorRuta(
  pathname: string,
): { seccion: SidebarSection | null; item: SidebarItem; exacta: boolean } | null {
  let mejor: { seccion: SidebarSection | null; item: SidebarItem } | null = null;

  const considerar = (item: SidebarItem, seccion: SidebarSection | null) => {
    const coincide = pathname === item.href || pathname.startsWith(item.href + '/');
    if (coincide && (!mejor || item.href.length > mejor.item.href.length)) {
      mejor = { seccion, item };
    }
  };

  for (const nodo of SIDEBAR_NODES) {
    if (nodo.kind === 'tile') considerar(nodo.item, null);
    if (nodo.kind === 'section') {
      for (const item of nodo.section.items) considerar(item, nodo.section);
    }
  }

  if (!mejor) return null;
  const encontrado: { seccion: SidebarSection | null; item: SidebarItem } = mejor;
  return { ...encontrado, exacta: pathname === encontrado.item.href };
}

/**
 * Accesos rápidos de la cabecera.
 *
 * Son las tres pantallas del día a día del mostrador: entrar por el menú
 * —abrirlo, buscar la sección, bajar hasta el ítem— cuesta demasiado para algo
 * que se usa decenas de veces al día. Salen de la misma lista que el menú
 * (mismos href y mismos permisos) para que no puedan decir cosas distintas.
 */
export const ACCESOS_RAPIDOS: SidebarItem[] = [
  { label: 'Venta Rápida', href: '/dashboard/venta-rapida', permission: 'canViewVentas', ocultableId: 'venta-rapida', icon: 'rayo' },
  { label: 'Ventas', href: '/dashboard/ventas', permission: 'canViewVentas', ocultableId: 'ventas', icon: 'ticket' },
  { label: 'Cotizaciones', href: '/dashboard/cotizaciones', permission: 'canViewCotizaciones', ocultableId: 'cotizaciones', icon: 'cotizacion' },
  { label: 'Órdenes de Servicio', labelCorto: 'Órdenes', href: '/dashboard/servicios', permission: 'canManageOrders', ocultableId: 'ordenes-servicio', icon: 'reporte' },
  // 🔑 Caja va con `alcancia` y no con el `ticket` del menú a propósito: abajo
  // de `xl` la cabecera muestra SOLO iconos, y en el menú Caja y Ventas
  // comparten icono. Dos botones idénticos no se pueden distinguir.
  { label: 'Caja', href: '/dashboard/caja', permission: 'canViewCaja', ocultableId: 'caja', icon: 'alcancia' },
  { label: 'Cola POS', href: '/dashboard/pos', permission: 'canViewVentas', ocultableId: 'cola-pos', icon: 'cola' },
  { label: 'Recepcion/Compras', labelCorto: 'Compras', href: '/dashboard/compras', permission: 'canViewCompras', icon: 'delivery' },
  // El boton muestra `labelCorto` y el tooltip usa `label`: en la cabecera
  // dice Prod --que es lo que pidio el user-- sin perder el nombre real al
  // pasar el mouse. El icono `caja` es la CAJA DE PRODUCTO, no la de dinero:
  // esa es `alcancia`, asi que abajo de `xl`, donde solo se ven iconos, los
  // dos accesos siguen siendo distinguibles.
  { label: 'Productos', labelCorto: 'Prod', href: '/dashboard/productos', permission: 'canViewProducts', ocultableId: 'productos', icon: 'caja' },
];
