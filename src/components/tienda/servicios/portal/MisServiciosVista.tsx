'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TiendaColors, alpha } from '@/lib/colors';
import { soles } from '@/lib/tienda-compra';
import { OrdenResumen, PASOS, estaTerminada, etiquetaOrden, fechaCorta, misServicios, pasoDe, mensajeError } from '@/lib/mis-servicios';
import { useSesionTienda } from '../../compra/SesionTienda';
import { Cargando, PedirIngreso } from '../../compra/CarritoVista';
import { HeroPortal, Pastilla } from './HeroPortal';

const IconoEquipo = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" />
  </svg>
);

const IconoEmpresa = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 21h18M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16M15 9h3a1 1 0 011 1v11M9 8h2M9 12h2M9 16h2" />
  </svg>
);

/** Listado de las órdenes de servicio del comprador en esta tienda (personales y de sus empresas). */
export function MisServiciosVista({ colors, empresaNombre }: { colors: TiendaColors; empresaNombre: string }) {
  const { subdominio, usuario } = useSesionTienda();
  const [ordenes, setOrdenes] = useState<OrdenResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'curso' | 'terminados'>('curso');
  const [aprobando, setAprobando] = useState<string | null>(null);
  // null = todas; '' = personales; nombre = las de ese cliente empresa.
  const [filtro, setFiltro] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await misServicios.listar(subdominio);
      setOrdenes(r.data);
      setError(null);
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron cargar tus servicios'));
    }
  }, [subdominio]);

  useEffect(() => { if (usuario) void cargar(); }, [usuario, cargar]);

  const aprobar = async (id: string) => {
    setAprobando(id);
    try {
      await misServicios.aprobar(subdominio, id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo aprobar'));
    } finally {
      setAprobando(null);
    }
  };

  const empresas = [...new Set((ordenes ?? []).map((o) => o.empresaCliente).filter((e): e is string => !!e))];
  const hayPersonales = (ordenes ?? []).some((o) => !o.empresaCliente);
  const visibles = (ordenes ?? []).filter((o) => filtro === null || (o.empresaCliente ?? '') === filtro);
  const enCurso = visibles.filter((o) => !estaTerminada(o));
  const terminadas = visibles.filter(estaTerminada);
  const porAprobar = enCurso.filter((o) => o.estado === 'ESPERANDO_APROBACION');
  const saldoTotal = enCurso.reduce((s, o) => s + Math.max(0, o.saldo), 0);
  const nombre = usuario?.nombres?.split(' ')[0];

  return (
    <>
      <HeroPortal colors={colors}>
        <div className="flex flex-col gap-4 md:gap-5">
          <nav className="text-xs text-white/75" aria-label="Migas">
            <Link href={`/${subdominio}`} className="hover:underline hover:text-white">{empresaNombre}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/${subdominio}/servicios`} className="hover:underline hover:text-white">Servicios</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white font-medium">Mis servicios</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              {nombre && <span className="text-sm md:text-[15px] text-white/85">Hola, {nombre}</span>}
              <h1 className="text-[26px] md:text-4xl font-extrabold tracking-tight">Mis servicios</h1>
              <p className="text-sm md:text-[15px] text-white/90">Sigue tus equipos, aprueba presupuestos y escríbele al técnico.</p>
            </div>
            {ordenes && ordenes.length > 0 && (
              <div className="flex gap-2.5 md:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Cifra valor={String(enCurso.length)} texto="En curso" />
                {porAprobar.length > 0 && <Cifra valor={String(porAprobar.length)} texto="Espera tu aprobación" destacada />}
                {saldoTotal > 0 && <Cifra valor={soles(saldoTotal)} texto="Saldo por pagar" />}
              </div>
            )}
          </div>
        </div>
      </HeroPortal>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-10 md:-mt-12 pb-16 flex flex-col gap-5">
        {usuario === undefined ? (
          <Cargando />
        ) : !usuario ? (
          <PedirIngreso texto="Ingresa con tu DNI para ver los servicios que tienes en la tienda." colors={colors} />
        ) : error && !ordenes ? (
          <p className="bg-white rounded-xl p-6 text-sm text-red-600">{error}</p>
        ) : !ordenes ? (
          <Cargando />
        ) : ordenes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center gap-3 shadow-[0_8px_30px_rgba(15,26,46,0.08)]">
            <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
              <IconoEquipo className="w-6 h-6" />
            </span>
            <p className="text-gray-700">Todavía no tienes servicios con {empresaNombre}.</p>
            <p className="text-sm text-gray-500 max-w-md">Cuando dejes un equipo en la tienda con tu DNI, lo vas a poder seguir desde aquí.</p>
            <p className="text-xs text-gray-400 max-w-md">Si vienes en nombre de una empresa, pide que registren tu DNI como contacto de la empresa para ver sus equipos.</p>
            <Link href={`/${subdominio}/servicios`} className="text-sm font-medium" style={{ color: colors.primario }}>Ver nuestros servicios</Link>
          </div>
        ) : (
          <>
            {error && <p className="bg-white rounded-xl px-4 py-3 text-sm text-red-600">{error}</p>}

            {porAprobar.map((o) => (
              <section key={o.id} className="bg-white rounded-2xl p-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center gap-4 shadow-[0_8px_30px_rgba(15,26,46,0.10)] ring-2 ring-amber-400">
                <span className="hidden md:flex w-12 h-12 rounded-xl bg-amber-50 text-amber-700 items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[11px] md:text-xs font-medium tracking-wide uppercase text-amber-700">Espera tu aprobación · {o.codigo}</span>
                  <span className="text-[15px] md:text-base font-medium text-gray-900">Presupuesto listo para tu {o.equipo}</span>
                  <span className="text-[13px] text-gray-500">{o.servicio ? `${o.servicio} · ` : ''}{soles(o.total)}. Sin tu aprobación no empezamos.</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/${subdominio}/mis-servicios/${o.id}`} className="flex-1 md:flex-none h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 flex items-center justify-center hover:bg-gray-50">
                    Ver presupuesto
                  </Link>
                  <button
                    type="button"
                    onClick={() => void aprobar(o.id)}
                    disabled={aprobando === o.id}
                    className="flex-1 md:flex-none h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: colors.primario }}
                  >
                    {aprobando === o.id ? 'Aprobando...' : 'Aprobar'}
                  </button>
                </div>
              </section>
            ))}

            {empresas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar por cliente">
                {([[null, 'Todos'], ...(hayPersonales ? [['', 'Personales']] : []), ...empresas.map((e) => [e, e])] as [string | null, string][]).map(([valor, label]) => {
                  const activo = filtro === valor;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFiltro(valor)}
                      aria-pressed={activo}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors"
                      style={activo ? { backgroundColor: colors.primario, color: '#fff' } : { backgroundColor: '#fff', color: '#3a4a63' }}
                    >
                      {valor && <IconoEmpresa className="w-3.5 h-3.5" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex">
              <div className="inline-flex gap-1 bg-white p-1 rounded-xl" role="tablist">
                {([['curso', `En curso (${enCurso.length})`], ['terminados', `Terminados (${terminadas.length})`]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className="h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
                    style={tab === id ? { backgroundColor: colors.primario, color: '#fff' } : { color: '#3a4a63' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'curso' ? (
              enCurso.length === 0 ? (
                <p className="bg-white rounded-xl p-6 text-sm text-gray-500 text-center">No tienes servicios en curso.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {enCurso.map((o) => <TarjetaOrden key={o.id} o={o} subdominio={subdominio} colors={colors} />)}
                </div>
              )
            ) : terminadas.length === 0 ? (
              <p className="bg-white rounded-xl p-6 text-sm text-gray-500 text-center">Todavía no tienes servicios terminados.</p>
            ) : (
              <ul className="bg-white rounded-2xl divide-y divide-gray-100 overflow-hidden">
                {terminadas.map((o) => {
                  const e = etiquetaOrden(o);
                  return (
                    <li key={o.id}>
                      <Link href={`/${subdominio}/mis-servicios/${o.id}`} className="flex items-center gap-3 px-4 md:px-6 py-3.5 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{o.equipo}</p>
                          <p className="text-xs text-gray-500 tabular-nums">{o.codigo} · {fechaCorta(o.fechaEntrega ?? o.creadoEn, true)}{o.empresaCliente ? ` · ${o.empresaCliente}` : ''}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums">{soles(o.total)}</span>
                        <Pastilla {...e} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Cifra({ valor, texto, destacada = false }: { valor: string; texto: string; destacada?: boolean }) {
  return (
    <div
      className={`flex-shrink-0 rounded-xl px-4 py-2.5 md:px-5 md:py-3 flex flex-col min-w-[110px] ${destacada ? 'bg-white text-amber-700' : 'bg-white/15 border border-white/30'}`}
    >
      <span className="text-xl md:text-2xl font-bold tabular-nums">{valor}</span>
      <span className={`text-[11px] md:text-xs ${destacada ? 'font-medium' : 'text-white/85'}`}>{texto}</span>
    </div>
  );
}

function TarjetaOrden({ o, subdominio, colors }: { o: OrdenResumen; subdominio: string; colors: TiendaColors }) {
  const e = etiquetaOrden(o);
  const paso = pasoDe(o.estado);
  const cancelada = o.estado === 'CANCELADO';
  return (
    <Link
      href={`/${subdominio}/mis-servicios/${o.id}`}
      className="relative bg-white rounded-2xl p-4 md:px-5 md:py-5 flex flex-col gap-4 shadow-[0_2px_12px_rgba(15,26,46,0.06)] hover:shadow-[0_8px_24px_rgba(15,26,46,0.10)] transition-shadow"
    >
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
          <IconoEquipo className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {o.empresaCliente && (
            <span className="self-start inline-flex items-center gap-1 max-w-full text-[11px] font-medium px-2 py-0.5 rounded-md mb-0.5" style={{ backgroundColor: alpha(colors.primario, 0.08), color: colors.primario }}>
              <IconoEmpresa className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{o.empresaCliente}</span>
            </span>
          )}
          <span className="text-xs text-gray-500 tabular-nums">{o.codigo} · Ingresó {fechaCorta(o.creadoEn)}</span>
          <span className="text-[15px] font-medium truncate" style={{ color: colors.primario }}>{o.equipo}</span>
          {(o.servicio || o.contacto) && (
            <span className="text-[13px] text-gray-500 truncate">{[o.servicio, o.contacto && `Dejó: ${o.contacto}`].filter(Boolean).join(' · ')}</span>
          )}
        </div>
        <Pastilla {...e} />
      </div>
      {!cancelada && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-6 gap-1" aria-label={`Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}`}>
            {PASOS.map((p, i) => (
              <span key={p} className="h-1.5 rounded-full" style={{ backgroundColor: i <= paso ? colors.primario : '#dfe6f1' }} />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-400"><span>Recibido</span><span>Entregado</span></div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 text-[13px]">
        <span className="text-gray-600">
          {o.fechaPrometida ? `Listo el ${fechaCorta(o.fechaPrometida)}` : 'Fecha por confirmar'}
        </span>
        <span className="flex items-center gap-3">
          {o.saldo > 0 && <span className="text-gray-600">Saldo <b className="font-medium text-gray-900 tabular-nums">{soles(o.saldo)}</b></span>}
          <span className="font-medium" style={{ color: colors.primario }}>Ver detalle →</span>
        </span>
      </div>
    </Link>
  );
}
