'use client';

// Lectura de datosPersonalizados en el detalle de la orden. Usa las definiciones
// de campos (cuando están disponibles) para etiquetas, orden y tipo; si no, infiere
// por la forma del valor.

import type { CampoServicio, TipoCampoServicio } from '@/core/types/servicio-catalogo';
import { CARD_BASE } from '@/components/ui/Card';

interface Entrada {
  nombre: string;
  valor: unknown;
  tipo?: TipoCampoServicio;
  /** Orden declarado de columnas cuando el campo es TABLA. */
  columnas?: string[];
}

/** Una TABLA es una lista NO vacía de objetos: una fila por objeto. */
function esTabla(v: unknown): v is Record<string, unknown>[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((e) => e != null && typeof e === 'object' && !Array.isArray(e))
  );
}

export function DatosPersonalizadosView({ datos, campos }: {
  datos: Record<string, unknown>;
  campos?: CampoServicio[];
}) {
  const entradas = ordenarEntradas(datos, campos);
  if (entradas.length === 0) return null;

  return (
    <div className={`${CARD_BASE} p-4`}>
      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Datos del servicio</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {entradas.map((e) => (
          <div
            key={e.nombre}
            className={
              e.tipo === 'INSPECCION_VISUAL' ||
              e.tipo === 'TEXTO_AREA' ||
              esTabla(e.valor)
                ? 'col-span-2'
                : ''
            }
          >
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
  const columnasPorNombre = new Map<string, string[]>();
  (campos ?? []).forEach((c, i) => {
    tipoPorNombre.set(c.nombre, { tipo: c.tipoCampo, orden: c.orden ?? i });
    // Las columnas de una TABLA viven en `opciones`, igual que los
    // sub-campos de OBJETO: [{ nombre, tipo, ... }].
    if (c.tipoCampo === 'TABLA' && Array.isArray(c.opciones)) {
      columnasPorNombre.set(
        c.nombre,
        (c.opciones as unknown[])
          .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
          .map((o) => String(o.nombre ?? ''))
          .filter(Boolean),
      );
    }
  });

  return Object.entries(datos)
    .filter(([, v]) => v != null && v !== '')
    .map(([nombre, valor]) => ({
      nombre,
      valor,
      tipo: tipoPorNombre.get(nombre)?.tipo,
      columnas: columnasPorNombre.get(nombre),
    }))
    .sort((a, b) => (tipoPorNombre.get(a.nombre)?.orden ?? 999) - (tipoPorNombre.get(b.nombre)?.orden ?? 999));
}

/**
 * Tabla de solo lectura con fila de totales.
 *
 * El ORDEN de las columnas sale de la definición del campo: `datosPersonalizados`
 * es jsonb y Postgres reordena las claves de un objeto, así que deducirlo del
 * dato daría un orden arbitrario. Las claves presentes en los datos que ya no
 * estén declaradas se agregan al final para no ocultar información.
 */
function TablaValor({ filas, columnas }: { filas: Record<string, unknown>[]; columnas?: string[] }) {
  // Si la plantilla define columnas, MANDAN ELLAS: quitar una columna no
  // borra sus valores del JSON, así que agregar las claves sueltas del dato
  // mostraría columnas ya eliminadas. El respaldo por claves solo aplica
  // cuando no hay definición (orden vieja, plantilla borrada).
  const cols = [...(columnas ?? [])];
  if (cols.length === 0) {
    for (const f of filas) {
      for (const k of Object.keys(f)) if (!cols.includes(k)) cols.push(k);
    }
  }
  if (cols.length === 0) return null;

  const totales = new Map<string, number>();
  for (const c of cols) {
    const vals = filas
      .map((f) => f[c])
      .filter((v) => v != null && String(v).trim() !== '');
    if (vals.length === 0) continue;
    const nums = vals.map((v) => Number(v));
    if (nums.every((n) => !Number.isNaN(n))) {
      totales.set(c, nums.reduce((a, n) => a + n, 0));
    }
  }

  const texto = (v: unknown) => (typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v == null ? '' : String(v));

  return (
    <div className="mt-1 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-max border-collapse text-[11px]">
        <thead>
          <tr className="bg-gray-50">
            {cols.map((c) => (
              <th
                key={c}
                className={`border-b border-gray-200 px-2 py-1.5 font-semibold text-[#004A94] ${
                  totales.has(c) ? 'text-right' : 'text-left'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {cols.map((c) => (
                <td key={c} className={`px-2 py-1.5 ${totales.has(c) ? 'text-right tabular-nums' : ''}`}>
                  {texto(f[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totales.size > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-semibold text-[#004A94]">
              {cols.map((c, i) => (
                <td key={c} className={`px-2 py-1.5 ${totales.has(c) ? 'text-right tabular-nums' : ''}`}>
                  {totales.has(c) ? totales.get(c)!.toFixed(2) : i === 0 ? 'Total' : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Valor({ entrada }: { entrada: Entrada }) {
  const { valor, tipo, columnas } = entrada;

  // Booleano
  if (typeof valor === 'boolean') {
    return <p className={`text-xs font-medium ${valor ? 'text-green-600' : 'text-gray-400'}`}>{valor ? 'Sí' : 'No'}</p>;
  }

  // TABLA → va ANTES de los chips: si no, cada fila se renderiza con
  // String(objeto) y sale "[object Object]".
  if (esTabla(valor)) {
    return <TablaValor filas={valor} columnas={columnas} />;
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
