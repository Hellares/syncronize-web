import Image from 'next/image';

const LINKS = {
  Producto: [
    { label: 'Características', href: '#caracteristicas' },
    { label: 'Planes', href: '#planes' },
    { label: 'FAQ', href: '#faq' },
  ],
  Soluciones: [
    { label: 'Tiendas y Retail', href: '#planes' },
    { label: 'Mayoristas', href: '#planes' },
    { label: 'Servicios', href: '#planes' },
    { label: 'Distribuidoras', href: '#planes' },
  ],
  Contacto: [
    { label: 'soporte@syncronize.net.pe', href: 'mailto:soporte@syncronize.net.pe' },
    { label: 'WhatsApp', href: 'https://wa.me/51942857613' },
  ],
};

export default function Footer() {
  return (
    <footer id="contacto" className="bg-gray-900 text-white">
      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-[#004A94] to-[#06b6d4]">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Lleva tu negocio al siguiente nivel
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Únete a los negocios que ya gestionan todo desde Syncronize. Empieza gratis hoy.
          </p>
          <a
            href="#planes"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-base font-bold text-[#004A94] shadow-xl transition-all hover:shadow-2xl hover:scale-105"
          >
            Crear Cuenta Gratis
          </a>
        </div>
      </div>

      {/* Footer content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Syncronize"
                width={36}
                height={36}
                className="h-9 w-9 brightness-0 invert"
              />
              <span
                className="text-2xl text-white tracking-wide"
                style={{ fontFamily: 'Airstrike', fontWeight: 'bold' }}
              >
                Syncronize
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Plataforma SaaS integral para gestionar tu negocio: ventas, inventario, compras y más.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Syncronize SAC. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              <a href="/privacidad" className="text-sm text-gray-500 hover:text-white transition-colors">
                Política de Privacidad
              </a>
              <a href="/terminos" className="text-sm text-gray-500 hover:text-white transition-colors">
                Términos y Condiciones
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            {/* Facebook */}
            <a href="#" className="text-gray-500 hover:text-white transition-colors" aria-label="Facebook">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" className="text-gray-500 hover:text-white transition-colors" aria-label="Instagram">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            {/* TikTok */}
            <a href="#" className="text-gray-500 hover:text-white transition-colors" aria-label="TikTok">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
