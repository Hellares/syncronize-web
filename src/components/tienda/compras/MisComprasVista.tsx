'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TiendaColors, alpha } from '@/lib/colors';
import { soles } from '@/lib/tienda-compra';
import { enlaceChatWhatsapp } from '@/core/utils/telefono';
import { mensajeError } from '@/lib/mis-servicios';
import {
  CompraDetalle, CompraResumen, ESTADO_COMPRA, METODO_PAGO, ResumenCompras, descargarEstadoCuenta, diaVence, fechaHora, misCompras,
} from '@/lib/mis-compras';
import { useSesionTienda } from '../compra/SesionTienda';
import { Cargando, PedirIngreso } from '../compra/CarritoVista';
import { HeroPortal, Pastilla } from '../servicios/portal/HeroPortal';

type Tab = 'todas' | 'credito' | 'pagadas';

const IconoBolsa = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" />
  </svg>
);

const IconoEmpresa = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 21h18M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16M15 9h3a1 1 0 011 1v11M9 8h2M9 12h2M9 16h2" />
  </svg>
);

/** "Mis compras": lo que el cliente compró en la tienda, pagado y a crédito, y cuánto debe. */
export function MisComprasVista({ colors, empresaNombre, telefono }: { colors: TiendaColors; empresaNombre: string; telefono?: string }) {
  const { subdominio, usuario } = useSesionTienda();
  const [compras, setCompras] = useState<CompraResumen[] | null>(null);
  const [resumen, setResumen] = useState<ResumenCompras | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('todas');
  const [busqueda, setBusqueda] = useState('');
  // null = todas; '' = personales; nombre = las de ese cliente empresa.
  const [filtro, setFiltro] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    misCompras.listar(subdominio).then((r) => {
      if (!vivo) return;
      setCompras(r.data);
      setResumen(r.resumen);
      setError(null);
      // En escritorio el detalle está al lado: se abre la compra que más importa
      // (la próxima a pagar, si no la última). En el celular arranca en la lista.
      const pedida = new URLSearchParams(window.location.search).get('compra');
      const escritorio = window.matchMedia('(min-width: 1024px)').matches;
      const inicial = (pedida && r.data.find((c) => c.id === pedida)?.id)
        ?? (escritorio ? (r.resumen.proximoPago?.ventaId ?? r.data[0]?.id ?? null) : null);
      setSeleccion(inicial);
    }).catch((e) => {
      if (vivo) setError(mensajeError(e, 'No se pudieron cargar tus compras'));
    });
    return () => { vivo = false; };
  }, [usuario, subdominio]);

  const empresas = useMemo(
    () => [...new Set((compras ?? []).map((c) => c.empresaCliente).filter((e): e is string => !!e))],
    [compras],
  );
  const hayPersonales = (compras ?? []).some((c) => !c.empresaCliente);
  const delFiltro = (compras ?? []).filter((c) => filtro === null || (c.empresaCliente ?? '') === filtro);
  const aCredito = delFiltro.filter((c) => c.esCredito && c.saldo > 0);
  const pagadas = delFiltro.filter((c) => c.estado === 'PAGADA');
  const q = busqueda.trim().toLowerCase();
  const visibles = (tab === 'credito' ? aCredito : tab === 'pagadas' ? pagadas : delFiltro)
    .filter((c) => !q || c.codigo.toLowerCase().includes(q));
  const nombre = usuario?.nombres?.split(' ')[0];
  const px = resumen?.proximoPago;
  // La deuda separada: la personal y la de cada empresa donde es encargado.
  // No se suman: la de la empresa la paga la empresa, no él.
  const deudas = (() => {
    const mapa = new Map<string, { empresa: string | null; monto: number; compras: number }>();
    for (const c of compras ?? []) {
      if (!c.esCredito || c.saldo <= 0) continue;
      const k = c.clienteEmpresaId ?? '';
      const d = mapa.get(k) ?? { empresa: c.empresaCliente, monto: 0, compras: 0 };
      mapa.set(k, { ...d, monto: d.monto + c.saldo, compras: d.compras + 1 });
    }
    return [...mapa.entries()]
      .map(([id, d]) => ({ id: id || null, empresa: d.empresa, monto: Math.round(d.monto * 100) / 100, compras: d.compras }))
      .sort((a, b) => (a.empresa === null ? -1 : b.empresa === null ? 1 : a.empresa.localeCompare(b.empresa)));
  })();
  const separarDeuda = deudas.some((d) => d.id !== null);
  const hayCreditoPersonal = (compras ?? []).some((c) => c.esCredito && !c.clienteEmpresaId);

  const abrir = (id: string | null) => {
    setSeleccion(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('compra', id); else url.searchParams.delete('compra');
    window.history.replaceState(null, '', url.toString());
    if (id && !window.matchMedia('(min-width: 1024px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <HeroPortal colors={colors}>
        <div className="flex flex-col gap-4 md:gap-5">
          <nav className="text-xs text-white/75" aria-label="Migas">
            <Link href={`/${subdominio}`} className="hover:underline hover:text-white">{empresaNombre}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white font-medium">Mis compras</span>
          </nav>
          <div className="flex flex-col gap-1.5">
            {nombre && <span className="text-sm md:text-[15px] text-white/85">Hola, {nombre}</span>}
            <h1 className="text-[26px] md:text-4xl font-extrabold tracking-tight">Mis compras</h1>
            <p className="text-sm md:text-[15px] text-white/90">Todo lo que compraste en la tienda y lo que te falta pagar.</p>
          </div>
          {resumen && resumen.cantidad > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3.5 text-gray-900">
              <div className="bg-white rounded-xl px-4 pt-1 pb-[9px] md:px-5 md:pt-1.5 md:pb-[11px] flex flex-col gap-1">
                <span className="text-[13px] text-gray-500">Le debes a la tienda</span>
                {separarDeuda ? (
                  <div className="flex flex-col divide-y divide-gray-100">
                    {(deudas.some((d) => d.id === null) ? deudas : [{ id: null, empresa: null, monto: 0, compras: 0 }, ...deudas]).map((d) => (
                      <div key={d.id ?? '__personal'} className="flex items-center justify-between gap-3 py-1.5">
                        <span className="min-w-0 flex items-center gap-1.5 text-[13px] text-gray-700">
                          {d.empresa ? (
                            <>
                              <IconoEmpresa className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate" title={d.empresa}>{d.empresa}</span>
                            </>
                          ) : (
                            <span>Personal</span>
                          )}
                          {d.compras > 0 && <span className="flex-shrink-0 text-gray-400">· {d.compras}</span>}
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-lg md:text-xl font-bold tabular-nums ${d.monto > 0 ? 'text-[#9a4b00]' : 'text-[#146c3a]'}`}>{soles(d.monto)}</span>
                          {(d.id !== null || hayCreditoPersonal) && (
                            <BotonEstadoCuenta clienteEmpresaId={d.id} colors={colors} icono etiqueta={`Estado de cuenta ${d.empresa ?? 'personal'}`} />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <span className={`text-2xl md:text-[30px] font-bold tabular-nums ${resumen.deuda > 0 ? 'text-[#9a4b00]' : 'text-[#146c3a]'}`}>{soles(resumen.deuda)}</span>
                    <span className="text-[13px] text-gray-500">
                      {resumen.deuda > 0
                        ? `En ${resumen.comprasConDeuda} ${resumen.comprasConDeuda === 1 ? 'compra' : 'compras'} a crédito${resumen.mora > 0 ? ` · mora ${soles(resumen.mora)}` : ''}`
                        : 'Estás al día. ¡Gracias!'}
                    </span>
                    {hayCreditoPersonal && <BotonEstadoCuenta clienteEmpresaId={null} colors={colors} />}
                  </>
                )}
              </div>
              <div className="bg-white rounded-xl px-4 pt-1 pb-[9px] md:px-5 md:pt-1.5 md:pb-[11px] flex flex-col gap-1">
                <span className="text-[13px] text-gray-500">Próximo pago</span>
                <span className="text-2xl md:text-[30px] font-bold tabular-nums">{px ? soles(px.saldo) : '—'}</span>
                <span className="text-[13px] text-gray-500">
                  {px
                    ? <>Vence el <b className="font-medium text-gray-900">{diaVence(px.fechaVencimiento)}</b> · cuota {px.numero}{px.numeroCuotas ? ` de ${px.numeroCuotas}` : ''} · {px.codigo}</>
                    : 'No tienes pagos pendientes'}
                </span>
              </div>
              <div className="bg-white rounded-xl px-4 pt-1 pb-[9px] md:px-5 md:pt-1.5 md:pb-[11px] flex flex-col gap-1">
                <span className="text-[13px] text-gray-500">Compraste en total</span>
                <span className="text-2xl md:text-[30px] font-bold tabular-nums">{soles(resumen.totalComprado)}</span>
                <span className="text-[13px] text-gray-500">{resumen.cantidad} {resumen.cantidad === 1 ? 'compra' : 'compras'} · pagado {soles(resumen.totalPagado)}</span>
              </div>
            </div>
          )}
        </div>
      </HeroPortal>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-10 md:-mt-12 pb-16 flex flex-col gap-4">
        {usuario === undefined ? (
          <Cargando />
        ) : !usuario ? (
          <PedirIngreso texto="Ingresa con tu DNI para ver tus compras en la tienda." colors={colors} />
        ) : error && !compras ? (
          <p className="bg-white rounded-xl p-6 text-sm text-red-600">{error}</p>
        ) : !compras ? (
          <Cargando />
        ) : compras.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center gap-3 shadow-[0_8px_30px_rgba(15,26,46,0.08)]">
            <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: alpha(colors.primario, 0.1), color: colors.primario }}>
              <IconoBolsa className="w-6 h-6" />
            </span>
            <p className="text-gray-700">Todavía no tienes compras con {empresaNombre}.</p>
            <p className="text-sm text-gray-500 max-w-md">Cuando compres en la tienda con tu DNI, tus compras y pagos van a aparecer aquí.</p>
            <Link href={`/${subdominio}`} className="text-sm font-medium" style={{ color: colors.primario }}>Ir a la tienda</Link>
          </div>
        ) : (
          <>
            {empresas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar por cliente">
                {([[null, 'Todas'], ...(hayPersonales ? [['', 'Personales']] : []), ...empresas.map((e) => [e, e])] as [string | null, string][]).map(([valor, label]) => {
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

            <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 ${seleccion ? 'max-lg:hidden' : ''}`}>
              <div className="flex gap-1 bg-white p-1 rounded-xl" role="tablist">
                {([['todas', `Todas · ${delFiltro.length}`], ['credito', `A crédito · ${aCredito.length}`], ['pagadas', `Pagadas · ${pagadas.length}`]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className="flex-1 md:flex-none h-10 px-4 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors"
                    style={tab === id ? { backgroundColor: colors.primario, color: '#fff' } : { color: '#3a4a63' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 h-11 px-3.5 bg-white rounded-xl md:w-72 text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <span className="sr-only">Buscar por código</span>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código (V-...)"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-4 items-start">
              <div className={`flex flex-col gap-2.5 ${seleccion ? 'max-lg:hidden' : ''}`}>
                {visibles.length === 0 ? (
                  <p className="bg-white rounded-xl p-6 text-sm text-gray-500 text-center">
                    {tab === 'credito' ? 'No tienes compras a crédito pendientes.' : tab === 'pagadas' ? 'Todavía no tienes compras pagadas.' : 'No hay compras con ese código.'}
                  </p>
                ) : (
                  visibles.map((c) => (
                    <TarjetaCompra key={c.id} c={c} colors={colors} activa={c.id === seleccion} onAbrir={() => abrir(c.id)} />
                  ))
                )}
              </div>

              {seleccion ? (
                <DetalleCompra
                  key={seleccion}
                  id={seleccion}
                  colors={colors}
                  telefono={telefono}
                  onVolver={() => abrir(null)}
                />
              ) : (
                <div className="hidden lg:flex bg-white rounded-2xl p-10 text-sm text-gray-500 items-center justify-center">
                  Elige una compra para ver su detalle.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function TarjetaCompra({ c, colors, activa, onAbrir }: { c: CompraResumen; colors: TiendaColors; activa: boolean; onAbrir: () => void }) {
  const e = ESTADO_COMPRA[c.estado];
  const deuda = c.esCredito && c.saldo > 0;
  const avance = c.total > 0 ? Math.min(100, Math.round((c.pagado / c.total) * 100)) : 0;
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={activa}
      className="text-left bg-white rounded-xl px-4 pt-1.5 pb-[11px] flex flex-col gap-3 shadow-[0_2px_12px_rgba(15,26,46,0.06)] hover:shadow-[0_8px_24px_rgba(15,26,46,0.10)] transition-shadow border-2"
      style={{ borderColor: activa ? colors.primario : 'transparent' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          {c.empresaCliente && (
            <span className="self-start inline-flex items-center gap-1 max-w-full text-[11px] font-medium px-2 py-0.5 rounded-md mb-0.5" style={{ backgroundColor: alpha(colors.primario, 0.08), color: colors.primario }}>
              <IconoEmpresa className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{c.empresaCliente}</span>
            </span>
          )}
          <span className="text-[15px] font-medium text-gray-900 tabular-nums">{c.codigo}</span>
          <span className="text-xs text-gray-500 tabular-nums">{fechaHora(c.fecha)} · {c.cantidadItems} {c.cantidadItems === 1 ? 'producto' : 'productos'}</span>
        </div>
        <Pastilla {...e} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex -space-x-2">
          {c.fotos.length > 0 ? c.fotos.map((f, i) => (
            <span key={i} className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-white bg-gray-100">
              <img src={f} alt="" className="w-full h-full object-cover" />
            </span>
          )) : (
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(colors.primario, 0.08), color: colors.primario }}>
              <IconoBolsa className="w-4.5 h-4.5" />
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="block text-xs text-gray-500">{deuda || c.estado === 'PENDIENTE' ? 'Te falta' : 'Total'}</span>
          <span className="text-[17px] font-bold tabular-nums" style={{ color: deuda ? e.color : '#111827' }}>{soles(deuda || c.estado === 'PENDIENTE' ? c.saldo : c.total)}</span>
        </div>
      </div>
      {deuda && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${avance}%`, backgroundColor: c.estado === 'VENCIDA' ? '#b42318' : colors.primario }} />
          </div>
          <span className="text-xs text-gray-500">
            Pagaste {soles(c.pagado)} de {soles(c.total)}
            {c.proximoPago && <> · {c.estado === 'VENCIDA' ? 'venció' : 'vence'} el {diaVence(c.proximoPago.fechaVencimiento)}</>}
          </span>
        </div>
      )}
    </button>
  );
}

const ESTADO_CUOTA: Record<string, { texto: string; fondo: string; color: string }> = {
  PAGADA: { texto: 'Pagada', fondo: '#e7f7ee', color: '#146c3a' },
  VENCIDA: { texto: 'Vencida', fondo: '#fdecec', color: '#b42318' },
  PARCIAL: { texto: 'Pago parcial', fondo: '#fff1d6', color: '#9a4b00' },
  PENDIENTE: { texto: 'Pendiente', fondo: '#eef2f8', color: '#3a4a63' },
};

function DetalleCompra({ id, colors, telefono, onVolver }: { id: string; colors: TiendaColors; telefono?: string; onVolver: () => void }) {
  const { subdominio } = useSesionTienda();
  const [c, setC] = useState<CompraDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    misCompras.detalle(subdominio, id)
      .then((r) => { if (vivo) setC(r); })
      .catch((e) => { if (vivo) setError(mensajeError(e, 'No se pudo cargar la compra')); });
    return () => { vivo = false; };
  }, [subdominio, id]);

  const volver = (
    <button type="button" onClick={onVolver} className="lg:hidden self-start inline-flex items-center gap-1.5 h-10 text-sm font-medium" style={{ color: colors.primario }}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 19l-7-7 7-7" /></svg>
      Mis compras
    </button>
  );

  if (error) return <div className="flex flex-col gap-2">{volver}<p className="bg-white rounded-2xl p-6 text-sm text-red-600">{error}</p></div>;
  if (!c) return <div className="bg-white rounded-2xl"><Cargando /></div>;

  const e = ESTADO_COMPRA[c.estado];
  const debe = c.saldo > 0;
  const proxima = c.cuotas.find((q) => q.saldo > 0);
  const whatsapp = enlaceChatWhatsapp(
    telefono,
    debe
      ? `Hola, quiero consultar por mi compra ${c.codigo}. Me figura un saldo de ${soles(c.saldo)}.`
      : `Hola, quiero consultar por mi compra ${c.codigo}.`,
  );

  return (
    <div className="flex flex-col gap-2">
      {volver}
      <section className="bg-white rounded-[10px] px-4 pb-4 pt-1.5 md:px-6 md:pb-6 md:pt-3.5 flex flex-col gap-5 md:gap-6 shadow-[0_2px_12px_rgba(15,26,46,0.06)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] md:text-[19px] font-medium text-gray-900 tabular-nums">Compra {c.codigo}</h2>
              <Pastilla {...e} texto={c.esCredito && c.numeroCuotas ? `${e.texto} · ${c.numeroCuotas} ${c.numeroCuotas === 1 ? 'cuota' : 'cuotas'}` : e.texto} />
            </div>
            <p className="text-[13px] text-gray-500">
              {[fechaHora(c.fecha), c.sede, c.comprobante && `${c.comprobante.tipo === 'FACTURA' ? 'Factura' : 'Boleta'} ${c.comprobante.numero}`, c.empresaCliente].filter(Boolean).join(' · ')}
            </p>
          </div>
          {c.comprobante?.pdfUrl && (
            <a
              href={c.comprobante.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start flex-shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              Descargar {c.comprobante.tipo === 'FACTURA' ? 'factura' : 'boleta'}
            </a>
          )}
        </div>

        <div className={`grid gap-2.5 ${debe ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <span className="block text-xs text-gray-500">Total de la compra</span>
            <span className="text-lg md:text-xl font-bold tabular-nums text-gray-900">{soles(c.total)}</span>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#e7f7ee' }}>
            <span className="block text-xs" style={{ color: '#146c3a' }}>{debe ? 'Ya pagaste' : 'Pagado'}</span>
            <span className="text-lg md:text-xl font-bold tabular-nums" style={{ color: '#146c3a' }}>{soles(c.pagado)}</span>
          </div>
          {debe && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: e.fondo }}>
              <span className="block text-xs" style={{ color: e.color }}>Te falta pagar</span>
              <span className="text-lg md:text-xl font-bold tabular-nums" style={{ color: e.color }}>{soles(c.saldo)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h3 className="text-[15px] font-medium mb-1" style={{ color: colors.primario }}>Productos</h3>
          {c.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: alpha(colors.primario, 0.06), color: colors.primario }}>
                {it.imagen ? (
                  <img src={it.imagen} alt="" className="w-full h-full object-cover" />
                ) : <IconoBolsa className="w-5 h-5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-[15px] text-gray-900">{it.descripcion}</p>
                <p className="text-xs md:text-[13px] text-gray-500 tabular-nums">
                  {it.cantidad} × {soles(it.precioUnitario)}{it.descuento > 0 ? ` · desc. ${soles(it.descuento)}` : ''}
                </p>
              </div>
              <span className="text-sm md:text-[15px] font-medium tabular-nums text-gray-900">{soles(it.subtotal)}</span>
            </div>
          ))}
          {(c.descuento > 0 || c.interes > 0) && (
            <div className="flex flex-col gap-1 pt-2 text-[13px] text-gray-500">
              {c.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span className="tabular-nums">− {soles(c.descuento)}</span></div>}
              {c.interes > 0 && <div className="flex justify-between"><span>Interés del crédito</span><span className="tabular-nums">+ {soles(c.interes)}</span></div>}
            </div>
          )}
        </div>

        {c.cuotas.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-medium" style={{ color: colors.primario }}>Cronograma de pagos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {c.cuotas.map((q) => {
                const eq = ESTADO_CUOTA[q.estado] ?? ESTADO_CUOTA.PENDIENTE;
                const esProxima = q.numero === proxima?.numero;
                return (
                  <div
                    key={q.numero}
                    className="rounded-[10px] px-3.5 pt-[7px] pb-3 flex flex-col gap-1"
                    style={{
                      backgroundColor: q.estado === 'PAGADA' ? '#f3fbf6' : esProxima ? '#fffaf0' : '#f6f8fc',
                      boxShadow: esProxima ? `inset 0 0 0 1.5px ${q.estado === 'VENCIDA' ? '#f1a9a0' : '#f3c77a'}` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">Cuota {q.numero}</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: eq.fondo, color: eq.color }}>{esProxima && q.estado === 'PENDIENTE' ? 'Próxima' : eq.texto}</span>
                    </div>
                    <span className="text-base font-medium tabular-nums text-gray-900">{soles(q.saldo > 0 ? q.saldo : q.monto)}</span>
                    <span className="text-xs text-gray-500">
                      {q.estado === 'PAGADA' ? `Pagada · vencía el ${diaVence(q.fechaVencimiento)}` : `Vence el ${diaVence(q.fechaVencimiento)}`}
                    </span>
                    {q.mora > 0 && <span className="text-xs" style={{ color: '#b42318' }}>Mora {soles(q.mora)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {c.pagos.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-medium" style={{ color: colors.primario }}>Tus pagos</h3>
            {c.pagos.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50">
                <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e7f7ee', color: '#146c3a' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{p.cuota ? `Pago de la cuota ${p.cuota}` : 'Pago'}</p>
                  <p className="text-xs text-gray-500 tabular-nums">{fechaHora(p.fecha)} · {METODO_PAGO[p.metodo] ?? p.metodo}</p>
                </div>
                <span className="text-sm font-medium tabular-nums" style={{ color: '#146c3a' }}>{soles(p.monto)}</span>
              </div>
            ))}
          </div>
        )}

        {c.esCredito && (
          <BotonEstadoCuenta clienteEmpresaId={c.clienteEmpresaId} colors={colors} bloque etiqueta={c.empresaCliente ? `Estado de cuenta de ${c.empresaCliente}` : 'Descargar mi estado de cuenta'} />
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-xl text-white text-[15px] font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1fa855' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.4A9 9 0 1121 12z" /></svg>
            {debe ? 'Consultar mi saldo por WhatsApp' : 'Consultar por WhatsApp'}
          </a>
        )}
      </section>
    </div>
  );
}

const IconoDescarga = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);

/**
 * Baja el PDF del estado de cuenta: el personal (`clienteEmpresaId` null) o el
 * de UNA empresa. Tres formas: enlace (card simple), ícono (fila de la card
 * separada) y bloque (detalle de la compra).
 */
function BotonEstadoCuenta({ clienteEmpresaId, colors, icono = false, bloque = false, etiqueta = 'Descargar estado de cuenta' }: {
  clienteEmpresaId: string | null; colors: TiendaColors; icono?: boolean; bloque?: boolean; etiqueta?: string;
}) {
  const { subdominio } = useSesionTienda();
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bajar = async () => {
    setBajando(true);
    setError(null);
    try {
      await descargarEstadoCuenta(subdominio, clienteEmpresaId);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo generar el estado de cuenta'));
    } finally {
      setBajando(false);
    }
  };

  if (icono) {
    return (
      <button
        type="button"
        onClick={() => void bajar()}
        disabled={bajando}
        aria-label={etiqueta}
        title={error ?? etiqueta}
        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
        style={{ color: error ? '#b42318' : colors.primario }}
      >
        {bajando
          ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <IconoDescarga className="w-[18px] h-[18px]" />}
      </button>
    );
  }
  return (
    <div className={bloque ? 'flex flex-col gap-1' : 'flex flex-col'}>
      <button
        type="button"
        onClick={() => void bajar()}
        disabled={bajando}
        className={bloque
          ? 'h-12 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-800 flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-60'
          : 'self-start inline-flex items-center gap-1.5 min-h-[32px] text-[13px] font-medium disabled:opacity-60'}
        style={bloque ? undefined : { color: colors.primario }}
      >
        <IconoDescarga className="w-4 h-4" />
        {bajando ? 'Generando PDF...' : etiqueta}
      </button>
      {error && <span className="text-xs text-[#b42318]">{error}</span>}
    </div>
  );
}
