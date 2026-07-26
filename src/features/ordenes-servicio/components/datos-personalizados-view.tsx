'use client';

// Lectura de datosPersonalizados en el detalle de la orden. Usa las definiciones
// de campos (cuando están disponibles) para etiquetas, orden y tipo; si no, infiere
// por la forma del valor.

import type { CampoServicio, TipoCampoServicio } from '@/core/types/servicio-catalogo';

interface Entrada { nombre: string; valor: unknown; tipo?: TipoCampoServicio }

export function DatosPersonalizadosView({ datos, campos }: {
  datos: Record<string, unknown>;
  campos?: CampoServicio[];
}) {
  const entradas = ordenarEntradas(datos, campos);
  if (entradas.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Datos del servicio</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {entradas.map((e) => (
          <div key={e.nombre} className={e.tipo === 'INSPECCION_VISUAL' || e.tipo === 'TEXTO_AREA' ? 'col-span-2' : ''}>
            <p className="text-[10px] uppercase text-gray-400">{e.nombre}</p>
            <Valor entrada={e} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ordenarEntradas(datos: Record<string, unknown>, campos?: CampoServicio[]): Entrada[] {
  const tipoPorNombre = new Map<string, { tipo: TipoCampoServicio; orden: number }>();
  (campos ?? []).forEach((c, i) => tipoPorNombre.set(c.nombre, { tipo: c.tipoCampo, orden: c.orden ?? i }));

  return Object.entries(datos)
    .filter(([, v]) => v != null && v !== '')
    .map(([nombre, valor]) => ({ nombre, valor, tipo: tipoPorNombre.get(nombre)?.tipo }))
    .sort((a, b) => (tipoPorNombre.get(a.nombre)?.orden ?? 999) - (tipoPorNombre.get(b.nombre)?.orden ?? 999));
}

function Valor({ entrada }: { entrada: Entrada }) {
  const { valor, tipo } = entrada;

  // Booleano
  if (typeof valor === 'boolean') {
    return <p className={`text-xs font-medium ${valor ? 'text-green-600' : 'text-gray-400'}`}>{valor ? 'Sí' : 'No'}</p>;
  }

  // Array → chips
  if (Array.isArray(valor)) {
    return (
      <div className="flex flex-wrap gap-1">
        {valor.map((v, i) => (
          <span key={i} className="rounded bg-[#437EFF]/10 px-1.5 py-0.5 text-[11px] text-[#437EFF]">{String(v)}</span>
        ))}
      </div>
    );
  }

  // Patrón de desbloqueo (string "0-1-2-..." o tipo declarado)
  // CODIGO_BARRAS queda fuera del heurístico igual que TELEFONO: una serie
  // como "1-2-3" es un código válido y no un patrón de desbloqueo.
  if (
    tipo === 'PATRON_DESBLOQUEO' ||
    (typeof valor === 'string' &&
      /^\d(-\d)+$/.test(valor) &&
      tipo !== 'TELEFONO' &&
      tipo !== 'CODIGO_BARRAS')
  ) {
    return <PatronView valor={String(valor)} />;
  }

  // Inspección visual (JSON con puntos)
  if (tipo === 'INSPECCION_VISUAL' || (typeof valor === 'string' && valor.includes('"puntos"'))) {
    return <InspeccionView valor={String(valor)} />;
  }

  // Archivo / URL → enlace o imagen
  if (typeof valor === 'string' && /^https?:\/\//.test(valor)) {
    const esImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(valor);
    return esImg
      ? <img src={valor} alt={entrada.nombre} className="mt-0.5 h-16 w-16 rounded object-cover" />
      : <a href={valor} target="_blank" rel="noreferrer" className="text-xs text-[#437EFF] hover:underline">Ver archivo</a>;
  }

  // Objeto anidado (OBJETO)
  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    return (
      <div className="mt-0.5 space-y-0.5">
        {Object.entries(obj).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
          <p key={k} className="text-[11px] text-gray-600"><span className="text-gray-400">{k}:</span> {Array.isArray(v) ? v.join(', ') : String(v)}</p>
        ))}
      </div>
    );
  }

  return <p className="text-xs font-medium text-gray-700">{String(valor)}</p>;
}

function PatronView({ valor }: { valor: string }) {
  const nodos = valor.split('-').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
  return (
    <div className="mt-0.5 inline-grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }, (_, i) => {
        const pos = nodos.indexOf(i);
        const activo = pos >= 0;
        return (
          <span key={i} className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ${
            activo ? 'bg-[#437EFF] text-white' : 'bg-gray-100 text-gray-300'}`}>{activo ? pos + 1 : ''}</span>
        );
      })}
    </div>
  );
}

function InspeccionView({ valor }: { valor: string }) {
  let puntos: { tipo?: string }[] = [];
  try { puntos = JSON.parse(valor)?.puntos ?? []; } catch { /* inválido */ }
  if (puntos.length === 0) return <p className="text-xs text-gray-400">Sin daños marcados</p>;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {puntos.map((p, i) => (
        <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600">{i + 1}. {p.tipo ?? 'DAÑO'}</span>
      ))}
    </div>
  );
}
