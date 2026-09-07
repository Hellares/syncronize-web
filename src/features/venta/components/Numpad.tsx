'use client';

/**
 * Teclado numérico del POS, portado del `PosNumpad` del app.
 *
 * Mismo vocabulario para que quien usa las dos cosas no reaprenda nada: chips
 * de montos rápidos, grilla de dígitos con `00` y `.`, y una barra de acciones
 * configurable (en el cobro, "Exacto").
 *
 * Dos diferencias deliberadas con el app, porque acá hay teclado físico:
 *  - 🔴 NO captura teclas. El numpad SUMA una forma de tipear, no reemplaza la
 *    que ya existe; quien tiene teclado sigue escribiendo en el input.
 *  - Los botones son `type="button"` y no roban el foco (`onMouseDown` con
 *    `preventDefault`), así el cursor se queda en el campo y se puede alternar
 *    entre el teclado real y el de pantalla sin volver a hacer clic.
 *
 * El valor se maneja como STRING crudo, igual que el `NumpadController`: el
 * buffer respeta lo que se tipea y no autocompleta el `.00`, así se puede
 * poner "100" y después ".50".
 */

interface AccionNumpad {
  label: string;
  onTap: () => void;
  /** Estilo destacado (acción primaria). */
  destacado?: boolean;
  enabled?: boolean;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Chips que SUMAN al monto actual. Sin ellos, no se muestran. */
  quickAmounts?: number[];
  acciones?: AccionNumpad[];
  /** Decimales admitidos. 0 para identificadores (DNI/RUC). */
  decimales?: number;
}

/**
 * Aplica una tecla al buffer. Función pura: es lo único que hay que mirar si
 * algún día el teclado se porta raro.
 */
export function aplicarTecla(valor: string, tecla: string, decimales = 2): string {
  if (tecla === 'C') return '';
  if (tecla === '⌫') return valor.slice(0, -1);

  if (tecla === '.') {
    if (decimales === 0 || valor.includes('.')) return valor;
    return valor === '' ? '0.' : `${valor}.`;
  }

  // Dígitos y "00": se frenan al llegar al tope de decimales. Sin esto,
  // tipear de más corre la coma y el monto termina siendo otro.
  const puntoEn = valor.indexOf('.');
  if (puntoEn >= 0) {
    const yaTiene = valor.length - puntoEn - 1;
    if (yaTiene >= decimales) return valor;
    // "00" contra un solo decimal libre entra como un cero, no como dos.
    if (tecla === '00' && yaTiene + 2 > decimales) return `${valor}0`;
  }
  // Un cero solo a la izquierda no aporta: "0" + "5" es "5", no "05".
  if (valor === '0' && tecla !== '.') return tecla === '00' ? '0' : tecla;
  return valor + tecla;
}

const TECLAS = ['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '.', '00', '0'];

const BTN =
  'flex h-11 items-center justify-center rounded-lg bg-white text-sm font-medium text-gray-800 ' +
  'shadow-sm ring-1 ring-[#d1e5ff] transition-colors hover:bg-blue-50 active:bg-blue-100';

export default function Numpad({ value, onChange, quickAmounts, acciones = [], decimales = 2 }: Props) {
  // Que el botón no se lleve el foco: el cursor sigue en el input y se puede
  // alternar entre el teclado físico y este sin volver a hacer clic.
  const sinRobarFoco = (e: React.MouseEvent) => e.preventDefault();

  const sumar = (monto: number) => {
    const actual = parseFloat(value || '0') || 0;
    onChange((actual + monto).toFixed(decimales));
  };

  return (
    <div className="mt-2 rounded-xl border border-[#d1e5ff] bg-[#f7fafd] p-2">
      {quickAmounts && quickAmounts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickAmounts.map(m => (
            <button key={m} type="button" onMouseDown={sinRobarFoco} onClick={() => sumar(m)}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-[#004A94] shadow-sm ring-1 ring-[#d1e5ff] hover:bg-blue-50">
              +{m}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {TECLAS.map(t => (
          <button key={t} type="button" onMouseDown={sinRobarFoco}
            onClick={() => onChange(aplicarTecla(value, t, decimales))}
            className={`${BTN} ${t === 'C' ? 'text-red-600' : ''}`}>
            {t}
          </button>
        ))}
        {/* El hueco de la cuarta fila lo ocupa la primera acción, que es la
            que más se usa. El resto va debajo. */}
        {acciones[0] ? (
          <button type="button" onMouseDown={sinRobarFoco}
            onClick={acciones[0].onTap} disabled={acciones[0].enabled === false}
            className={`col-span-2 flex h-11 items-center justify-center rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-40 ${
              acciones[0].destacado
                ? 'bg-[#004A94] text-white hover:bg-[#003570]'
                : 'bg-white text-[#004A94] ring-1 ring-[#d1e5ff] hover:bg-blue-50'
            }`}>
            {acciones[0].label}
          </button>
        ) : <div className="col-span-2" />}
      </div>

      {acciones.length > 1 && (
        <div className="mt-1.5 flex gap-1.5">
          {acciones.slice(1).map(a => (
            <button key={a.label} type="button" onMouseDown={sinRobarFoco}
              onClick={a.onTap} disabled={a.enabled === false}
              className="flex-1 rounded-lg bg-white py-2 text-xs font-medium text-[#004A94] shadow-sm ring-1 ring-[#d1e5ff] hover:bg-blue-50 disabled:opacity-40">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
