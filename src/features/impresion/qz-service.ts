// Puente con QZ Tray (websocket localhost) para enviar ESC-POS crudo
// a la impresora térmica emparejada al sistema operativo.
import qz from 'qz-tray';
import { KJUR, KEYUTIL, hextob64 } from 'jsrsasign';
import { QZ_CERTIFICATE, QZ_PRIVATE_KEY } from './qz-keys';

/** Config local de impresora (paridad ImpresorasManager de Flutter, en localStorage) */
export interface ImpresoraWebConfig {
  impresoraNombre: string;
  paperWidth: 58 | 80;
  autoImprimirVenta: boolean;
}

const STORAGE_KEY = 'impresora_termica_web_v1';

export function getImpresoraConfig(): ImpresoraWebConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as ImpresoraWebConfig : null;
  } catch { return null; }
}

export function saveImpresoraConfig(config: ImpresoraWebConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearImpresoraConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

let configured = false;

/** Conecta al websocket de QZ Tray (modo unsigned: QZ pide permiso al usuario la 1ª vez) */
export async function conectarQz(): Promise<void> {
  if (!configured) {
    // Peticiones FIRMADAS con nuestro certificado auto-firmado: QZ lo confía
    // vía authcert.override en cada PC → conexión verde, sin diálogos.
    // OJO: QZ invoca estos handlers como RESOLVERS (resolve, reject) — hay que
    // llamar resolve(), no devolver una Promise (eso colgaba todo).
    qz.security.setCertificatePromise((resolve: (cert?: string) => void) => { resolve(QZ_CERTIFICATE); });
    // Declarar el algoritmo que usamos al firmar (default de la lib es SHA1 → "Bad signature")
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise((toSign: string) => (resolve: (sig?: string | null) => void, reject?: (err: unknown) => void) => {
      try {
        const key = KEYUTIL.getKey(QZ_PRIVATE_KEY);
        const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
        sig.init(key);
        sig.updateString(toSign);
        resolve(hextob64(sig.sign()));
      } catch (err) {
        reject?.(err);
      }
    });
    configured = true;
  }
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }
}

export function qzActivo(): boolean {
  try { return qz.websocket.isActive(); } catch { return false; }
}

export async function desconectarQz(): Promise<void> {
  if (qz.websocket.isActive()) await qz.websocket.disconnect();
}

/** Lista las impresoras instaladas en el sistema */
export async function listarImpresoras(): Promise<string[]> {
  await conectarQz();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

/** Envía bytes ESC-POS crudos a la impresora indicada */
export async function imprimirRaw(impresoraNombre: string, bytes: number[]): Promise<void> {
  await conectarQz();
  const config = qz.configs.create(impresoraNombre);
  // hex evita problemas de encoding en el transporte websocket (formato canónico 2.2)
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  await qz.print(config, [{ type: 'raw', format: 'command', flavor: 'hex', data: hex }]);
}

/** Imprime en la impresora principal configurada (null config → error descriptivo) */
export async function imprimirEnPrincipal(bytes: number[]): Promise<void> {
  const config = getImpresoraConfig();
  if (!config?.impresoraNombre) throw new Error('No hay impresora térmica configurada');
  await imprimirRaw(config.impresoraNombre, bytes);
}
