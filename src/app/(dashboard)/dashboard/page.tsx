'use client';

/**
 * Dashboard principal.
 *
 * 🔴 Lo que había antes mostraba DATOS INVENTADOS: las sparklines de las
 * tarjetas salían de `Math.random()`, el gráfico de ingresos de
 * `generateMonthlyData()` —doce meses simulados con una tendencia al alza
 * hardcodeada— y los "+12.5%" eran constantes escritas a mano. Un panel que
 * miente es peor que no tener panel: se toman decisiones mirándolo.
 *
 * Ahora todo sale de `GET /ventas/analytics/dashboard`, que ya devuelve las 17
 * secciones en UNA request, y de la caja activa del usuario. La página responde
 * las cuatro preguntas de la mañana: cómo venimos hoy, cómo venimos estos días,
 * qué se está por romper y qué se vende.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import * as ventaService from '@/features/venta/services/venta-service';
import * as cajaService from '@/features/caja/services/caja-service';
import type { VentaAnalyticsDashboard, AnalyticsResumen } from '@/core/types/venta-analytics';
import { METODO_PAGO_LABEL, type Caja, type ResumenCaja } from '@/core/types/caja';

const RANGOS = [7, 14, 30] as const;
const AZUL = '#437EFF';

function soles(n: number, decimales = 2): string {
  return `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

/**
 * Fecha en `YYYY-MM-DD` LOCAL.
 *
 * 🔴 Nada de `toISOString()`: en Lima (UTC−5) después de las 19:00 devuelve el
 * día siguiente, así que el dashboard mostraría "hoy" con las ventas de mañana
 * —o sea, ninguna— justo en el horario de cierre.
 */
function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function haceDias(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function saludoDelDia(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

/* ─────────── Piezas ─────────── */

/**
 * Tonos de las tarjetas de cifras: degradado suave del blanco al tono, para
 * que cada tarjeta diga de qué habla antes de leerla.
 *
 * SIN borde. En cuentas por cobrar estas tarjetas llevan `ring-1` del color
 * porque ahí no hay sombra y 🔴 un `border-gray-200` no se ve sobre el #f5f7fa
 * del dashboard. Acá el canto lo dibujan la sombra y el blanco del arranque
 * del degradado contra el gris del fondo, así que el ring sobraba: con la
 * cifra ya teñida, marco y número decían lo mismo dos veces.
 *
 * La elevación es `shadow-lg` en reposo y `shadow-xl` al hover. Lo que se lee
 * como altura es el DESPLAZAMIENTO y el desenfoque de la sombra, no su
 * opacidad: para levantarlas más hay que subir de escalón, no oscurecerlas.
 *
 * `from-30%` retrasa el arranque: la tarjeta se queda BLANCA hasta el 30% de
 * la diagonal y el degradado ocurre en el 70% restante. Sin esa parada el
 * blanco vive solo en la esquina (0%) y a un cuarto de camino ya hay mezcla,
 * así que el tono terminaba invadiendo la zona donde va la cifra.
 *
 * `cifra` es el tono OSCURO de cada color, no el vivo: sobre blanco, el 600 de
 * naranja se queda en 3.6:1 de contraste y la cifra es el dato que se lee de
 * lejos. Viaja como custom property `--tono-cifra` para que `Cifra` no tenga
 * que repetir el tono en cada llamada y no puedan desincronizarse.
 */
const TONOS = {
  neutro:  { fondo: 'from-white from-30% to-gray-200',    chip: 'bg-gray-100 text-gray-500',       cifra: '#111827' },
  azul:    { fondo: 'from-white from-30% to-blue-200',    chip: 'bg-blue-100 text-[#004A94]',      cifra: '#004A94' },
  naranja: { fondo: 'from-white from-30% to-orange-200',  chip: 'bg-orange-100 text-orange-700',   cifra: '#c2410c' },
  fucsia:  { fondo: 'from-white from-30% to-fuchsia-200', chip: 'bg-fuchsia-100 text-fuchsia-700', cifra: '#a21caf' },
  verde:   { fondo: 'from-white from-30% to-green-200',   chip: 'bg-green-100 text-green-700',     cifra: '#15803d' },
} as const;

/**
 * Los bloques grandes (Este mes, Ventas por día, Necesita atención, Lo más
 * vendido, Cómo te pagaron hoy) van en blanco con borde gris.
 *
 * El borde es #e8f2ff, el mismo azul del fondo de "Este mes": los bloques lo
 * llevan como línea y esa tarjeta como relleno, así que la fila se lee como un
 * conjunto sin que todos tengan que ir teñidos.
 *
 * 🔴 Se probó darles el degradado azul de las tarjetas de cifras (06-09) y no
 * funciona: son mucho más altos, así que el degradado se estira sobre mucha
 * más superficie y la esquina inferior derecha llega saturada justo donde hay
 * listas y texto. El degradado sirve para una tarjeta de ~120px, no para un
 * bloque de 300.
 */
const BLOQUE_STD = 'rounded-xl border border-[#e8f2ff] bg-white';

/**
 * Título de bloque. 🔴 `font-medium` (500) y no `font-semibold`: Amazon Ember
 * mapea 600-1000 a la MISMA cara Bold, así que entre 600 y 700 no cambia un
 * píxel. A 13px la Bold se empasta; la Medium respira y el azul de marca hace
 * el trabajo de jerarquía que antes hacía el peso.
 */
const TITULO_BLOQUE = 'text-[13px] font-medium text-[#004A94]';

function Tarjeta({ titulo, icono, tono = 'neutro', children }: {
  titulo: string;
  icono: React.ReactNode;
  tono?: keyof typeof TONOS;
  children: React.ReactNode;
}) {
  const t = TONOS[tono];
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-4 shadow-lg transition-shadow hover:shadow-xl ${t.fondo}`}
      style={{ '--tono-cifra': t.cifra } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg ${t.chip}`}>{icono}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function Cifra({ children }: { children: React.ReactNode }) {
  // Toma el color de SU tarjeta vía `--tono-cifra`; el gris queda de respaldo
  // por si algún día se usa fuera de una `Tarjeta`.
  return <p className="mt-2.5 text-[28px] font-bold leading-none tracking-tight text-[color:var(--tono-cifra,#111827)]">{children}</p>;
}

function FilaMagnitud({ nombre, valor, porcentaje, detalle }: {
  nombre: string; valor: string; porcentaje: number; detalle: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="min-w-0 truncate text-xs font-semibold text-gray-800">{nombre}</span>
        <span className="shrink-0 text-xs font-bold text-gray-900">{valor}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, porcentaje)}%`, backgroundColor: AZUL }} />
        </div>
        <span className="w-[62px] shrink-0 text-right text-[10px] text-gray-500">{detalle}</span>
      </div>
    </div>
  );
}

interface Aviso { grave: boolean; titulo: string; detalle: string; href: string; accion: string }

function Bloque({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col ${BLOQUE_STD}`}>
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2.5 pt-3.5">
        <h2 className={TITULO_BLOQUE}>{titulo}</h2>
        {extra}
      </div>
      {children}
    </div>
  );
}

function Esqueleto({ alto }: { alto: string }) {
  return <div className={`animate-pulse rounded-xl border border-[#e8ecf1] bg-white ${alto}`} />;
}

/* ─────────── Página ─────────── */

export default function DashboardPage() {
  const { state: authState } = useAuth();
  const { empresa, sedes } = useEmpresa();
  const permissions = usePermissions();

  const sedesActivas = useMemo(() => sedes.filter(s => s.isActive), [sedes]);
  const [sedeId, setSedeId] = useState('');
  useEffect(() => {
    if (sedeId || sedesActivas.length === 0) return;
    setSedeId((sedesActivas.find(s => s.esPrincipal) ?? sedesActivas[0]).id);
  }, [sedesActivas, sedeId]);

  const [rango, setRango] = useState<number>(14);
  const [hoy, setHoy] = useState<VentaAnalyticsDashboard | null>(null);
  const [serie, setSerie] = useState<VentaAnalyticsDashboard | null>(null);
  const [cargandoHoy, setCargandoHoy] = useState(true);
  const [cargandoSerie, setCargandoSerie] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [caja, setCaja] = useState<{ caja: Caja; resumen: ResumenCaja | null } | null>(null);
  const [cajaLista, setCajaLista] = useState(false);
  const [apuntada, setApuntada] = useState<number | null>(null);
  const [mes, setMes] = useState<AnalyticsResumen | null>(null);

  const verStats = permissions.canViewStatistics;

  // Dos llamadas al MISMO endpoint: una para el día (tarjetas, alertas, medios
  // de pago) y otra para el rango del gráfico. El resumen que devuelve es del
  // rango pedido, así que las cifras de hoy no se pueden sacar de la serie.
  useEffect(() => {
    if (!verStats || !sedeId) return;
    let vivo = true;
    setCargandoHoy(true);
    const h = claveFecha(new Date());
    ventaService.getAnalyticsDashboard({ sedeId, fechaInicio: h, fechaFin: h, periodo: 'DIARIO' })
      .then(d => { if (vivo) { setHoy(d); setFallo(false); } })
      .catch(() => { if (vivo) setFallo(true); })
      .finally(() => { if (vivo) setCargandoHoy(false); });
    return () => { vivo = false; };
  }, [verStats, sedeId]);

  useEffect(() => {
    if (!verStats || !sedeId) return;
    let vivo = true;
    setCargandoSerie(true);
    setApuntada(null);
    ventaService.getAnalyticsDashboard({
      sedeId,
      fechaInicio: claveFecha(haceDias(rango - 1)),
      fechaFin: claveFecha(new Date()),
      periodo: 'DIARIO',
    })
      .then(d => { if (vivo) setSerie(d); })
      .catch(() => { /* el error ya se avisa con el de hoy */ })
      .finally(() => { if (vivo) setCargandoSerie(false); });
    return () => { vivo = false; };
  }, [verStats, sedeId, rango]);

  // El mes va aparte y contra el endpoint CHICO: son tres cifras, no hace falta
  // pagar las 17 secciones del consolidado otra vez.
  useEffect(() => {
    if (!verStats || !sedeId) return;
    let vivo = true;
    const inicio = new Date();
    inicio.setDate(1);
    ventaService.getAnalyticsResumen({
      sedeId,
      fechaInicio: claveFecha(inicio),
      fechaFin: claveFecha(new Date()),
    })
      .then(r => { if (vivo) setMes(r); })
      .catch(() => { /* la fila del mes simplemente no se dibuja */ });
    return () => { vivo = false; };
  }, [verStats, sedeId]);

  const cargarCaja = useCallback(async () => {
    if (!permissions.canViewCaja) { setCajaLista(true); return; }
    try {
      const activa = await cajaService.getCajaActiva();
      if (!activa?.id) { setCaja(null); return; }
      const resumen = await cajaService.getResumen(activa.id).catch(() => null);
      setCaja({ caja: activa, resumen });
    } catch {
      setCaja(null);
    } finally {
      setCajaLista(true);
    }
  }, [permissions.canViewCaja]);
  useEffect(() => { void cargarCaja(); }, [cargarCaja]);

  /** La serie con los días SIN ventas rellenados: si no, el gráfico miente por omisión. */
  const barras = useMemo(() => {
    const porDia = new Map((serie?.ventasPeriodo ?? []).map(r => [r.periodo, r]));
    return Array.from({ length: rango }, (_, i) => {
      const fecha = haceDias(rango - 1 - i);
      const fila = porDia.get(claveFecha(fecha));
      return { fecha, total: fila?.total ?? 0, cantidad: fila?.cantidad ?? 0 };
    });
  }, [serie, rango]);

  const maximo = Math.max(1, ...barras.map(b => b.total));
  const totalRango = barras.reduce((s, b) => s + b.total, 0);
  const ventasRango = barras.reduce((s, b) => s + b.cantidad, 0);
  const punto = apuntada != null ? barras[apuntada] : null;

  const resumen = hoy?.resumen;
  const cambioCrudo = hoy?.comparativo?.porcentajeCambio;
  const ayerVendio = (hoy?.comparativo?.periodoAnterior?.montoTotal ?? 0) > 0;
  const cambio = ayerVendio && Number.isFinite(cambioCrudo) ? (cambioCrudo as number) : null;
  const sinVentasHoy = !!resumen && resumen.totalVentas === 0;

  /** Alertas del backend + reposición, ordenadas por gravedad. */
  const avisos = useMemo<Aviso[]>(() => {
    const out: Aviso[] = [];
    for (const a of hoy?.alertas ?? []) {
      if (a.tipo === 'CREDITOS_VENCIDOS') {
        out.push({ grave: true, titulo: a.mensaje, detalle: 'Cobranza vencida', href: '/dashboard/cuentas-cobrar', accion: 'Ver' });
      } else if (a.tipo === 'BORRADORES_ANTIGUOS') {
        out.push({ grave: false, titulo: a.mensaje, detalle: 'Ventas sin cerrar', href: '/dashboard/ventas', accion: 'Ver' });
      } else {
        out.push({ grave: false, titulo: a.mensaje, detalle: '', href: '/dashboard/ventas', accion: 'Ver' });
      }
    }
    const criticos = (hoy?.reposicion ?? []).filter(r => r.nivel === 'CRITICO' || r.nivel === 'BAJO');
    for (const r of criticos.slice(0, 6)) {
      out.push({
        grave: r.nivel === 'CRITICO',
        titulo: r.nombre,
        detalle: `${r.diasCobertura <= 0 ? 'Sin stock' : `${Math.round(r.diasCobertura)} días de cobertura`} · sugerido comprar ${Math.round(r.sugeridoComprar)}`,
        href: '/dashboard/alertas-stock',
        accion: 'Reponer',
      });
    }
    return out.sort((a, b) => Number(b.grave) - Number(a.grave));
  }, [hoy]);

  /**
   * La proyección de cierre la calcula el backend SIEMPRE sobre el mes en curso
   * —ignora el rango de la consulta y solo mira la sede—, así que viene gratis
   * en la llamada de hoy.
   *
   * 🔑 `variacionPct` compara la PROYECCIÓN contra el mes anterior COMPLETO, no
   * las ventas de hoy: la etiqueta tiene que decir eso y no otra cosa.
   */
  const proyeccion = hoy?.proyeccion;
  const mesAnteriorNombre = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('es-PE', { month: 'long' });
  }, []);

  const topProductos = (serie?.topProductos ?? []).slice(0, 5);
  const maxProducto = Math.max(1, ...topProductos.map(p => p.ingresoTotal));
  const pagos = (hoy?.metodosPago ?? []).filter(m => m.monto > 0);
  const totalPagos = pagos.reduce((s, m) => s + m.monto, 0);

  if (authState.status !== 'authenticated') return null;
  const { user } = authState;

  return (
    <div className="space-y-3.5">

      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight text-[#004A94]">{saludoDelDia()}, {user.nombres}</h1>
          <p className="mt-0.5 text-xs capitalize text-gray-500">
            {FECHA_LARGA.format(new Date())}
            {empresa?.nombre && <span className="normal-case"> · {empresa.nombre}</span>}
          </p>
        </div>
        {sedesActivas.length > 1 && (
          <select
            value={sedeId}
            onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-[#e3e8ef] bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-[#004A94]"
          >
            {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {fallo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          No se pudieron cargar las estadísticas. El resto de la página sigue funcionando.
        </div>
      )}

      {/* ── Hoy ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {verStats && cargandoHoy ? (
          <><Esqueleto alto="h-[118px]" /><Esqueleto alto="h-[118px]" /><Esqueleto alto="h-[118px]" /></>
        ) : verStats && resumen ? (
          <>
            <Tarjeta titulo="Ventas de hoy" tono="azul" icono={
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>
            }>
              <Cifra>{soles(resumen.montoTotal)}</Cifra>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {cambio != null && resumen.totalVentas > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${cambio >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {cambio >= 0 ? '▲' : '▼'} {Math.abs(cambio).toFixed(0)}% vs ayer
                  </span>
                )}
                <span className="text-[11px] text-gray-500">
                  {sinVentasHoy
                    ? 'Todavía no hay ventas hoy'
                    : `${resumen.totalVentas} ${resumen.totalVentas === 1 ? 'venta' : 'ventas'}`}
                </span>
              </div>
              {sinVentasHoy && (
                <Link href="/dashboard/venta-rapida" className="mt-1.5 inline-block text-[11px] font-bold text-[#004A94] hover:underline">
                  Abrir Venta Rápida →
                </Link>
              )}
            </Tarjeta>

            <Tarjeta titulo="Ticket promedio" tono="naranja" icono={
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 11h18" /></svg>
            }>
              <Cifra>{soles(resumen.ticketPromedio)}</Cifra>
              <p className="mt-1.5 text-[11px] text-gray-500">Sobre las ventas de hoy</p>
            </Tarjeta>

            {permissions.canViewReports && (
              <Tarjeta titulo="Margen de hoy" tono="fucsia" icono={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.3 5 1.4 5 3.4-2.2 3.3-5 3.3-5-1.4-5-3.3" /></svg>
              }>
                <Cifra>{soles(resumen.utilidadBruta)}</Cifra>
                <p className="mt-1.5 text-[11px] text-gray-500">{Number(resumen.margenPorcentaje || 0).toFixed(1)}% sobre la venta de hoy</p>
              </Tarjeta>
            )}
          </>
        ) : null}

        {/* Mi caja: lo primero que mira un cajero, y antes no estaba en ningún lado */}
        {permissions.canViewCaja && (
          cajaLista ? (
            caja ? (
              <div className={`flex flex-col rounded-xl bg-gradient-to-br p-4 shadow-lg transition-shadow hover:shadow-xl ${TONOS.verde.fondo}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg ${TONOS.verde.chip}`}>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Mi caja</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  {/* 🔴 `font-medium` (500) y no `font-semibold`: Amazon Ember
                      mapea 600-1000 a la MISMA cara Bold, así que bajar de 700
                      a 600 no cambia nada en pantalla. 500 cae en Medium, que
                      es la cara que necesita este renglón. */}
                  <span className="text-sm font-medium text-green-800">
                    Abierta desde las {new Date(caja.caja.fechaApertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {caja.resumen && (
                  <p className="mt-1 text-[11px] text-gray-600">Efectivo esperado: <span className="font-semibold">{soles(caja.resumen.saldoEfectivo)}</span></p>
                )}
                <Link href="/dashboard/caja" className="mt-auto self-start rounded-lg border border-green-400 bg-white px-2.5 py-1 pt-1 text-[11px] font-bold text-green-700 hover:bg-green-50">
                  Ir a mi caja
                </Link>
              </div>
            ) : (
              <div className={`flex flex-col rounded-xl bg-gradient-to-br p-4 shadow-lg transition-shadow hover:shadow-xl ${TONOS.neutro.fondo}`}>
                {/* Sin caja abierta va en GRIS, no en verde: el verde de esta
                    tarjeta significa "caja abierta", y teñirla igual borraría
                    la única señal que da de un vistazo. */}
                <div className="flex items-center gap-2">
                  <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg ${TONOS.neutro.chip}`}>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Mi caja</span>
                </div>
                <p className="mt-2.5 text-sm font-bold text-gray-700">Sin caja abierta</p>
                <p className="mt-1 text-[11px] text-gray-500">La Venta Rápida necesita una caja abierta.</p>
                <Link href="/dashboard/caja" className="mt-auto self-start rounded-lg bg-[#004A94] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#003570]">
                  Abrir caja
                </Link>
              </div>
            )
          ) : <Esqueleto alto="h-[118px]" />
        )}
      </div>

      {/* ── Este mes: el puente al análisis, sin duplicarlo ── */}
      {verStats && (proyeccion || mes) && (
        // Esta tarjeta NO usa `BLOQUE_STD`: va en #e8f2ff plano —sin degradado
        // y sin borde— y con `p-2`, 18px menos de alto que los demás bloques
        // (8 del padding contra su p-4 original, más 2 del `mt-2.5` de la
        // grilla, más lo que cede la cifra al bajar de 22 a 20px).
        <div className="rounded-xl bg-[#e8f2ff] p-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={TITULO_BLOQUE}>Este mes</h2>
            <Link href="/dashboard/ventas/analytics" className="text-[11px] font-bold text-[#004A94] hover:underline">
              Ver estadísticas completas →
            </Link>
          </div>

          <div className="mt-2.5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Vendido</p>
              <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-[#004A94]">
                {soles(mes?.montoTotal ?? proyeccion?.ventasActual ?? 0)}
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {proyeccion?.diasTranscurridos != null
                  ? `${proyeccion.diasTranscurridos} de ${proyeccion.diasEnMes} días`
                  : `${mes?.totalVentas ?? 0} ventas`}
              </p>
            </div>

            <div className="sm:border-l sm:border-gray-100 sm:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Proyección al cierre</p>
              {proyeccion?.suficiente && proyeccion.proyeccionCierre != null ? (
                <>
                  <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-[#004A94]">
                    {soles(proyeccion.proyeccionCierre)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {proyeccion.variacionPct != null && (proyeccion.mesAnterior ?? 0) > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${proyeccion.variacionPct >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {proyeccion.variacionPct >= 0 ? '▲' : '▼'} {Math.abs(proyeccion.variacionPct).toFixed(0)}% vs {mesAnteriorNombre}
                      </span>
                    )}
                    {proyeccion.proyeccionMin != null && proyeccion.proyeccionMax != null && (
                      <span className="text-[11px] text-gray-500">
                        entre {soles(proyeccion.proyeccionMin, 0)} y {soles(proyeccion.proyeccionMax, 0)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-semibold text-gray-500">Sin historia suficiente</p>
                  <p className="mt-1.5 text-[11px] text-gray-500">Hacen falta más días de ventas para proyectar el cierre.</p>
                </>
              )}
            </div>

            {permissions.canViewReports && (
              <div className="sm:border-l sm:border-gray-100 sm:pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Margen del mes</p>
                <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-[#004A94]">
                  {mes ? soles(mes.utilidadBruta) : '—'}
                </p>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {mes ? `${Number(mes.margenPorcentaje || 0).toFixed(1)}% · ticket ${soles(mes.ticketPromedio)}` : 'Cargando…'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Serie + atención ── */}
      {verStats && (
        <div className="grid gap-3.5 xl:grid-cols-12">

          <div className={`flex min-h-[300px] flex-col p-4 xl:col-span-7 ${BLOQUE_STD}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={TITULO_BLOQUE}>Ventas por día</h2>
                <p className="mt-0.5 text-[11px] text-gray-500">Últimos {rango} días</p>
              </div>
              <div className="flex gap-1 rounded-lg border border-[#e8ecf1] p-0.5">
                {RANGOS.map(n => (
                  <button key={n} onClick={() => setRango(n)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${rango === n ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {n}d
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-[22px] font-bold tracking-tight text-gray-900">
                {soles(punto ? punto.total : totalRango)}
              </span>
              <span className="text-[11px] text-gray-500">
                {punto
                  ? `${punto.cantidad} ${punto.cantidad === 1 ? 'venta' : 'ventas'} el ${punto.fecha.getDate()} de ${punto.fecha.toLocaleDateString('es-PE', { month: 'long' })}`
                  : `${ventasRango} ${ventasRango === 1 ? 'venta' : 'ventas'} en ${rango} días`}
              </span>
            </div>

            {cargandoSerie ? (
              <div className="mt-4 flex-1 animate-pulse rounded-lg bg-gray-50" />
            ) : (
              <div className={`mt-3.5 flex flex-1 items-end ${rango > 20 ? 'gap-[3px]' : 'gap-1.5'}`}>
                {barras.map((b, i) => {
                  const activa = apuntada === i || (apuntada == null && i === barras.length - 1);
                  return (
                    <div key={i}
                      onMouseEnter={() => setApuntada(i)}
                      onMouseLeave={() => setApuntada(null)}
                      className="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-1.5">
                      {/* Una sola tinta: la altura ya codifica la magnitud. */}
                      <div className="w-full rounded-t"
                        style={{ height: `${Math.max(2, Math.round((b.total / maximo) * 100))}%`, backgroundColor: AZUL, opacity: activa ? 1 : 0.34 }} />
                      <span className={`text-center text-[9px] ${activa ? 'text-gray-700' : 'text-gray-400'}`}>{b.fecha.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="xl:col-span-5">
            <Bloque
              titulo="Necesita atención"
              extra={avisos.length > 0
                ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-700">{avisos.length}</span>
                : undefined}
            >
              {cargandoHoy ? (
                <div className="px-4 pb-4"><div className="h-24 animate-pulse rounded-lg bg-gray-50" /></div>
              ) : avisos.length === 0 ? (
                <p className="px-4 pb-5 pt-2 text-xs text-gray-400">Nada pendiente. Ni stock por caerse ni cobranza vencida.</p>
              ) : (
                <div className="max-h-[248px] overflow-y-auto">
                  {avisos.map((a, i) => (
                    <Link key={i} href={a.href}
                      className="flex items-start gap-2.5 border-t border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50">
                      <span className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${a.grave ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 17h.01" /></svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-gray-800">{a.titulo}</span>
                        {a.detalle && <span className="block truncate text-[11px] text-gray-500">{a.detalle}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-[#004A94]">{a.accion}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Bloque>
          </div>
        </div>
      )}

      {/* ── Qué se vende y cómo pagan ── */}
      {verStats && (
        <div className="grid gap-3.5 md:grid-cols-2">
          <Bloque titulo="Lo más vendido" extra={<span className="text-[11px] text-gray-500">últimos {rango} días</span>}>
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {cargandoSerie ? (
                <div className="h-24 animate-pulse rounded-lg bg-gray-50" />
              ) : topProductos.length === 0 ? (
                <p className="py-3 text-xs text-gray-400">Sin ventas en el período.</p>
              ) : topProductos.map(p => (
                <FilaMagnitud key={p.productoId} nombre={p.nombre}
                  valor={soles(p.ingresoTotal, 0)}
                  porcentaje={(p.ingresoTotal / maxProducto) * 100}
                  detalle={`${Math.round(p.cantidadVendida)} u`} />
              ))}
            </div>
          </Bloque>

          <Bloque titulo="Cómo te pagaron hoy" extra={totalPagos > 0 ? <span className="text-[11px] text-gray-500">{soles(totalPagos, 0)}</span> : undefined}>
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {cargandoHoy ? (
                <div className="h-24 animate-pulse rounded-lg bg-gray-50" />
              ) : pagos.length === 0 ? (
                <p className="py-3 text-xs text-gray-400">Todavía no hay cobros hoy.</p>
              ) : pagos.map(m => (
                <FilaMagnitud key={m.metodo} nombre={METODO_PAGO_LABEL[m.metodo] ?? m.metodo}
                  valor={soles(m.monto, 0)}
                  porcentaje={(m.monto / Math.max(1, ...pagos.map(p => p.monto))) * 100}
                  detalle={`${Math.round((m.monto / totalPagos) * 100)}% · ${m.cantidad} v`} />
              ))}
            </div>
          </Bloque>
        </div>
      )}

      {/* Sin permiso de estadísticas no hay panel que mostrar: se ofrece el trabajo. */}
      {!verStats && (
        <div className="rounded-xl border border-[#e8ecf1] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-gray-700">Tu cuenta no tiene acceso a las estadísticas</p>
          <p className="mt-1 text-xs text-gray-500">Podés seguir vendiendo con normalidad desde acá.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard/venta-rapida" className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Venta Rápida</Link>
            <Link href="/dashboard/ventas" className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Ventas</Link>
            <Link href="/dashboard/cotizaciones" className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Cotizaciones</Link>
          </div>
        </div>
      )}
    </div>
  );
}
