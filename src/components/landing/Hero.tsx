import Image from 'next/image';
import Particles from './Particles';
import GridWave from './GridWave';
import TypingEffect from './TypingEffect';
import CountUp from './CountUp';
import LogoSpin from './LogoSpin';
import TextReveal from './TextReveal';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0891b2] via-[#2563eb] to-[#437EFF] scan-line">
      {/* Blobs */}
      <div className="blob blob-1 bg-[#06b6d4]" />
      <div className="blob blob-2 bg-[#437EFF]" />
      <div className="blob blob-3 bg-[#5b8fd4]" />
      <div className="blob blob-4 bg-[#06b6d4]" />

      {/* Particles */}
      <Particles />

      {/* Grid Wave */}
      <GridWave />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 -mt-[190px] text-center">
        <div className="mb-8 flex items-center justify-center gap-4">
          <LogoSpin interval={30000}>
            <img
              src="/logo.svg"
              alt="Syncronize"
              className="h-20 w-20 brightness-0 invert sm:h-24 sm:w-24"
            />
          </LogoSpin>
          <TextReveal interval={40000} delay={400}>
            <span
              className="text-6xl text-white tracking-wide sm:text-7xl md:text-8xl"
              style={{ fontFamily: 'Airstrike', fontWeight: 'bold' }}
            >
              Syncronize
            </span>
          </TextReveal>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm mb-8 border border-white/10">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          Plataforma SaaS para negocios
        </div>

        <h1 className="mx-auto max-w-4xl text-2xl leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl" style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 400 }}>
          Tu negocio,
          <br />
          <span className="light-flare mt-[10px] inline-block text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-wider text-white" style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 700 }}>
            sincronizado
          </span>
        </h1>

        <div className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl h-[56px] sm:h-[28px]">
          <TypingEffect
            text="Gestiona ventas, inventario, compras, RRHH y tu propia tienda online desde una sola plataforma."
            speed={25}
            delay={800}
          />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#planes"
            className="animate-glow-pulse rounded-full bg-white px-8 py-4 text-base font-bold text-[#004A94] shadow-xl transition-all hover:shadow-2xl hover:scale-105"
          >
            Empieza Gratis
          </a>
          <a
            href="#caracteristicas"
            className="group rounded-full border-2 border-white/30 px-8 py-4 text-base font-semibold text-white transition-all hover:border-cyan-400/60 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            Ver Características
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>

        {/* Stats with CountUp */}
        <div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { end: 100, suffix: '%', label: 'Cloud', icon: '☁️' },
            { end: 8, suffix: '+', label: 'Módulos', icon: '⚡' },
            { end: 24, suffix: '/7', label: 'Disponibilidad', icon: '🔒' },
            { end: 4, suffix: '', label: 'Planes', icon: '📊' },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="text-2xl font-bold text-white sm:text-3xl transition-transform duration-300 group-hover:scale-110">
                <CountUp end={stat.end} suffix={stat.suffix} duration={2000} />
              </div>
              <div className="mt-1 text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f5f7fa] to-transparent z-[3]" />
    </section>
  );
}
