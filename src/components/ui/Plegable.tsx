'use client';

/**
 * Una tira que ocupa UNA línea cerrada y despliega su contenido al tocarla.
 *
 * Para lo que es de CONSULTA y no de trabajo: el top de deudores, el historial
 * de ventas pagadas, los abonos. Abiertos se comen la altura que necesita la
 * lista, que es lo que se usa todos los días.
 *
 * Cerrada no es inútil: al lado del título va el resumen --cuántos y cuánto--,
 * que es lo que se mira casi siempre sin necesidad de abrir.
 */

interface Props {
  titulo: string;
  /** Lo esencial, para no tener que abrir: "4 clientes · S/ 8.420". */
  resumen?: string;
  abierto: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function Plegable({ titulo, resumen, abierto, onToggle, children }: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-blue-400/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50/60"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#437EFF] transition-transform ${abierto ? 'rotate-90' : ''}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{titulo}</span>
        {resumen && <span className="ml-auto truncate text-[11px] text-gray-400">{resumen}</span>}
      </button>
      {abierto && <div className="border-t border-gray-100 px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}
