'use client';

/**
 * Formulario de un CAMPO de plantilla de servicio.
 *
 * Vive acá y no en cada pantalla porque hay TRES que lo usan (Campos de
 * servicio, el detalle de una plantilla y el formulario del servicio) y con
 * una copia por pantalla la cascada quedaba cargable en una sí y en otra no,
 * que es exactamente lo que paso el 20-09.
 *
 * Dos modos:
 * - `campo` → edición (PUT del campo).
 * - `plantillaId` → alta DENTRO de esa plantilla.
 * - ninguno de los dos → alta en el catálogo suelto de la empresa.
 */
import { useState } from 'react';
import { AxiosError } from 'axios';
import type {
  CampoServicio, TipoCampoServicio, SubCampoObjeto, SubCampoTipo,
  ConfiguracionCampoDto,
} from '@/core/types/servicio-catalogo';
import {
  TIPOS_CAMPO, TIPO_CAMPO_LABEL, TIPOS_CAMPO_CON_OPCIONES,
  CATEGORIAS_CAMPO, CATEGORIA_CAMPO_LABEL, SUB_CAMPO_TIPO_LABEL, opcionesAStrings,
  leerArbolDependiente, textoAArbol, arbolATexto, profundidadArbol,
} from '@/core/types/servicio-catalogo';
import * as service from '@/features/ordenes-servicio/services/configuracion-campos-service';
import * as catalogoService from '@/features/ordenes-servicio/services/servicio-catalogo-service';

/* --- Form crear/editar campo (incl. sub-campos OBJETO) --- */
export function CampoFormDialog({ campo, plantillaId, onClose, onSaved }: {
  campo?: CampoServicio | null;
  /** Alta dentro de una plantilla (si no, va al catálogo de la empresa). */
  plantillaId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!campo;
  const [nombre, setNombre] = useState(campo?.nombre ?? '');
  const [tipoCampo, setTipoCampo] = useState<TipoCampoServicio>((campo?.tipoCampo as TipoCampoServicio) ?? 'TEXTO');
  const [categoria, setCategoria] = useState<string>(campo?.categoria ?? '');
  const [descripcion, setDescripcion] = useState(campo?.descripcion ?? '');
  const [placeholder, setPlaceholder] = useState(campo?.placeholder ?? '');
  const [esRequerido, setEsRequerido] = useState(!!campo?.esRequerido);
  const [permiteOtro, setPermiteOtro] = useState(!!campo?.permiteOtro);
  const [opcionesTxt, setOpcionesTxt] = useState(
    campo && TIPOS_CAMPO_CON_OPCIONES.includes(campo.tipoCampo as TipoCampoServicio)
      ? opcionesAStrings(campo.opciones).join(', ')
      : ''
  );
  const [subCampos, setSubCampos] = useState<SubCampoObjeto[]>(
    campo?.tipoCampo === 'OBJETO' && Array.isArray(campo.opciones)
      ? (campo.opciones as Record<string, unknown>[]).map(o => ({
          nombre: String(o.nombre ?? ''),
          tipo: (o.tipo as SubCampoTipo) ?? 'TEXTO',
          opciones: Array.isArray(o.opciones) ? (o.opciones as unknown[]).map(String) : undefined,
        }))
      : []
  );
  // Selección en cascada: los niveles por coma y el árbol como texto
  // indentado (2 espacios por nivel). Se edita como texto porque así se PEGA
  // una lista de modelos, que es como se cargan estas tablas de verdad.
  const cascadaInicial = campo?.tipoCampo === 'OPCION_DEPENDIENTE'
    ? leerArbolDependiente(campo.opciones)
    : null;
  const [nivelesTxt, setNivelesTxt] = useState(cascadaInicial?.niveles.join(', ') ?? '');
  const [arbolTxt, setArbolTxt] = useState(cascadaInicial ? arbolATexto(cascadaInicial.arbol) : '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usaOpciones = TIPOS_CAMPO_CON_OPCIONES.includes(tipoCampo);
  const esObjeto = tipoCampo === 'OBJETO';
  const esCascada = tipoCampo === 'OPCION_DEPENDIENTE';
  const niveles = nivelesTxt.split(',').map(s => s.trim()).filter(Boolean);
  const arbolCascada = textoAArbol(arbolTxt);
  const profCascada = profundidadArbol(arbolCascada);
  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

  const submit = async () => {
    setError('');
    if (!nombre.trim()) { setError('Ingresa el nombre del campo'); return; }
    if (esObjeto && subCampos.filter(s => s.nombre.trim()).length === 0) { setError('Agrega al menos un sub-campo'); return; }

    if (esCascada) {
      if (niveles.length === 0) { setError('Ponele nombre a los niveles (ej: Fabricante, Familia, Modelo)'); return; }
      if (arbolCascada.length === 0) { setError('Cargá al menos una opción del primer nivel'); return; }
      // El backend rechaza lo mismo: acá se avisa antes de mandar.
      if (profCascada > niveles.length) {
        setError(`Hay opciones indentadas más allá del último nivel ("${niveles[niveles.length - 1]}")`);
        return;
      }
    }

    let opciones: unknown = undefined;
    if (esCascada) {
      opciones = { niveles, arbol: arbolCascada };
    } else if (usaOpciones) {
      opciones = opcionesTxt.split(',').map(s => s.trim()).filter(Boolean);
    } else if (esObjeto) {
      opciones = subCampos
        .filter(s => s.nombre.trim())
        .map(s => {
          const entry: Record<string, unknown> = { nombre: s.nombre.trim(), tipo: s.tipo };
          if (s.tipo === 'OPCION_SIMPLES' && s.opciones?.length) entry.opciones = s.opciones;
          return entry;
        });
    }

    const data: ConfiguracionCampoDto = {
      nombre: nombre.trim(),
      tipoCampo,
      categoria: categoria || null,
      descripcion: descripcion.trim() || null,
      placeholder: placeholder.trim() || null,
      esRequerido,
      permiteOtro: usaOpciones ? permiteOtro : false,
      opciones,
    };

    setIsSubmitting(true);
    try {
      // Tres destinos: editar el campo, crearlo DENTRO de una plantilla, o
      // crearlo en el catálogo suelto de la empresa.
      if (esEdicion) await service.actualizarCampo(campo!.id, data);
      else if (plantillaId) await catalogoService.addCampoPlantilla(plantillaId, data);
      else await service.crearCampo(data);
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el campo');
      setIsSubmitting(false);
    }
  };

  const eliminar = async () => {
    if (!campo || !confirm('¿Eliminar este campo? Las órdenes existentes conservan los datos ya capturados.')) return;
    setIsSubmitting(true);
    try { await service.eliminarCampo(campo.id); onSaved(); }
    catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo eliminar el campo');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar campo' : 'Nuevo campo'}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre del campo *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Número de serie, IMEI..." autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de campo</label>
            <select className={`${inputClass} bg-white`} value={tipoCampo} onChange={e => setTipoCampo(e.target.value as TipoCampoServicio)}>
              {TIPOS_CAMPO.map(t => <option key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Categoría (opcional)</label>
            <select className={`${inputClass} bg-white`} value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Sin categoría</option>
              {CATEGORIAS_CAMPO.map(c => <option key={c} value={c}>{CATEGORIA_CAMPO_LABEL[c]}</option>)}
            </select>
          </div>

          {esCascada && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Niveles (separados por coma)</label>
                <input className={inputClass} value={nivelesTxt} onChange={e => setNivelesTxt(e.target.value)} placeholder="Fabricante, Familia, Modelo" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Opciones (una por línea, indentá con 2 espacios)</label>
                <textarea className={`${inputClass} resize-y font-mono`} rows={8} value={arbolTxt} onChange={e => setArbolTxt(e.target.value)}
                  placeholder={'QUALCOMM\n  SNAPDRAGON\n    8 Gen 3\n    888\nINTEL\n  CORE\n    i5-12400'} />
                <p className="mt-1 text-[10px] text-gray-400">
                  Cada sangría es el nivel siguiente: lo que cuelga de QUALCOMM solo aparece si se eligió QUALCOMM.
                </p>
                {arbolCascada.length > 0 && (
                  <p className={`mt-1 text-[10px] ${profCascada > niveles.length && niveles.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {arbolCascada.length} en el primer nivel · {profCascada} {profCascada === 1 ? 'nivel' : 'niveles'} de profundidad
                    {niveles.length > 0 && ` · declarados ${niveles.length}`}
                  </p>
                )}
              </div>
            </>
          )}

          {usaOpciones && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Opciones (separadas por coma)</label>
                <input className={inputClass} value={opcionesTxt} onChange={e => setOpcionesTxt(e.target.value)} placeholder="Opción 1, Opción 2, Opción 3" />
              </div>
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Permitir &quot;Otro&quot;</span>
                <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={permiteOtro} onChange={e => setPermiteOtro(e.target.checked)} />
              </label>
            </>
          )}

          <input className={inputClass} value={placeholder} onChange={e => setPlaceholder(e.target.value)} placeholder="Placeholder (opcional)" />
          <input className={inputClass} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción de ayuda (opcional)" />

          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Campo requerido</span>
            <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={esRequerido} onChange={e => setEsRequerido(e.target.checked)} />
          </label>

          {/* Sub-campos para tipo OBJETO */}
          {esObjeto && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Sub-campos</span>
                <button type="button" onClick={() => setSubCampos([...subCampos, { nombre: '', tipo: 'TEXTO' }])}
                  className="text-[11px] font-semibold text-[#437EFF] hover:underline">+ Agregar</button>
              </div>
              {subCampos.length === 0 && <p className="text-[11px] text-gray-400">Agrega sub-campos con el botón +.</p>}
              <div className="space-y-2">
                {subCampos.map((sub, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <input className={`${inputClass} flex-1`} value={sub.nombre} placeholder="Nombre"
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, nombre: e.target.value } : s))} />
                      <select className={`${inputClass} w-28 bg-white`} value={sub.tipo}
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, tipo: e.target.value as SubCampoTipo, opciones: undefined } : s))}>
                        {(Object.keys(SUB_CAMPO_TIPO_LABEL) as SubCampoTipo[]).map(t => <option key={t} value={t}>{SUB_CAMPO_TIPO_LABEL[t]}</option>)}
                      </select>
                      <button type="button" onClick={() => setSubCampos(subCampos.filter((_, j) => j !== i))}
                        className="px-1 text-red-400 hover:text-red-600">✕</button>
                    </div>
                    {sub.tipo === 'OPCION_SIMPLES' && (
                      <input className={`${inputClass} text-xs`} placeholder="Opciones separadas por coma (ej: AM5, AM4)"
                        value={(sub.opciones ?? []).join(', ')}
                        onChange={e => setSubCampos(subCampos.map((s, j) => j === i ? { ...s, opciones: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } : s))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {esEdicion ? (
            <button onClick={eliminar} disabled={isSubmitting} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={isSubmitting}
              className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
