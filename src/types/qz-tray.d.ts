declare module 'qz-tray' {
  interface QzSecurity {
    /** QZ lo invoca como resolver: (resolve, reject) => void — llamar resolve(), no devolver Promise */
    setCertificatePromise(resolver: (resolve: (cert?: string) => void, reject?: (err: unknown) => void) => void): void;
    setSignaturePromise(factory: (toSign: string) => (resolve: (sig?: string | null) => void, reject?: (err: unknown) => void) => void): void;
    setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void;
  }
  interface QzWebsocket {
    connect(options?: { retries?: number; delay?: number; host?: string }): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }
  interface QzPrinters {
    find(query?: string): Promise<string | string[]>;
    getDefault(): Promise<string>;
  }
  interface QzConfigs {
    create(printer: string, options?: Record<string, unknown>): unknown;
  }
  interface QzData {
    type: 'raw' | 'pixel';
    format?: 'hex' | 'base64' | 'plain' | 'command';
    flavor?: string;
    data: string;
  }
  const qz: {
    security: QzSecurity;
    websocket: QzWebsocket;
    printers: QzPrinters;
    configs: QzConfigs;
    print(config: unknown, data: QzData[]): Promise<void>;
  };
  export default qz;
}
