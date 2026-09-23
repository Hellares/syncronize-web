'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { DIALOG_BODY, DIALOG_FOOT, DIALOG_HEAD, DIALOG_PANEL_RELIEVE_3XL, INPUT_STD, LABEL } from '@/components/ui/dialogo';
import type { Sede } from '@/core/types/empresa';
import type { PermisosPorRol, RegistroUsuarioResponse } from '@/core/types/usuario';
import { consultarDni } from '@/features/cotizacion/services/cliente-service';
import { registrarUsuario } from '../services/usuario-service';
import { IDS_ACCESOS_RAPIDOS } from '../catalogos';
import AccesoUsuarioCampos, { payloadAcceso, type ConfigAcceso } from './AccesoUsuarioCampos';

interface Props {
  isOpen: boolean;
  sedes: Sede[];
  tabla: PermisosPorRol | null;
  onClose: () => void;
  onSuccess: (r: RegistroUsuarioResponse) => void;
}

const vacio = (sedes: Sede[]): ConfigAcceso => ({
  rol: null,
  // Con una sola sede va sola: el selector ni se muestra.
  sedeIds: sedes.length === 1 ? [sedes[0].id] : [],
  permisos: [],
  // Hasta elegir el rol, nada del dashboard: al elegirlo entra su configuración estándar.
  ocultos: [...IDS_ACCESOS_RAPIDOS],
  limiteCreditoVenta: '',
});

/**
 * Alta de un trabajador — réplica de `usuario_form_page.dart`.
 *
 * El DNI es la llave: si esa persona ya tiene cuenta (en otra empresa, o acá
 * como cliente) el backend la reutiliza y solo crea el vínculo. Si es nueva,
 * su contraseña temporal es el DNI y se le pide cambiarla al entrar.
 */
export default function UsuarioFormDialog({ isOpen, sedes, tabla, onClose, onSuccess }: Props) {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [acceso, setAcceso] = useState<ConfigAcceso>(() => vacio(sedes));
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniMsg, setDniMsg] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const sedesKey = useMemo(() => sedes.map((s) => s.id).join(','), [sedes]);

  useEffect(() => {
    if (!isOpen) return;
    setDni(''); setNombres(''); setApellidos(''); setTelefono(''); setEmail('');
    setDireccion(''); setDistrito(''); setProvincia(''); setDepartamento('');
    setAcceso(vacio(sedes));
    setDniMsg(''); setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sedesKey]);

  const buscarDni = useCallback(async (valor: string) => {
    if (!/^\d{8}$/.test(valor)) return;
    setBuscandoDni(true);
    setDniMsg('');
    try {
      const r = await consultarDni(valor);
      setNombres(r.nombres ?? '');
      setApellidos([r.apellidoPaterno, r.apellidoMaterno].filter(Boolean).join(' ') || (r.nombreCompleto ?? ''));
      if (r.direccion) setDireccion(r.direccion);
      if (r.distrito) setDistrito(r.distrito);
      if (r.provincia) setProvincia(r.provincia);
      if (r.departamento) setDepartamento(r.departamento);
      setDniMsg(`✓ ${r.nombreCompleto ?? 'Datos encontrados'}`);
    } catch {
      setDniMsg('No se encontraron datos: complétalos a mano');
    } finally {
      setBuscandoDni(false);
    }
  }, []);

  const guardar = async () => {
    setError('');
    if (!/^\d{8}$/.test(dni)) return setError('El DNI debe tener 8 dígitos');
    if (!nombres.trim()) return setError('Los nombres son obligatorios');
    if (!apellidos.trim()) return setError('Los apellidos son obligatorios');
    if (!/^9\d{8}$/.test(telefono)) return setError('El teléfono debe tener 9 dígitos y empezar con 9');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('El email no es válido');
    if (!acceso.rol) return setError('Elige un rol');
    if (sedes.length > 0 && acceso.sedeIds.length === 0) return setError('Asígnale al menos una sede');

    const opt = (v: string) => v.trim() || undefined;
    setGuardando(true);
    try {
      const r = await registrarUsuario({
        dni,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono,
        email: opt(email),
        direccion: opt(direccion),
        distrito: opt(distrito),
        provincia: opt(provincia),
        departamento: opt(departamento),
        ...payloadAcceso(acceso),
      });
      onSuccess(r);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={DIALOG_PANEL_RELIEVE_3XL} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={DIALOG_HEAD}>
          <h3 className="text-sm font-medium text-[#004A94]">Nuevo usuario</h3>
          <p className="text-[11px] text-gray-400">Si la persona ya tiene cuenta, se la vincula a la empresa con el rol que elijas.</p>
        </div>

        <div className={DIALOG_BODY}>
          <div className="grid gap-5 pb-3 md:grid-cols-2">
            {/* Datos de la persona */}
            <div className="space-y-3">
              <div>
                <label className={LABEL}>DNI *</label>
                <div className="relative">
                  <input
                    className={INPUT_STD}
                    value={dni}
                    maxLength={8}
                    inputMode="numeric"
                    placeholder="12345678"
                    autoFocus
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setDni(v);
                      setDniMsg('');
                      if (v.length === 8) buscarDni(v);
                    }}
                  />
                  {buscandoDni && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">RENIEC…</span>}
                </div>
                {dniMsg && <p className={`mt-0.5 text-[11px] ${dniMsg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{dniMsg}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={LABEL}>Nombres *</label><input className={INPUT_STD} value={nombres} onChange={(e) => setNombres(e.target.value)} /></div>
                <div><label className={LABEL}>Apellidos *</label><input className={INPUT_STD} value={apellidos} onChange={(e) => setApellidos(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>Teléfono *</label>
                  <input className={INPUT_STD} value={telefono} maxLength={9} inputMode="numeric" placeholder="987654321" onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div><label className={LABEL}>Email</label><input className={INPUT_STD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              <div><label className={LABEL}>Dirección</label><input className={INPUT_STD} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={LABEL}>Distrito</label><input className={INPUT_STD} value={distrito} onChange={(e) => setDistrito(e.target.value)} /></div>
                <div><label className={LABEL}>Provincia</label><input className={INPUT_STD} value={provincia} onChange={(e) => setProvincia(e.target.value)} /></div>
                <div><label className={LABEL}>Departamento</label><input className={INPUT_STD} value={departamento} onChange={(e) => setDepartamento(e.target.value)} /></div>
              </div>
              <p className="rounded-md bg-[#eaf2fd] px-2 py-1.5 text-[11px] text-[#004A94]">
                Si es una cuenta nueva, su contraseña temporal es el DNI y se le pedirá cambiarla al entrar.
              </p>
            </div>

            {/* Rol y permisos */}
            <AccesoUsuarioCampos
              value={acceso}
              onChange={setAcceso}
              sedes={sedes}
              tabla={tabla}
              presetAlElegirRol
              mostrarLimiteCredito={false}
            />
          </div>
        </div>

        <div className={DIALOG_FOOT}>
          {error && <p className="mr-auto self-center text-[11px] text-red-600">{error}</p>}
          <button onClick={onClose} disabled={guardando} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {guardando ? 'Registrando…' : 'Registrar usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
