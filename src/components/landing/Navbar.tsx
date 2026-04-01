'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const NAV_LINKS = [
  { label: 'Características', href: '#caracteristicas' },
  { label: 'Planes', href: '#planes' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Syncronize"
            width={36}
            height={36}
            className={`h-9 w-9 transition-all duration-300 ${
              scrolled ? '' : 'brightness-0 invert'
            }`}
            priority
          />
          <span
            className={`text-2xl tracking-wide transition-colors duration-300 ${
              scrolled ? 'text-[#004A94]' : 'text-white'
            }`}
            style={{ fontFamily: 'Airstrike', fontWeight: 'bold' }}
          >
            Syncronize
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-300 hover:text-[#06b6d4] ${
                scrolled ? 'text-gray-700' : 'text-white/90'
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105 ${
              scrolled
                ? 'border border-[#004A94] text-[#004A94] hover:bg-[#004A94]/5'
                : 'border border-white/30 text-white hover:bg-white/10'
            }`}
          >
            Iniciar Sesión
          </a>
          <a
            href="#planes"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#004A94] shadow-md transition-all hover:shadow-lg hover:scale-105"
          >
            Empieza Gratis
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5"
          aria-label="Menu"
        >
          <span
            className={`block h-0.5 w-6 transition-all duration-300 ${
              scrolled ? 'bg-gray-800' : 'bg-white'
            } ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 transition-all duration-300 ${
              scrolled ? 'bg-gray-800' : 'bg-white'
            } ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 transition-all duration-300 ${
              scrolled ? 'bg-gray-800' : 'bg-white'
            } ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg border-t">
          <div className="flex flex-col px-6 py-4 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 font-medium text-sm hover:text-[#004A94]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-full border border-[#004A94] px-5 py-2.5 text-sm font-semibold text-[#004A94] text-center"
            >
              Iniciar Sesión
            </a>
            <a
              href="#planes"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-[#004A94] px-5 py-2.5 text-sm font-semibold text-white text-center"
            >
              Empieza Gratis
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
