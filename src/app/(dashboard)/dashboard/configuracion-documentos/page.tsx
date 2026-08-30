'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import Card from '@/components/ui/Card';
import { usePermissions, useEmpresa } from '@/features/empresa/context/empresa-context';
import * as storageService from '@/features/storage/services/storage-service';
import { reducirImagen } from '@/core/utils/imagen';
import * as cfgService from '@/features/configuracion-documentos/services/configuracion-documentos-service';
import {
  FORMATOS_PAPEL,
  POSICIONES_LOGO,
  SECCIONES_PLANTILLA,
  margenesDePlantilla,
  type ConfiguracionDocumentos,
  type ConfiguracionCompleta,
  type PlantillaDocumento,
} from '@/core/types/configuracion-documentos';
import { construirCotizacionPdf } from '@/features/cotizacion/components/cotizacion-pdf';
import type { Cotizacion } from '@/core/types/cotizacion';
import type { EmpresaInfo } from '@/core/types/empresa';

/**
 * Cotizacion de muestra para la vista previa.
 *
 * Trae de todo --descuento, IGV, observaciones y condiciones-- para que ningun
 * interruptor de seccion parezca no hacer nada al probarlo.
 */
const COTIZACION_MUESTRA: Cotizacion = {
  id: 'muestra', empresaId: 'muestra', sedeId: 'muestra', vendedorId: 'muestra',
  codigo: 'COT-000123', nombre: 'Ejemplo de cotización',
  nombreCliente: 'Cliente de ejemplo S.A.C.', documentoCliente: '20123456789',
  emailCliente: 'contacto@ejemplo.com', telefonoCliente: '999 888 777',
  direccionCliente: 'Av. Siempre Viva 742',
  moneda: 'PEN', subtotal: 550, descuento: 50, impuestos: 90, total: 590,
  fechaEmision: new Date().toISOString(),
  fechaVencimiento: new Date(Date.now() + 7 * 864e5).toISOString(),
  estado: 'PENDIENTE' as Cotizacion['estado'],
  observaciones: 'Los precios no incluyen instalación ni traslado.',
  condiciones: 'Validez de 7 días. 50% de adelanto para iniciar.',
  creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString(),
  sede: { id: 'muestra', nombre: 'Sede Principal' },
  vendedorNombre: 'Vendedor de ejemplo',
  detalles: [
    { id: '1', cotizacionId: 'muestra', descripcion: 'Producto de ejemplo A', cantidad: 2,
      precioUnitario: 150, descuento: 0, tipoAfectacion: '10', porcentajeIGV: 18,
      igv: 45.76, icbper: 0, subtotal: 254.24, total: 300, orden: 1 },
    { id: '2', cotizacionId: 'muestra', descripcion: 'Producto de ejemplo B', cantidad: 1,
      precioUnitario: 200, descuento: 50, tipoAfectacion: '10', porcentajeIGV: 18,
      igv: 22.88, icbper: 0, subtotal: 127.12, total: 150, orden: 2 },
    { id: '3', cotizacionId: 'muestra', descripcion: 'Servicio de instalación', cantidad: 1,
      precioUnitario: 140, descuento: 0, tipoAfectacion: '10', porcentajeIGV: 18,
      igv: 21.36, icbper: 0, subtotal: 118.64, total: 140, orden: 3 },
  ],
};

/**
 * Vista previa: el PDF REAL, con los valores del formulario todavia sin
 * guardar.
 *
 * Se dibuja con `construirCotizacionPdf`, el mismo que usa la descarga. Un
 * mockup en HTML seria mas barato pero se separaria del PDF a la primera
 * correccion, y entonces mentiria justo donde el usuario confia.
 */
function VistaPrevia({ config, plantilla, empresa }: {
  config: ConfiguracionDocumentos;
  plantilla: PlantillaDocumento;
  empresa: EmpresaInfo | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let creada: string | null = null;
    // Debounce: mover un margen con las flechas dispara un render por pulsacion
    // y cada uno arma un PDF entero.
    const t = setTimeout(async () => {
      try {
        const cfg: ConfiguracionCompleta = { configuracion: config, plantilla };
        const doc = await construirCotizacionPdf({
          cotizacion: COTIZACION_MUESTRA, mode: 'interno', empresa, cfg,
        });
        if (cancelado) return;
        creada = doc.output('bloburl') as unknown as string;
        setUrl(creada);
        setError(false);
      } catch {
        if (!cancelado) setError(true);
      }
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(t);
      // Sin esto cada tecleo deja un blob vivo hasta recargar la pagina.
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [config, plantilla, empresa]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-gray-400">Vista previa</p>
        <span className="text-[10px] text-gray-400">Datos de ejemplo</span>
      </div>
      {error ? (
        <p className="text-xs text-red-600">No se pudo generar la vista previa</p>
      ) : url ? (
        <iframe src={`${url}#toolbar=0&navpanes=0`} title="Vista previa de la cotización"
          className="h-[520px] w-full rounded-[6px] bg-white ring-1 ring-blue-400" />
      ) : (
        <div className="flex h-[520px] items-center justify-center rounded-[6px] bg-zinc-100 ring-1 ring-blue-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
        </div>
      )}
      <p className="mt-2 text-[10px] text-gray-400">
        Es el PDF real, con los cambios que todavía no guardaste.
      </p>
    </div>
  );
}

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

/**
 * Campo de logo: sube el archivo y deja la URL en el formulario.
 *
 * Mismo camino que el app: `/storage/upload` con entidad EMPRESA y categoria
 * LOGO. Se achica antes a 800x400 --el logo va embebido en CADA PDF y ocupa
 * pocos milimetros en la hoja, asi que la foto original solo engorda los
 * documentos.
 */
function CampoLogo({ label, value, onChange, ayuda, empresaId, onError, onOk }: {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  ayuda?: string;
  empresaId?: string;
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file: File) => {
    if (!empresaId) return;
    setSubiendo(true);
    try {
      const reducido = await reducirImagen(file, 800, 400);
      const res = await storageService.uploadFile({
        file: reducido, empresaId, entidadTipo: 'EMPRESA', entidadId: empresaId, categoria: 'LOGO',
      });
      onChange(res.url);
      onOk('Logo subido. Falta Guardar para que salga en los documentos.');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      onError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo subir el logo');
    } finally {
      setSubiendo(false);
      // Se limpia para que elegir el MISMO archivo otra vez vuelva a disparar
      // el onChange (el input no cambia de valor y no emite el evento).
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-zinc-100 ring-1 ring-blue-400">
          {value
            ? <img src={value} alt={label} className="h-full w-full object-contain p-1" />
            : <span className="text-[9px] text-zinc-500">sin logo</span>}
        </div>
        <div className="flex flex-col gap-1">
          <input ref={input} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); }} />
          <button type="button" onClick={() => input.current?.click()} disabled={subiendo}
            className="rounded-lg border border-[#437EFF] px-3 py-1.5 text-[11px] font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">
            {subiendo ? 'Subiendo…' : value ? 'Cambiar' : 'Subir logo'}
          </button>
          {value && !subiendo && (
            <button type="button" onClick={() => onChange('')}
              className="text-[10px] text-red-500 hover:underline">
              Quitar
            </button>
          )}
        </div>
      </div>
      {ayuda && <p className="mt-1 text-[10px] text-gray-400">{ayuda}</p>}
    </div>
  );
}

/** Campo de color: la muestra para elegir y el hex para pegar uno de la marca. */
function CampoColor({ label, value, onChange, ayuda }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ayuda?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="h-[30px] w-10 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0 shadow-md ring-1 ring-blue-400"
          aria-label={label}
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#1565C0"
          className={`${INPUT_STD} w-28 font-mono uppercase`}
        />
      </div>
      {ayuda && <p className="mt-1 text-[10px] text-gray-400">{ayuda}</p>}
    </div>
  );
}

export default function ConfiguracionDocumentosPage() {
  const permissions = usePermissions();
  const { empresa } = useEmpresa();
  const [config, setConfig] = useState<ConfiguracionDocumentos | null>(null);
  const [plantilla, setPlantilla] = useState<PlantillaDocumento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // En paralelo: son dos recursos independientes y la pantalla los muestra
      // juntos, así que encadenarlos solo suma espera.
      const [c, p] = await Promise.all([
        cfgService.getConfiguracion(),
        cfgService.getPlantilla('COTIZACION'),
      ]);
      setConfig(c);
      setPlantilla(p);
    } catch {
      setError('No se pudo cargar la configuración de documentos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!config || !plantilla) return;
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const m = margenesDePlantilla(plantilla);
      // Los dos PUT van juntos: para quien configura esto es UNA pantalla, y
      // guardar la marca sí y la plantilla no dejaría el PDF a mitad de camino.
      const [c, p] = await Promise.all([
        cfgService.updateConfiguracion({
          logoUrl: config.logoUrl?.trim() || undefined,
          nombreComercial: config.nombreComercial?.trim() || undefined,
          colorPrimario: config.colorPrimario,
          colorSecundario: config.colorSecundario,
          colorTexto: config.colorTexto,
          textoPiePagina: config.textoPiePagina,
          textoPieVenta: config.textoPieVenta?.trim() || undefined,
          textoPieServicio: config.textoPieServicio?.trim() || undefined,
          mostrarPaginacion: config.mostrarPaginacion,
        }),
        cfgService.updatePlantilla('COTIZACION', {
          margenSuperior: m.top,
          margenInferior: m.bottom,
          margenIzquierdo: m.left,
          margenDerecho: m.right,
          mostrarLogo: plantilla.mostrarLogo,
          mostrarDatosEmpresa: plantilla.mostrarDatosEmpresa,
          mostrarDatosCliente: plantilla.mostrarDatosCliente,
          mostrarDetalles: plantilla.mostrarDetalles,
          mostrarTotales: plantilla.mostrarTotales,
          mostrarObservaciones: plantilla.mostrarObservaciones,
          mostrarCondiciones: plantilla.mostrarCondiciones,
          mostrarFirma: plantilla.mostrarFirma,
          mostrarCodigoQR: plantilla.mostrarCodigoQR,
          mostrarPiePagina: plantilla.mostrarPiePagina,
          condicionesPorDefecto: plantilla.condicionesPorDefecto?.trim() || null,
          logoUrl: plantilla.logoUrl?.trim() || null,
          posicionLogo: plantilla.posicionLogo ?? 'IZQUIERDA',
          colorEncabezado: plantilla.colorEncabezado?.trim() || undefined,
          colorCuerpo: plantilla.colorCuerpo?.trim() || undefined,
        }),
      ]);
      setConfig(c);
      setPlantilla(p);
      setOk('Configuración guardada. Los próximos PDF salen con estos ajustes.');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (!permissions.canManageSettings) {
    return <p className="text-sm text-gray-500">No tenés permiso para configurar los documentos.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (!config || !plantilla) {
    return <p className="text-sm text-red-600">{error ?? 'No se pudo cargar la configuración'}</p>;
  }

  const m = margenesDePlantilla(plantilla);
  const setMargen = (k: 'margenSuperior' | 'margenInferior' | 'margenIzquierdo' | 'margenDerecho', v: string) =>
    setPlantilla({ ...plantilla, [k]: v === '' ? 0 : Number(v) });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración de documentos</h1>
          <p className="text-sm text-gray-500">
            La marca vale para todos los documentos; la plantilla, solo para las cotizaciones.
          </p>
        </div>
        <button onClick={guardar} disabled={guardando}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {ok && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{ok}</p></div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
      <div className="space-y-4">

      {/* ── Marca ── */}
      <Card padding="p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Marca</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Nombre comercial</label>
            <input value={config.nombreComercial ?? ''} onChange={e => setConfig({ ...config, nombreComercial: e.target.value })}
              placeholder="El que ve el cliente" className={`${INPUT_STD} w-full`} />
          </div>

          <CampoLogo label="Logo de la marca" value={config.logoUrl}
            onChange={url => setConfig({ ...config, logoUrl: url })}
            ayuda="Se usa en los documentos que no tengan uno propio. Se achica a 800×400."
            empresaId={empresa?.id} onError={setError} onOk={setOk} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CampoColor label="Primario" value={config.colorPrimario}
            onChange={v => setConfig({ ...config, colorPrimario: v })}
            ayuda="Encabezados y títulos" />
          <CampoColor label="Secundario" value={config.colorSecundario}
            onChange={v => setConfig({ ...config, colorSecundario: v })} />
          <CampoColor label="Texto" value={config.colorTexto}
            onChange={v => setConfig({ ...config, colorTexto: v })}
            ayuda="Cuerpo del documento" />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Pie de página</label>
            <input value={config.textoPiePagina} onChange={e => setConfig({ ...config, textoPiePagina: e.target.value })}
              className={`${INPUT_STD} w-full`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Pie solo para ventas</label>
              <input value={config.textoPieVenta ?? ''} onChange={e => setConfig({ ...config, textoPieVenta: e.target.value })}
                placeholder="Vacío = usa el general" className={`${INPUT_STD} w-full`} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Pie solo para servicios</label>
              <input value={config.textoPieServicio ?? ''} onChange={e => setConfig({ ...config, textoPieServicio: e.target.value })}
                placeholder="Vacío = usa el general" className={`${INPUT_STD} w-full`} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={config.mostrarPaginacion}
              onChange={e => setConfig({ ...config, mostrarPaginacion: e.target.checked })}
              className="accent-[#004A94]" />
            Numerar las páginas
          </label>
        </div>
      </Card>

      {/* ── Plantilla de cotización ── */}
      <Card padding="p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Cotización</p>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <CampoLogo label="Logo de la cotización" value={plantilla.logoUrl}
            onChange={url => setPlantilla({ ...plantilla, logoUrl: url })}
            ayuda="Vacío = usa el de la marca. Para la cabecera A4 conviene uno apaisado, no el cuadrado del ticket."
            empresaId={empresa?.id} onError={setError} onOk={setOk} />
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Posición del logo</label>
            <div className="flex gap-1.5">
              {POSICIONES_LOGO.map(pos => (
                <button key={pos.value} type="button"
                  onClick={() => setPlantilla({ ...plantilla, posicionLogo: pos.value })}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    (plantilla.posicionLogo ?? 'IZQUIERDA') === pos.value
                      ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {pos.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              A la izquierda va al lado del nombre de la empresa; centrado o a la derecha, el bloque de datos baja.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-500">
          Formato <b className="text-gray-700">{FORMATOS_PAPEL.find(f => f.value === plantilla.formatoPapel)?.label ?? plantilla.formatoPapel}</b>
          {plantilla.formatoPapel !== 'A4' && (
            <span className="text-amber-600"> — el PDF de la web se genera siempre en A4</span>
          )}
        </p>

        <p className="mt-4 mb-1 text-[11px] font-medium text-gray-600">Márgenes (mm)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['margenSuperior', 'Superior', m.top],
            ['margenInferior', 'Inferior', m.bottom],
            ['margenIzquierdo', 'Izquierdo', m.left],
            ['margenDerecho', 'Derecho', m.right],
          ] as const).map(([k, label, val]) => (
            <div key={k}>
              <label className="mb-1 block text-[10px] text-gray-500">{label}</label>
              <input type="number" min={0} max={50} step={1} value={val}
                onChange={e => setMargen(k, e.target.value)}
                className={`${INPUT_STD} w-full text-right`} />
            </div>
          ))}
        </div>

        <p className="mt-4 mb-1 text-[11px] font-medium text-gray-600">Qué se muestra</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SECCIONES_PLANTILLA.map(s => (
            <label key={s.key} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
              <input type="checkbox" checked={Boolean(plantilla[s.key])}
                onChange={e => setPlantilla({ ...plantilla, [s.key]: e.target.checked })}
                className="mt-0.5 accent-[#004A94]" />
              <span>
                {s.label}
                {s.ayuda && <span className="block text-[10px] text-amber-600">{s.ayuda}</span>}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">
            Condiciones por defecto
          </label>
          <textarea
            value={plantilla.condicionesPorDefecto ?? ''}
            onChange={e => setPlantilla({ ...plantilla, condicionesPorDefecto: e.target.value })}
            rows={6}
            placeholder={'* Todos los precios incluyen IGV (18%)\n* Nuestros precios están sujetos a stock y tipo de cambio del día\n* Los montos mostrados están expresados en SOLES (S/.)'}
            className="w-full resize-y rounded-[6px] bg-zinc-100 px-3 py-2 font-sans text-xs text-[#004A94] shadow-md outline-none ring-1 ring-blue-400 transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 focus:shadow-lg focus:shadow-blue-200"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Con esto arranca cada cotización nueva; después se puede editar en cada una.
            Cambiarlo acá no toca las ya emitidas.
          </p>
        </div>

        <p className="mt-4 mb-1 text-[11px] font-medium text-gray-600">Colores propios de la cotización</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoColor label="Encabezado" value={plantilla.colorEncabezado ?? ''}
            onChange={v => setPlantilla({ ...plantilla, colorEncabezado: v })}
            ayuda={`Vacío = usa el primario (${config.colorPrimario})`} />
          <CampoColor label="Cuerpo" value={plantilla.colorCuerpo ?? ''}
            onChange={v => setPlantilla({ ...plantilla, colorCuerpo: v })}
            ayuda={`Vacío = usa el color de texto (${config.colorTexto})`} />
        </div>
      </Card>

      </div>

      {/* El preview NO lleva overflow: un contenedor con scroll le recorta el
          ring a la Card (el ring se dibuja por fuera del borde). */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <Card padding="p-4">
          <VistaPrevia config={config} plantilla={plantilla} empresa={empresa ?? null} />
        </Card>
      </div>
      </div>
    </div>
  );
}
