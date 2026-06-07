'use client';

import { useState, useEffect, useMemo } from 'react';
import { AxiosError } from 'axios';
import type { ComprobanteItem } from '@/core/types/facturacion';
import { TIPO_COMPROBANTE_LABEL } from '@/core/types/facturacion';
import * as facturacionService from '../services/facturacion-service';

interface Props {
  isOpen: boolean;
  comprobante: ComprobanteItem;
  onSuccess: (msg: string) => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

function diasDesde(iso: string): number {
  const emision = new Date(iso);
  const hoy = new Date();
  const d0 = Date.UTC(emision.getFullYear(), emision.getMonth(), emision.getDate());
  const d1 = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.floor((d1 - d0) / 86400000);
}

/**
 * Anulación SUNAT:
 *  - FACTURA → Comunicación de Baja (RA), plazo 7 días.
 *  - BOLETA  → Resumen Diario (RC), plazo 3 días.
 * Crea + envía en una sola acción y reporta el estado resultante.
 */
export default function AnularComprobanteDialog({ isOpen, comprobante, onSuccess, onClose }: Props) {
  const esBoleta = comprobante.tipoComprobante === 'BOLETA';
  const metodo = esBoleta ? 'RC' : 'CDB';
  const plazoDias = esBoleta ? 3 : 7;

  const dias = useMemo(() => diasDesde(comprobante.fechaEmision), [comprobante.fechaEmision]);
  const fueraDePlazo = dias > plazoDias;
  const fechaReferencia = comprobante.fechaEmision.slice(0, 10); // YYYY-MM-DD

  const [motivoGeneral, setMotivoGeneral] = useState('');
  const [motivoEspecifico, setMotivoEspecifico] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setMotivoGeneral(''); setMotivoEspecifico(''); setError(''); }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError('');
    if (motivoGeneral.trim().length < 3) { setError('El motivo general debe tener al menos 3 caracteres'); return; }
    if (motivoEspecifico.trim().length < 3) { setError('El motivo específico debe tener al menos 3 caracteres'); return; }
    if (!comprobante.sedeId) { setError('El comprobante no tiene sede asignada'); return; }

    setIsSubmitting(true);
    try {
      if (esBoleta) {
        const rc = await facturacionService.crearResumenDiario({
          sedeId: comprobante.sedeId,
          motivoAnulacion: motivoGeneral.trim(),
          detalles: [{ comprobanteId: comprobante.id, motivoEspecifico: motivoEspecifico.trim() }],
        });
        const enviado = await facturacionService.enviarResumenDiario(rc.id);
        onSuccess(`Resumen diario ${enviado.numeroCompleto} · ${enviado.estadoSunat}`);
      } else {
        const cdb = await facturacionService.crearComunicacionBaja({
          sedeId: comprobante.sedeId,
          fechaReferencia,
          motivoBaja: motivoGeneral.trim(),
          detalles: [{ comprobanteId: comprobante.id, motivoEspecifico: motivoEspecifico.trim() }],
        });
        const enviado = await facturacionService.enviarComunicacionBaja(cdb.id);
        onSuccess(`Comunicación de baja ${enviado.numeroCompleto} · ${enviado.estadoSunat}`);
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo anular el comprobante');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Anular comprobante</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          {TIPO_COMPROBANTE_LABEL[comprobante.tipoComprobante]} <span className="font-mono">{comprobante.codigoGenerado}</span>
        </p>

        <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600">
          Método: <span className="font-semibold">{esBoleta ? 'Resumen Diario (RC)' : 'Comunicación de Baja (RA)'}</span> · plazo {plazoDias} días.
          <br />Emitido hace <span className={`font-semibold ${fueraDePlazo ? 'text-red-600' : 'text-gray-700'}`}>{dias} día{dias === 1 ? '' : 's'}</span> ({fechaReferencia}).
        </div>

        {fueraDePlazo && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
            <p className="text-xs text-red-700">
              ⚠ Fuera del plazo SUNAT de {plazoDias} días para {metodo}. SUNAT rechazará la anulación; considera emitir una nota de crédito.
            </p>
          </div>
        )}

        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>Motivo general *</label>
            <input className={inputClass} value={motivoGeneral} maxLength={500}
              onChange={e => setMotivoGeneral(e.target.value)} placeholder="Motivo de la anulación" />
          </div>
          <div>
            <label className={labelClass}>Motivo específico del documento *</label>
            <input className={inputClass} value={motivoEspecifico} maxLength={250}
              onChange={e => setMotivoEspecifico(e.target.value)} placeholder="Detalle específico" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {isSubmitting ? 'Anulando...' : 'Anular en SUNAT'}
          </button>
        </div>
      </div>
    </div>
  );
}
