'use client';

/**
 * Mandarle algo a un cliente por WhatsApp, desde cualquier pantalla.
 *
 * Vive acá y no dentro de cada pantalla porque el flujo tiene una bifurcación
 * —¿la empresa tiene su línea vinculada o no?— y cuatro pasos, y duplicarlo es
 * garantizar que las dos copias se separen. Es el equivalente de
 * `WhatsappClienteService` + `mensaje_whatsapp_dialog` del app.
 *
 * Las dos ramas:
 *
 * - **Con la línea vinculada** el mensaje sale desde el número de la empresa
 *   sin salir de la web, con el adjunto incluido.
 * - **Sin vincular** se abre WhatsApp con el texto ya escrito. 🔴 El adjunto
 *   NO viaja por el enlace —`wa.me` solo prellena texto—, así que se descarga
 *   para adjuntarlo a mano. Callarlo termina con el usuario creyendo que mandó
 *   el catálogo cuando solo mandó el saludo.
 */

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { enlaceWhatsapp, esCelularEscrito, telefonoParaWhatsapp } from '@/core/utils/telefono';
import * as whatsappService from '../services/whatsapp-service';

export interface AdjuntoWhatsapp {
  /** Con el que el cliente lo ve en su WhatsApp: `catalogo_jayliland.pdf`. */
  nombre: string;
  /** Una línea para saber qué se manda: "6 productos · 240 KB". */
  detalle?: string;
  tipo: 'pdf' | 'imagen';
  /**
   * 🔴 Se arma AL ENVIAR, no al abrir el cuadro: un catálogo de sesenta
   * productos con sus fotos tarda, y armarlo para que después cancelen es
   * trabajo tirado.
   */
  construir: () => Promise<Blob>;
}

interface Props {
  titulo: string;
  textoInicial: string;
  numeroInicial?: string | null;
  /** De dónde salió el número, para que se entienda que se puede cambiar. */
  ayudaNumero?: string;
  adjunto?: AdjuntoWhatsapp;
  onClose: () => void;
  onEnviado?: () => void;
}

const INPUT_STD =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';
const INPUT_STD_TA =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200';
const LABEL = 'mb-1 block text-[11px] font-medium text-gray-600';

/** `data:application/pdf;base64,AAA…` → `AAA…`. El backend lo quiere pelado. */
function base64Pelado(dataUri: string): string {
  const coma = dataUri.indexOf(',');
  return coma >= 0 ? dataUri.slice(coma + 1) : dataUri;
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () =>
      typeof fr.result === 'string'
        ? resolve(base64Pelado(fr.result))
        : reject(new Error('No se pudo leer el archivo'));
    fr.onerror = () => reject(fr.error ?? new Error('No se pudo leer el archivo'));
    fr.readAsDataURL(blob);
  });
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  // Sin el revoke el blob queda en memoria toda la sesión. El timeout está
  // porque Firefox cancela la descarga si se revoca en el mismo tick.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function EnviarPorWhatsappDialog({
  titulo,
  textoInicial,
  numeroInicial,
  ayudaNumero,
  adjunto,
  onClose,
  onEnviado,
}: Props) {
  const { empresa } = useEmpresa();

  const [numero, setNumero] = useState(numeroInicial ?? '');
  const [texto, setTexto] = useState(textoInicial);
  // null = todavía preguntando. Ante cualquier problema queda en false: abrir
  // WhatsApp siempre funciona, y es preferible a prometer un envío que no pasa.
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [numeroEmpresa, setNumeroEmpresa] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorNumero, setErrorNumero] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!empresa?.id) return;
    let cancelado = false;
    whatsappService
      .getEstado(empresa.id)
      .then((e) => {
        if (cancelado) return;
        setConectado(e.conectado);
        setNumeroEmpresa(e.numero ?? null);
      })
      .catch(() => {
        if (!cancelado) setConectado(false);
      });
    return () => {
      cancelado = true;
    };
  }, [empresa?.id]);

  const validar = useCallback(() => {
    if (!esCelularEscrito(numero)) {
      setErrorNumero('Escribí un celular válido');
      return null;
    }
    setErrorNumero(null);
    return telefonoParaWhatsapp(numero);
  }, [numero]);

  /** Sale desde el número de la empresa, con el adjunto adentro. */
  const enviarPorElSistema = async () => {
    const destino = validar();
    if (!destino || !empresa?.id) return;

    setTrabajando(true);
    setError(null);
    try {
      if (adjunto) {
        const blob = await adjunto.construir();
        const base64 = await blobABase64(blob);
        if (adjunto.tipo === 'pdf') {
          await whatsappService.enviarDocumento(empresa.id, {
            numero: destino,
            base64,
            nombreArchivo: adjunto.nombre,
            caption: texto,
          });
        } else {
          await whatsappService.enviarImagen(empresa.id, {
            numero: destino,
            base64,
            caption: texto,
            mimetype: blob.type || 'image/png',
          });
        }
      } else {
        await whatsappService.enviarMensaje(empresa.id, destino, texto);
      }
      setEnviado(true);
      onEnviado?.();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(
        (Array.isArray(msg) ? msg.join(', ') : msg) ||
          'No se pudo enviar desde el sistema. Probá abriendo WhatsApp.',
      );
    } finally {
      setTrabajando(false);
    }
  };

  /**
   * Abre el chat con el texto puesto y deja el archivo descargado.
   *
   * 🔴 El `window.open` va PRIMERO y sin `await` delante: después de esperar a
   * que se arme el PDF, el navegador ya no reconoce el clic y bloquea la
   * pestaña. Por eso primero se abre y después se descarga.
   */
  const abrirWhatsapp = async () => {
    const destino = validar();
    if (!destino) return;

    window.open(enlaceWhatsapp(destino, texto), '_blank', 'noopener');
    if (!adjunto) {
      onClose();
      return;
    }

    setTrabajando(true);
    setError(null);
    try {
      descargar(await adjunto.construir(), adjunto.nombre);
      setEnviado(true);
    } catch {
      setError('Se abrió WhatsApp, pero no se pudo preparar el archivo.');
    } finally {
      setTrabajando(false);
    }
  };

  const viaja = conectado === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 font-sans shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">{titulo}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {conectado === null
            ? 'Verificando la línea de la empresa…'
            : viaja
              ? `Sale del WhatsApp de la empresa${numeroEmpresa ? ` (${numeroEmpresa})` : ''} sin salir de la web`
              : 'Se abre WhatsApp con el texto ya escrito'}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className={LABEL}>Celular del cliente</label>
            <input
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                setErrorNumero(null);
                setEnviado(false);
              }}
              placeholder="987 654 321"
              inputMode="tel"
              autoFocus
              className={`${INPUT_STD} ${errorNumero ? 'ring-red-400' : 'ring-blue-400'}`}
            />
            {errorNumero ? (
              <p className="mt-1 text-[10px] text-red-600">{errorNumero}</p>
            ) : (
              ayudaNumero && <p className="mt-1 text-[10px] text-gray-400">{ayudaNumero}</p>
            )}
          </div>

          {adjunto && (
            <div
              className={`rounded-[6px] p-3 ring-1 shadow-sm transition-all duration-300 ${
                viaja ? 'bg-green-50/60 ring-green-400/50' : 'bg-amber-50/60 ring-amber-400/50'
              }`}
            >
              <p className="text-[11px] font-medium text-[#004A94]">{adjunto.nombre}</p>
              <p className={`mt-0.5 text-[10px] ${viaja ? 'text-gray-500' : 'text-amber-800'}`}>
                {viaja
                  ? (adjunto.detalle ?? 'Se envía con el mensaje')
                  : 'WhatsApp no acepta archivos por enlace: se abre el chat con el texto y el archivo se descarga para que lo adjuntes ahí.'}
              </p>
            </div>
          )}

          <div>
            <label className={LABEL}>Mensaje</label>
            {/* Se redacta ACÁ y no en WhatsApp: el enlace deja el cursor al
                principio del texto y no hay forma de moverlo, así que seguir
                escribiendo del otro lado obliga a reposicionarlo a mano. */}
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              className={INPUT_STD_TA}
            />
            <p className="mt-1 text-[10px] text-gray-400">
              WhatsApp entiende *negrita* entre asteriscos.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        {enviado && (
          <p className="mt-3 text-xs font-medium text-green-700">
            {viaja
              ? `Enviado al ${numero}`
              : 'WhatsApp abierto y archivo descargado: adjuntalo en el chat.'}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {enviado ? 'Cerrar' : 'Cancelar'}
          </button>
          {/* Mientras se verifica la línea no se ofrece nada: el botón tiene que
              decir lo que REALMENTE va a pasar. */}
          <button
            onClick={viaja ? enviarPorElSistema : abrirWhatsapp}
            disabled={trabajando || conectado === null}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#1da851] disabled:opacity-50"
          >
            {trabajando && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {trabajando
              ? 'Preparando…'
              : viaja
                ? enviado
                  ? 'Enviar de nuevo'
                  : 'Enviar'
                : 'Abrir WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
