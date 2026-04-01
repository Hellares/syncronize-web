'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const DashboardCharts = dynamic(() => import('./DashboardCharts'), { ssr: false });
const StatCardSparkline = dynamic(() => import('./StatCardSparkline'), { ssr: false });

const STAT_CARDS = [
  { key: 'totalProductos', label: 'Productos', href: '/dashboard/productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: '#437EFF', bgColor: '#437EFF', change: 12.5 },
  { key: 'totalUsuarios', label: 'Usuarios', href: '/dashboard/usuarios', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#10b981', bgColor: '#10b981', change: 8.2 },
  { key: 'totalSedes', label: 'Sedes', href: '/dashboard/sedes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: '#f59e0b', bgColor: '#f59e0b', change: 0 },
  { key: 'ingresosMes', label: 'Ingresos del Mes', href: '/dashboard/ventas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#8b5cf6', bgColor: '#8b5cf6', change: 15.3, prefix: 'S/ ' },
] as const;

const QUICK_LINKS = [
  { label: 'Productos', href: '/dashboard/productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', permission: 'canViewProducts' as const },
  { label: 'Categorías', href: '/dashboard/categorias', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', permission: 'canViewProducts' as const },
  { label: 'Marcas', href: '/dashboard/marcas', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', permission: 'canViewProducts' as const },
  { label: 'Unidades', href: '/dashboard/unidades', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', permission: 'canViewProducts' as const },
  { label: 'Clientes', href: '/dashboard/clientes', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', permission: 'canViewClients' as const },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', permission: 'canManageSettings' as const },
];

export default function DashboardPage() {
  const { state: authState } = useAuth();
  const { state: empresaState, empresa, statistics, sedes, userRoles } = useEmpresa();
  const permissions = usePermissions();

  if (authState.status !== 'authenticated') return null;
  const { user } = authState;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Bienvenido, {user.nombres}</p>
        </div>
        {empresa && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm border border-gray-100">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-medium text-gray-700">{empresa.nombre}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {empresaState.status === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#437EFF] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {empresaState.status === 'error' && (
        <div className="rounded-[10px] bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-600">{empresaState.message}</p>
        </div>
      )}

      {/* Stat cards row */}
      {statistics && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card) => {
            const value = statistics[card.key as keyof typeof statistics];
            const isPositive = card.change > 0;
            return (
              <Link
                key={card.key}
                href={card.href}
                className="group rounded-[10px] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${card.bgColor}15` }}>
                    <svg className="h-5 w-5" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  {card.change !== 0 && (
                    <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isPositive ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f43f5e]/10 text-[#f43f5e]'}`}>
                      <svg className={`h-3 w-3 ${isPositive ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      {Math.abs(card.change)}%
                    </div>
                  )}
                </div>

                <p className="text-2xl font-bold text-gray-900">
                  {'prefix' in card ? card.prefix : ''}{typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{card.label}</p>

                {/* Mini sparkline */}
                <div className="mt-3 h-[40px]">
                  <StatCardSparkline color={card.color} value={value as number} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Charts row */}
      {statistics && (
        <DashboardCharts statistics={statistics} />
      )}

      {/* Bottom row */}
      {empresa && (
        <div className="grid gap-4 md:gap-6 xl:grid-cols-12">
          {/* Empresa info */}
          <div className="xl:col-span-4 rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Información</h3>
            <div className="space-y-3">
              {[
                { label: 'Empresa', value: empresa.nombre },
                { label: 'RUC', value: empresa.ruc || '—' },
                { label: 'Rubro', value: empresa.rubro || '—' },
                { label: 'Plan', value: empresa.planSuscripcion?.nombre || '—' },
                { label: 'Estado', value: empresa.estadoSuscripcion, color: empresa.estadoSuscripcion === 'ACTIVA' ? '#10b981' : '#f59e0b' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className="text-xs font-semibold" style={item.color ? { color: item.color } : undefined}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div className="xl:col-span-3 rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Tus Roles</h3>
            <div className="flex flex-wrap gap-2">
              {userRoles.map((role) => (
                <span
                  key={role.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    role.estado === 'ACTIVO'
                      ? 'bg-[#10b981]/10 text-[#10b981]'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {role.rol}
                </span>
              ))}
            </div>

            <h3 className="mb-3 mt-5 text-sm font-bold text-gray-900">Sedes</h3>
            <div className="space-y-2">
              {sedes.filter(s => s.isActive).map((sede) => (
                <div key={sede.id} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${sede.esPrincipal ? 'bg-[#437EFF]' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-600 flex-1">{sede.nombre}</span>
                  {sede.esPrincipal && <span className="text-[10px] text-[#437EFF] font-medium">Principal</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="xl:col-span-5 rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Accesos Rápidos</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_LINKS.filter((link) => permissions[link.permission]).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-gray-100 p-3 text-center transition-all duration-200 hover:border-[#437EFF]/20 hover:bg-[#437EFF]/[0.03] hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-[#437EFF]/10">
                    <svg className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[#437EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 group-hover:text-[#437EFF]">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
