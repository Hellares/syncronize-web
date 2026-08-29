'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermissions, useEmpresa } from '@/features/empresa/context/empresa-context';
import {
  SIDEBAR_NODES,
  ICONOS,
  ROLES_DELIVERY,
  tienePermiso,
  type SidebarNode,
  type SidebarSection,
  type SidebarItem,
} from './sidebar-config';
import type { EmpresaPermissions } from '@/core/types/empresa';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Ancho del riel colapsado. Lo espeja el layout con un spacer del mismo ancho. */
export const SIDEBAR_RIEL = 68;
/** Ancho desplegado. */
const SIDEBAR_ABIERTO = 252;
/**
 * Retardo antes de abrir con el mouse.
 *
 * 🔑 Sin esto el menu se despliega cada vez que el puntero CRUZA el borde
 * izquierdo camino al contenido. 120 ms alcanza para distinguir "voy pasando"
 * de "me quiero meter", y no se siente lento.
 */
const RETARDO_ABRIR = 120;
const CLAVE_PIN = 'syncronize.sidebar.fijado';

function esActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

function SvgIcon({ nombre, size = 19 }: { nombre: string; size?: number }) {
  const d = ICONOS[nombre];
  if (!d) return <span className="shrink-0" style={{ width: size, height: size }} />;
  return (
    <svg className="shrink-0" style={{ width: size, height: size }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Un ítem suelto de primer nivel (Dashboard, Mi Perfil, Impresoras…). */
function TileLink({ item, pathname, abierto }: { item: SidebarItem; pathname: string; abierto: boolean }) {
  const activa = esActiva(pathname, item.href);
  return (
    <li>
      <Link
        href={item.href}
        title={abierto ? undefined : item.label}
        className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-2.5 transition-colors ${
          activa ? 'bg-white/10 text-white' : 'text-white/[.72] hover:bg-white/[.07] hover:text-white'
        }`}
      >
        {activa && <span className="absolute -left-[11px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-[#5EA8FF]" />}
        <SvgIcon nombre={item.icon} />
        <span className={`flex-1 whitespace-nowrap text-left text-[12.5px] transition-opacity duration-150 ${activa ? 'font-bold' : 'font-medium'} ${abierto ? 'opacity-100' : 'opacity-0'}`}>
          {item.label}
        </span>
      </Link>
    </li>
  );
}

function SectionGroup({ section, items, pathname, expanded, onToggle, abierto }: {
  section: SidebarSection;
  items: SidebarItem[];
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  abierto: boolean;
}) {
  const isActive = items.some((item) => esActiva(pathname, item.href));

  // Colapsado, un acordeon desplegado seria una tira de items sin nombre.
  const mostrarHijos = abierto && expanded;

  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        title={abierto ? undefined : section.label}
        className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-2.5 transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-white/[.72] hover:bg-white/[.07] hover:text-white'
        }`}
      >
        {isActive && <span className="absolute -left-[11px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-[#5EA8FF]" />}
        <SvgIcon nombre={section.icon} />
        <span className={`flex-1 whitespace-nowrap text-left text-[12.5px] transition-opacity duration-150 ${isActive ? 'font-bold' : 'font-medium'} ${abierto ? 'opacity-100' : 'opacity-0'}`}>
          {section.label}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 transition-all duration-150 ${expanded ? '' : 'rotate-180'} ${abierto ? 'opacity-100' : 'opacity-0'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>

      {mostrarHijos && (
        <ul className="pb-1.5 pt-0.5" role="menu">
          {items.map((item) => (
            <li key={item.href} role="none">
              <SidebarLink item={item} pathname={pathname} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarLink({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const isActive = esActiva(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={`relative flex min-h-[30px] items-center whitespace-nowrap rounded-lg py-1 pl-[38px] pr-2.5 text-xs transition-colors ${
        isActive
          ? 'bg-[#5EA8FF]/[.16] font-bold text-white'
          : 'font-medium text-white/[.62] hover:bg-white/[.07] hover:text-white'
      }`}
    >
      {isActive && <span className="absolute left-[19px] top-1/2 h-[15px] w-[3px] -translate-y-1/2 rounded-sm bg-[#5EA8FF]" />}
      {item.label}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const permissions = usePermissions();
  const { empresa, userRoles } = useEmpresa();
  const pathname = usePathname();
  // Acordeón como el del app: UNA sección abierta a la vez. Con 12 secciones,
  // permitir varias convierte el menú en una tira que hay que scrollear entera.
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const [fijado, setFijado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El pin sobrevive a la recarga: quien lo deja fijo no quiere volver a
  // fijarlo cada vez que entra.
  useEffect(() => {
    setFijado(localStorage.getItem(CLAVE_PIN) === '1');
  }, []);

  const alternarPin = () => {
    setFijado((f) => {
      const nuevo = !f;
      localStorage.setItem(CLAVE_PIN, nuevo ? '1' : '0');
      return nuevo;
    });
  };

  const entrar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(true), RETARDO_ABRIR);
  }, []);

  const salir = useCallback(() => {
    // El timer se cancela SIEMPRE: si el puntero se fue antes de los 120 ms,
    // el menu no tiene que abrirse despues de que ya no esta encima.
    if (timer.current) clearTimeout(timer.current);
    setHover(false);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const abierto = fijado || hover;

  /**
   * El árbol que este usuario ve, ya filtrado.
   *
   * Dos filtros distintos y no intercambiables: el PERMISO dice qué puede
   * hacer, y `accesosRapidosOcultos` dice qué le escondió el admin aunque
   * pueda. Se arreglan en lugares opuestos, así que se aplican por separado.
   */
  const nodos = useMemo(() => {
    const ocultos = new Set(permissions.accesosRapidosOcultos ?? []);
    const esRepartidor = userRoles.some((r) => ROLES_DELIVERY.includes(r.rol));

    const visible = (item: SidebarItem, permisos: EmpresaPermissions) =>
      tienePermiso(permisos, item.permission) && !(item.ocultableId && ocultos.has(item.ocultableId));

    return SIDEBAR_NODES.flatMap((nodo): SidebarNode[] => {
      if (nodo.kind === 'divider') return [nodo];

      if (nodo.kind === 'tile') {
        // El pool de entregas se muestra por ROL (es la home del repartidor),
        // no por permiso: no hay un flag equivalente en el mapa de permisos.
        if (nodo.item.href === '/dashboard/delivery' && !esRepartidor) return [];
        return visible(nodo.item, permissions) ? [nodo] : [];
      }

      if (!tienePermiso(permissions, nodo.section.permission)) return [];
      const items = nodo.section.items.filter((i) => visible(i, permissions));
      // Ocultarle todos los hijos a alguien tiene que llevarse la sección: un
      // encabezado que no despliega nada solo hace ruido.
      if (items.length === 0) return [];
      return [{ ...nodo, section: { ...nodo.section, items } }];
    });
  }, [permissions, userRoles]);

  const secciones = useMemo(
    () => nodos.flatMap((n) => (n.kind === 'section' ? [n.section] : [])),
    [nodos],
  );

  // Al navegar, se abre la sección que contiene la ruta activa (y se cierra la
  // otra, que es lo que hace el acordeón).
  useEffect(() => {
    const conLaRuta = secciones.find((s) => s.items.some((i) => esActiva(pathname, i.href)));
    if (conLaRuta) setSeccionAbierta(conLaRuta.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, secciones.length]);

  const alternarSeccion = (id: string) =>
    setSeccionAbierta((actual) => (actual === id ? null : id));

  // En movil el cajon tapa la pantalla: navegar y quedarse abierto obliga a un
  // segundo gesto para ver a donde se fue. El drawer del app hace lo mismo.
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const contenido = (desplegado: boolean) => (
    <div className="flex h-full flex-col">
      {/* Empresa + pin */}
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-white/[.07] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white text-sm font-bold text-[#004A94]">
          {empresa?.logo
            ? <img src={empresa.logo} alt="" className="h-full w-full object-cover" />
            : (empresa?.nombre?.charAt(0) || 'S')}
        </div>
        <div className={`min-w-0 flex-1 whitespace-nowrap transition-opacity duration-150 ${desplegado ? 'opacity-100' : 'opacity-0'}`}>
          <p className="truncate text-[12.5px] font-bold text-white">{empresa?.nombre || 'Cargando…'}</p>
          <p className="truncate text-[10px] text-white/55">{empresa?.rubro || ''}</p>
        </div>
        {/* Pin: solo en escritorio, donde existe el colapso por hover */}
        <button
          onClick={alternarPin}
          title={fijado ? 'Soltar el menú (se colapsa solo)' : 'Fijar el menú abierto'}
          aria-pressed={fijado}
          className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150 lg:flex ${
            desplegado ? 'opacity-100' : 'pointer-events-none opacity-0'
          } ${fijado ? 'bg-white/15 text-white' : 'text-white/45 hover:bg-white/10 hover:text-white'}`}
        >
          <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 10.8V6h6v4.8l2 3.2H7l2-3.2z" />
          </svg>
        </button>
      </div>

      {/* Navegación */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-[11px] py-2.5" role="navigation" aria-label="Dashboard">
        <ul className="space-y-0.5">
          {nodos.map((nodo, i) => {
            if (nodo.kind === 'divider') {
              return <li key={`div-${i}`} className="my-1.5 border-t border-white/[.07]" aria-hidden="true" />;
            }
            if (nodo.kind === 'tile') {
              return <TileLink key={nodo.item.href} item={nodo.item} pathname={pathname} abierto={desplegado} />;
            }
            return (
              <SectionGroup
                key={nodo.section.id}
                section={nodo.section}
                items={nodo.section.items}
                pathname={pathname}
                expanded={seccionAbierta === nodo.section.id}
                onToggle={() => alternarSeccion(nodo.section.id)}
                abierto={desplegado}
              />
            );
          })}
        </ul>
      </nav>

      {/* Suscripción */}
      {empresa && (
        <div className="flex h-[46px] shrink-0 items-center gap-2.5 whitespace-nowrap border-t border-white/[.07] px-[18px]">
          <span className={`h-2 w-2 shrink-0 rounded-full ${empresa.estadoSuscripcion === 'ACTIVA' ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className={`flex-1 truncate text-[10.5px] text-white/60 transition-opacity duration-150 ${desplegado ? 'opacity-100' : 'opacity-0'}`}>
            {empresa.planSuscripcion?.nombre || 'Plan'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Escritorio: spacer que reserva el riel + panel que se despliega ENCIMA.
          Desplegar empujando correria la pagina entera cada vez que el puntero
          roza el borde izquierdo. */}
      <div className="hidden shrink-0 lg:block" style={{ width: SIDEBAR_RIEL }} aria-hidden="true" />
      <aside
        onMouseEnter={entrar}
        onMouseLeave={salir}
        style={{ width: abierto ? SIDEBAR_ABIERTO : SIDEBAR_RIEL }}
        className={`fixed bottom-0 left-0 top-0 z-40 hidden overflow-hidden bg-[#0B2E52] transition-[width] duration-200 ease-out lg:block ${
          abierto && !fijado ? 'shadow-[6px_0_24px_-8px_rgba(11,46,82,.45)]' : ''
        }`}
        aria-label="Main navigation"
      >
        {contenido(abierto)}
      </aside>

      {/* Móvil: cajón de siempre, sin hover */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed bottom-0 top-0 z-50 overflow-hidden bg-[#0B2E52] transition-[width] duration-200 ease-out lg:hidden ${
          isOpen ? 'w-[252px]' : 'w-0'
        }`}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {contenido(true)}
      </aside>
    </>
  );
}
