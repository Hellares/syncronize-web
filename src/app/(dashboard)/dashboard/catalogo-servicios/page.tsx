'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type { Servicio, CreateServicioDto, PlantillaServicio } from '@/core/types/servicio-catalogo';
import type { TipoServicio } from '@/core/types/orden-servicio';
import { TIPOS_SERVICIO, TIPO_SERVICIO_LABEL } from '@/core/types/orden-servicio';
import type { CampoServicio } from '@/core/types/servicio-catalogo';
import { TIPO_CAMPO_LABEL } from '@/core/types/servicio-catalogo';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';
import * as camposService from '@/features/ordenes-servicio/services/configuracion-campos-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import { CampoFormDialog } from '@/features/ordenes-servicio/components/campo-form-dialog';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CatalogoServiciosPage() {
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageServices;

  const [items, setItems] = useState<Servicio[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');
  const [form, setForm] = useState<{ open: boolean; servicio?: Servicio | null }>({ open: false });
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (q?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await catalogoService.getServicios({ search: (q ?? search) || undefined }));
    } catch {
      setError('Error al cargar los servicios');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(''); }, [fetchData]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => fetchData(q), 400);
  };

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const eliminar = async (s: Servicio) => {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"?`)) return;
    try { await catalogoService.deleteServicio(s.id); flash('Servicio eliminado'); fetchData(); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo eliminar el servicio');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de Servicios</h1>
          <p className="text-sm text-gray-500">Servicios reutilizables para las órdenes</p>
        </div>
        {puedeGestionar && (
          <button onClick={() => setForm({ open: true })}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nuevo servicio
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      <input className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
        value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar servicio..." />

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center"><p className="text-4xl mb-2">🧰</p><p className="text-gray-400">Sin servicios en el catálogo</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                <th className="px-4 py-2.5">Servicio</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Tipo</th>
                <th className="px-4 py-2.5 hidden lg:table-cell">Plantilla</th>
                <th className="px-4 py-2.5 text-right">Precio</th>
                {puedeGestionar && <th className="px-4 py-2.5 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(s => (
                <tr key={s.id} className="hover:bg-[#437EFF]/5">
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-900">{s.nombre}</p>
                    {s.descripcion && <p className="text-[10px] text-gray-400 truncate max-w-[260px]">{s.descripcion}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{s.tipoServicio ? TIPO_SERVICIO_LABEL[s.tipoServicio] : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{s.plantillaServicio?.nombre ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">{fmt(s.precio)}</td>
                  {puedeGestionar && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setForm({ open: true, servicio: s })} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Editar</button>
                      <button onClick={() => eliminar(s)} className="ml-1 rounded border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50">Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form.open && (
        <ServicioFormDialog servicio={form.servicio}
          onClose={() => setForm({ open: false })}
          onSuccess={(msg) => { setForm({ open: false }); flash(msg); fetchData(); }} />
      )}
    </div>
  );
}

function ServicioFormDialog({ servicio, onClose, onSuccess }: { servicio?: Servicio | null; onClose: () => void; onSuccess: (msg: string) => void }) {
  const esEdicion = !!servicio;
  const [nombre, setNombre] = useState(servicio?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '');
  const [precio, setPrecio] = useState(servicio?.precio != null ? String(servicio.precio) : '');
  const [tipoServicio, setTipoServicio] = useState<TipoServicio | ''>(servicio?.tipoServicio ?? '');
  const [duracionMinutos, setDuracionMinutos] = useState(servicio?.duracionMinutos != null ? String(servicio.duracionMinutos) : '');
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(servicio?.impuestoPorcentaje != null ? String(servicio.impuestoPorcentaje) : '');
  const [plantillaServicioId, setPlantillaServicioId] = useState(servicio?.plantillaServicioId ?? '');
  const [plantillas, setPlantillas] = useState<PlantillaServicio[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Los campos viven en la PLANTILLA, no en el servicio: se recargan las
  // plantillas (que ya traen sus campos) despues de cada cambio.
  // La carga inicial queda con `.then` y no con un `await` dentro del efecto:
  // el lint de React marca el segundo como setState sincrónico en un efecto.
  useEffect(() => { catalogoService.getPlantillas().then(setPlantillas).catch(() => {}); }, []);
  const cargarPlantillas = async () => {
    try { setPlantillas(await catalogoService.getPlantillas()); } catch { /* el error de la accion ya se muestra */ }
  };

  const [campoDialog, setCampoDialog] = useState<{ open: boolean; campo?: CampoServicio | null }>({ open: false });
  const plantillaSel = plantillas.find(p => p.id === plantillaServicioId) ?? null;
  const campos = [...(plantillaSel?.campos ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const quitarCampo = async (c: CampoServicio) => {
    if (!confirm(`¿Quitar el campo "${c.nombre}" de la plantilla?`)) return;
    try { await camposService.eliminarCampo(c.id); await cargarPlantillas(); }
    catch { setError('No se pudo quitar el campo'); }
  };

  // Reordenar con flechas y no arrastrando: el app usa drag porque es
  // tactil; acá dentro de un diálogo con scroll el arrastre pelea con el
  // scroll del panel.
  const moverCampo = async (i: number, delta: number) => {
    const destino = i + delta;
    if (destino < 0 || destino >= campos.length) return;
    const ids = campos.map(c => c.id);
    [ids[i], ids[destino]] = [ids[destino], ids[i]];
    try { await camposService.reordenarCampos(ids); await cargarPlantillas(); }
    catch { setError('No se pudo guardar el nuevo orden'); }
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';
  const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setIsSubmitting(true);
    try {
      const dto: CreateServicioDto = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precio ? parseFloat(precio) : undefined,
        tipoServicio: tipoServicio || undefined,
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos, 10) : undefined,
        impuestoPorcentaje: impuestoPorcentaje ? parseFloat(impuestoPorcentaje) : undefined,
        // Al editar, '' debe DESVINCULAR la plantilla (null explícito); undefined = sin cambio
        plantillaServicioId: plantillaServicioId || (esEdicion ? null : undefined),
      };
      if (esEdicion && servicio) { await catalogoService.updateServicio(servicio.id, dto); onSuccess('Servicio actualizado'); }
      else { await catalogoService.createServicio(dto); onSuccess('Servicio creado'); }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el servicio');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar servicio' : 'Nuevo servicio'}</h3>
        <div className="mt-3 space-y-3">
          <div><label className={labelClass}>Nombre *</label><input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
          <div><label className={labelClass}>Descripción</label><textarea className={`${inputClass} resize-none`} rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelClass}>Precio</label><input className={inputClass} type="number" step="0.01" min="0" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
            <div><label className={labelClass}>Duración (min)</label><input className={inputClass} type="number" step="1" min="0" value={duracionMinutos} onChange={e => setDuracionMinutos(e.target.value)} /></div>
            <div><label className={labelClass}>IGV %</label><input className={inputClass} type="number" step="0.01" min="0" value={impuestoPorcentaje} onChange={e => setImpuestoPorcentaje(e.target.value)} /></div>
          </div>
          <div>
            <label className={labelClass}>Tipo de servicio</label>
            <select className={`${inputClass} bg-white`} value={tipoServicio} onChange={e => setTipoServicio(e.target.value as TipoServicio | '')}>
              <option value="">Sin tipo</option>
              {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Plantilla de campos (opcional)</label>
            <select className={`${inputClass} bg-white`} value={plantillaServicioId} onChange={e => setPlantillaServicioId(e.target.value)}>
              <option value="">Sin plantilla</option>
              {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <p className="mt-0.5 text-[10px] text-gray-400">Define los campos personalizados que se piden al crear una orden con este servicio.</p>
          </div>

          {/* Campos de la plantilla, como en el app: acá se ven, se agregan
              y se quitan sin tener que ir a otra pantalla. */}
          {plantillaSel && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">Campos de “{plantillaSel.nombre}”</span>
                <button type="button" onClick={() => setCampoDialog({ open: true, campo: null })}
                  className="rounded-lg border border-[#437EFF] px-2.5 py-1 text-[11px] font-medium text-[#437EFF] hover:bg-[#437EFF]/5">+ Campo</button>
              </div>
              {campos.length === 0 ? (
                <p className="text-[11px] text-gray-400">Sin campos todavía. Con “+ Campo” se agregan a la plantilla.</p>
              ) : (
                <div className="space-y-1">
                  {campos.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg bg-[#437EFF]/5 px-2.5 py-1.5">
                      <span className="w-4 shrink-0 text-[10px] text-gray-400">{i + 1}</span>
                      <button type="button" onClick={() => setCampoDialog({ open: true, campo: c })}
                        className="min-w-0 flex-1 truncate text-left text-[11px] text-[#004A94]">
                        {c.nombre}
                        <span className="text-gray-400"> · {TIPO_CAMPO_LABEL[c.tipoCampo as keyof typeof TIPO_CAMPO_LABEL] ?? c.tipoCampo}</span>
                        {c.esRequerido && <span className="text-red-500"> *</span>}
                      </button>
                      <button type="button" onClick={() => moverCampo(i, -1)} disabled={i === 0}
                        className="px-1 text-[11px] text-gray-400 hover:text-[#437EFF] disabled:opacity-30" title="Subir">↑</button>
                      <button type="button" onClick={() => moverCampo(i, 1)} disabled={i === campos.length - 1}
                        className="px-1 text-[11px] text-gray-400 hover:text-[#437EFF] disabled:opacity-30" title="Bajar">↓</button>
                      <button type="button" onClick={() => quitarCampo(c)}
                        className="px-1 text-[11px] text-gray-400 hover:text-red-600" title="Quitar">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-gray-400">Los campos son de la plantilla: se comparten con los demás servicios que la usen.</p>
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      {campoDialog.open && plantillaSel && (
        <CampoFormDialog
          campo={campoDialog.campo}
          plantillaId={campoDialog.campo ? undefined : plantillaSel.id}
          onClose={() => setCampoDialog({ open: false })}
          onSaved={() => { setCampoDialog({ open: false }); cargarPlantillas(); }}
        />
      )}
    </div>
  );
}
