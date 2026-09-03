'use client';

import { useState, useEffect } from 'react';
import { useAtributos } from '@/features/producto/hooks/use-atributos';
import { usePermissions } from '@/features/empresa/context/empresa-context';
import type { ProductoAtributo, AtributoTipo, CreateProductoAtributoDto } from '@/core/types/producto';

// --- Tipo config: icono, color, label ---

const TIPO_CONFIG: Record<AtributoTipo, { label: string; icon: string; color: string }> = {
  COLOR:        { label: 'Color',           icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'bg-pink-100 text-pink-700' },
  TALLA:        { label: 'Talla',           icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4', color: 'bg-blue-100 text-blue-700' },
  MATERIAL:     { label: 'Material',        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'bg-amber-100 text-amber-700' },
  CAPACIDAD:    { label: 'Capacidad',       icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color: 'bg-cyan-100 text-cyan-700' },
  SELECT:       { label: 'Selección',       icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'bg-indigo-100 text-indigo-700' },
  MULTI_SELECT: { label: 'Multi-Selección', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'bg-violet-100 text-violet-700' },
  BOOLEAN:      { label: 'Sí/No',           icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-green-100 text-green-700' },
  NUMERO:       { label: 'Número',          icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14', color: 'bg-orange-100 text-orange-700' },
  TEXTO:        { label: 'Texto',           icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'bg-gray-100 text-gray-600' },

  // Traidos del catalogo de tipos de campo de servicio (2026-08-14). Las
  // etiquetas son las mismas que muestra la app.
  TEXTO_AREA:          { label: 'Texto largo',      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-gray-100 text-gray-600' },
  MONEDA:              { label: 'Monto (S/)',       icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-emerald-100 text-emerald-700' },
  EMAIL:               { label: 'Email',            icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'bg-sky-100 text-sky-700' },
  TELEFONO:            { label: 'Teléfono',         icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'bg-sky-100 text-sky-700' },
  URL:                 { label: 'URL',              icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', color: 'bg-sky-100 text-sky-700' },
  FECHA:               { label: 'Fecha',            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-teal-100 text-teal-700' },
  HORA:                { label: 'Hora',             icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-teal-100 text-teal-700' },
  CODIGO_BARRAS:       { label: 'Código de barras', icon: 'M12 4v16m3-16v16M6 4v16m12-16v16M3 4v16m18-16v16', color: 'bg-slate-100 text-slate-700' },
  PIN_CLAVE:           { label: 'PIN / clave',      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'bg-slate-100 text-slate-700' },
  PATRON_DESBLOQUEO:   { label: 'Patrón desbloqueo', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', color: 'bg-slate-100 text-slate-700' },
  DOCUMENTO_IDENTIDAD: { label: 'DNI / RUC',        icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2', color: 'bg-rose-100 text-rose-700' },
  PLACA_VEHICULO:      { label: 'Placa',            icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1', color: 'bg-rose-100 text-rose-700' },
  LICENCIA_CONDUCIR:   { label: 'Licencia',         icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-rose-100 text-rose-700' },
  FOTO:                { label: 'Foto',             icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-fuchsia-100 text-fuchsia-700' },
  FIRMA:               { label: 'Firma',            icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', color: 'bg-fuchsia-100 text-fuchsia-700' },
  ARCHIVO:             { label: 'Archivo',          icon: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13', color: 'bg-fuchsia-100 text-fuchsia-700' },
  INSPECCION_VISUAL:   { label: 'Inspección visual', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', color: 'bg-yellow-100 text-yellow-700' },
  PRODUCTO_CATALOGO:   { label: 'Producto del catálogo', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'bg-yellow-100 text-yellow-700' },
  SELECT_DEPENDIENTE:  { label: 'Selección dependiente', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: 'bg-indigo-100 text-indigo-700' },
};

// Tipos que REQUIEREN valores predefinidos: los únicos que se llenan eligiendo
// de una lista y, por lo mismo, los únicos que generan variantes.
const TIPOS_REQUIEREN_VALORES: AtributoTipo[] = ['SELECT', 'MULTI_SELECT', 'SELECT_DEPENDIENTE'];

/** Los que pueden ser padre de una cadena: se eligen de una lista simple. */
const TIPOS_PUEDEN_SER_PADRE: AtributoTipo[] = ['SELECT', 'SELECT_DEPENDIENTE'];

// Los cuatro legacy no son tipos de dato sino NOMBRES de atributo: se
// comportaban igual que SELECT y ya no se ofrecen al crear. Siguen en el tipo
// para que una fila vieja no se rompa al mostrarse.
const TIPOS_LEGACY: AtributoTipo[] = ['COLOR', 'TALLA', 'MATERIAL', 'CAPACIDAD'];

// Todo lo que no se elige de una lista se tipea, así que PROHÍBE valores. Se
// deriva en vez de enumerarse: un tipo nuevo cae del lado correcto solo.
const prohibeValoresPredefinidos = (t: AtributoTipo) =>
  !TIPOS_REQUIEREN_VALORES.includes(t) && !TIPOS_LEGACY.includes(t);

// Orden del selector, igual que `kTiposAtributoProducto` en la app.
const TIPOS_OFRECIDOS: AtributoTipo[] = [
  'SELECT', 'MULTI_SELECT', 'SELECT_DEPENDIENTE',
  'TEXTO', 'TEXTO_AREA', 'NUMERO', 'MONEDA', 'BOOLEAN',
  'FECHA', 'HORA', 'EMAIL', 'TELEFONO', 'URL',
  'CODIGO_BARRAS', 'PIN_CLAVE', 'PATRON_DESBLOQUEO',
  'DOCUMENTO_IDENTIDAD', 'PLACA_VEHICULO', 'LICENCIA_CONDUCIR',
  'FOTO', 'FIRMA', 'ARCHIVO',
  'INSPECCION_VISUAL', 'PRODUCTO_CATALOGO',
];

// Estilo estandar de inputs de la web (zinc + ring azul + glow al focus), el
// mismo de `CotizacionForm`, `ProductoForm` y los dialogos de stock. El
// `border-gray-200` de antes casi no se ve sobre el blanco del dialogo. El
// ring va BAKED: el error de este formulario es un banner, no una marca por
// campo.
const inputClass = "w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200";
// 🔴 El textarea NO puede llevar el alto fijo del estandar: lo aplasta.
const textareaClass = "w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] px-3 py-2 shadow-md focus:shadow-lg focus:shadow-blue-200";
const selectClass = inputClass;

// --- Form Dialog ---

function AtributoFormDialog({ isOpen, atributo, existentes, isSubmitting, onSave, onClose }: {
  isOpen: boolean;
  atributo?: ProductoAtributo | null;
  /** Los demás atributos, para elegir de cuál depende éste. */
  existentes: ProductoAtributo[];
  isSubmitting: boolean;
  onSave: (data: CreateProductoAtributoDto) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [tipo, setTipo] = useState<AtributoTipo>('SELECT');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('');
  const [requerido, setRequerido] = useState(false);
  const [mostrarEnListado, setMostrarEnListado] = useState(true);
  const [usarParaFiltros, setUsarParaFiltros] = useState(true);
  const [mostrarEnMarketplace, setMostrarEnMarketplace] = useState(true);
  const [valoresText, setValoresText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dependeDeAtributoId, setDependeDeAtributoId] = useState<string | null>(null);
  /** Opciones por cada valor del padre, escritas separadas por coma. */
  const [valoresPorPadre, setValoresPorPadre] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (atributo) {
        setNombre(atributo.nombre);
        setClave(atributo.clave);
        setTipo(atributo.tipo);
        setDescripcion(atributo.descripcion || '');
        setUnidad(atributo.unidad || '');
        setRequerido(atributo.requerido || false);
        setValoresText(atributo.valores?.join(', ') || '');
        setDependeDeAtributoId(atributo.dependeDeAtributoId ?? null);
        // Las opciones ya cargadas, agrupadas por la rama a la que pertenecen.
        const porPadreInicial: Record<string, string> = {};
        for (const o of atributo.opciones ?? []) {
          if (!o.padreValor) continue;
          porPadreInicial[o.padreValor] = porPadreInicial[o.padreValor]
            ? `${porPadreInicial[o.padreValor]}, ${o.valor}`
            : o.valor;
        }
        setValoresPorPadre(porPadreInicial);
        // These fields may not be in the current type, use defaults
        setMostrarEnListado(true);
        setUsarParaFiltros(true);
        setMostrarEnMarketplace(true);
      } else {
        setNombre(''); setClave(''); setTipo('SELECT'); setDescripcion('');
        setUnidad(''); setRequerido(false); setValoresText('');
        setDependeDeAtributoId(null); setValoresPorPadre({});
        setMostrarEnListado(true); setUsarParaFiltros(true); setMostrarEnMarketplace(true);
      }
      setErrors({});
    }
  }, [isOpen, atributo]);

  const generarClave = (v: string) => {
    return v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'atributo';
  };

  const handleNombreChange = (v: string) => {
    setNombre(v);
    if (!atributo) setClave(generarClave(v));
  };

  const handleTipoChange = (nuevoTipo: AtributoTipo) => {
    setTipo(nuevoTipo);
    // Limpiar valores si el tipo los prohíbe
    if (prohibeValoresPredefinidos(nuevoTipo)) {
      setValoresText('');
    }
  };

  const parseValores = (): string[] => {
    return valoresText.split(',').map(v => v.trim()).filter(v => v.length > 0);
  };

  const requiereValores = TIPOS_REQUIEREN_VALORES.includes(tipo);
  const prohibeValores = prohibeValoresPredefinidos(tipo);
  const esDependiente = tipo === 'SELECT_DEPENDIENTE';

  // Candidatos a padre: se eligen de una lista simple y no es este mismo. Un
  // multi-select no puede serlo — con dos valores a la vez no se sabría qué
  // rama mostrar. El backend valida lo mismo.
  const candidatosPadre = existentes.filter(
    a => a.isActive && a.id !== atributo?.id && TIPOS_PUEDEN_SER_PADRE.includes(a.tipo),
  );
  const padreElegido = candidatosPadre.find(a => a.id === dependeDeAtributoId) ?? null;

  /** Las opciones con su rama, tal como las espera el backend. */
  const construirOpciones = () => {
    const out: { valor: string; padreValor: string }[] = [];
    for (const [padreValor, texto] of Object.entries(valoresPorPadre)) {
      for (const valor of texto.split(',').map(v => v.trim()).filter(Boolean)) {
        out.push({ valor, padreValor });
      }
    }
    return out;
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!clave.trim()) errs.clave = 'La clave es requerida';

    const opciones = esDependiente ? construirOpciones() : [];
    const valores = esDependiente ? opciones.map(o => o.valor) : parseValores();

    // Validación por tipo
    if (esDependiente && !dependeDeAtributoId) {
      errs.dependeDe = 'Elegí de qué atributo depende';
    }
    if (requiereValores && valores.length === 0) {
      errs.valores = `El tipo ${TIPO_CONFIG[tipo].label} requiere al menos un valor predefinido`;
    }
    if (prohibeValores && valores.length > 0) {
      errs.valores = `El tipo ${TIPO_CONFIG[tipo].label} no permite valores predefinidos`;
    }

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    onSave({
      nombre: nombre.trim(),
      clave: clave.trim(),
      tipo,
      ...(descripcion.trim() && { descripcion: descripcion.trim() }),
      ...(!prohibeValores && valores.length > 0 && { valores }),
      // `opciones` manda sobre `valores`: el backend regenera la lista plana
      // desde acá, que es lo único que sabe de qué rama cuelga cada opción.
      ...(esDependiente && { opciones }),
      dependeDeAtributoId: esDependiente ? dependeDeAtributoId : null,
      ...(unidad.trim() && { unidad: unidad.trim() }),
      requerido,
      mostrarEnListado,
      usarParaFiltros,
      mostrarEnMarketplace,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Atributo"
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 font-sans shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-gray-900">{atributo ? 'Editar Atributo' : 'Nuevo Atributo'}</h3>

        <div className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => handleNombreChange(e.target.value)} placeholder="Ej: Color, Talla, Material" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* Clave + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Clave *</label>
              <input className={inputClass} value={clave} onChange={e => setClave(e.target.value)} placeholder="color" />
              <p className="mt-0.5 text-[10px] text-gray-400">Identificador único, se genera automáticamente</p>
              {errors.clave && <p className="mt-1 text-xs text-red-500">{errors.clave}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Tipo *</label>
              <select className={selectClass} value={tipo} onChange={e => handleTipoChange(e.target.value as AtributoTipo)}>
                {/* Se recorre la lista ordenada, no el mapa: el mapa incluye
                    los legacy, que no se ofrecen al crear. Si el atributo que
                    se está editando es uno de esos, se suma para que el select
                    no quede sin su valor. */}
                {(TIPOS_OFRECIDOS.includes(tipo) ? TIPOS_OFRECIDOS : [...TIPOS_OFRECIDOS, tipo]).map((value) => (
                  <option key={value} value={value}>{TIPO_CONFIG[value].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Descripción</label>
            <textarea className={`${textareaClass} min-h-[60px]`} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción opcional del atributo" />
          </div>

          {/* Unidad (solo para tipos que la usen) */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">Unidad</label>
            <input className={inputClass} value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="Ej: GB, cm, MHz, kg" />
          </div>

          {/* Cadena de dependencia: FABRICANTE → FAMILIA → PROCESADOR */}
          {esDependiente && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Depende de <span className="text-red-500">*</span>
              </label>
              {candidatosPadre.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                  Primero creá el atributo del que va a depender. Para PROCESADOR,
                  por ejemplo, hace falta FABRICANTE como Selección simple.
                </p>
              ) : (
                <select
                  className={selectClass}
                  value={dependeDeAtributoId ?? ''}
                  onChange={e => {
                    setDependeDeAtributoId(e.target.value || null);
                    // Las ramas son otras: lo escrito para el padre anterior
                    // ya no significa nada.
                    setValoresPorPadre({});
                  }}
                >
                  <option value="">Elegí el atributo padre</option>
                  {candidatosPadre.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              )}
              {errors.dependeDe && <p className="mt-1 text-xs text-red-500">{errors.dependeDe}</p>}
            </div>
          )}

          {/* Un campo por rama del padre */}
          {esDependiente && padreElegido && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Valores por cada {padreElegido.nombre} <span className="text-red-500">*</span>
              </label>
              {padreElegido.valores.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                  &quot;{padreElegido.nombre}&quot; todavía no tiene valores cargados.
                </p>
              ) : (
                <div className="space-y-2">
                  {padreElegido.valores.map(valorPadre => (
                    <div key={valorPadre}>
                      <span className="text-[11px] font-medium text-gray-500">{valorPadre}</span>
                      <input
                        className={inputClass}
                        value={valoresPorPadre[valorPadre] ?? ''}
                        onChange={e =>
                          setValoresPorPadre(prev => ({ ...prev, [valorPadre]: e.target.value }))
                        }
                        placeholder={`Opciones para ${valorPadre}, separadas por coma`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-gray-400">
                Al cargar un producto, elegir {padreElegido.nombre} deja a la vista
                solo las opciones de esa rama.
              </p>
              {errors.valores && <p className="mt-1 text-xs text-red-500">{errors.valores}</p>}
            </div>
          )}

          {/* Valores (solo si el tipo no los prohíbe y no es dependiente) */}
          {!prohibeValores && !esDependiente && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                Valores Predefinidos {requiereValores && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className={`${textareaClass} min-h-[60px]`}
                value={valoresText}
                onChange={e => setValoresText(e.target.value)}
                placeholder="Separa los valores con comas. Ej: Rojo, Azul, Verde, Negro"
              />
              {parseValores().length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {parseValores().map(v => (
                    <span key={v} className="rounded-full bg-[#437EFF]/10 px-2 py-0.5 text-[11px] font-medium text-[#437EFF]">{v}</span>
                  ))}
                </div>
              )}
              {errors.valores && <p className="mt-1 text-xs text-red-500">{errors.valores}</p>}
            </div>
          )}

          {prohibeValores && (
            <div className="rounded-[6px] bg-zinc-100 p-2.5 ring-1 ring-blue-400 shadow-md">
              <p className="text-xs text-gray-500">El tipo <strong>{TIPO_CONFIG[tipo].label}</strong> no usa valores predefinidos. El valor se ingresa directamente al asignar.</p>
            </div>
          )}

          {/* Checkboxes de configuración */}
          <div className="space-y-2 border-t border-[#cfe0f5] pt-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Configuración</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requerido} onChange={e => setRequerido(e.target.checked)} className="accent-[#004A94]" />
              Requerido al crear variantes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mostrarEnListado} onChange={e => setMostrarEnListado(e.target.checked)} className="accent-[#004A94]" />
              Mostrar en listado de productos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={usarParaFiltros} onChange={e => setUsarParaFiltros(e.target.checked)} className="accent-[#004A94]" />
              Usar para filtros de búsqueda
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mostrarEnMarketplace} onChange={e => setMostrarEnMarketplace(e.target.checked)} className="accent-[#004A94]" />
              Mostrar en marketplace
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : atributo ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Attribute Card (expandible) ---

function AtributoCard({ attr, canManage, onEdit, onDelete }: {
  attr: ProductoAtributo;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TIPO_CONFIG[attr.tipo] || TIPO_CONFIG.TEXTO;

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-blue-400/40 shadow-sm">
      {/* Header (always visible) */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icono tipo */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
          </svg>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-medium text-gray-900">{attr.nombre}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
            {attr.requerido && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Requerido</span>}
            {!attr.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Inactivo</span>}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Clave: <span className="font-mono">{attr.clave}</span>
            {attr.unidad && <> | Unidad: {attr.unidad}</>}
            {attr.valores.length > 0 && <> | {attr.valores.length} valores</>}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <button onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#437EFF]" title="Editar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#cfe0f5] bg-[#eaf2fd]/40 px-4 py-3 space-y-3">
          {/* Descripción */}
          {attr.descripcion && (
            <div>
              <p className="text-[10px] font-medium uppercase text-gray-400 mb-0.5">Descripción</p>
              <p className="text-xs text-gray-600">{attr.descripcion}</p>
            </div>
          )}

          {/* Valores */}
          {attr.valores.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase text-gray-400 mb-1">Valores ({attr.valores.length})</p>
              <div className="flex flex-wrap gap-1">
                {attr.valores.map(v => (
                  <span key={v} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${attr.requerido ? 'bg-green-500' : 'bg-gray-300'}`} />
              Requerido
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En listado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En filtros
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              En marketplace
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Page ---

export default function AtributosPage() {
  const { atributos, isLoading, isSubmitting, error, success, clearMessages, create, update, remove } = useAtributos();
  const permissions = usePermissions();
  const canManage = permissions.canManageProducts;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductoAtributo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductoAtributo | null>(null);

  useEffect(() => { if (success) { const t = setTimeout(clearMessages, 4000); return () => clearTimeout(t); } }, [success, clearMessages]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Atributos de Producto</h1>
          <p className="text-sm text-gray-500">Define atributos para crear variantes (color, talla, material, etc.)</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003570]">
            + Nuevo Atributo
          </button>
        )}
      </div>

      {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5"><p className="text-sm text-green-700">{success}</p></div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
        </div>
      ) : atributos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No hay atributos</p>
          <p className="mt-1 max-w-sm text-xs text-gray-400">
            Los atributos te permiten definir características como color, talla o material. Se usan para crear variantes y filtrar productos.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 items-start">
          {atributos.map(attr => (
            <AtributoCard
              key={attr.id}
              attr={attr}
              canManage={canManage}
              onEdit={() => { setEditing(attr); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(attr)}
            />
          ))}
        </div>
      )}

      <AtributoFormDialog
        isOpen={formOpen}
        atributo={editing}
        existentes={atributos}
        isSubmitting={isSubmitting}
        onSave={async (data) => {
          if (editing) await update(editing.id, data);
          else await create(data);
          setFormOpen(false); setEditing(null);
        }}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div role="dialog" aria-modal="true" aria-label="Eliminar atributo"
            className="w-full max-w-sm rounded-2xl bg-white p-6 font-sans shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900">Eliminar Atributo</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Eliminar <strong>{deleteTarget.nombre}</strong>? Si está en uso en plantillas activas, no se podrá eliminar.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button onClick={async () => { await remove(deleteTarget.id); setDeleteTarget(null); }} disabled={isSubmitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
