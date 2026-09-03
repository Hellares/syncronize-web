'use client';

import { useState, useEffect } from 'react';
import type { AtributoValor, AtributoPlantilla } from '@/core/types/producto';
import * as varianteService from '@/features/producto/services/variante-service';

/**
 * La ficha técnica agrupada por SECCIONES —las plantillas con las que se
 * cargaron los atributos— y dibujada como tabla `nombre | valor`.
 *
 * Es la misma presentación que el app (`ficha_atributos.dart`): sin agrupar,
 * un producto con procesador y disco muestra veinte filas seguidas sin decir
 * qué pertenece a qué.
 *
 * 🔑 El orden lo manda `plantillasAtributosIds`, que es el que guardó el
 * producto. Un atributo que está en DOS plantillas cae en la primera que lo
 * reclama; los que no reclama ninguna —cargados a mano, o de una plantilla que
 * después se borró— NO se esconden: son datos igual, y van al final cada uno
 * con su propio nombre por título.
 */

interface Props {
  atributosValores: AtributoValor[];
  /** El orden de secciones que guardó el producto. */
  plantillasIds?: string[];
}

type Seccion = { id: string; titulo: string; valores: AtributoValor[]; suelto?: boolean };

export function agruparPorSeccion(
  atributosValores: AtributoValor[],
  plantillas: AtributoPlantilla[],
  plantillasIds: string[],
): Seccion[] {
  const porId = new Map(plantillas.map(p => [p.id, p]));
  const pendientes = new Map(atributosValores.map(av => [av.atributoId, av]));
  const secciones: Seccion[] = [];

  // El orden guardado manda; si no hay, se recorren las plantillas en el suyo.
  const orden = plantillasIds.length ? plantillasIds : plantillas.map(p => p.id);

  for (const id of orden) {
    const plantilla = porId.get(id);
    if (!plantilla) continue;
    const valores: AtributoValor[] = [];
    for (const pa of plantilla.atributos) {
      const av = pendientes.get(pa.atributoId);
      if (av) { valores.push(av); pendientes.delete(pa.atributoId); }
    }
    if (valores.length) secciones.push({ id: plantilla.id, titulo: plantilla.nombre, valores });
  }

  // Los sueltos, cada uno como su propia sección titulada con su nombre: un
  // rótulo inventado ("Otros") no dice nada y encima choca con las plantillas
  // que de verdad se llaman así.
  for (const av of pendientes.values()) {
    secciones.push({ id: av.id, titulo: av.atributo.nombre, valores: [av], suelto: true });
  }

  return secciones;
}

function TablaAtributos({ valores, soloValor }: { valores: AtributoValor[]; soloValor?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[6px] ring-1 ring-[#cfe0f5]">
      {valores.map((av, i) => (
        <div
          key={av.id}
          className={`flex items-baseline gap-3 px-3 py-1.5 ${i % 2 === 0 ? 'bg-zinc-50' : 'bg-white'} ${i > 0 ? 'border-t border-[#e6eef8]' : ''}`}
        >
          {/* El nombre se lleva 2/5 y el valor 3/5: los nombres son cortos y
              los valores se van largos. En un suelto el nombre ya está en el
              título de la sección, así que la columna sobra. */}
          {!soloValor && <span className="w-2/5 shrink-0 text-[11px] text-gray-500">{av.atributo.nombre}</span>}
          <span className="min-w-0 flex-1 text-[11px] font-medium text-gray-800">
            {av.valor || <span className="font-normal text-amber-600">sin valor</span>}
            {av.atributo.unidad && <span className="ml-0.5 font-normal text-gray-400">{av.atributo.unidad}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function SeccionColapsable({ seccion }: { seccion: Seccion }) {
  const [abierta, setAbierta] = useState(true);
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-[#cfe0f5]">
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        className="flex w-full items-center justify-between bg-[#eaf2fd] px-3 py-1.5 text-left transition-colors hover:bg-[#dfeafb]"
      >
        <span className="truncate text-[11px] font-medium text-[#004A94]">{seccion.titulo}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {!seccion.suelto && <span className="text-[10px] text-[#7ea6d8]">{seccion.valores.length}</span>}
          <svg className={`h-3.5 w-3.5 text-[#7ea6d8] transition-transform ${abierta ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {abierta && (
        <div className="p-2">
          <TablaAtributos valores={seccion.valores} soloValor={seccion.suelto} />
        </div>
      )}
    </div>
  );
}

export default function FichaTecnicaAtributos({ atributosValores, plantillasIds = [] }: Props) {
  const [plantillas, setPlantillas] = useState<AtributoPlantilla[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    varianteService.getPlantillas()
      .then(data => { if (!cancelado) setPlantillas(data); })
      // Sin plantillas no se puede agrupar, pero los datos se muestran igual:
      // una ficha sin secciones es mejor que una ficha vacía.
      .catch(() => { if (!cancelado) setPlantillas([]); });
    return () => { cancelado = true; };
  }, []);

  if (plantillas === null) {
    return <TablaAtributos valores={atributosValores} />;
  }

  const secciones = agruparPorSeccion(atributosValores, plantillas, plantillasIds);
  if (secciones.length <= 1) {
    return <TablaAtributos valores={atributosValores} />;
  }

  // Hasta tres columnas. Las secciones que no entran en la fila siguen en la
  // siguiente por su cuenta: no hace falta una regla para "la quinta".
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {secciones.map(s => <SeccionColapsable key={s.id} seccion={s} />)}
    </div>
  );
}
