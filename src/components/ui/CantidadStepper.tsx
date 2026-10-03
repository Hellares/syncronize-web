'use client';

import NumeroInput from './NumeroInput';

/**
 * `[−] 3 [+]` con el número escribible: el mismo control de cantidad del app
 * (Venta Rápida y el sheet de variantes de Compras).
 *
 * Los botones cambian de a uno sin tocar el teclado; el número se escribe
 * cuando son muchas ("24"). Vacío no aplica nada: al salir vuelve al valor que
 * había, así borrar para reescribir no saca la línea.
 */
interface Props {
  value: number;
  onChange: (n: number) => void;
  /** Con presentación se escriben kilos: "1.5". */
  decimales?: boolean;
  puedeMas?: boolean;
  puedeMenos?: boolean;
  /** El número no se escribe (un granel ya cargado: solo se puede bajar). */
  soloLectura?: boolean;
  className?: string;
}

export default function CantidadStepper({
  value,
  onChange,
  decimales = false,
  puedeMas = true,
  puedeMenos = true,
  soloLectura = false,
  className = '',
}: Props) {
  const boton = (texto: string, habilitado: boolean, accion: () => void, titulo: string) => (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={!habilitado}
      onClick={accion}
      className="flex h-full w-6 shrink-0 items-center justify-center text-sm font-bold text-[#004A94] transition-colors hover:bg-blue-100 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent"
    >
      {texto}
    </button>
  );
  return (
    <div
      className={`flex h-[28px] items-stretch overflow-hidden rounded-[4px] bg-blue-50/60 ring-[0.5px] ring-[#004A94]/50 ${className}`}
    >
      {boton('−', puedeMenos && value > 0, () => onChange(Math.max(0, value - 1)), 'Uno menos')}
      <NumeroInput
        value={value}
        onChange={(n) => {
          if (n !== value) onChange(n);
        }}
        // Vacío al salir = lo que había, no cero.
        vacio={value}
        decimales={decimales ? 3 : 0}
        disabled={soloLectura}
        title="Cantidad"
        className="w-full min-w-0 bg-transparent text-center text-xs font-bold text-gray-800 outline-none disabled:text-gray-500"
      />
      {boton('+', puedeMas, () => onChange(value + 1), 'Uno más')}
    </div>
  );
}
