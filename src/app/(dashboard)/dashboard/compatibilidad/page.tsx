'use client';

// Reglas de compatibilidad entre productos (paridad reglas_compatibilidad_page de Flutter).
// Administra las reglas que usa la validación de compatibilidad en cotizaciones.

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { ReglaCompatibilidad, CreateReglaCompatibilidadDto, TipoValidacionCompatibilidad } from '@/features/producto/services/compatibilidad-service';
import * as compatService from '@/features/producto/services/compatibilidad-service';
import { nombreCategoria, parseMapeo } from '@/features/producto/services/compatibilidad-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import * as varianteService from '@/features/producto/services/variante-service';
import type { ProductoAtributo } from '@/core/types/producto';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = `${inputClass} bg-white`;
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

const TIPO_LABEL: Record<TipoValidacionCompatibilidad, string> = {
  IGUAL: 'Debe ser igual',
  INCLUYE_EN: 'Incluido en (mapeo)',
};

export default function CompatibilidadPage() {
  const permissions = usePermissions();
  const [reglas, setReglas] = useState<ReglaCompatibilidad[]>([]);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [atributos, setAtributos] = useState<ProductoAtributo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [dialog, setDialog] = useState<{ regla: ReglaCompatibilidad | null } | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, c, a] = await Promise.all([
        compatService.getReglas(),
        catalogoService.getCategorias().catch(() => [] as CatalogoItem[]),
        varianteService.getProductoAtributos().catch(() => [] as ProductoAtributo[]),
      ]);
      setReglas(r);
      setCategorias(c);
      setAtributos(a);
    } catch {
      setError('No se pudieron cargar las reglas de compatibilidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (regla: ReglaCompatibilidad) => {
    if (!confirm(`¿Eliminar la regla "${regla.nombre}"?`)) return;
    try {
      await compatService.deleteRegla(regla.id);
      setReglas(prev => prev.filter(x => x.id !== regla.id));
      flash('Regla eliminada');
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(typeof m === 'string' ? m : 'No se pudo eliminar la regla');
    }
  };

  const nombreAtributo = (clave: string) => atributos.find(a => a.clave === clave)?.nombre ?? clave;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reglas de compatibilidad</h1>
          <p className="text-sm text-gray-500">Validan qué productos pueden combinarse (se aplican en cotizaciones)</p>
        </div>
        {permissions.canManageProducts && (
          <button onClick={() => setDialog({ regla: null })}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">
            + Nueva regla
          </button>
        )}
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-2.5"><p className="text-xs text-green-700">{msg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : reglas.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">No hay reglas de compatibilidad. Crea una para validar combinaciones de productos.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {reglas.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.nombre}</p>
                  {r.descripcion && <p className="text-[11px] text-gray-400">{r.descripcion}</p>}
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{nombreCategoria(r.categoriaOrigen)} · {nombreAtributo(r.atributoOrigenClave)}</span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-700">{nombreCategoria(r.categoriaDestino)} · {nombreAtributo(r.atributoDestinoClave)}</span>
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{TIPO_LABEL[r.tipoValidacion]}</span>
                  </p>
                </div>
                {permissions.canManageProducts && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setDialog({ regla: r })} className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">Editar</button>
                    <button onClick={() => eliminar(r)} className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <ReglaDialog
          regla={dialog.regla}
          categorias={categorias}
          atributos={atributos}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); flash('Regla guardada'); cargar(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Dialog crear/editar ───────────────────────────

interface MapeoRow { origen: string; destinos: string }

function ReglaDialog({ regla, categorias, atributos, onClose, onSaved }: {
  regla: ReglaCompatibilidad | null;
  categorias: CatalogoItem[];
  atributos: ProductoAtributo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(regla?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(regla?.descripcion ?? '');
  const [categoriaOrigenId, setCategoriaOrigenId] = useState(regla?.categoriaOrigenId ?? '');
  const [atributoOrigenClave, setAtributoOrigenClave] = useState(regla?.atributoOrigenClave ?? '');
  const [categoriaDestinoId, setCategoriaDestinoId] = useState(regla?.categoriaDestinoId ?? '');
  const [atributoDestinoClave, setAtributoDestinoClave] = useState(regla?.atributoDestinoClave ?? '');
  const [tipoValidacion, setTipoValidacion] = useState<TipoValidacionCompatibilidad>(regla?.tipoValidacion ?? 'IGUAL');
  const [mapeo, setMapeo] = useState<MapeoRow[]>(() => {
    const obj = parseMapeo(regla?.mapeoValores);
    const rows = Object.entries(obj).map(([origen, destinos]) => ({ origen, destinos: (destinos ?? []).join(', ') }));
    return rows.length ? rows : [{ origen: '', destinos: '' }];
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const atribOrigen = atributos.find(a => a.clave === atributoOrigenClave);

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!categoriaOrigenId || !atributoOrigenClave || !categoriaDestinoId || !atributoDestinoClave) {
      setError('Completa categorías y atributos de origen y destino'); return;
    }
    let mapeoValores: Record<string, string[]> | undefined;
    if (tipoValidacion === 'INCLUYE_EN') {
      mapeoValores = {};
      for (const row of mapeo) {
        const k = row.origen.trim();
        if (!k) continue;
        mapeoValores[k] = row.destinos.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (Object.keys(mapeoValores).length === 0) {
        setError('El mapeo de valores es requerido para "Incluido en"'); return;
      }
    }
    const dto: CreateReglaCompatibilidadDto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      categoriaOrigenId, atributoOrigenClave,
      categoriaDestinoId, atributoDestinoClave,
      tipoValidacion,
      ...(mapeoValores ? { mapeoValores } : {}),
    };
    setSubmitting(true);
    try {
      if (regla) await compatService.updateRegla(regla.id, dto);
      else await compatService.createRegla(dto);
      onSaved();
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : (typeof m === 'string' ? m : 'No se pudo guardar la regla'));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{regla ? 'Editar regla' : 'Nueva regla de compatibilidad'}</h3>

        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Socket CPU ↔ Placa madre" />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoría origen *</label>
              <select className={selectClass} value={categoriaOrigenId} onChange={e => setCategoriaOrigenId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Atributo origen *</label>
              <select className={selectClass} value={atributoOrigenClave} onChange={e => setAtributoOrigenClave(e.target.value)}>
                <option value="">Seleccionar...</option>
                {atributos.map(a => <option key={a.id} value={a.clave}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Categoría destino *</label>
              <select className={selectClass} value={categoriaDestinoId} onChange={e => setCategoriaDestinoId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Atributo destino *</label>
              <select className={selectClass} value={atributoDestinoClave} onChange={e => setAtributoDestinoClave(e.target.value)}>
                <option value="">Seleccionar...</option>
                {atributos.map(a => <option key={a.id} value={a.clave}>{a.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tipo de validación</label>
            <select className={selectClass} value={tipoValidacion} onChange={e => setTipoValidacion(e.target.value as TipoValidacionCompatibilidad)}>
              <option value="IGUAL">Debe ser igual (el valor de origen = valor de destino)</option>
              <option value="INCLUYE_EN">Incluido en (cada valor de origen permite ciertos valores de destino)</option>
            </select>
          </div>

          {tipoValidacion === 'INCLUYE_EN' && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase text-gray-400">Mapeo de valores</p>
              <div className="space-y-2">
                {mapeo.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {atribOrigen?.valores?.length ? (
                      <select className={`${selectClass} w-32`} value={row.origen}
                        onChange={e => setMapeo(prev => prev.map((r, j) => j === i ? { ...r, origen: e.target.value } : r))}>
                        <option value="">Origen...</option>
                        {atribOrigen.valores.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input className={`${inputClass} w-32`} value={row.origen} placeholder="Valor origen"
                        onChange={e => setMapeo(prev => prev.map((r, j) => j === i ? { ...r, origen: e.target.value } : r))} />
                    )}
                    <span className="text-gray-400">→</span>
                    <input className={`${inputClass} flex-1`} value={row.destinos} placeholder="Valores destino (separados por coma)"
                      onChange={e => setMapeo(prev => prev.map((r, j) => j === i ? { ...r, destinos: e.target.value } : r))} />
                    <button type="button" onClick={() => setMapeo(prev => prev.filter((_, j) => j !== i))}
                      className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setMapeo(prev => [...prev, { origen: '', destinos: '' }])}
                className="mt-2 text-[11px] font-semibold text-[#437EFF] hover:underline">+ Agregar valor</button>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={submitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {submitting ? 'Guardando...' : regla ? 'Guardar' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>
  );
}
