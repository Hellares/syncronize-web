'use client';

import { useState } from 'react';
import ScrollReveal from './ScrollReveal';
import TiltCard from './TiltCard';

type Period = 'mensual' | 'semestral' | 'anual';

interface Plan {
  name: string;
  tag?: string;
  prices: Record<Period, number>;
  storage: string;
  limits: string[];
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Básico',
    prices: { mensual: 0, semestral: 0, anual: 0 },
    storage: '200 MB',
    limits: ['50 productos', '20 servicios', '3 usuarios', '1 sede'],
    features: [
      'Gestión de compras',
      'Inventario básico',
      'Gestión de clientes',
      'Web temporal (2 meses)',
      'Soporte por email',
    ],
    cta: 'Comenzar Gratis',
  },
  {
    name: 'Emprendedor',
    prices: { mensual: 30, semestral: 160, anual: 300 },
    storage: '3 GB',
    limits: ['1,000 productos', '100 servicios', '10 usuarios', '3 sedes'],
    features: [
      'Todo en Básico',
      'Página web permanente',
      'Personalización de marca',
      'POS completo',
      'Soporte por email',
    ],
    cta: 'Elegir Emprendedor',
  },
  {
    name: 'Profesional',
    tag: 'Popular',
    highlighted: true,
    prices: { mensual: 50, semestral: 250, anual: 500 },
    storage: '5 GB',
    limits: ['2,000 productos', '300 servicios', '50 usuarios', '10 sedes'],
    features: [
      'Todo en Emprendedor',
      'Reportes avanzados',
      'RRHH y Planilla',
      'Cuentas por cobrar/pagar',
      'Soporte email y teléfono',
    ],
    cta: 'Elegir Profesional',
  },
  {
    name: 'Empresarial',
    prices: { mensual: 100, semestral: 500, anual: 1000 },
    storage: '10 GB',
    limits: ['Productos ilimitados', 'Servicios ilimitados', '100 usuarios', '20 sedes'],
    features: [
      'Todo en Profesional',
      'Dominio propio',
      'Acceso a API',
      'Reportes personalizados',
      'Soporte 24/7',
    ],
    cta: 'Elegir Empresarial',
  },
];

const PERIOD_LABELS: Record<Period, string> = {
  mensual: 'Mensual',
  semestral: 'Semestral',
  anual: 'Anual',
};

function formatPrice(price: number) {
  return price === 0 ? 'Gratis' : `S/ ${price}`;
}

function periodSuffix(period: Period, price: number) {
  if (price === 0) return '';
  const map: Record<Period, string> = {
    mensual: '/mes',
    semestral: '/6 meses',
    anual: '/año',
  };
  return map[period];
}

export default function Pricing() {
  const [period, setPeriod] = useState<Period>('mensual');

  return (
    <section id="planes" className="py-24 px-6 bg-[#f5f7fa]">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-[#004A94]/10 px-4 py-1.5 text-sm font-semibold text-[#004A94] mb-4">
              Planes y Precios
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Elige el plan perfecto para tu negocio
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Comienza gratis y escala cuando lo necesites.
            </p>
          </div>
        </ScrollReveal>

        {/* Period toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm border border-gray-200">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-[#004A94] text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {PERIOD_LABELS[p]}
                {p === 'anual' && (
                  <span className={`ml-1.5 text-xs ${period === p ? 'text-cyan-300' : 'text-green-600'}`}>
                    -50%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 120}>
            <TiltCard>
            <div
              className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                plan.highlighted
                  ? 'animated-border bg-gradient-to-br from-[#004A94] to-[#437EFF] text-white shadow-xl shadow-blue-500/30'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-[0_0_25px_rgba(6,182,212,0.12)]'
              }`}
            >
              {plan.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-gray-900">
                  {plan.tag}
                </span>
              )}

              <h3
                className={`text-lg font-bold ${
                  plan.highlighted ? 'text-white' : 'text-gray-900'
                }`}
              >
                {plan.name}
              </h3>

              <div className="mt-4 mb-6">
                <span
                  className={`text-4xl font-extrabold ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatPrice(plan.prices[period])}
                </span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-white/70' : 'text-gray-500'
                  }`}
                >
                  {periodSuffix(period, plan.prices[period])}
                </span>
              </div>

              <div
                className={`text-xs font-medium mb-4 ${
                  plan.highlighted ? 'text-cyan-200' : 'text-gray-500'
                }`}
              >
                {plan.storage} de almacenamiento
              </div>

              {/* Limits */}
              <div className={`mb-4 space-y-1.5 pb-4 border-b ${plan.highlighted ? 'border-white/20' : 'border-gray-100'}`}>
                {plan.limits.map((l) => (
                  <div key={l} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-white/80' : 'text-gray-600'}`}>
                    <span className="text-xs">&#9679;</span>
                    {l}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="mb-6 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        plan.highlighted ? 'text-cyan-300' : 'text-green-500'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600'}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href="#contacto"
                className={`block w-full rounded-full py-3 text-center text-sm font-bold transition-all hover:scale-105 ${
                  plan.highlighted
                    ? 'animate-glow-pulse bg-white text-[#004A94] shadow-lg'
                    : 'bg-[#004A94] text-white hover:shadow-[0_0_20px_rgba(0,74,148,0.3)]'
                }`}
              >
                {plan.cta}
              </a>
            </div>
            </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
