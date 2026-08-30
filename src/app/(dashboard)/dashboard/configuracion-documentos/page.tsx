'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import Card from '@/components/ui/Card';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import * as cfgService from '@/features/configuracion-documentos/services/configuracion-documentos-service';
import {
  FORMATOS_PAPEL,
  SECCIONES_PLANTILLA,
  margenesDePlantilla,
  type ConfiguracionDocumentos,
  type PlantillaDocumento,
} from '@/core/types/configuracion-documentos';

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus).
const INPUT_STD =
  'bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';

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
    <div className="mx-auto max-w-4xl space-y-4">
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

      {/* ── Marca ── */}
      <Card padding="p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Marca</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Nombre comercial</label>
            <input value={config.nombreComercial ?? ''} onChange={e => setConfig({ ...config, nombreComercial: e.target.value })}
              placeholder="El que ve el cliente" className={`${INPUT_STD} w-full`} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">URL del logo</label>
            <input value={config.logoUrl ?? ''} onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
              placeholder="Vacío = se usa el logo de la empresa" className={`${INPUT_STD} w-full`} />
          </div>
        </div>

        {config.logoUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img src={config.logoUrl} alt="Logo" className="h-12 w-auto rounded border border-gray-200 bg-white object-contain p-1" />
            <span className="text-[10px] text-gray-400">Así entra en el PDF</span>
          </div>
        )}

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
  );
}
