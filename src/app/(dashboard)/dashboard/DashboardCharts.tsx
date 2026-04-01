'use client';

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { EmpresaStatistics } from '@/core/types/empresa';

interface Props {
  statistics: EmpresaStatistics;
}

// Simulated monthly data based on current stats
function generateMonthlyData(currentValue: number) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentMonth = new Date().getMonth();

  return months.map((name, i) => {
    if (i > currentMonth) return { name, ventas: 0, ingresos: 0 };
    const factor = 0.5 + Math.random() * 0.8;
    const trend = 0.7 + (i / 12) * 0.6; // upward trend
    return {
      name,
      ventas: Math.round(currentValue * factor * trend * 0.1),
      ingresos: Math.round(currentValue * factor * trend),
    };
  }).slice(0, currentMonth + 1);
}

const COLORS = ['#437EFF', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

export default function DashboardCharts({ statistics }: Props) {
  const monthlyData = generateMonthlyData(statistics.ingresosMes || 1000);

  const distributionData = [
    { name: 'Productos', value: statistics.totalProductos },
    { name: 'Servicios', value: statistics.totalServicios },
    { name: 'Cotizaciones', value: statistics.totalCotizaciones },
    { name: 'Proveedores', value: statistics.totalProveedores },
  ].filter((d) => d.value > 0);

  const performanceData = [
    { name: 'Productos', value: statistics.totalProductos, max: Math.max(statistics.totalProductos, 50), color: '#437EFF' },
    { name: 'Usuarios', value: statistics.totalUsuarios, max: Math.max(statistics.totalUsuarios, 10), color: '#10b981' },
    { name: 'Sedes', value: statistics.totalSedes, max: Math.max(statistics.totalSedes, 5), color: '#f59e0b' },
    { name: 'Órdenes', value: statistics.ordenesPendientes, max: Math.max(statistics.ordenesPendientes, 10), color: '#8b5cf6' },
  ];

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-12">
      {/* Main chart: Earning Statistics */}
      <div className="xl:col-span-8 rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Estadísticas de Ingresos</h3>
            <p className="text-xs text-gray-400 mt-0.5">Resumen mensual</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#437EFF]" />
              <span className="text-gray-500">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" />
              <span className="text-gray-500">Ventas</span>
            </div>
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#437EFF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#437EFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, '']}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#437EFF" strokeWidth={2.5} fill="url(#colorIngresos)" dot={false} activeDot={{ r: 5, fill: '#437EFF' }} />
              <Area type="monotone" dataKey="ventas" stroke="#06b6d4" strokeWidth={2.5} fill="url(#colorVentas)" dot={false} activeDot={{ r: 5, fill: '#06b6d4' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right column */}
      <div className="xl:col-span-4 space-y-4">
        {/* Distribution pie */}
        <div className="rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-2 text-sm font-bold text-gray-900">Distribución</h3>
          <div className="flex items-center gap-4">
            <div className="h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distributionData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {distributionData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] text-gray-500">{item.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance bars */}
        <div className="rounded-[10px] bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Rendimiento</h3>
          <div className="space-y-3.5">
            {performanceData.map((item) => {
              const pct = Math.round((item.value / item.max) * 100);
              return (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
