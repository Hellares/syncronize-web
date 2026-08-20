'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { GruposMayoreoResumen, VarianteMayoreo } from '@/core/types/mayoreo';
import { gruposConAviso, gruposSolitarios } from '@/core/types/mayoreo';
import type { ProductoStock } from '@/core/types/stock';
import { coincideTodosLosTerminos, terminosBusqueda } from '@/core/utils/busqueda-texto';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import GrupoMayoreoCard from '@/features/producto/components/mayoreo/GrupoMayoreoCard';
import { getGruposMayoreo } from '@/features/producto/services/precio-nivel-service';
import { getStockByVarianteSede } from '@/features/stock/services/stock-service';
import UpdatePreciosDialog from '@/features/stock/components/UpdatePreciosDialog';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/**
 * MONITOR DE MAYOREO COMBINADO — qué variantes suman entre sí para llegar al
 * mínimo de un nivel.
 *
 * Desde que el mayoreo se acumula por grupo, tres edredones de tres diseños
 * distintos que comparten el mismo "Por Mayor ≥ 3" se cobran por mayor. Eso es
 * lo que se quería, pero el grupo es IMPLÍCITO: sale de que las dos variantes
 * tengan cargado el mismo nivel, no de una lista que alguien mantiene. Nadie
 * puede saber, mirando la pantalla de variantes, cuáles combinan.
 *
 * Peor: cambiarle un sol al precio por mayor de una variante la saca del grupo
 * EN SILENCIO. Esta pantalla es la que lo hace visible — y por eso muestra tan
 * fuerte los dos casos que duelen: la variante que quedó sola en su grupo y la
 * que no tiene nivel y nunca va a hacer mayoreo.
 *
 * 🔴 Los grupos los arma el backend con la MISMA llave con la que cobra. La web
 * no los recalcula: un monitor que agrupara por su cuenta podría mostrar algo
 * distinto de lo que el POS termina cobrando.
 */
export default function GruposMayoreoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productoId } = use(params);
  const { sedes, state } = useEmpresa();

  const sedesActivas = useMemo(() => sedes.filter((s) => s.isActive), [sedes]);
  /**
   * La sede sale del contexto DESPUÉS del primer render. La elegida es estado
   * (la decide el usuario) y el default se DERIVA: sembrarlo desde un efecto
   * encadenaría renders, y disparar la carga antes de saber de qué sede se
   * habla traería los precios en null y habría que pedirlos de nuevo.
   */
  const sedesListas = state.status === 'loaded' || state.status === 'error';
  const [sedeElegida, setSedeElegida] = useState<string | null>(null);
  const sedeId = sedeElegida
    ?? (sedesActivas.find((s) => s.esPrincipal) ?? sedesActivas[0])?.id
    ?? '';

  const [resumen, setResumen] = useState<GruposMayoreoResumen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  /**
   * Grupos abiertos. Arranca vacío: con 7 grupos y 91 variantes, abrir todo de
   * entrada es una pared de texto.
   */
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  // Precios: se abren SIN salir del monitor. La variante se guarda junto al
  // stock porque es la que sabe en qué unidad se le habla al usuario.
  const [stockEnEdicion, setStockEnEdicion] = useState<ProductoStock | null>(null);
  const [varianteEnEdicion, setVarianteEnEdicion] = useState<VarianteMayoreo | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!sedesListas) return;
    setIsLoading(true);
    setError('');
    try {
      setResumen(await getGruposMayoreo(productoId, sedeId || null));
    } catch {
      setError('No se pudieron cargar los grupos de mayoreo');
      setResumen(null);
    } finally {
      setIsLoading(false);
    }
  }, [productoId, sedeId, sedesListas]);

  // Los grupos no cambian por sede, pero el precio de lista y el stock sí — y
  // son los que dicen cuánto se ahorra realmente.
  useEffect(() => { cargar(); }, [cargar]);

  const terminos = useMemo(() => terminosBusqueda(filtro), [filtro]);
  const buscando = terminos.length > 0;

  // Nombre + SKU juntos: "frozen 3 pzs" y "VAR-000044" filtran igual de bien.
  const coincide = useCallback(
    (v: VarianteMayoreo) => coincideTodosLosTerminos(`${v.nombre} ${v.sku}`, terminos),
    [terminos],
  );

  /**
   * Abre el diálogo de precios de una variante SIN salir del monitor.
   *
   * Es la mitad que faltaba: detectar acá que una variante quedó sola en su
   * grupo —o que su nivel no baja del precio de lista— y tener que irse a otra
   * pantalla a corregirlo dejaba el problema visto pero no resuelto. Al guardar
   * se recarga, así que el reagrupado se ve en el acto: si el precio quedó igual
   * al de sus hermanas, la variante SALTA a su grupo.
   */
  const editarPrecio = useCallback(async (v: VarianteMayoreo) => {
    if (!sedeId) {
      // Sin sede el diálogo abriría con datos incompletos.
      setError('Elegí una sede para poder editar precios');
      return;
    }
    setAbriendo(v.varianteId);
    setError('');
    try {
      // El diálogo trabaja sobre el ProductoStock de la sede (precio, costo,
      // oferta, liquidación), que el monitor no trae: pide solo lo que muestra.
      setStockEnEdicion(await getStockByVarianteSede(v.varianteId, sedeId));
      setVarianteEnEdicion(v);
    } catch {
      // El precio no se toca a ciegas.
      setError(`No se pudo leer el precio de ${v.nombre}`);
    } finally {
      setAbriendo(null);
    }
  }, [sedeId]);

  const alternar = useCallback((clave: string) => setAbiertos((prev) => {
    const next = new Set(prev);
    if (!next.delete(clave)) next.add(clave);
    return next;
  }), []);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/productos/${productoId}`} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Grupos de mayoreo</h1>
            <p className="text-sm text-gray-500">{resumen?.productoNombre ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sedesActivas.length > 1 && (
            <select
              value={sedeId}
              onChange={(e) => setSedeElegida(e.target.value)}
              className={`${INPUT_STD} bg-white`}
            >
              {sedesActivas.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}{s.esPrincipal ? ' (Principal)' : ''}</option>
              ))}
            </select>
          )}
          <button
            onClick={cargar}
            title="Actualizar"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Contenido
        isLoading={isLoading}
        resumen={resumen}
        buscando={buscando}
        coincide={coincide}
        abiertos={abiertos}
        onAlternar={alternar}
        onEditarVariante={editarPrecio}
        abriendo={abriendo}
        filtro={filtro}
        onFiltro={setFiltro}
      />

      <UpdatePreciosDialog
        isOpen={!!stockEnEdicion}
        stock={stockEnEdicion}
        // Sin esto un granel se editaría en gramos (S/0.008) en vez de en
        // kilos (S/8.00), que es justo el número que no se puede tipear.
        unidadPresentacionSimbolo={varianteEnEdicion?.unidadPresentacionSimbolo}
        factorPresentacion={varianteEnEdicion?.factorPresentacion}
        onClose={() => setStockEnEdicion(null)}
        onSuccess={() => { setStockEnEdicion(null); cargar(); }}
      />
    </div>
  );
}

interface ContenidoProps {
  isLoading: boolean;
  resumen: GruposMayoreoResumen | null;
  buscando: boolean;
  coincide: (v: VarianteMayoreo) => boolean;
  abiertos: Set<string>;
  onAlternar: (clave: string) => void;
  onEditarVariante: (v: VarianteMayoreo) => void;
  abriendo: string | null;
  filtro: string;
  onFiltro: (v: string) => void;
}

function Contenido({
  isLoading, resumen, buscando, coincide, abiertos, onAlternar, onEditarVariante, abriendo, filtro, onFiltro,
}: ContenidoProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
      </div>
    );
  }
  if (!resumen) return null;

  if (resumen.grupos.length === 0 && resumen.sinNivel.length === 0) {
    return (
      <Mensaje
        titulo="Este producto no tiene variantes"
        detalle="El mayoreo combinado se calcula entre variantes."
      />
    );
  }

  if (resumen.grupos.length === 0) {
    return (
      <Mensaje
        titulo="Ninguna variante tiene precio por mayor"
        detalle={`Las ${resumen.totalVariantes} variantes se venden siempre a precio de lista. Cargá un nivel "Por Mayor" en al menos dos para que empiecen a combinar entre sí.`}
      />
    );
  }

  const sinNivelVisibles = resumen.sinNivel.filter(coincide);

  return (
    <div className="space-y-3">
      <Resumen resumen={resumen} />

      <div className="relative">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={filtro}
          onChange={(e) => onFiltro(e.target.value)}
          placeholder="Buscar variante en los grupos…"
          className={`${INPUT_STD} w-full pl-8`}
        />
      </div>

      {abriendo && <p className="text-[11px] text-gray-400">Abriendo precios…</p>}

      {resumen.grupos.map((g) => {
        const visibles = g.variantes.filter(coincide);
        // Con el buscador activo, un grupo sin coincidencias se esconde entero.
        if (buscando && visibles.length === 0) return null;
        return (
          <GrupoMayoreoCard
            key={g.clave}
            grupo={g}
            visibles={visibles}
            // Buscando, se abre solo: el usuario ya dijo qué quiere ver.
            abierto={abiertos.has(g.clave) || buscando}
            onAlternar={() => onAlternar(g.clave)}
            onEditarVariante={onEditarVariante}
          />
        );
      })}

      {resumen.sinNivel.length > 0 && (!buscando || sinNivelVisibles.length > 0) && (
        <SinNivel
          total={resumen.sinNivel.length}
          visibles={sinNivelVisibles}
          onEditarVariante={onEditarVariante}
        />
      )}
    </div>
  );
}

/**
 * La foto de arriba: cuántos grupos hay, cuántas variantes combinan y —lo
 * importante— cuántas quedaron afuera.
 */
function Resumen({ resumen: r }: { resumen: GruposMayoreoResumen }) {
  const afuera = r.totalVariantes - r.variantesEnGrupo;
  const solitarios = gruposSolitarios(r);
  const avisos = gruposConAviso(r);

  return (
    <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-3">
      <p className="text-xs font-bold text-blue-900">
        {r.grupos.length} {r.grupos.length === 1 ? 'grupo' : 'grupos'} de mayoreo
      </p>
      <p className="mt-1 text-[10.5px] leading-snug text-blue-900">
        Las variantes de un mismo grupo <strong>SUMAN entre sí</strong> para llegar al mínimo.
        Llevar una de cada una ya es mayoreo.
      </p>
      <p className="mt-1 text-[10px] italic text-blue-700">
        Tocá una variante para editar sus precios: al guardar, el reagrupado se ve al instante.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill texto={`${r.variantesEnGrupo} de ${r.totalVariantes} combinan`} tono="verde" />
        {afuera > 0 && <Pill texto={`${afuera} sin precio por mayor`} tono="naranja" />}
        {solitarios > 0 && (
          <Pill texto={`${solitarios} ${solitarios === 1 ? 'grupo' : 'grupos'} de una sola`} tono="naranja" />
        )}
        {avisos > 0 && <Pill texto={`${avisos} con avisos`} tono="rojo" />}
      </div>
    </div>
  );
}

const TONOS = {
  verde: 'border-green-300 bg-green-50 text-green-800',
  naranja: 'border-orange-300 bg-orange-50 text-orange-800',
  rojo: 'border-red-300 bg-red-50 text-red-800',
} as const;

function Pill({ texto, tono }: { texto: string; tono: keyof typeof TONOS }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONOS[tono]}`}>
      {texto}
    </span>
  );
}

/**
 * Las que nunca van a hacer mayoreo. Va al final y en naranja porque casi
 * siempre es un olvido, no una decisión.
 */
function SinNivel({ total, visibles, onEditarVariante }: {
  total: number;
  visibles: VarianteMayoreo[];
  onEditarVariante: (v: VarianteMayoreo) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-orange-300 bg-orange-50">
      <div className="px-3 py-2.5">
        <p className="text-[11.5px] font-bold text-orange-900">Nunca harán mayoreo ({total})</p>
        <p className="mt-0.5 text-[10px] leading-snug text-orange-900">
          No tienen ningún nivel de precio cargado, así que se venden siempre a precio de lista
          por más que el cliente lleve muchas.
        </p>
      </div>
      <div className="border-t border-orange-200">
        {/* También se tocan: es acá donde más falta hace entrar a cargarle el
            precio por mayor que nunca tuvo. */}
        {visibles.map((v) => (
          <button
            key={v.varianteId}
            onClick={() => onEditarVariante(v)}
            className="flex w-full items-center gap-2 border-b border-orange-100 px-3 py-1.5 text-left transition-colors last:border-0 hover:bg-orange-100/70"
          >
            <span className="min-w-0 flex-1 truncate text-[11px] text-gray-800">{v.nombre}</span>
            <span className="shrink-0 font-mono text-[9.5px] text-gray-600">
              {v.sku}
              {v.precioVenta != null && ` · S/ ${v.precioVenta.toFixed(2)}`}
            </span>
            <svg className="h-3.5 w-3.5 shrink-0 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function Mensaje({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
      <p className="text-sm font-medium text-gray-600">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">{detalle}</p>
    </div>
  );
}
