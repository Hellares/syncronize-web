'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { Venta, VentaEnvio, VentaEnvioDto } from '@/core/types/venta';
import * as ventaService from '../services/venta-service';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

const AGENCIAS_RAPIDAS = ['SHALOM', 'OLVA', 'MARVISUR'];

interface Props {
  venta: Venta;
  canManage: boolean;
  onUpdated: () => void;
}

/**
 * Card de envío del detalle de venta (paridad venta_envio_sheet.dart):
 * datos del rótulo de agencia + editar con prefill en cascada + imprimir rótulo
 * (al imprimir se marca rotuloImpresoEn → chip IMPRESO).
 */
export default function EnvioVentaCard({ venta, canManage, onUpdated }: Props) {
  const { empresa } = useEmpresa();
  const [showForm, setShowForm] = useState(false);
  const envio = venta.envio;

  const imprimirRotulo = async () => {
    if (!envio) return;
    const remitente = empresa?.nombre || empresa?.razonSocial || '';
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    // Rótulo A4 apaisado: destinatario grande, agencia/destino, remitente al pie
    w.document.write(`<!doctype html><html><head><title>Rótulo ${venta.codigo}</title><style>
      @page { size: A4 landscape; margin: 16mm; }
      body { font-family: Arial, sans-serif; color: #111; margin: 0; }
      .marco { border: 4px solid #111; border-radius: 12px; padding: 28px 36px; height: calc(100vh - 40px); box-sizing: border-box; display: flex; flex-direction: column; }
      .lbl { font-size: 13px; letter-spacing: 2px; color: #555; text-transform: uppercase; margin-bottom: 2px; }
      .dest { font-size: 44px; font-weight: 800; line-height: 1.1; }
      .doc { font-size: 22px; margin-top: 2px; }
      .fila { margin-top: 22px; }
      .val { font-size: 30px; font-weight: 700; }
      .destino { font-size: 34px; font-weight: 800; }
      .pie { margin-top: auto; border-top: 2px solid #111; padding-top: 10px; display: flex; justify-content: space-between; font-size: 15px; }
    </style></head><body><div class="marco">
      <div class="lbl">Destinatario</div>
      <div class="dest">${envio.destinatarioNombre ?? ''}</div>
      <div class="doc">${envio.destinatarioDni ? `DNI: ${envio.destinatarioDni}` : ''}${envio.destinatarioCelular ? ` &nbsp;·&nbsp; CEL: ${envio.destinatarioCelular}` : ''}</div>
      <div class="fila"><div class="lbl">Agencia</div><div class="val">${envio.agenciaNombre ?? '—'}${envio.agenciaDireccion ? ` — ${envio.agenciaDireccion}` : ''}</div></div>
      <div class="fila"><div class="lbl">Destino</div><div class="destino">${[envio.destinoDepartamento, envio.destinoProvincia].filter(Boolean).join(' — ') || '—'}</div></div>
      <div class="pie"><span>REMITE: <strong>${remitente}</strong></span><span>${venta.codigo}</span></div>
    </div><script>window.onload = () => { window.print(); window.close(); };</script></body></html>`);
    w.document.close();
    try {
      await ventaService.marcarRotuloImpreso(venta.id);
      onUpdated();
    } catch { /* el rótulo ya salió; el chip se corrige al reimprimir */ }
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-purple-600">🚚 Envío</p>
        {envio?.rotuloImpresoEn && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700"
            title={new Date(envio.rotuloImpresoEn).toLocaleString('es-PE')}>
            🖨 IMPRESO
          </span>
        )}
      </div>

      {envio ? (
        <div className="space-y-1 text-xs text-gray-700">
          <p className="text-sm font-semibold text-gray-900">{envio.destinatarioNombre}</p>
          {(envio.destinatarioDni || envio.destinatarioCelular) && (
            <p className="text-gray-500">
              {envio.destinatarioDni && `DNI ${envio.destinatarioDni}`}
              {envio.destinatarioDni && envio.destinatarioCelular && ' · '}
              {envio.destinatarioCelular && `📱 ${envio.destinatarioCelular}`}
            </p>
          )}
          {envio.agenciaNombre && <p><span className="text-gray-400">Agencia:</span> <strong>{envio.agenciaNombre}</strong>{envio.agenciaDireccion ? ` — ${envio.agenciaDireccion}` : ''}</p>}
          {(envio.destinoDepartamento || envio.destinoProvincia) && (
            <p><span className="text-gray-400">Destino:</span> {[envio.destinoDepartamento, envio.destinoProvincia].filter(Boolean).join(' — ')}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Sin datos de envío registrados.</p>
      )}

      {canManage && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => setShowForm(true)}
            className="rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100">
            {envio ? 'Editar envío' : 'Registrar envío'}
          </button>
          {envio && (
            <button onClick={imprimirRotulo}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700">
              🖨 Imprimir rótulo
            </button>
          )}
        </div>
      )}

      {showForm && (
        <EnvioFormDialog
          venta={venta}
          onSaved={(imprimir) => {
            setShowForm(false);
            onUpdated();
            if (imprimir) setTimeout(imprimirRotulo, 300);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

/* --- Form de envío (prefill en cascada: envío de esta venta → último del cliente → snapshot) --- */
function EnvioFormDialog({ venta, onSaved, onClose }: { venta: Venta; onSaved: (imprimir: boolean) => void; onClose: () => void }) {
  const [form, setForm] = useState<VentaEnvioDto>({
    destinatarioNombre: venta.envio?.destinatarioNombre ?? venta.nombreCliente ?? '',
    destinatarioDni: venta.envio?.destinatarioDni ?? venta.documentoCliente ?? '',
    destinatarioCelular: venta.envio?.destinatarioCelular ?? (venta as { telefonoCliente?: string }).telefonoCliente ?? '',
    agenciaNombre: venta.envio?.agenciaNombre ?? '',
    destinoDepartamento: venta.envio?.destinoDepartamento ?? '',
    destinoProvincia: venta.envio?.destinoProvincia ?? '',
    agenciaDireccion: venta.envio?.agenciaDireccion ?? '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill "lo último que tocaste gana": solo si la venta aún no tiene envío
  useEffect(() => {
    if (venta.envio || !venta.clienteId) return;
    ventaService.getUltimoEnvioCliente(venta.clienteId).then((ultimo: VentaEnvio | null) => {
      if (!ultimo) return;
      setForm(prev => ({
        ...prev,
        destinatarioNombre: ultimo.destinatarioNombre || prev.destinatarioNombre,
        destinatarioDni: ultimo.destinatarioDni || prev.destinatarioDni,
        destinatarioCelular: ultimo.destinatarioCelular || prev.destinatarioCelular,
        agenciaNombre: ultimo.agenciaNombre || prev.agenciaNombre,
        destinoDepartamento: ultimo.destinoDepartamento || prev.destinoDepartamento,
        destinoProvincia: ultimo.destinoProvincia || prev.destinoProvincia,
        agenciaDireccion: ultimo.agenciaDireccion || prev.agenciaDireccion,
      }));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof VentaEnvioDto, v: string) => setForm(prev => ({ ...prev, [k]: v.toUpperCase() }));

  const guardar = async (imprimir: boolean) => {
    if (!form.destinatarioNombre?.trim()) { setError('El destinatario es obligatorio'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await ventaService.upsertEnvio(venta.id, {
        destinatarioNombre: form.destinatarioNombre.trim(),
        destinatarioDni: form.destinatarioDni?.trim() || undefined,
        destinatarioCelular: form.destinatarioCelular?.trim() || undefined,
        agenciaNombre: form.agenciaNombre?.trim() || undefined,
        destinoDepartamento: form.destinoDepartamento?.trim() || undefined,
        destinoProvincia: form.destinoProvincia?.trim() || undefined,
        agenciaDireccion: form.agenciaDireccion?.trim() || undefined,
      });
      onSaved(imprimir);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el envío');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Datos de envío — {venta.codigo}</h3>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Destinatario *</label>
            <input className={inputClass} value={form.destinatarioNombre ?? ''} onChange={e => set('destinatarioNombre', e.target.value)} placeholder="NOMBRE COMPLETO" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">DNI</label>
              <input className={inputClass} inputMode="numeric" maxLength={8} value={form.destinatarioDni ?? ''} onChange={e => set('destinatarioDni', e.target.value.replace(/\D/g, ''))} placeholder="12345678" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Celular</label>
              <input className={inputClass} inputMode="tel" maxLength={9} value={form.destinatarioCelular ?? ''} onChange={e => set('destinatarioCelular', e.target.value.replace(/\D/g, ''))} placeholder="987654321" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Agencia</label>
            <input className={inputClass} value={form.agenciaNombre ?? ''} onChange={e => set('agenciaNombre', e.target.value)} placeholder="SHALOM / OLVA / ..." />
            <div className="mt-1.5 flex gap-1.5">
              {AGENCIAS_RAPIDAS.map(a => (
                <button key={a} type="button" onClick={() => set('agenciaNombre', a)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${form.agenciaNombre === a ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Departamento</label>
              <input className={inputClass} value={form.destinoDepartamento ?? ''} onChange={e => set('destinoDepartamento', e.target.value)} placeholder="LA LIBERTAD" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Provincia / ciudad</label>
              <input className={inputClass} value={form.destinoProvincia ?? ''} onChange={e => set('destinoProvincia', e.target.value)} placeholder="TRUJILLO" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Dirección de la agencia destino</label>
            <input className={inputClass} value={form.agenciaDireccion ?? ''} onChange={e => set('agenciaDireccion', e.target.value)} placeholder="AV. ESPAÑA 123" />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => guardar(false)} disabled={isSubmitting}
            className="rounded-lg border border-purple-300 px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50">
            Solo guardar
          </button>
          <button onClick={() => guardar(true)} disabled={isSubmitting}
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar e imprimir rótulo'}
          </button>
        </div>
      </div>
    </div>
  );
}
