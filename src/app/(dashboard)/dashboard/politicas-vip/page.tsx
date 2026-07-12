'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import type {
  PoliticaDescuento, CreatePoliticaDescuentoDto, TipoDescuento, TipoCalculoDescuento,
  EstrategiaMayor, ClienteAsignado, UsoHistorialItem,
} from '@/core/types/politica-descuento';
import {
  TIPO_DESCUENTO_LABEL, TIPO_CALCULO_LABEL, ESTRATEGIA_MAYOR_LABEL, resumenCalculo, esVigente,
} from '@/core/types/politica-descuento';
import * as politicaService from '@/features/politicas-descuento/services/politica-descuento-service';
import * as clienteService from '@/features/cotizacion/services/cliente-service';
import * as productoService from '@/features/producto/services/producto-service';
import * as catalogoService from '@/features/catalogo/services/catalogo-service';
import type { CatalogoItem } from '@/features/catalogo/services/catalogo-service';
import type { Producto } from '@/core/types/producto';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

const TIPOS_UI: TipoDescuento[] = ['VIP', 'PROMOCIONAL', 'LEALTAD', 'CUMPLEANIOS'];
const CALCULOS: TipoCalculoDescuento[] = ['PORCENTAJE', 'MONTO_FIJO', 'PRECIO_COSTO', 'PRECIO_MAYOR_DESDE_UNIDAD'];

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function PoliticasVipPage() {
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageDiscounts;
  const puedeAsignar = permissions.canAssignDiscounts;

  const [politicas, setPoliticas] = useState<PoliticaDescuento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [accionMsg, setAccionMsg] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoDescuento | ''>('VIP');
  const [soloActivas, setSoloActivas] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PoliticaDescuento | null>(null);
  const [clientesDe, setClientesDe] = useState<PoliticaDescuento | null>(null);
  const [alcanceDe, setAlcanceDe] = useState<PoliticaDescuento | null>(null);
  const [historialDe, setHistorialDe] = useState<PoliticaDescuento | null>(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await politicaService.getPoliticas({
        tipoDescuento: tipoFiltro || undefined,
        isActive: soloActivas ? true : undefined,
        limit: 50,
      });
      setPoliticas(res.data ?? []);
    } catch {
      setError('No se pudieron cargar las políticas');
    } finally {
      setIsLoading(false);
    }
  }, [tipoFiltro, soloActivas]);

  useEffect(() => { cargar(); }, [cargar]);
  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const eliminar = async (p: PoliticaDescuento) => {
    if (!confirm(`¿Eliminar la política "${p.nombre}"? Los clientes asignados dejarán de recibir este precio.`)) return;
    try {
      await politicaService.eliminarPolitica(p.id);
      flash('Política eliminada');
      cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo eliminar');
    }
  };

  const toggleActiva = async (p: PoliticaDescuento) => {
    try {
      await politicaService.actualizarPolitica(p.id, { isActive: !p.isActive });
      flash(p.isActive ? 'Política desactivada' : 'Política activada');
      cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo actualizar');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Políticas VIP</h1>
          <p className="text-xs text-gray-500">Precios especiales por cliente. En la venta gana el MENOR precio (nunca se acumulan descuentos).</p>
        </div>
        {puedeGestionar && (
          <button onClick={() => { setEditando(null); setFormOpen(true); }}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nueva política
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {([['', 'Todas'], ...TIPOS_UI.map(t => [t, TIPO_DESCUENTO_LABEL[t]])] as Array<[TipoDescuento | '', string]>).map(([v, lbl]) => (
            <button key={v} onClick={() => setTipoFiltro(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${tipoFiltro === v ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={soloActivas} onChange={e => setSoloActivas(e.target.checked)}
            className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
          Solo activas
        </label>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : politicas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-4xl mb-2">⭐</p>
          <p className="text-sm font-medium text-gray-500">Sin políticas{tipoFiltro ? ` de tipo ${TIPO_DESCUENTO_LABEL[tipoFiltro as TipoDescuento]}` : ''}</p>
          {puedeGestionar && <p className="mt-1 text-xs text-gray-400">Crea una para dar precios especiales a tus clientes.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {politicas.map(p => {
            const vigente = esVigente(p);
            return (
              <div key={p.id} className={`rounded-xl border bg-white p-4 ${vigente ? 'border-gray-200' : 'border-gray-200 opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{TIPO_DESCUENTO_LABEL[p.tipoDescuento]}</span>
                      {!p.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">INACTIVA</span>}
                      {p.isActive && !vigente && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">FUERA DE VIGENCIA</span>}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[#004A94]">{resumenCalculo(p)}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {p.aplicarATodos
                        ? 'Aplica a TODO el catálogo'
                        : `${(p.productosAplicables ?? []).length} producto(s) · ${(p.categoriasAplicables ?? []).length} categoría(s)`}
                      {(p.fechaInicio || p.fechaFin) && <> · vigencia {fmtFecha(p.fechaInicio)} → {p.fechaFin ? fmtFecha(p.fechaFin) : 'sin fin'}</>}
                      {p.montoMinCompra ? <> · compra mín S/ {Number(p.montoMinCompra).toFixed(2)}</> : null}
                      {(p._count?.usosHistorial ?? 0) > 0 && <> · {p._count!.usosHistorial} uso(s)</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {puedeAsignar && (
                      <button onClick={() => setClientesDe(p)} className="rounded border border-amber-300 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50">⭐ Clientes</button>
                    )}
                    {puedeGestionar && !p.aplicarATodos && (
                      <button onClick={() => setAlcanceDe(p)} className="rounded border border-teal-200 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-50">🎯 Alcance</button>
                    )}
                    <button onClick={() => setHistorialDe(p)} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Historial</button>
                    {puedeGestionar && (
                      <>
                        <button onClick={() => { setEditando(p); setFormOpen(true); }} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Editar</button>
                        <button onClick={() => toggleActiva(p)} className={`rounded border px-2 py-1 text-[10px] ${p.isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                          {p.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => eliminar(p)} className="rounded border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50">Eliminar</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <PoliticaFormDialog politica={editando}
          onSaved={(msg) => { setFormOpen(false); flash(msg); cargar(); }}
          onClose={() => setFormOpen(false)} />
      )}
      {clientesDe && (
        <ClientesVipDialog politica={clientesDe} onClose={() => { setClientesDe(null); cargar(); }} />
      )}
      {alcanceDe && (
        <AlcanceDialog politica={alcanceDe} onClose={() => { setAlcanceDe(null); cargar(); }} />
      )}
      {historialDe && (
        <HistorialDialog politica={historialDe} onClose={() => setHistorialDe(null)} />
      )}
    </div>
  );
}

/* ─── Form crear/editar política ──────────────────────────────────────────── */
function PoliticaFormDialog({ politica, onSaved, onClose }: {
  politica: PoliticaDescuento | null; onSaved: (msg: string) => void; onClose: () => void;
}) {
  const esEdicion = !!politica;
  const [nombre, setNombre] = useState(politica?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(politica?.descripcion ?? '');
  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>(politica?.tipoDescuento ?? 'VIP');
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculoDescuento>(politica?.tipoCalculo ?? 'PRECIO_COSTO');
  const [valorDescuento, setValorDescuento] = useState(politica?.valorDescuento != null ? String(politica.valorDescuento) : '');
  const [markup, setMarkup] = useState(politica?.markupSobreCosto != null ? String(politica.markupSobreCosto) : '');
  const [estrategiaMayor, setEstrategiaMayor] = useState<EstrategiaMayor>(politica?.estrategiaMayor ?? 'PRIMER_NIVEL');
  const [descuentoMaximo, setDescuentoMaximo] = useState(politica?.descuentoMaximo != null ? String(politica.descuentoMaximo) : '');
  const [montoMinCompra, setMontoMinCompra] = useState(politica?.montoMinCompra != null ? String(politica.montoMinCompra) : '');
  const [fechaInicio, setFechaInicio] = useState(politica?.fechaInicio ? politica.fechaInicio.slice(0, 10) : '');
  const [fechaFin, setFechaFin] = useState(politica?.fechaFin ? politica.fechaFin.slice(0, 10) : '');
  const [prioridad, setPrioridad] = useState(String(politica?.prioridad ?? 0));
  const [aplicarATodos, setAplicarATodos] = useState(politica?.aplicarATodos ?? true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usaValor = tipoCalculo === 'PORCENTAJE' || tipoCalculo === 'MONTO_FIJO';

  const submit = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    const valor = parseFloat(valorDescuento) || 0;
    if (usaValor && valor <= 0) { setError(tipoCalculo === 'PORCENTAJE' ? 'Indica el % de descuento' : 'Indica el monto de descuento'); return; }
    if (tipoCalculo === 'PORCENTAJE' && valor > 100) { setError('El % no puede superar 100'); return; }
    setIsSubmitting(true);
    setError('');
    const dto: CreatePoliticaDescuentoDto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      tipoDescuento,
      tipoCalculo,
      valorDescuento: usaValor ? valor : 0,
      descuentoMaximo: usaValor && parseFloat(descuentoMaximo) > 0 ? parseFloat(descuentoMaximo) : undefined,
      montoMinCompra: parseFloat(montoMinCompra) > 0 ? parseFloat(montoMinCompra) : undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      aplicarATodos,
      prioridad: parseInt(prioridad) || 0,
      ...(tipoCalculo === 'PRECIO_COSTO' && parseFloat(markup) > 0 ? { markupSobreCosto: parseFloat(markup) } : {}),
      ...(tipoCalculo === 'PRECIO_MAYOR_DESDE_UNIDAD' ? { estrategiaMayor } : {}),
    };
    try {
      if (esEdicion && politica) { await politicaService.actualizarPolitica(politica.id, dto); onSaved('Política actualizada'); }
      else { await politicaService.crearPolitica(dto); onSaved('Política creada — asigna clientes con ⭐'); }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar la política');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar política' : 'Nueva política de precio'}</h3>
        <div className="mt-3 space-y-3">
          <div><label className={labelClass}>Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Clientes VIP mayoristas" autoFocus /></div>
          <div><label className={labelClass}>Descripción</label>
            <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Opcional" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Tipo</label>
              <select className={`${inputClass} bg-white`} value={tipoDescuento} onChange={e => setTipoDescuento(e.target.value as TipoDescuento)}>
                {TIPOS_UI.map(t => <option key={t} value={t}>{TIPO_DESCUENTO_LABEL[t]}</option>)}
              </select></div>
            <div><label className={labelClass}>Prioridad</label>
              <input className={inputClass} type="number" step="1" value={prioridad} onChange={e => setPrioridad(e.target.value)} title="Mayor número = mayor prioridad (orden; el precio final siempre es el MENOR)" /></div>
          </div>

          <div>
            <label className={labelClass}>Cómo se calcula el precio</label>
            <select className={`${inputClass} bg-white`} value={tipoCalculo} onChange={e => setTipoCalculo(e.target.value as TipoCalculoDescuento)}>
              {CALCULOS.map(c => <option key={c} value={c}>{TIPO_CALCULO_LABEL[c]}</option>)}
            </select>
          </div>

          {usaValor && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>{tipoCalculo === 'PORCENTAJE' ? '% de descuento *' : 'Monto S/ *'}</label>
                <input className={inputClass} type="number" step="0.01" min="0" value={valorDescuento} onChange={e => setValorDescuento(e.target.value)} /></div>
              <div><label className={labelClass}>Descuento máximo S/</label>
                <input className={inputClass} type="number" step="0.01" min="0" value={descuentoMaximo} onChange={e => setDescuentoMaximo(e.target.value)} placeholder="Sin tope" /></div>
            </div>
          )}
          {tipoCalculo === 'PRECIO_COSTO' && (
            <div>
              <label className={labelClass}>Markup sobre el costo (%)</label>
              <input className={inputClass} type="number" step="0.01" min="0" value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0 = costo puro" />
              <p className="mt-1 text-[10px] text-gray-400">Precio = costo × (1 + markup/100). Si el producto no tiene costo, la política no aplica (nunca vende a S/ 0).</p>
            </div>
          )}
          {tipoCalculo === 'PRECIO_MAYOR_DESDE_UNIDAD' && (
            <div>
              <label className={labelClass}>Estrategia de nivel</label>
              <select className={`${inputClass} bg-white`} value={estrategiaMayor} onChange={e => setEstrategiaMayor(e.target.value as EstrategiaMayor)}>
                {(['PRIMER_NIVEL', 'MEJOR_NIVEL'] as EstrategiaMayor[]).map(s => <option key={s} value={s}>{ESTRATEGIA_MAYOR_LABEL[s]}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">El cliente paga el precio por mayor desde la primera unidad.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Vigente desde</label>
              <input className={inputClass} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
            <div><label className={labelClass}>Vigente hasta</label>
              <input className={inputClass} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
          </div>
          <div><label className={labelClass}>Compra mínima S/</label>
            <input className={inputClass} type="number" step="0.01" min="0" value={montoMinCompra} onChange={e => setMontoMinCompra(e.target.value)} placeholder="Sin mínimo" /></div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={aplicarATodos} onChange={e => setAplicarATodos(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            <span>
              <span className="font-medium text-gray-800">Aplicar a todo el catálogo</span>
              <span className="block text-xs text-gray-500">Si lo desmarcas, define el alcance por producto/categoría con 🎯 (con % override opcional por ítem).</span>
            </span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Clientes VIP asignados (B2C + B2B, paridad asignar_clientes_page) ───── */
function ClientesVipDialog({ politica, onClose }: { politica: PoliticaDescuento; onClose: () => void }) {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const [asignados, setAsignados] = useState<ClienteAsignado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Array<{ id: string; tipo: 'empresa' | 'persona'; nombre: string; documento: string }>>([]);
  const [buscando, setBuscando] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    try { setAsignados(await politicaService.getClientesAsignados(politica.id)); }
    catch { setError('No se pudieron cargar los clientes asignados'); }
    finally { setLoading(false); }
  }, [politica.id]);

  useEffect(() => {
    let alive = true;
    politicaService.getClientesAsignados(politica.id)
      .then(d => { if (alive) { setAsignados(d); setLoading(false); } })
      .catch(() => { if (alive) { setError('No se pudieron cargar los clientes asignados'); setLoading(false); } });
    return () => { alive = false; };
  }, [politica.id]);

  const buscar = (texto: string) => {
    setQ(texto);
    if (debounce.current) clearTimeout(debounce.current);
    if (texto.trim().length < 2) { setResultados([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      try { setResultados(await clienteService.buscarClientes(empresaId, texto.trim())); }
      catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 350);
  };

  const yaAsignado = (r: { id: string; tipo: 'empresa' | 'persona' }) =>
    asignados.some(a => (r.tipo === 'persona' ? a.clienteId === r.id : a.clienteEmpresaId === r.id));

  const agregar = async (r: { id: string; tipo: 'empresa' | 'persona' }) => {
    setError('');
    try {
      await politicaService.asignarClientes(politica.id,
        r.tipo === 'persona' ? { clienteIds: [r.id] } : { clienteEmpresaIds: [r.id] });
      setQ(''); setResultados([]);
      cargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo asignar el cliente');
    }
  };

  const remover = async (a: ClienteAsignado) => {
    if (!confirm(`¿Quitar a ${a.nombre ?? 'este cliente'} de la política?`)) return;
    try { await politicaService.removerCliente(politica.id, a.id); cargar(); }
    catch { setError('No se pudo remover el cliente'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">⭐ Clientes VIP</h3>
        <p className="text-xs text-gray-500">{politica.nombre} — {resumenCalculo(politica)}</p>

        {/* Búsqueda unificada persona + empresa */}
        <div className="relative mt-3">
          <input className={inputClass} value={q} onChange={e => buscar(e.target.value)}
            placeholder="Buscar cliente por nombre, DNI o RUC para asignar..." />
          {(buscando || resultados.length > 0) && q.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {buscando && <div className="px-3 py-2 text-xs text-gray-400">Buscando…</div>}
              {!buscando && resultados.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>}
              {resultados.map(r => {
                const asignado = yaAsignado(r);
                return (
                  <button key={`${r.tipo}-${r.id}`} disabled={asignado} onClick={() => agregar(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-40">
                    <span className="min-w-0">
                      <span className="mr-1.5 rounded bg-gray-100 px-1 text-[9px] font-bold text-gray-500">{r.tipo === 'persona' ? 'DNI' : 'RUC'}</span>
                      {r.nombre}
                      <span className="ml-1 font-mono text-[10px] text-gray-400">{r.documento}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-[#437EFF]">{asignado ? 'Ya asignado' : '+ Asignar'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Asignados */}
        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-xs text-gray-400">Cargando…</p>
          ) : asignados.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">Sin clientes asignados. Busca arriba para agregar.</p>
          ) : asignados.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  <span className={`mr-1.5 rounded px-1 text-[9px] font-bold ${a.tipo === 'B2C' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{a.tipo}</span>
                  {a.nombre ?? '—'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono">{a.documento ?? ''} · desde {fmtFecha(a.creadoEn)}</p>
              </div>
              <button onClick={() => remover(a)} title="Quitar de la política"
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>

        <div className="mt-3 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Alcance: productos y categorías (cuando NO aplica a todos) ──────────── */
function AlcanceDialog({ politica, onClose }: { politica: PoliticaDescuento; onClose: () => void }) {
  const [detalle, setDetalle] = useState<PoliticaDescuento | null>(null);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [catSel, setCatSel] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usaOverride = politica.tipoCalculo === 'PORCENTAJE' || politica.tipoCalculo === 'MONTO_FIJO';

  const cargar = useCallback(async () => {
    try { setDetalle(await politicaService.getPolitica(politica.id)); }
    catch { setError('No se pudo cargar el alcance'); }
  }, [politica.id]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      politicaService.getPolitica(politica.id),
      catalogoService.getCategorias().catch(() => [] as CatalogoItem[]),
    ]).then(([d, cats]) => { if (alive) { setDetalle(d); setCategorias(cats); } })
      .catch(() => { if (alive) setError('No se pudo cargar el alcance'); });
    return () => { alive = false; };
  }, [politica.id]);

  const buscarProductos = (texto: string) => {
    setQ(texto);
    if (debounce.current) clearTimeout(debounce.current);
    if (texto.trim().length < 2) { setResultados([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await productoService.getProductos({ page: 1, limit: 10, search: texto.trim(), isActive: true });
        setResultados(res.data);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 350);
  };

  const agregarProducto = async (p: Producto) => {
    setError('');
    let override: number | undefined;
    if (usaOverride) {
      const v = prompt(`Override de ${politica.tipoCalculo === 'PORCENTAJE' ? '%' : 'S/'} para "${p.nombre}" (vacío = usar el valor de la política, ${Number(politica.valorDescuento)}):`);
      if (v === null) return;
      override = parseFloat(v) > 0 ? parseFloat(v) : undefined;
    }
    try {
      await politicaService.asignarProductos(politica.id, [{ productoId: p.id, ...(override != null ? { descuentoOverride: override } : {}) }]);
      setQ(''); setResultados([]);
      cargar();
    } catch { setError('No se pudo agregar el producto'); }
  };

  const agregarCategoria = async () => {
    if (!catSel) return;
    setError('');
    try {
      await politicaService.asignarCategorias(politica.id, [{ categoriaId: catSel }]);
      setCatSel('');
      cargar();
    } catch { setError('No se pudo agregar la categoría'); }
  };

  const productos = detalle?.productosAplicables ?? [];
  const cats = detalle?.categoriasAplicables ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">🎯 Alcance de la política</h3>
        <p className="text-xs text-gray-500">{politica.nombre} — solo aplica a estos productos/categorías</p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Productos */}
        <div className="relative mt-3">
          <input className={inputClass} value={q} onChange={e => buscarProductos(e.target.value)} placeholder="Buscar producto para agregar…" />
          {(buscando || resultados.length > 0) && q.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {buscando && <div className="px-3 py-2 text-xs text-gray-400">Buscando…</div>}
              {resultados.map(p => (
                <button key={p.id} onClick={() => agregarProducto(p)} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  <span className="font-mono text-[10px] text-gray-400">{p.codigoEmpresa}</span> {p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {productos.length === 0 ? <p className="text-xs text-gray-400">Sin productos específicos.</p> : productos.map(pa => (
            <div key={pa.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-1.5 text-xs">
              <span className="min-w-0 truncate">
                {pa.producto?.nombre ?? pa.productoId}
                {pa.descuentoOverride != null && <span className="ml-1.5 rounded bg-blue-100 px-1 text-[9px] font-bold text-blue-700">override {Number(pa.descuentoOverride)}{politica.tipoCalculo === 'PORCENTAJE' ? '%' : ''}</span>}
              </span>
              <button onClick={async () => { await politicaService.removerProducto(politica.id, pa.productoId).catch(() => setError('No se pudo quitar')); cargar(); }}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>

        {/* Categorías */}
        <div className="mt-4 flex gap-2">
          <select className={`${inputClass} bg-white`} value={catSel} onChange={e => setCatSel(e.target.value)}>
            <option value="">Agregar categoría…</option>
            {categorias.filter(c => !cats.some(x => x.categoriaId === c.id)).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={agregarCategoria} disabled={!catSel}
            className="shrink-0 rounded-lg bg-[#004A94] px-3 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-40">+</button>
        </div>
        <div className="mt-2 space-y-1">
          {cats.map(ca => (
            <div key={ca.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-1.5 text-xs">
              <span>{ca.categoria?.nombrePersonalizado ?? ca.categoria?.nombreLocal ?? ca.categoriaId}</span>
              <button onClick={async () => { await politicaService.removerCategoria(politica.id, ca.categoriaId).catch(() => setError('No se pudo quitar')); cargar(); }}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Historial de uso ─────────────────────────────────────────────────────── */
function HistorialDialog({ politica, onClose }: { politica: PoliticaDescuento; onClose: () => void }) {
  const [items, setItems] = useState<UsoHistorialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    politicaService.getHistorialUso(politica.id)
      .then(d => { if (alive) setItems(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [politica.id]);

  const fmt = (n: number) => `S/ ${Number(n).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Historial de uso — {politica.nombre}</h3>
        <p className="text-xs text-gray-500">Últimos {items.length} usos registrados en ventas</p>
        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-xs text-gray-400">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Esta política aún no se usó en ninguna venta.</p>
          ) : items.map(u => (
            <div key={u.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 truncate">{u.variante?.nombre ?? u.producto?.nombre ?? '—'} × {u.cantidad}</span>
                <span className="shrink-0 font-semibold text-green-700">−{fmt(u.descuentoAplicado)}</span>
              </div>
              <p className="text-[10px] text-gray-400">
                {fmt(u.precioOriginal)} → {fmt(u.precioFinal)} · {new Date(u.creadoEn).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {u.sede?.nombre ? ` · ${u.sede.nombre}` : ''}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
