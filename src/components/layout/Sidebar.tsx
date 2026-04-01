'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermissions, useEmpresa } from '@/features/empresa/context/empresa-context';
import { SIDEBAR_SECTIONS, type SidebarSection, type SidebarItem } from './sidebar-config';
import type { EmpresaPermissions } from '@/core/types/empresa';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function hasPermission(permissions: EmpresaPermissions, key?: keyof EmpresaPermissions): boolean {
  if (!key) return true;
  return permissions[key];
}

function SvgIcon({ path }: { path: string }) {
  return (
    <svg className="h-[22px] w-[22px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function SectionGroup({ section, permissions, pathname, expanded, onToggle }: {
  section: SidebarSection;
  permissions: EmpresaPermissions;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const visibleItems = section.items.filter((item) => hasPermission(permissions, item.permission));
  const isActive = visibleItems.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

  if (visibleItems.length === 0) return null;

  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-3 font-medium transition-all duration-200 ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        <SvgIcon path={section.icon} />
        <span className="text-sm">{section.label}</span>
        <svg
          className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {expanded && (
        <ul className="ml-9 mr-0 space-y-1 pb-3 pr-0 pt-2" role="menu">
          {visibleItems.map((item) => (
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
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`relative block rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-white/15 text-white'
          : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      {item.label}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const permissions = usePermissions();
  const { empresa } = useEmpresa();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const visibleSections = SIDEBAR_SECTIONS.filter(
    (section) => hasPermission(permissions, section.permission)
  );

  // Auto-expand section that contains active route
  useEffect(() => {
    visibleSections.forEach((section) => {
      const hasActiveChild = section.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      if (hasActiveChild && !expandedItems.includes(section.label)) {
        setExpandedItems((prev) => [...prev, section.label]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col pt-4 pb-8 pl-6 pr-2">
      {/* Company info */}
      <Link href="/dashboard" className="mb-6 mr-2 block rounded-[10px] bg-white/10 p-3.5 transition-all hover:bg-white/15">
        <div className="flex items-center gap-3">
          {empresa?.logo ? (
            <img src={empresa.logo} alt="" className="h-10 w-10 rounded-lg object-cover ring-2 ring-white/20" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
              {empresa?.nombre?.charAt(0) || 'S'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{empresa?.nombre || 'Cargando...'}</p>
            <p className="truncate text-xs text-white/60">{empresa?.rubro || ''}</p>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pr-3 custom-scrollbar" role="navigation" aria-label="Dashboard">
        <div className="mb-4">
          <h2 className="mb-3 px-3.5 text-xs font-semibold uppercase tracking-wider text-white/40">
            Menú Principal
          </h2>
          <ul className="space-y-1">
            {visibleSections.map((section) => (
              <SectionGroup
                key={section.label}
                section={section}
                permissions={permissions}
                pathname={pathname}
                expanded={expandedItems.includes(section.label)}
                onToggle={() => toggleExpanded(section.label)}
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* Subscription footer */}
      {empresa && (
        <div className="mr-2 mt-4 rounded-[10px] bg-white/10 p-3.5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${empresa.estadoSuscripcion === 'ACTIVA' ? 'bg-green-400' : 'bg-amber-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{empresa.planSuscripcion?.nombre || 'Plan'}</p>
              <p className="text-[10px] text-white/50">{empresa.estadoSuscripcion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block sticky top-0 h-screen w-[280px] shrink-0 overflow-hidden bg-gradient-to-b from-[#1e3a5f] to-[#2a5298] transition-[width] duration-200 ease-linear"
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed bottom-0 top-0 z-50 w-[280px] overflow-hidden bg-gradient-to-b from-[#1e3a5f] to-[#2a5298] transition-[width] duration-200 ease-linear lg:hidden ${
          isOpen ? 'w-[280px]' : 'w-0'
        }`}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Close button */}
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
