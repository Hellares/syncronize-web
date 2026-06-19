'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';
import * as yapeService from '@/features/integraciones/services/yape-service';
import type { IntegracionYapeConfig } from '@/features/integraciones/services/yape-service';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

export default function IntegracionYapePage() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const permissions = usePermissions();
  const puedeEditar = permissions.canManageSettings;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [config, setConfig] = useState<IntegracionYapeConfig | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('https://yape.syncronize.net.pe');
  const [accountId, setAccountId] = useState('');
  const [accountApiKey, setAccountApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [habilitado, setHabilitado] = useState(true);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const cfg = await yapeService.getIntegracionYape(empresaId);
      setConfig(cfg);
      if (cfg.apiBaseUrl) setApiBaseUrl(cfg.apiBaseUrl);
      setAccountId(cfg.accountId ?? '');
      setHabilitado(cfg.habilitado);
    } catch {
      setError('No se pudo cargar la configuración de Yape');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    setSuccessMsg('');
    try {
      const dto: yapeService.UpdateIntegracionYapeDto = {
        apiBaseUrl: apiBaseUrl.trim(),
        accountId: accountId.trim(),
        habilitado,
      };
      // Los secretos solo se envían si el usuario escribió uno nuevo.
      if (accountApiKey.trim()) dto.accountApiKey = accountApiKey.trim();
      if (webhookSecret.trim()) dto.webhookSecret = webhookSecret.trim();

      const cfg = await yapeService.updateIntegracionYape(empresaId, dto);
      setConfig(cfg);
      setAccountApiKey('');
      setWebhookSecret('');
      setSuccessMsg('Integración guardada correctamente');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'No se pudo guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const handleProbar = async () => {
    setProbando(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await yapeService.probarIntegracionYape(empresaId);
      if (res.ok) {
        setSuccessMsg(res.mensaje);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(res.mensaje);
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'No se pudo probar la conexión');
    } finally {
      setProbando(false);
    }
  };

  const copiarWebhook = () => {
    if (config?.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setSuccessMsg('URL del webhook copiada');
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-[#004A94]">Integración Yape</h1>
        <p className="mt-1 text-xs text-gray-500">
          Conecta tu cuenta de api-yape para validar automáticamente los cobros Yape/Plin.
          Crea la cuenta en el panel de api-yape y pega aquí sus credenciales.
        </p>
      </div>

      {/* Estado */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            config?.configurado && config?.habilitado ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-xs text-gray-600">
          {config?.configurado
            ? config?.habilitado
              ? 'Integración activa'
              : 'Configurada (deshabilitada)'
            : 'Sin configurar'}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <label className={labelClass}>URL base de api-yape</label>
          <input
            className={inputClass}
            value={apiBaseUrl}
            disabled={!puedeEditar}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://yape.syncronize.net.pe"
          />
        </div>

        <div>
          <label className={labelClass}>Account ID</label>
          <input
            className={inputClass}
            value={accountId}
            disabled={!puedeEditar}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="id de la cuenta en api-yape"
          />
        </div>

        <div>
          <label className={labelClass}>Account API Key (acc_…)</label>
          <input
            className={inputClass}
            value={accountApiKey}
            disabled={!puedeEditar}
            onChange={(e) => setAccountApiKey(e.target.value)}
            placeholder={
              config?.accountApiKeyMask
                ? `Actual: ${config.accountApiKeyMask} — dejar vacío para conservar`
                : 'acc_…'
            }
          />
        </div>

        <div>
          <label className={labelClass}>Webhook Secret (whsec_…)</label>
          <input
            className={inputClass}
            value={webhookSecret}
            disabled={!puedeEditar}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={
              config?.webhookSecretMask
                ? `Actual: ${config.webhookSecretMask} — dejar vacío para conservar`
                : 'whsec_…'
            }
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={habilitado}
            disabled={!puedeEditar}
            onChange={(e) => setHabilitado(e.target.checked)}
          />
          Integración habilitada
          <span className="text-xs text-gray-400">
            (si se apaga, los cobros vuelven a modo manual)
          </span>
        </label>
      </div>

      {/* Webhook a configurar en api-yape */}
      {config?.webhookUrl && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-medium text-[#004A94]">
            Webhook a configurar en api-yape
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            En el panel admin de api-yape, pega esta URL en el webhook de la cuenta para
            que confirme los pagos:
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            <code className="flex-1 break-all text-xs text-[#004A94]">{config.webhookUrl}</code>
            <button
              onClick={copiarWebhook}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {puedeEditar && (
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="rounded-lg bg-[#437EFF] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleProbar}
            disabled={probando || !config?.configurado}
            className="rounded-lg border border-[#437EFF] px-4 py-2 text-sm font-medium text-[#437EFF] disabled:opacity-40"
          >
            {probando ? 'Probando…' : 'Probar conexión'}
          </button>
        </div>
      )}
      {!config?.configurado && (
        <p className="mt-2 text-xs text-gray-400">
          Guarda la configuración para habilitar la prueba de conexión.
        </p>
      )}
    </div>
  );
}
