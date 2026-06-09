'use client';

// Renderiza los campos dinámicos (plantilla del servicio) al crear/editar una orden.
// Soporta todos los TipoCampoServicio del backend y guarda el valor con la MISMA
// forma que Flutter: array<string> para múltiples, string para patrón,
// JSON-string para inspección, Map para OBJETO. Ver dynamic_form_renderer.dart.

import { useState } from 'react';
import type React from 'react';
import type { CampoServicio, TipoCampoServicio } from '@/core/types/servicio-catalogo';
import { opcionesAStrings } from '@/core/types/servicio-catalogo';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';
const helpClass = 'mt-0.5 text-[10px] text-gray-400';

const OTRO = '__OTRO__';
const TIPOS_DANO = ['RAYON', 'ABOLLADURA', 'ROTURA', 'FALTANTE', 'MANCHA', 'OTRO'];

// ───────────────────────── helpers exportados ─────────────────────────

/** Valor inicial de los campos a partir de defaultValue (respeta el tipo). */
export function seedDefaults(campos: CampoServicio[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of campos) {
    const dv = c.defaultValue;
    if (dv == null || dv === '') continue;
    if (c.tipoCampo === 'NUMERO') {
      const n = Number(dv);
      if (!Number.isNaN(n)) out[c.nombre] = n;
    } else if (c.tipoCampo === 'CHECKBOX') {
      out[c.nombre] = dv === 'true' || dv === '1';
    } else if (c.tipoCampo === 'OPCION_MULTIPLE' || c.tipoCampo === 'CHECKBOX_MULTIPLE') {
      out[c.nombre] = dv.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      out[c.nombre] = dv;
    }
  }
  return out;
}

function esVacio(v: unknown): boolean {
  if (v == null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/** Valida campos requeridos del lado cliente (el backend también valida). */
export function validarCamposRequeridos(campos: CampoServicio[], datos: Record<string, unknown>): string | null {
  for (const c of campos) {
    if (c.esRequerido && esVacio(datos[c.nombre])) return `El campo "${c.nombre}" es requerido`;
  }
  return null;
}

/** Quita strings vacíos, null, arrays y objetos vacíos antes de enviar. */
export function limpiarDatos(datos: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => !esVacio(v)));
}

// ───────────────────────── agrupación por categoría ─────────────────────────

function catLabel(cat: string): string {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function agrupar(campos: CampoServicio[]): [string, CampoServicio[]][] {
  const ordenados = [...campos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const map = new Map<string, CampoServicio[]>();
  for (const c of ordenados) {
    const cat = (c.categoria && String(c.categoria).trim()) || 'Datos del servicio';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(c);
  }
  return [...map.entries()];
}

// ───────────────────────── componente principal ─────────────────────────

export function DynamicFieldsForm({ campos, values, onChange }: {
  campos: CampoServicio[];
  values: Record<string, unknown>;
  onChange: (nombre: string, valor: unknown) => void;
}) {
  if (campos.length === 0) return null;
  const grupos = agrupar(campos);
  return (
    <div className="space-y-4">
      {grupos.map(([cat, items]) => (
        <div key={cat} className="space-y-3">
          <p className="text-[11px] font-semibold uppercase text-gray-400">{catLabel(cat)}</p>
          {items.map((campo) => (
            <CampoInput key={campo.id} campo={campo} value={values[campo.nombre]}
              onChange={(v) => onChange(campo.nombre, v)} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── un campo ─────────────────────────

function CampoInput({ campo, value, onChange }: {
  campo: CampoServicio;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const req = campo.esRequerido ? ' *' : '';
  const ph = campo.placeholder ?? '';
  const help = campo.descripcion ? <p className={helpClass}>{campo.descripcion}</p> : null;
  const label = <label className={labelClass}>{campo.nombre}{req}</label>;
  const wrap = (inner: React.ReactNode) => <div>{label}{inner}{help}</div>;

  switch (campo.tipoCampo) {
    case 'TEXTO_AREA':
      return wrap(<textarea className={`${inputClass} resize-none`} rows={2}
        value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={ph} />);

    case 'OPCION_SIMPLES':
      return wrap(<OpcionSimple campo={campo} value={value} onChange={onChange} />);

    case 'OPCION_MULTIPLE':
    case 'CHECKBOX_MULTIPLE':
      return wrap(<MultiSelect campo={campo} value={value} onChange={onChange} />);

    case 'CHECKBOX':
      return (
        <div>
          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">{campo.nombre}{req}</span>
            <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={!!value}
              onChange={(e) => onChange(e.target.checked)} />
          </label>
          {help}
        </div>
      );

    case 'ARCHIVO': {
      // Paridad con Flutter: switch booleano que habilita adjuntar archivos desde el detalle.
      const on = value === true;
      return (
        <div>
          <label className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="text-xs font-medium text-gray-600">{campo.nombre}{req}</span>
              <span className="block text-[10px] text-gray-400">{on ? 'Se habilitará la sección de imágenes en el detalle' : 'Habilitar para adjuntar archivos desde el detalle'}</span>
            </span>
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-green-600" checked={on} onChange={(e) => onChange(e.target.checked)} />
          </label>
          {help}
        </div>
      );
    }

    case 'PATRON_DESBLOQUEO':
      return wrap(<PatronPicker value={value} onChange={onChange} />);

    case 'INSPECCION_VISUAL':
      return wrap(<InspeccionEditor campo={campo} value={value} onChange={onChange} />);

    case 'OBJETO':
      return <ObjetoInput campo={campo} value={value} onChange={onChange} label={label} help={help} />;

    default: {
      const t = inputTypeOf(campo.tipoCampo);
      return wrap(<input className={inputClass} type={t} value={String(value ?? '')}
        onChange={(e) => onChange(t === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        placeholder={ph} />);
    }
  }
}

function inputTypeOf(tipo: TipoCampoServicio): string {
  switch (tipo) {
    case 'NUMERO': return 'number';
    case 'FECHA': return 'date';
    case 'HORA': return 'time';
    case 'EMAIL': return 'email';
    case 'URL': return 'url';
    case 'TELEFONO': return 'tel';
    default: return 'text';
  }
}

// ───────────────────────── opción simple (con "Otro") ─────────────────────────

function OpcionSimple({ campo, value, onChange }: { campo: CampoServicio; value: unknown; onChange: (v: unknown) => void }) {
  const ops = opcionesAStrings(campo.opciones);
  const valStr = value == null ? '' : String(value);
  const permiteOtro = !!campo.permiteOtro;
  // "Otro" está activo si hay un valor que no está en las opciones.
  const [otroForzado, setOtroForzado] = useState(false);
  const otroActivo = permiteOtro && (otroForzado || (valStr !== '' && !ops.includes(valStr)));
  const seleccion = otroActivo ? OTRO : valStr;

  return (
    <>
      <select className={selectClass} value={seleccion}
        onChange={(e) => {
          if (e.target.value === OTRO) { setOtroForzado(true); onChange(''); }
          else { setOtroForzado(false); onChange(e.target.value); }
        }}>
        <option value="">Seleccionar...</option>
        {ops.map((o) => <option key={o} value={o}>{o}</option>)}
        {permiteOtro && <option value={OTRO}>Otro…</option>}
      </select>
      {otroActivo && (
        <input className={`${inputClass} mt-1.5`} value={valStr}
          onChange={(e) => onChange(e.target.value)} placeholder="Especificar..." autoFocus />
      )}
    </>
  );
}

// ───────────────────────── selección múltiple ─────────────────────────

function MultiSelect({ campo, value, onChange }: { campo: CampoServicio; value: unknown; onChange: (v: unknown) => void }) {
  const ops = opcionesAStrings(campo.opciones);
  const arr = Array.isArray(value) ? (value as unknown[]).map(String) : [];
  const conocidas = new Set(ops);
  const otroVal = arr.find((v) => !conocidas.has(v)) ?? '';
  const permiteOtro = !!campo.permiteOtro;

  const toggle = (op: string) => {
    const next = arr.includes(op) ? arr.filter((v) => v !== op) : [...arr, op];
    onChange(next);
  };
  const setOtro = (txt: string) => {
    const base = arr.filter((v) => conocidas.has(v));
    onChange(txt.trim() ? [...base, txt] : base);
  };

  return (
    <div className="space-y-1 rounded-lg border border-gray-200 p-2">
      {ops.length === 0 && !permiteOtro && <p className="text-[11px] text-gray-400">Sin opciones configuradas</p>}
      {ops.map((op) => (
        <label key={op} className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" className="h-4 w-4 accent-[#437EFF]" checked={arr.includes(op)} onChange={() => toggle(op)} />
          {op}
        </label>
      ))}
      {permiteOtro && (
        <input className={`${inputClass} mt-1`} value={otroVal}
          onChange={(e) => setOtro(e.target.value)} placeholder="Otro (especificar)..." />
      )}
    </div>
  );
}

// ───────────────────────── patrón de desbloqueo (grid 3x3) ─────────────────────────

function PatronPicker({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const str = typeof value === 'string' ? value : '';
  const nodos = str ? str.split('-').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)) : [];

  const toggle = (i: number) => {
    // Click en orden: agrega si no está; si es el último, lo quita (deshacer).
    if (nodos.includes(i)) {
      if (nodos[nodos.length - 1] === i) onChange(nodos.slice(0, -1).join('-'));
      return;
    }
    onChange([...nodos, i].join('-'));
  };

  return (
    <div>
      <div className="inline-grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-3">
        {Array.from({ length: 9 }, (_, i) => {
          const pos = nodos.indexOf(i);
          const activo = pos >= 0;
          return (
            <button key={i} type="button" onClick={() => toggle(i)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                activo ? 'border-[#437EFF] bg-[#437EFF] text-white' : 'border-gray-300 text-transparent hover:border-[#437EFF]'}`}>
              {activo ? pos + 1 : '·'}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[10px] text-gray-400">{nodos.length ? `Secuencia: ${nodos.map((n) => n + 1).join(' → ')}` : 'Toca los puntos en orden'}</span>
        {nodos.length > 0 && <button type="button" onClick={() => onChange('')} className="text-[10px] text-red-500 hover:underline">Limpiar</button>}
      </div>
    </div>
  );
}

// ───────────────────────── inspección visual ─────────────────────────

interface PuntoInspeccion { x: number; y: number; tipo: string }

function InspeccionEditor({ campo, value, onChange }: { campo: CampoServicio; value: unknown; onChange: (v: unknown) => void }) {
  const silueta = typeof campo.silueta === 'string' ? campo.silueta : 'GENERICO';
  let puntos: PuntoInspeccion[] = [];
  if (typeof value === 'string' && value) {
    try { puntos = (JSON.parse(value)?.puntos ?? []) as PuntoInspeccion[]; } catch { /* inválido */ }
  }
  const [tipoActual, setTipoActual] = useState(TIPOS_DANO[0]);

  const persistir = (next: PuntoInspeccion[]) => onChange(next.length ? JSON.stringify({ silueta, puntos: next }) : '');

  const agregar = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = +((e.clientX - r.left) / r.width).toFixed(3);
    const y = +((e.clientY - r.top) / r.height).toFixed(3);
    persistir([...puntos, { x, y, tipo: tipoActual }]);
  };

  return (
    <div className="space-y-2">
      <select className={selectClass} value={tipoActual} onChange={(e) => setTipoActual(e.target.value)}>
        {TIPOS_DANO.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div onClick={agregar}
        className="relative h-44 w-full cursor-crosshair overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-gray-300">Toca para marcar daños</span>
        {puntos.map((p, i) => (
          <span key={i} title={p.tipo}
            className="absolute -ml-2 -mt-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{i + 1}</span>
        ))}
      </div>
      {puntos.length > 0 && (
        <div className="space-y-1">
          {puntos.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
              <span>{i + 1}. {p.tipo}</span>
              <button type="button" onClick={() => persistir(puntos.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── objeto (subcampos anidados) ─────────────────────────

// Subcampos del OBJETO: mapas JSON planos { nombre, tipo, opciones } — OJO: usan
// `tipo` (no `tipoCampo`). Tipos soportados (paridad Flutter): CHECKBOX, OPCION_SIMPLES
// (dropdown), TEXTO/NUMERO. Valor guardado: Map keyed por nombre del subcampo.
interface SubCampo { nombre: string; tipo?: string; opciones?: unknown }

function ObjetoInput({ campo, value, onChange, label, help }: {
  campo: CampoServicio; value: unknown; onChange: (v: unknown) => void;
  label: React.ReactNode; help: React.ReactNode;
}) {
  const subs: SubCampo[] = Array.isArray(campo.opciones)
    ? (campo.opciones as unknown[]).filter((s): s is SubCampo => !!s && typeof s === 'object' && 'nombre' in (s as object))
    : [];
  const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  if (subs.length === 0) return <div>{label}<p className={helpClass}>Sin subcampos configurados</p></div>;
  return (
    <div>
      {label}{help}
      <div className="mt-1 space-y-3 rounded-lg border border-gray-200 p-3">
        {subs.map((sc, i) => (
          <SubCampoInput key={sc.nombre || i} sub={sc} value={obj[sc.nombre]}
            onChange={(v) => onChange({ ...obj, [sc.nombre]: v })} />
        ))}
      </div>
    </div>
  );
}

function SubCampoInput({ sub, value, onChange }: { sub: SubCampo; value: unknown; onChange: (v: unknown) => void }) {
  const tipo = (sub.tipo ?? 'TEXTO').toUpperCase();

  if (tipo === 'CHECKBOX') {
    return (
      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{sub.nombre}</span>
        <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }

  if (tipo === 'OPCION_SIMPLES' || tipo === 'OPCION_MULTIPLE') {
    const ops = opcionesAStrings(sub.opciones);
    return (
      <div>
        <label className={labelClass}>{sub.nombre}</label>
        <select className={selectClass} value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccionar...</option>
          {ops.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  const t = tipo === 'NUMERO' ? 'number' : 'text';
  return (
    <div>
      <label className={labelClass}>{sub.nombre}</label>
      <input className={inputClass} type={t} value={value == null ? '' : String(value)}
        onChange={(e) => onChange(t === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
    </div>
  );
}
