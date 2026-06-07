'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type {
  ConfiguracionFacturacion,
  ProveedorFacturacion,
  EntornoFacturacion,
  ProbarConexionResponse,
  UpdateConfiguracionFacturacionDto,
} from '@/core/types/facturacion';
import {
  PROVEEDOR_LABEL,
  PROVEEDOR_ARCHIVADO,
  PROVEEDOR_REQUIERE_COMPANY_BRANCH,
} from '@/core/types/facturacion';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import { usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const selectClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

const PROVEEDORES: ProveedorFacturacion[] = ['SYNCROFACT', 'NUBEFACT'];
const ENTORNOS: EntornoFacturacion[] = ['BETA', 'PRODUCCION'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ConfiguracionFacturacionPage() {
  const permissions = usePermissions();
  const puedeEditar = permissions.canManageInvoices || permissions.canManageSettings;

  const [config, setConfig] = useState<ConfiguracionFacturacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [proveedorActivo, setProveedorActivo] = useState<ProveedorFacturacion>('SYNCROFACT');
  const [entorno, setEntorno] = useState<EntornoFacturacion>('BETA');
  const [proveedorRuta, setProveedorRuta] = useState('');
  const [proveedorToken, setProveedorToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [facturacionActiva, setFacturacionActiva] = useState(false);
  const [emailFacturacion, setEmailFacturacion] = useState('');
  const [resolucionSunat, setResolucionSunat] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProbarConexionResponse | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const hidratar = (c: ConfiguracionFacturacion) => {
    setProveedorActivo(c.proveedorActivo);
    setEntorno(c.entorno);
    setProveedorRuta(c.proveedorRuta ?? '');
    setProveedorToken(c.proveedorToken ?? '');
    setFacturacionActiva(c.facturacionActiva);
    setEmailFacturacion(c.emailFacturacion ?? '');
    setResolucionSunat(c.resolucionSunat ?? '');
    const pc = (c.proveedorConfig ?? {}) as Record<string, unknown>;
    setCompanyId(pc.companyId != null ? String(pc.companyId) : '');
    setBranchId(pc.branchId != null ? String(pc.branchId) : '');
  };

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const c = await facturacionService.getConfiguracion();
      setConfig(c);
      hidratar(c);
    } catch {
      setError('No se pudo cargar la configuración de facturación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const requiereCompanyBranch = PROVEEDOR_REQUIERE_COMPANY_BRANCH[proveedorActivo];
  const esArchivado = PROVEEDOR_ARCHIVADO[proveedorActivo];

  const construirProveedorConfig = (): Record<string, unknown> | undefined => {
    if (!requiereCompanyBranch) return undefined;
    const cfg: Record<string, unknown> = {};
    if (companyId.trim()) cfg.companyId = Number(companyId);
    if (branchId.trim()) cfg.branchId = Number(branchId);
    return cfg;
  };

  const handleProbar = async () => {
    setError(null);
    setTestResult(null);
    if (!proveedorRuta.trim()) { setError('Ingresa la URL del proveedor para probar'); return; }
    if (proveedorToken.trim().length < 10) { setError('El token debe tener al menos 10 caracteres'); return; }
    setIsTesting(true);
    try {
      const res = await facturacionService.probarConexion({
        proveedorActivo,
        proveedorRuta: proveedorRuta.trim(),
        proveedorToken: proveedorToken.trim(),
        proveedorConfig: construirProveedorConfig(),
      });
      setTestResult(res);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al probar la conexión');
    } finally {
      setIsTesting(false);
    }
  };

  const handleGuardar = async () => {
    setError(null);
    setSuccessMsg('');
    if (proveedorToken.trim() && proveedorToken.trim().length < 10) {
      setError('El token debe tener al menos 10 caracteres');
      return;
    }
    setIsSaving(true);
    try {
      const dto: UpdateConfiguracionFacturacionDto = {
        proveedorActivo,
        entorno,
        facturacionActiva,
      };
      if (proveedorRuta.trim()) dto.proveedorRuta = proveedorRuta.trim();
      if (proveedorToken.trim()) dto.proveedorToken = proveedorToken.trim();
      if (emailFacturacion.trim()) dto.emailFacturacion = emailFacturacion.trim();
      if (resolucionSunat.trim()) dto.resolucionSunat = resolucionSunat.trim();
      const pc = construirProveedorConfig();
      if (pc) dto.proveedorConfig = pc;

      const actualizada = await facturacionService.updateConfiguracion(dto);
      setConfig(actualizada);
      hidratar(actualizada);
      setSuccessMsg('Configuración guardada correctamente');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const copiarWebhook = () => {
    navigator.clipboard?.writeText(`${API_URL}/webhooks/syncrofact`);
    setSuccessMsg('URL del webhook copiada');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración de Facturación</h1>
          <p className="text-sm text-gray-500">Proveedor de comprobantes electrónicos y credenciales SUNAT</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${facturacionActiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {facturacionActiva ? '● Activa' : '○ Inactiva'}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${entorno === 'PRODUCCION' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {entorno}
          </span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}
      {successMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{successMsg}</p></div>}

      {!puedeEditar && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">Solo puedes ver esta configuración. Se requiere el permiso de facturación para editarla.</p>
        </div>
      )}

      {/* Proveedor */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Proveedor</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Proveedor activo *</label>
            <select className={selectClass} value={proveedorActivo} disabled={!puedeEditar}
              onChange={e => { setProveedorActivo(e.target.value as ProveedorFacturacion); setTestResult(null); }}>
              {PROVEEDORES.map(p => <option key={p} value={p}>{PROVEEDOR_LABEL[p]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Entorno *</label>
            <select className={selectClass} value={entorno} disabled={!puedeEditar}
              onChange={e => setEntorno(e.target.value as EntornoFacturacion)}>
              {ENTORNOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        {esArchivado && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-xs text-amber-700">
              {PROVEEDOR_LABEL[proveedorActivo]} está archivado: no emite nuevos comprobantes. Úsalo solo para consultar histórico; para emitir, selecciona Syncrofact.
            </p>
          </div>
        )}
        {entorno === 'PRODUCCION' && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5">
            <p className="text-xs text-red-700">⚠ Entorno de PRODUCCIÓN: los comprobantes se enviarán a SUNAT real y tendrán validez tributaria.</p>
          </div>
        )}

        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>URL API del proveedor *</label>
            <input className={inputClass} value={proveedorRuta} disabled={!puedeEditar}
              onChange={e => setProveedorRuta(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Token / credencial *</label>
            <div className="relative">
              <input className={`${inputClass} pr-16`} type={showToken ? 'text' : 'password'} value={proveedorToken}
                disabled={!puedeEditar} onChange={e => setProveedorToken(e.target.value)}
                placeholder="Token del proveedor" autoComplete="off" />
              <button type="button" onClick={() => setShowToken(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#437EFF]">
                {showToken ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {requiereCompanyBranch && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Company ID (Syncrofact)</label>
                <input className={inputClass} type="number" value={companyId} disabled={!puedeEditar}
                  onChange={e => setCompanyId(e.target.value)} placeholder="1" />
              </div>
              <div>
                <label className={labelClass}>Branch ID (Syncrofact)</label>
                <input className={inputClass} type="number" value={branchId} disabled={!puedeEditar}
                  onChange={e => setBranchId(e.target.value)} placeholder="1" />
              </div>
            </div>
          )}
        </div>

        {puedeEditar && (
          <div className="mt-4">
            <button onClick={handleProbar} disabled={isTesting}
              className="rounded-lg border border-[#437EFF] px-4 py-2 text-xs font-bold text-[#437EFF] hover:bg-[#437EFF]/5 disabled:opacity-50">
              {isTesting ? 'Probando...' : '⚡ Probar conexión'}
            </button>
          </div>
        )}

        {testResult && (
          <div className={`mt-3 rounded-lg border p-3 ${testResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-xs font-semibold ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.ok ? '✓ Conexión exitosa' : '✕ Conexión fallida'}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600">{testResult.mensaje || testResult.error}</p>
            {testResult.branches && testResult.branches.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-semibold uppercase text-gray-400">Sucursales detectadas</p>
                {testResult.branches.map(b => (
                  <div key={String(b.branchIdProveedor)} className="flex items-center justify-between rounded bg-white px-2 py-1 text-[11px]">
                    <span className="text-gray-700">{b.codigo} · {b.nombre}</span>
                    <span className="text-gray-400">{b.totalSeries} series</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Webhook (Syncrofact) */}
      {proveedorActivo === 'SYNCROFACT' && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Webhook de eventos</h2>
          <p className="mt-1 text-xs text-gray-500">
            Configura esta URL en Syncrofact para recibir actualizaciones de estado (invoice.*, daily_summary.*, communication.*).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600">{API_URL}/webhooks/syncrofact</code>
            <button onClick={copiarWebhook} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Copiar</button>
          </div>
        </section>
      )}

      {/* Datos de la empresa / billing */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Datos del emisor</h2>
        {config && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-[11px] sm:grid-cols-3">
            <div><span className="text-gray-400">RUC</span><p className="font-medium text-gray-700">{config.ruc ?? '—'}</p></div>
            <div className="col-span-2"><span className="text-gray-400">Razón social</span><p className="font-medium text-gray-700 truncate">{config.razonSocial ?? '—'}</p></div>
            <div className="col-span-3"><span className="text-gray-400">Dirección fiscal</span><p className="font-medium text-gray-700">{config.direccionFiscal ?? '—'}</p></div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Email de facturación</label>
            <input className={inputClass} type="email" value={emailFacturacion} disabled={!puedeEditar}
              onChange={e => setEmailFacturacion(e.target.value)} placeholder="facturacion@empresa.com" />
          </div>
          <div>
            <label className={labelClass}>Resolución SUNAT</label>
            <input className={inputClass} value={resolucionSunat} disabled={!puedeEditar}
              onChange={e => setResolucionSunat(e.target.value)} placeholder="No.034-005-0005315" />
          </div>
        </div>
      </section>

      {/* Activación + guardar */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Facturación electrónica activa</p>
            <p className="text-xs text-gray-500">Cuando está activa, los comprobantes se envían automáticamente al proveedor.</p>
          </div>
          <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={facturacionActiva} disabled={!puedeEditar}
            onChange={e => setFacturacionActiva(e.target.checked)} />
        </label>
      </section>

      {puedeEditar && (
        <div className="flex justify-end gap-2 pb-4">
          <button onClick={cargar} disabled={isSaving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Descartar
          </button>
          <button onClick={handleGuardar} disabled={isSaving}
            className="rounded-lg bg-[#004A94] px-5 py-2 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}
