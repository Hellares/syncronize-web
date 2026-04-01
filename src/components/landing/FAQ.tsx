'use client';

import { useState } from 'react';
import ScrollReveal from './ScrollReveal';

const FAQS = [
  {
    q: '¿Puedo empezar sin pagar?',
    a: 'Sí. El plan Básico es completamente gratuito e incluye inventario básico, gestión de clientes, punto de venta y una página web temporal por 2 meses. No necesitas tarjeta de crédito.',
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí, puedes actualizar o cambiar tu plan cuando quieras. El cambio se aplica inmediatamente y se ajusta el cobro de forma proporcional al tiempo restante.',
  },
  {
    q: '¿Qué métodos de pago aceptan?',
    a: 'Aceptamos transferencia bancaria, Yape, Plin, efectivo y tarjeta de crédito/débito. Puedes elegir el método que más te convenga al momento de pagar tu suscripción.',
  },
  {
    q: '¿Mi tienda online tiene un dominio propio?',
    a: 'En los planes Básico, Emprendedor y Profesional tu tienda está disponible como subdominio de Syncronize. En el plan Empresarial puedes configurar tu propio dominio personalizado.',
  },
  {
    q: '¿Funciona en celular y computadora?',
    a: 'Sí. Syncronize tiene una app móvil para Android disponible en Play Store y una app de administración. Tu tienda web se adapta automáticamente a cualquier dispositivo.',
  },
  {
    q: '¿Puedo gestionar múltiples locales?',
    a: 'Sí, dependiendo de tu plan puedes administrar de 1 hasta 20 sedes, cada una con su propio stock, caja y empleados independientes.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-[#004A94]/10 px-4 py-1.5 text-sm font-semibold text-[#004A94] mb-4">
              FAQ
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Preguntas Frecuentes
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <ScrollReveal key={i} delay={i * 80}>
              <div
                className={`rounded-xl border transition-all duration-300 ${
                  isOpen ? 'border-[#437EFF]/30 bg-blue-50/30 shadow-sm' : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-[#437EFF] transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-48 pb-4' : 'max-h-0'
                  }`}
                >
                  <p className="px-6 text-gray-600 leading-relaxed text-sm">
                    {faq.a}
                  </p>
                </div>
              </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
