import ScrollReveal from './ScrollReveal';

const TESTIMONIALS = [
  {
    name: 'Carlos Mendoza',
    role: 'Dueño de Ferretería',
    text: 'Syncronize me ayudó a organizar mi inventario de más de 800 productos. Ahora sé exactamente qué tengo en stock y las ventas son mucho más rápidas con el POS.',
    avatar: 'CM',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'María López',
    role: 'Tienda de Ropa Online',
    text: 'La tienda web que se genera automáticamente es increíble. Mis clientes pueden ver los productos y contactarme por WhatsApp. Mis ventas online crecieron un 40%.',
    avatar: 'ML',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Roberto Díaz',
    role: 'Distribuidora Mayorista',
    text: 'El control de inventario y kardex me permite saber exactamente qué tengo en cada almacén. Con el módulo de cuentas por cobrar ya no se me escapa ningún crédito pendiente.',
    avatar: 'RD',
    color: 'from-amber-500 to-orange-500',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-[#004A94]/10 px-4 py-1.5 text-sm font-semibold text-[#004A94] mb-4">
              Testimonios
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Lo que dicen nuestros clientes
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 150}>
            <div
              className="rounded-2xl bg-[#f5f7fa] p-6 border border-gray-100 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] hover:-translate-y-2"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-sm font-bold`}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </div>
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
