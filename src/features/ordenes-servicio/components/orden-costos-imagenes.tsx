'use client';

// Resumen de costos (paridad _buildResumenCostosSection de Flutter: incluye
// componentes en el cálculo) + sección de imágenes/firma de la orden.

import { useState, useEffect, useRef, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useImagenPegada } from '../hooks/use-imagen-pegada';
import type { OrdenServicio } from '@/core/types/orden-servicio';
import {
  subtotalComponentesOrden, costoFinalOrden, saldoPendienteOrden,
} from '@/core/types/orden-servicio';
import type { MetodoPagoVenta } from '@/core/types/caja';
import { METODO_PAGO_LABEL } from '@/core/types/caja';
import * as osService from '../services/orden-servicio-service';
import * as storageService from '@/features/storage/services/storage-service';
import type { ArchivoResponse } from '@/features/storage/services/storage-service';

function fmt(n: number | undefined | null): string {
  return `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METODOS: MetodoPagoVenta[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

function CostoRow({ label, valor, bold, color, showSign, size }: {
  label: string; valor: number; bold?: boolean; color?: string; showSign?: boolean; size?: string;
}) {
  const prefix = showSign && valor >= 0 ? '+' : '';
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`${size ?? 'text-xs'} ${bold ? 'font-bold' : ''} ${color ?? 'text-gray-600'}`}>{label}</span>
      <span className={`${size ?? 'text-xs'} ${bold ? 'font-bold' : 'font-medium'} ${color ?? 'text-gray-700'}`}>{prefix}{fmt(valor)}</span>
    </div>
  );
}

/** Card "Resumen de costos" con desglose de componentes + edición de costos. */
export function ResumenCostosCard({ orden, canManage, onChanged }: { orden: OrdenServicio; canManage: boolean; onChanged: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const componentes = orden.componentes ?? [];

  let totalMO = 0, totalRep = 0;
  for (const c of componentes) { totalMO += Number(c.costoAccion ?? 0); totalRep += Number(c.costoRepuestos ?? 0); }
  const subtotalComp = totalMO + totalRep;
  const costoTotal = orden.costoTotal ?? null;
  const adelanto = orden.adelanto ?? null;
  const descuento = orden.descuento ?? null;
  const costoFinal = costoFinalOrden(orden);   // total al cliente = componentes + servicio − descuento
  const saldo = saldoPendienteOrden(orden);

  const isTerminal = orden.estado === 'CANCELADO' || orden.estado === 'FINALIZADO';
  const hasCosts = subtotalComp > 0 || costoTotal != null;
  const compsConCosto = componentes.filter(c => Number(c.costoAccion ?? 0) > 0 || Number(c.costoRepuestos ?? 0) > 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-gray-400">Resumen de costos</p>
        {canManage && !isTerminal && (
          <button onClick={() => setEditOpen(true)} className="rounded bg-[#437EFF]/10 px-2 py-1 text-[11px] font-semibold text-[#437EFF] hover:bg-[#437EFF]/20">
            ✎ {hasCosts ? 'Editar' : 'Agregar'}
          </button>
        )}
      </div>

      {!hasCosts ? (
        <p className="py-2 text-center text-[11px] text-gray-400">Sin costos registrados</p>
      ) : (
        <>
          {/* Repuestos / componentes (el cliente los paga) */}
          {compsConCosto.length > 0 && (
            <div className="mb-1">
              {compsConCosto.map(c => {
                const mo = Number(c.costoAccion ?? 0), rep = Number(c.costoRepuestos ?? 0);
                const nombre = `${c.componente?.tipoComponente?.nombre ?? c.componente?.marca ?? 'Componente'}${c.componente?.modelo ? ` ${c.componente.modelo}` : ''}`;
                return (
                  <div key={c.id} className="mb-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-gray-700">🔧 {nombre}</span>
                      <span className="text-xs font-semibold text-gray-700">{fmt(mo + rep)}</span>
                    </div>
                    <div className="ml-5 flex flex-wrap gap-x-4 text-[10px] text-gray-400">
                      {mo > 0 && <span>Mano de obra: <b className="text-gray-500">{fmt(mo)}</b></span>}
                      {rep > 0 && <span>Repuesto/compra: <b className="text-gray-500">{fmt(rep)}</b></span>}
                    </div>
                  </div>
                );
              })}
              <CostoRow label="Repuestos / componentes" valor={subtotalComp} bold />
            </div>
          )}

          {costoTotal != null && <CostoRow label="Costo del servicio" valor={costoTotal} />}
          {descuento != null && descuento > 0 && <CostoRow label="Descuento" valor={-descuento} color="text-green-700" showSign />}
          {costoFinal != null && <CostoRow label="Total al cliente" valor={costoFinal} color="text-[#004A94]" size="text-sm" />}

          <div className="mt-2 rounded-lg bg-[#437EFF]/5 p-2.5">
            {adelanto != null && adelanto > 0 && (
              <>
                <CostoRow label="Adelanto" valor={adelanto} color="text-green-700" />
                {orden.metodoPagoAdelanto && <p className="mb-1 text-[10px] text-gray-500">{METODO_PAGO_LABEL[orden.metodoPagoAdelanto as MetodoPagoVenta] ?? orden.metodoPagoAdelanto}</p>}
              </>
            )}
            {saldo != null && (
              // Con saldo 0 la fila pasa a "PAGADO", y ahí el monto que
              // corresponde es lo COBRADO (el total), no el saldo — que por
              // definición vale 0 y se leía como "se cobró S/ 0.00".
              <CostoRow
                label={saldo <= 0.005 ? 'PAGADO' : 'SALDO PENDIENTE'}
                valor={saldo <= 0.005 ? (costoFinal ?? 0) : saldo}
                bold size="text-sm"
                color={saldo <= 0.005 ? 'text-green-700' : 'text-orange-600'}
              />
            )}
          </div>
        </>
      )}

      {editOpen && (
        <EditarCostosDialog orden={orden} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onChanged(); }} />
      )}
    </div>
  );
}

/* --- Editar costos (PUT /ordenes-servicio/:id; no transiciona estado) --- */
function EditarCostosDialog({ orden, onClose, onSaved }: { orden: OrdenServicio; onClose: () => void; onSaved: () => void }) {
  const [costoTotal, setCostoTotal] = useState(orden.costoTotal != null ? String(orden.costoTotal) : '');
  const [descuento, setDescuento] = useState(orden.descuento != null ? String(orden.descuento) : '');
  const [adelanto, setAdelanto] = useState(orden.adelanto != null ? String(orden.adelanto) : '');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta | ''>((orden.metodoPagoAdelanto as MetodoPagoVenta) ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const compCost = subtotalComponentesOrden(orden);
  const costo = parseFloat(costoTotal || '0');
  const desc = parseFloat(descuento || '0');
  const adel = parseFloat(adelanto || '0');
  const costoFinalCalc = compCost + costo - desc; // total al cliente = repuestos + servicio − descuento
  const saldoCalc = costoFinalCalc - adel;
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    if (adel > 0 && !metodoPago) { setError('Selecciona el medio de pago del adelanto'); return; }
    setSaving(true);
    try {
      // El UpdateOrdenServicioDto del backend NO acepta empresaId (whitelist
      // forbidNonWhitelisted) — el tenant va por header x-tenant-id.
      await osService.actualizarOrden(orden.id, {
        costoTotal: costoTotal.trim() ? costo : undefined,
        descuento: descuento.trim() ? desc : undefined,
        adelanto: adelanto.trim() ? adel : undefined,
        ...(adel > 0 && metodoPago ? { metodoPagoAdelanto: metodoPago } : {}),
      });
      onSaved();
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudieron guardar los costos');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-medium text-[#004A94]">Costos del servicio</h3>
        <p className="text-[11px] text-gray-500">Editar precios y pagos</p>
        <div className="mt-3 space-y-2">
          {compCost > 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">Repuestos / componentes: <b className="text-gray-700">{fmt(compCost)}</b> <span className="text-gray-400">(se suman al total)</span></div>
          )}
          <div><label className="mb-1 block text-[10px] text-gray-400">Costo del servicio (mano de obra / diagnóstico)</label><input className={inputClass} type="number" step="0.01" min="0" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} /></div>
          <div><label className="mb-1 block text-[10px] text-gray-400">Descuento</label><input className={inputClass} type="number" step="0.01" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-[10px] text-gray-400">Adelanto</label><input className={inputClass} type="number" step="0.01" min="0" value={adelanto} onChange={e => setAdelanto(e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] text-gray-400">Medio pago</label>
              <select className={`${inputClass} bg-white`} value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPagoVenta)}>
                <option value="">—</option>
                {METODOS.map(m => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {(costo > 0 || compCost > 0) && (
          <div className="mt-3 rounded-lg border border-[#437EFF]/30 bg-[#437EFF]/5 p-2.5">
            {compCost > 0 && <CostoRow label="Repuestos / componentes" valor={compCost} />}
            {costo > 0 && <CostoRow label="Costo del servicio" valor={costo} />}
            {desc > 0 && <CostoRow label="Descuento" valor={-desc} color="text-green-700" showSign />}
            <CostoRow label="Total al cliente" valor={costoFinalCalc} color="text-[#004A94]" />
            {adel > 0 && <CostoRow label="Adelanto" valor={adel} color="text-green-700" />}
            <div className="my-1 border-t border-gray-200" />
            <CostoRow label={saldoCalc <= 0.005 ? 'PAGADO' : 'Saldo pendiente'} valor={saldoCalc <= 0.005 ? costoFinalCalc : saldoCalc} size="text-sm" color={saldoCalc <= 0.005 ? 'text-green-700' : 'text-orange-600'} />
          </div>
        )}

        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar costos'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Imágenes de la orden (entidadTipo ORDEN_SERVICIO) + firma del cliente --- */
export function OrdenImagenesSection({ orden, canManageSettings, forceShow }: { orden: OrdenServicio; canManageSettings: boolean; forceShow: boolean }) {
  const empresaId = orden.empresaId;
  const [archivos, setArchivos] = useState<ArchivoResponse[]>([]);
  const [firma, setFirma] = useState<ArchivoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const list = await storageService.getFilesByEntity('ORDEN_SERVICIO', orden.id, empresaId);
      setFirma(list.find(a => a.categoria === 'FIRMA') ?? null);
      setArchivos(list.filter(a => a.categoria !== 'FIRMA'));
    } catch {
      setArchivos([]); setFirma(null);
    } finally {
      setLoading(false);
    }
  }, [orden.id, empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const subir = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    setError(''); setProgress(0);
    try {
      await storageService.uploadFile({ file, empresaId, entidadTipo: 'ORDEN_SERVICIO', entidadId: orden.id, onProgress: setProgress });
      await cargar();
    } catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo subir la imagen (requiere permiso de configuración)');
    } finally { setProgress(null); }
  }, [empresaId, orden.id, cargar]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await subir(file);
  };

  const { arrastrando, zona } = useImagenPegada({
    activo: canManageSettings && progress == null,
    prefijoNombre: orden.codigo,
    onImagen: subir,
  });

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try { await storageService.deleteFile(id, empresaId); await cargar(); }
    catch (err) {
      const m = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(m) ? m.join(', ') : m || 'No se pudo eliminar la imagen');
    }
  };

  // Visibilidad: paridad con _shouldShowImagenes (imágenes existen o un campo ARCHIVO activo) + admin.
  const visible = loading || archivos.length > 0 || !!firma || forceShow || canManageSettings;
  if (!visible) return null;

  return (
    <div {...zona}
      className={`rounded-xl border bg-white p-4 transition-colors ${arrastrando ? 'border-[#437EFF] bg-blue-50/40' : 'border-gray-200'}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-gray-400">Imágenes ({archivos.length})</p>
        {canManageSettings && (
          <button onClick={() => fileRef.current?.click()} disabled={progress != null}
            className="text-[11px] font-semibold text-[#437EFF] hover:underline disabled:opacity-50">
            {progress != null ? `Subiendo ${progress}%` : '📷 Subir imagen'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {error && <p className="mb-2 text-[11px] text-red-500">{error}</p>}
      {canManageSettings && progress == null && (
        <p className="mb-2 text-[10px] text-gray-400">
          {arrastrando
            ? 'Soltá la imagen para subirla.'
            : <>Pegá una captura con <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[9px] text-gray-500">Ctrl</kbd> + <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[9px] text-gray-500">V</kbd>, o arrastrá una acá.</>}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
      ) : archivos.length === 0 ? (
        <p className="py-1 text-[11px] text-gray-400">Sin imágenes adjuntas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {archivos.map(img => (
            <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
              <img src={img.urlThumbnail || img.url} alt={img.nombreOriginal} onClick={() => setViewer(img.url)} className="h-full w-full cursor-pointer object-cover" />
              {canManageSettings && (
                <button onClick={() => eliminar(img.id)} className="absolute right-0.5 top-0.5 rounded-full bg-black/50 px-1.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {firma && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Firma del cliente</p>
          <img src={firma.url} alt="Firma" onClick={() => setViewer(firma.url)} className="h-20 cursor-pointer rounded-lg border border-gray-200 bg-white object-contain p-1" />
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
