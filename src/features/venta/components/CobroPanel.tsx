'use client';

import { useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AxiosError } from 'axios';
import type { VentaItem, Venta, PagoVentaDto, DivergenciaPrecio, MetodoPagoVenta } from '@/core/types/venta';
import { requiereAutorizacionBajoCosto, recalcularNivelesEnLote, UMBRAL_BANCARIZACION_PEN, FRECUENCIAS, CUOTAS_OPCIONES, labelFrecuencia } from '@/core/types/venta';
import type { Emisor } from '@/core/types/facturacion';
import * as facturacionService from '@/features/facturacion/services/facturacion-service';
import * as ventaService from '../services/venta-service';
import AutorizacionDialog from '@/features/stock/components/AutorizacionDialog';
import { useAuth } from '@/core/auth/auth-context';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import { buscarClientes } from '@/features/cotizacion/services/cliente-service';
import ClientePersonaFormDialog from '@/features/clientes/components/ClientePersonaFormDialog';
import ClienteEmpresaFormDialog from '@/features/clientes/components/ClienteEmpresaFormDialog';
import EvidenciaVentaCard from './EvidenciaVentaCard';
import Numpad from './Numpad';
import { numpadAbierto, numpadDelServer, suscribirNumpad, guardarNumpad } from './preferencia-numpad';

const METODOS = ['EFECTIVO', 'YAPE', 'TARJETA', 'PLIN', 'TRANSFERENCIA'] as const;
const METODOS_DIGITALES = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];
const REQUIEREN_BANCO = ['TARJETA', 'TRANSFERENCIA'];
const TOLERANCIA = 0.005;
const ROLES_AUTORIZADORES = ['SUPER_ADMIN', 'EMPRESA_ADMIN', 'GERENTE_SEDE', 'ADMINISTRADOR', 'SUPERVISOR'];

// Estilo estandar de la web: zinc + ring azul + glow al focus, 30 px de alto
// (la altura del input estandar). El ring va BAKED porque aca el error es un
// banner arriba, no una marca por campo.
const inputClass =
  'w-full bg-zinc-100 text-[#004A94] font-sans text-xs ring-1 ring-blue-400 outline-none transition-all duration-300 placeholder:text-zinc-500 placeholder:opacity-60 rounded-[6px] h-[30px] px-3 shadow-md focus:shadow-lg focus:shadow-blue-200';


interface Pago { metodoPago: string; monto: number; referencia?: string; banco?: string }

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface InitialCliente { clienteId?: string; clienteEmpresaId?: string; nombre: string; documento: string }

interface Props {
  items: VentaItem[];
  setItems: React.Dispatch<React.SetStateAction<VentaItem[]>>;
  sedeId: string;
  total: number;
  onBack: () => void;
  onSuccess: (venta: Venta) => void;
  /** Adelantos ya pagados de órdenes de servicio en el carrito: hoy se cobra total − adelanto. */
  adelantoAplicado?: number;
  /** Cliente pre-cargado (ej. desde una orden de servicio). */
  initialCliente?: InitialCliente;
}

export default function CobroPanel({ items, setItems, sedeId, total, onBack, onSuccess, adelantoAplicado = 0, initialCliente }: Props) {
  const { state: authState } = useAuth();
  const { userRoles, empresa } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const userId = authState.status === 'authenticated' ? authState.user.id : '';
  const esAutorizador = useMemo(() => userRoles.some(r => r.isActive && ROLES_AUTORIZADORES.includes(r.rol)), [userRoles]);

  const hayOrdenes = items.some(it => it.esOrdenServicio);
  const totalACobrar = Math.round((total - adelantoAplicado) * 100) / 100;

  // Comprobante + cliente (pre-cargado si viene de una orden)
  const [tipoComprobante, setTipoComprobante] = useState<'TICKET' | 'BOLETA' | 'FACTURA'>('TICKET');

  // Multi-RUC: emisores activos de la empresa. Sin emisor activo la venta
  // solo puede ser TICKET (gating de facturación, paridad Flutter); con 2+
  // se elige con cuál RUC se emite (emisorId solo para socios, id != null).
  const [emisores, setEmisores] = useState<Emisor[]>([]);
  const [emisorSel, setEmisorSel] = useState<Emisor | null>(null);
  useEffect(() => {
    facturacionService.getEmisores()
      .then(ems => {
        setEmisores(ems);
        const activos = ems.filter(e => e.activo);
        // Pre-selección: el principal (EMPRESA) si está activo, si no el primero
        setEmisorSel(activos.find(e => e.tipo === 'EMPRESA') ?? activos[0] ?? null);
      })
      .catch(() => setEmisores([]));
  }, []);
  const emisoresActivos = useMemo(() => emisores.filter(e => e.activo), [emisores]);
  const puedeEmitir = emisoresActivos.length > 0;
  const [documento, setDocumento] = useState(initialCliente?.documento ?? '');
  const [clienteNombre, setClienteNombre] = useState(initialCliente?.nombre ?? '');
  const [clienteId, setClienteId] = useState<string | undefined>(initialCliente?.clienteId);
  const [clienteEmpresaId, setClienteEmpresaId] = useState<string | undefined>(initialCliente?.clienteEmpresaId);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  // Busqueda del cliente POR NOMBRE, para cuando el cajero lo conoce pero no
  // sabe su documento. Es sobre los clientes que la empresa YA tiene: el
  // alta de uno nuevo sigue saliendo del documento, que es lo que RENIEC y
  // SUNAT saben resolver.
  // El documento de la consulta en vuelo. Sirve para descartar la respuesta si
  // el usuario siguió tecleando mientras volvía.
  const docEnVuelo = useRef('');
  // Documento completo que ni RENIEC ni SUNAT reconocieron: habilita el alta a
  // mano, que es la única salida cuando la fuente oficial no lo tiene.
  const [noEncontrado, setNoEncontrado] = useState('');
  const [dialogoPersona, setDialogoPersona] = useState('');
  const [dialogoEmpresa, setDialogoEmpresa] = useState('');

  // Fotos de la venta. Ya subidas (los ids) y si queda alguna en vuelo: el
  // boton de cobrar espera a que terminen para no perderlas.
  const [evidenciaIds, setEvidenciaIds] = useState<string[]>([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof buscarClientes>>>([]);
  const [buscandoNombre, setBuscandoNombre] = useState(false);
  const debounceNombre = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ultimo documento consultado, para no repetir la busqueda en cada render.
  const ultimoBuscado = useRef<string>('');
  const [esGenerico, setEsGenerico] = useState(false);

  // A qué campo le escribe el numpad. Lo decide el foco: tocar el DNI/RUC lo
  // pasa a modo documento (sin decimales ni chips), tocar el monto lo devuelve.
  const [campoNumpad, setCampoNumpad] = useState<'monto' | 'documento'>('monto');

  // Preferencia del DISPOSITIVO, no del usuario: ver `preferencia-numpad.ts`.
  // Va por `useSyncExternalStore` y no por un effect que lee localStorage,
  // porque eso último no pasa el lint del compilador de React.
  const verNumpad = useSyncExternalStore(suscribirNumpad, numpadAbierto, numpadDelServer);

  // Crédito
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [numeroCuotas, setNumeroCuotas] = useState(1);
  const [frecuenciaDias, setFrecuenciaDias] = useState(30);

  // Pagos
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metodoActual, setMetodoActual] = useState<string>('EFECTIVO');
  const [montoInput, setMontoInput] = useState('');
  const [refInput, setRefInput] = useState('');
  const [bancoInput, setBancoInput] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 409 dialogs
  const [divergenciasPrecio, setDivergenciasPrecio] = useState<DivergenciaPrecio[] | null>(null);
  const [divergenciasStock, setDivergenciasStock] = useState<Array<{ descripcion: string; productoId?: string; varianteId?: string; cantidadSolicitada: number; stockDisponible: number }> | null>(null);
  const [showBancarizacion, setShowBancarizacion] = useState(false);
  const [showAutorizacionBC, setShowAutorizacionBC] = useState(false);
  // Vencimiento: se abre al REBOTE del backend, no antes — el cliente no sabe
  // de qué lote sale cada unidad.
  const [showAutorizacionVenc, setShowAutorizacionVenc] = useState(false);
  const [lineasVencidas, setLineasVencidas] = useState<Array<{ descripcion: string; lote: string; vencio: string; unidades?: number }>>([]);
  // Aviso para quien SÍ puede autorizar: no pide contraseña, pide que mire.
  const [showAvisoVencido, setShowAvisoVencido] = useState(false);

  const esCredito = condicionPago === 'CREDITO';
  /** 🔑 Derivado SIEMPRE: es lo que hace que `plazo ÷ cuotas` le devuelva al
   *  backend exactamente la frecuencia elegida. */
  const plazoDias = frecuenciaDias * numeroCuotas;
  const totalPagado = useMemo(() => pagos.reduce((a, p) => a + p.monto, 0), [pagos]);
  const faltante = totalACobrar - totalPagado;
  const vuelto = totalPagado - totalACobrar;
  const cubierto = faltante <= TOLERANCIA;

  /**
   * Preview de las cuotas. Espejo de `CuotaCalculator` del app y del
   * `generarCuotas` del backend: intervalo con piso de 1 día, cuota redondeada
   * hacia abajo al céntimo y el resto en la última.
   */
  const cuotas = useMemo(() => {
    if (!esCredito || numeroCuotas < 1 || total <= 0) return [];
    const intervalo = Math.max(1, Math.floor(plazoDias / numeroCuotas));
    const montoCuota = Math.floor((total / numeroCuotas) * 100) / 100;
    const resto = Math.round((total - montoCuota * numeroCuotas) * 100) / 100;
    return Array.from({ length: numeroCuotas }, (_, i) => {
      const numero = i + 1;
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + intervalo * numero);
      return { numero, monto: numero === numeroCuotas ? montoCuota + resto : montoCuota, fecha };
    });
  }, [esCredito, numeroCuotas, plazoDias, total]);

  /**
   * Cliente lookup (RENIEC/SUNAT).
   *
   * Al resolverse BIEN, el numpad vuelve solo al monto: el documento ya está
   * cargado y lo siguiente que se tipea es cuánto paga. Si falla NO cambia,
   * porque ahí lo que hace falta es corregir los dígitos.
   */
  const buscarCliente = useCallback(async (docParam?: string) => {
    setError('');
    const doc = (docParam ?? documento).trim();
    // 🔴 Cada consulta se queda con su numero: si mientras vuelve el usuario
    // siguió tecleando, el resultado ya no corresponde a lo que hay en el campo
    // y NO se aplica. Sin esto, un RUC de 11 disparaba tambien la consulta del
    // prefijo de 8 y, como RENIEC tarda mas que SUNAT, el error del DNI llegaba
    // despues y pisaba al del RUC: el usuario veia "no se pudo consultar el
    // DNI" con su RUC recortado a 8 digitos.
    docEnVuelo.current = doc;
    setBuscandoCliente(true);
    try {
      if (doc.length === 8) {
        const c = await ventaService.buscarClientePorDni(doc);
        if (docEnVuelo.current !== doc) return;
        setClienteNombre(c.nombreCompleto);
        setClienteId(c.clienteEmpresaId);
        setClienteEmpresaId(undefined);
        setEsGenerico(false);
        setCampoNumpad('monto');
      } else if (doc.length === 11) {
        const c = await ventaService.buscarClientePorRuc(doc);
        if (docEnVuelo.current !== doc) return;
        setClienteNombre(c.razonSocial);
        setClienteEmpresaId(c.clienteEmpresaId);
        setClienteId(undefined);
        setEsGenerico(false);
        setCampoNumpad('monto');
      } else {
        setError('Documento inválido: DNI (8 dígitos) o RUC (11 dígitos)');
      }
    } catch (err) {
      if (docEnVuelo.current !== doc) return;
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se encontró el documento');
      // Con el documento completo y sin resultado, se ofrece registrarlo a
      // mano: el get-or-create solo sabe crear lo que RENIEC o SUNAT conocen.
      setNoEncontrado(doc);
      // 🔴 Se suelta la marca del documento buscado: si no, el efecto lo da por
      // consultado y NUNCA reintenta con el mismo número. Antes eso lo tapaba
      // el botón "Buscar"; sin botón, esto es el reintento.
      ultimoBuscado.current = '';
    } finally {
      if (docEnVuelo.current === doc) setBuscandoCliente(false);
    }
  }, [documento]);

  /**
   * Busca solo con la cantidad de dígitos completa: 8 = DNI, 11 = RUC.
   *
   * Los dos cuidados que hacen que esto no moleste:
   *  - `ultimoBuscado` evita repetir la consulta si el valor no cambió (React
   *    puede re-renderizar por cualquier otra razón).
   *  - 🔴 Se saltea el genérico: `usarGenerico()` escribe `00000000`, que son
   *    8 dígitos, y sin esta guarda dispararía una consulta a RENIEC por un
   *    documento que sabemos que no existe.
   * Al bajar de 8 se limpia la marca, así que corregir un dígito y volver a
   * completarlo vuelve a buscar.
   */
  useEffect(() => {
    const doc = documento.trim();
    if (doc.length < 8) { ultimoBuscado.current = ''; setNoEncontrado(''); return; }
    if (esGenerico || doc === '00000000') return;
    if (!/^\d{8}$|^\d{11}$/.test(doc)) return;
    if (ultimoBuscado.current === doc) return;
    // 🔴 Medio segundo de espera: los 8 primeros digitos de un RUC son un DNI
    // valido, asi que sin esto tipear un RUC disparaba SIEMPRE una consulta a
    // RENIEC por un DNI que nadie pidio. Con la pausa, escribiendo de corrido
    // solo sale la consulta del numero terminado.
    const t = setTimeout(() => {
      ultimoBuscado.current = doc;
      buscarCliente(doc);
    }, 500);
    return () => clearTimeout(t);
  }, [documento, esGenerico, buscarCliente]);

  /**
   * Busca entre los clientes que la empresa YA tiene, por nombre o documento.
   *
   * Con menos de 3 letras no dispara: con una o dos vuelve media agenda y el
   * desplegable tapa el resto de la tarjeta sin servir de nada.
   */
  useEffect(() => {
    const q = busquedaNombre.trim();
    if (debounceNombre.current) clearTimeout(debounceNombre.current);
    if (q.length < 3 || !empresaId) { setResultados([]); return; }
    debounceNombre.current = setTimeout(() => {
      setBuscandoNombre(true);
      buscarClientes(empresaId, q)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscandoNombre(false));
    }, 300);
    return () => { if (debounceNombre.current) clearTimeout(debounceNombre.current); };
  }, [busquedaNombre, empresaId]);

  /**
   * 🔴 Persona y empresa viven en TABLAS distintas y cada una tiene su
   * propia FK: se manda UNO de los dos ids y se limpia el otro. Cruzarlos
   * hace que el backend no encuentre nada y la venta se emita SIN cliente,
   * sin ningun error visible — el nombre se ve bien porque viaja aparte.
   */
  const elegirCliente = (r: { id: string; tipo: 'empresa' | 'persona'; nombre: string; documento: string }) => {
    setClienteNombre(r.nombre);
    setDocumento(r.documento ?? '');
    if (r.tipo === 'persona') {
      setClienteId(r.id);
      setClienteEmpresaId(undefined);
    } else {
      setClienteEmpresaId(r.id);
      setClienteId(undefined);
    }
    setEsGenerico(false);
    setError('');
    setNoEncontrado('');
    setBusquedaNombre('');
    setResultados([]);
    // Ya resuelto por nombre: que el efecto del documento no vuelva a
    // consultarlo y pise el id con el del get-or-create.
    ultimoBuscado.current = (r.documento ?? '').trim();
    setCampoNumpad('monto');
  };

  const usarGenerico = () => {
    setNoEncontrado('');
    setEsGenerico(true);
    setDocumento('00000000');
    setClienteNombre('CLIENTES VARIOS');
    setClienteId(undefined);
    setClienteEmpresaId(undefined);
  };

  // --- Pagos ---
  const seleccionarMetodo = (m: string) => {
    setMetodoActual(m);
    if (METODOS_DIGITALES.includes(m) && !refInput.trim()) setRefInput('000');
    if (m === 'EFECTIVO' && refInput === '000') setRefInput('');
  };

  const agregarPago = (montoOverride?: number) => {
    const m = montoOverride ?? parseFloat(montoInput);
    if (isNaN(m) || m <= 0) return;
    if (REQUIEREN_BANCO.includes(metodoActual) && !bancoInput.trim()) {
      setError(`${metodoActual} requiere indicar el banco`);
      return;
    }
    setError('');
    setPagos(prev => [...prev, {
      metodoPago: metodoActual,
      monto: m,
      referencia: refInput.trim() || undefined,
      banco: REQUIEREN_BANCO.includes(metodoActual) ? bancoInput.trim() : undefined,
    }]);
    setMontoInput('');
    setRefInput(METODOS_DIGITALES.includes(metodoActual) ? '000' : '');
  };

  // --- Bancarización Ley 28194 (umbral fijo 2000, paridad Flutter) ---
  const totalEfectivo = pagos.filter(p => p.metodoPago === 'EFECTIVO').reduce((a, p) => a + p.monto, 0);
  const totalBancarizado = totalPagado - totalEfectivo;
  const aplicaBancarizacion = !esCredito && total >= UMBRAL_BANCARIZACION_PEN
    && totalEfectivo > 0 && totalBancarizado < UMBRAL_BANCARIZACION_PEN;

  // --- Cobrar ---
  const construirYEnviar = useCallback(async (opts?: { aceptaRiesgo?: boolean; bajoCostoAuthId?: string; vencidoAuthId?: string }) => {
    setIsSubmitting(true);
    setError('');
    try {
      const venta = await ventaService.crearYCobrar({
        canalVenta: 'POS',
        sedeId,
        ...(evidenciaIds.length > 0 && { evidenciaIds }),
        vendedorId: userId,
        clienteId,
        clienteEmpresaId,
        nombreCliente: clienteNombre || 'CLIENTES VARIOS',
        documentoCliente: documento.trim() || '00000000',
        moneda: 'PEN',
        tipoComprobante,
        tipoDocumentoCliente: tipoComprobante === 'FACTURA' ? '6' : '1',
        // Multi-RUC: emisorId solo para socios (el principal va sin él)
        ...(tipoComprobante !== 'TICKET' && emisorSel?.id ? { emisorId: emisorSel.id } : {}),
        esCredito,
        ...(esCredito && { plazoCredito: plazoDias, numeroCuotas }),
        ...(pagos.length > 0 && {
          metodoPago: pagos[0].metodoPago as MetodoPagoVenta,
          montoRecibido: totalPagado,
          pagos: pagos as PagoVentaDto[],
        }),
        detalles: items.map(it => it.esOrdenServicio
          ? {
              // Línea de orden de servicio: pura, cantidad 1, sin descuento.
              ordenServicioId: it.ordenServicioId,
              descripcion: it.descripcion,
              cantidad: 1,
              precioUnitario: it.precioUnitario,
              porcentajeIGV: it.porcentajeIGV,
              precioIncluyeIgv: it.precioIncluyeIgv,
              tipoAfectacion: it.tipoAfectacion,
            }
          : {
              productoId: it.productoId,
              varianteId: it.varianteId,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              // VENDER A COSTO: lo que manda es el MODO. El servidor ignora
              // `precioUnitario` y pone el costo — mandarlo igual no molesta y
              // deja el rastro de lo que el cajero vio en pantalla.
              ...(it.precioModo && { precioModo: it.precioModo }),
              // Lote elegido a mano: manda sobre FEFO para el costo y para de
              // dónde sale la mercadería.
              ...(it.loteId && { loteId: it.loteId }),
              ...(it.descuento > 0 && { descuento: it.descuento }),
              porcentajeIGV: it.porcentajeIGV,
              precioIncluyeIgv: it.precioIncluyeIgv,
              tipoAfectacion: it.tipoAfectacion,
              ...(it.icbper > 0 && { icbper: it.icbper * it.cantidad }),
              // Trazabilidad de combo expandido
              ...(it.origenComboId && { origenComboId: it.origenComboId, origenComboNombre: it.origenComboNombre }),
            }),
        ...(opts?.aceptaRiesgo && { aceptaRiesgoBancarizacion: true }),
        ...(opts?.bajoCostoAuthId && { ventaBajoCostoAutorizadaPorId: opts.bajoCostoAuthId }),
        // 🔴 Campo APARTE del de bajo costo: son dos decisiones distintas, y
        // reusar uno haría que autorizar un precio bajo autorizara además
        // vender mercadería pasada de fecha.
        ...(opts?.vencidoAuthId && { ventaVencidaAutorizadaPorId: opts.vencidoAuthId }),
      });
      onSuccess(venta);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        const data = err.response.data;
        if (data?.code === 'PRECIO_DESACTUALIZADO' && data?.divergencias) {
          setDivergenciasPrecio(data.divergencias);
          return;
        }
        if (data?.code === 'STOCK_INSUFICIENTE' && data?.divergencias) {
          setDivergenciasStock(data.divergencias);
          return;
        }
        if (data?.code === 'ORDEN_YA_COBRADA' && Array.isArray(data?.ordenes)) {
          const ids = new Set(data.ordenes.map((o: { ordenServicioId: string }) => o.ordenServicioId));
          setItems(prev => prev.filter(it => !(it.ordenServicioId && ids.has(it.ordenServicioId))));
          setError(data.message || 'La orden ya fue cobrada en otra venta — se quitó del carrito');
          return;
        }
        if (data?.code === 'SALDO_ORDEN_DESACTUALIZADO' && Array.isArray(data?.divergencias)) {
          const ids = new Set(data.divergencias.map((d: { ordenServicioId: string }) => d.ordenServicioId));
          setItems(prev => prev.filter(it => !(it.ordenServicioId && ids.has(it.ordenServicioId))));
          setError('El costo de la orden cambió — se quitó del carrito. Vuelve a agregarla desde Venta Rápida.');
          return;
        }
        setError(data?.message || 'Conflicto al cobrar — reintenta');
        return;
      }
      // ── Vencimientos ──
      // A diferencia del bajo costo, esto NO se puede anticipar en el cliente:
      // de qué lote sale cada unidad lo sabe el servidor. Por eso se resuelve
      // al rebote.
      if (err instanceof AxiosError && err.response?.status === 400) {
        const data = err.response.data;
        if (data?.code === 'VENTA_VENCIDO_NO_AUTORIZADA') {
          setLineasVencidas(Array.isArray(data.lineas) ? data.lineas : []);
          // 🔑 A quien tiene el rol no se le piden credenciales —autorizarse a
          // sí mismo es legítimo justamente porque lo tiene— pero SÍ se le
          // avisa: vender algo pasado de fecha es una decisión, y hacerlo en
          // silencio sería peor que pedir una contraseña. Confirma y sigue.
          if (esAutorizador && userId && !opts?.vencidoAuthId) {
            setShowAvisoVencido(true);
            return;
          }
          setShowAutorizacionVenc(true);
          return;
        }
        if (data?.code === 'VENTA_PRODUCTO_VENCIDO') {
          // CADUCIDAD: no hay diálogo porque no hay autorización posible.
          setError(data.message || 'Hay producto vencido en el carrito');
          return;
        }
      }
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al cobrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  }, [items, setItems, pagos, sedeId, userId, esAutorizador, clienteId, clienteEmpresaId, clienteNombre, documento, tipoComprobante, emisorSel, esCredito, plazoDias, numeroCuotas, totalPagado, evidenciaIds, onSuccess]);

  const handleCobrar = () => {
    setError('');
    // Validaciones (paridad Flutter)
    if (tipoComprobante === 'FACTURA' && !/^\d{11}$/.test(documento.trim())) {
      setError('FACTURA requiere un RUC válido de 11 dígitos'); return;
    }
    if (esCredito && (esGenerico || (!clienteId && !clienteEmpresaId))) {
      setError('El crédito requiere un cliente identificado (busca por DNI/RUC)'); return;
    }
    // Orden 100% adelantada (saldo 0): se emite el comprobante sin cobrar nada hoy.
    const sinSaldoHoy = totalACobrar <= TOLERANCIA;
    if (!esCredito && !sinSaldoHoy && pagos.length === 0) { setError('Agrega al menos un pago'); return; }
    if (!esCredito && !sinSaldoHoy && !cubierto) { setError(`Faltan S/ ${fmt(faltante)} por cubrir`); return; }
    // Sin cliente identificado la venta va a CLIENTES VARIOS y sigue: en un
    // mostrador con cola, obligar a elegir "Genérico" era un paso de más para
    // el caso más común. El payload ya cae a `CLIENTES VARIOS` / `00000000`.
    // Las dos excepciones siguen arriba y no se tocan: FACTURA exige RUC, y
    // el crédito exige cliente identificado —no se le fía a "varios"—.

    // Venta bajo costo → autorización
    if (requiereAutorizacionBajoCosto(items)) {
      if (esAutorizador && userId) {
        preCobro(userId);
      } else {
        setShowAutorizacionBC(true);
      }
      return;
    }
    preCobro(undefined);
  };

  const preCobro = (bajoCostoAuthId?: string) => {
    // 🔴 Si queda una foto subiendo, su `archivoId` todavía no existe y la
    // venta se crearía SIN ella. Son segundos y el cajero ya la sacó.
    if (subiendoFotos) {
      setError('Esperá a que terminen de subir las fotos.');
      return;
    }
    // Bancarización: confirmar riesgo antes de enviar
    if (aplicaBancarizacion) {
      setPendingBajoCosto(bajoCostoAuthId);
      setShowBancarizacion(true);
      return;
    }
    construirYEnviar({ bajoCostoAuthId });
  };

  const [pendingBajoCosto, setPendingBajoCosto] = useState<string | undefined>();

  // 409 PRECIO: aplicar precios del server y dejar reintentar (paridad aplicarPreciosNuevosDeBackend simplificada)
  const aplicarPreciosServer = () => {
    if (!divergenciasPrecio) return;
    setItems(prev => prev.map(it => {
      const div = divergenciasPrecio.find(d =>
        (d.varianteId && d.varianteId === it.varianteId) ||
        (!d.varianteId && d.productoId === it.productoId && !it.varianteId)
      );
      if (!div) return it;
      return { ...it, precioBase: div.precioServer, precioUnitario: div.precioServer, nivelAplicado: null };
    }));
    setDivergenciasPrecio(null);
  };

  // 409 STOCK: ajustar al disponible (quita los de 0, recalcula niveles)
  const ajustarStockServer = () => {
    if (!divergenciasStock) return;
    // Cambian las cantidades: se reprecia el carrito ENTERO, porque bajar una
    // linea puede sacar del mayoreo a las otras del mismo grupo.
    setItems(prev => recalcularNivelesEnLote(prev.flatMap(it => {
      const div = divergenciasStock.find(d =>
        (d.varianteId && d.varianteId === it.varianteId) ||
        (!d.varianteId && d.productoId === it.productoId && !it.varianteId)
      );
      if (!div) return [it];
      if (div.stockDisponible <= 0) return [];
      return [{ ...it, cantidad: div.stockDisponible }];
    })));
    setDivergenciasStock(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Cobrar</h1>
          <span className="ml-1.5 rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[11px] font-medium text-[#004A94]">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
          </span>
        </div>
        {/* El total se fue de acá al display del panel de cobro: lo que decide
            si la venta se puede cerrar es el FALTANTE, y tenerlo a un lado de
            la pantalla y las teclas al otro obligaba a cruzar la vista. */}
        {adelantoAplicado > 0 && (
          <p className="text-[11px] text-gray-500">
            Adelanto −S/ {fmt(adelantoAplicado)} · <span className="font-medium text-green-600">a cobrar hoy S/ {fmt(totalACobrar)}</span>
          </p>
        )}
      </div>

      {hayOrdenes && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <p className="text-[11px] text-blue-700">🛠 Incluye orden(es) de servicio: el comprobante se emite por el total del servicio y el adelanto ya pagado se aplica como pago.</p>
        </div>
      )}

      {total >= UMBRAL_BANCARIZACION_PEN && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-[11px] text-amber-700">⚖ Venta ≥ S/ {UMBRAL_BANCARIZACION_PEN} — Ley 28194: si se paga en efectivo, el cliente pierde el derecho a deducir el IGV.</p>
        </div>
      )}

      {/* Caja registradora: a la izquierda lo que se define UNA vez —
          comprobante, cliente, condición—, y a la derecha una columna fija de
          340px con el faltante, las teclas y el botón de cobrar juntos. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* === Comprobante + cliente + crédito === */}
        <div className="space-y-3">
          <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Comprobante</p>
            <div className="flex gap-2">
              {(['TICKET', 'BOLETA', 'FACTURA'] as const).map(t => {
                const bloqueado = t !== 'TICKET' && !puedeEmitir;
                return (
                  <button key={t} onClick={() => !bloqueado && setTipoComprobante(t)} disabled={bloqueado}
                    title={bloqueado ? 'Configura la facturación electrónica para emitir boletas/facturas' : undefined}
                    className={`flex-1 rounded-lg border p-2 text-xs font-medium ${tipoComprobante === t ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : bloqueado ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-500'}`}>
                    {t}
                  </button>
                );
              })}
            </div>
            {!puedeEmitir && (
              <p className="mt-2 text-[10px] text-amber-600">⚠ Sin facturación electrónica configurada — solo Ticket interno.</p>
            )}
            {/* Selector de emisor (multi-RUC): solo con 2+ activos y comprobante electrónico */}
            {emisoresActivos.length >= 2 && tipoComprobante !== 'TICKET' && (
              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase text-teal-700">Emisor (RUC)</label>
                <select
                  className="w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs text-teal-900 outline-none focus:border-teal-500"
                  value={emisorSel?.ruc ?? ''}
                  onChange={e => setEmisorSel(emisoresActivos.find(em => em.ruc === e.target.value) ?? null)}>
                  {emisoresActivos.map(em => (
                    <option key={em.ruc} value={em.ruc}>{em.razonSocial} — {em.ruc}{em.tipo === 'EMPRESA' ? ' (principal)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">Cliente</p>
              {tipoComprobante !== 'FACTURA' && (
                <button onClick={usarGenerico}
                  className={`rounded-lg border px-2 py-1 text-[10px] ${esGenerico ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF] font-bold' : 'border-gray-200 text-gray-500'}`}>
                  Genérico
                </button>
              )}
            </div>
            {/* Los dos caminos al cliente en UNA fila: el documento (que lo
                crea si la empresa no lo tiene) y el nombre (que busca entre los
                que ya estan). En pantallas angostas se apilan solos. */}
            <div className="mt-2 flex flex-wrap items-start gap-2">
              {/* Sin botón: la consulta sale sola al completar los 8 u 11
                  dígitos. Enter queda por si el número ya estaba escrito y hace
                  falta reintentar. */}
              <div className="relative min-w-[190px] flex-1">
                {/* 🔴 `inputMode="none"` con el numpad abierto: suprime el
                    teclado del sistema en la tablet —que es de lo que se trata—
                    sin bloquear el input, así el teclado FÍSICO de la PC sigue
                    escribiendo normal. `readOnly` habría matado las dos cosas. */}
                <input className={inputClass} value={documento}
                  inputMode={verNumpad ? 'none' : 'numeric'}
                  onFocus={() => setCampoNumpad('documento')}
                  onChange={e => { setDocumento(e.target.value); setEsGenerico(false); }}
                  placeholder={tipoComprobante === 'FACTURA' ? 'RUC (11 dígitos)' : 'DNI (8) o RUC (11)'}
                  maxLength={11}
                  onKeyDown={e => { if (e.key === 'Enter') buscarCliente(); }} />
                {buscandoCliente && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    buscando…
                  </span>
                )}
              </div>

              <div className="relative min-w-[190px] flex-1">
                <input
                  className={inputClass}
                  value={busquedaNombre}
                  onChange={e => setBusquedaNombre(e.target.value)}
                  onFocus={() => setCampoNumpad('monto')}
                  placeholder="…o buscá por nombre"
                />
                {busquedaNombre.trim().length >= 3 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-[6px] bg-white shadow-lg ring-1 ring-blue-400/40">
                    {buscandoNombre ? (
                      <p className="px-3 py-2 text-[11px] text-gray-400">Buscando…</p>
                    ) : resultados.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-gray-500">
                        Sin resultados. Tecleá el DNI o el RUC al lado: si no está en
                        la empresa se crea solo con los datos de RENIEC o SUNAT.
                      </p>
                    ) : (
                      resultados.map(r => (
                        <button
                          key={`${r.tipo}-${r.id}`}
                          type="button"
                          onClick={() => elegirCliente(r)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs text-gray-800">{r.nombre}</span>
                            <span className="block text-[10px] text-gray-400">
                              {r.tipo === 'empresa' ? 'RUC' : 'DNI'} {r.documento || '—'}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            {clienteNombre && (
              <p className="mt-2 rounded-[6px] bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">✓ {clienteNombre}</p>
            )}
            {/* Ni RENIEC ni SUNAT lo conocen: el get-or-create no puede crearlo
                solo, asi que se ofrece cargarlo a mano. Mismo camino que el app. */}
            {noEncontrado && !clienteNombre && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[6px] bg-amber-50 px-3 py-2">
                <span className="text-[11px] text-amber-800">
                  No se encontró {noEncontrado.length === 11 ? 'el RUC' : 'el documento'} {noEncontrado}.
                </span>
                <button
                  type="button"
                  onClick={() => (noEncontrado.length === 11 ? setDialogoEmpresa(noEncontrado) : setDialogoPersona(noEncontrado))}
                  className="inline-flex h-[26px] shrink-0 items-center rounded-md bg-[#004A94] px-2.5 text-[10px] font-medium text-white transition-colors hover:bg-[#003570]">
                  Registrar cliente
                </button>
              </div>
            )}
          </div>

          {/* Las fotos van en la columna de la IZQUIERDA, con lo que se define
              una vez por venta. La derecha es la caja registradora (faltante,
              teclas, cobrar) y meter una galería ahí la parte al medio. */}
          <EvidenciaVentaCard
            onChange={setEvidenciaIds}
            onSubiendoChange={setSubiendoFotos}
          />

          {/* Crédito */}
          <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Condición de pago</p>
            <div className="flex gap-2">
              {(['CONTADO', 'CREDITO'] as const).map(c => (
                <button key={c} onClick={() => { setCondicionPago(c); if (c === 'CREDITO') setPagos([]); }}
                  className={`flex-1 rounded-lg border p-2 text-xs font-medium ${condicionPago === c ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                  {c === 'CONTADO' ? '💵 Contado' : '📅 Crédito'}
                </button>
              ))}
            </div>
            {esCredito && (
              <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium text-gray-500">Paga cada</span>
                    <select className={inputClass} value={frecuenciaDias}
                      onChange={e => setFrecuenciaDias(parseInt(e.target.value))}>
                      {FRECUENCIAS.map(f => <option key={f.dias} value={f.dias}>{f.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium text-gray-500">N.° de pagos</span>
                    <select className={inputClass} value={numeroCuotas}
                      onChange={e => setNumeroCuotas(parseInt(e.target.value))}>
                      {CUOTAS_OPCIONES.map(n => <option key={n} value={n}>{n} pago{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </label>
                </div>

                {cuotas.length > 0 && (
                  <div className="mt-2 rounded-md bg-white px-2.5 py-1.5">
                    <p className="text-[11px] font-semibold text-orange-800">
                      {cuotas.length} pago{cuotas.length > 1 ? 's' : ''} {labelFrecuencia(frecuenciaDias)} de S/ {fmt(cuotas[0].monto)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Primera: {cuotas[0].fecha.toLocaleDateString('es-PE')}
                      {cuotas.length > 1 && ` · Última: ${cuotas[cuotas.length - 1].fecha.toLocaleDateString('es-PE')}`}
                    </p>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-gray-500">Requiere cliente identificado (búsqueda por DNI/RUC).</p>
              </div>
            )}
          </div>

          {/* Los pagos ya agregados viven acá, en la columna izquierda, y no
              en el panel: el panel tiene alto FIJO —display, métodos, teclas y
              cobrar— y si la lista creciera ahí adentro, cada pago empujaría
              el botón de cobrar más abajo. Acá crece hacia el lado que tiene
              lugar. */}
          {pagos.length > 0 && (
            <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
              <p className="mb-2 text-sm font-medium text-gray-800">
                Pagos registrados
                {pagos.length > 1 && <span className="ml-2 text-[10px] font-medium text-purple-600">MIXTO</span>}
              </p>
              <div className="space-y-1">
                {pagos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs">
                    <span className="text-gray-700">{p.metodoPago}{p.banco ? ` · ${p.banco}` : ''}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                    <span className="flex items-center gap-2">
                      <strong className="font-medium">S/ {fmt(p.monto)}</strong>
                      <button onClick={() => setPagos(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">✕</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* === Panel de cobro === */}
        <div className="space-y-3">

          {/* Display de caja registradora. Muestra el FALTANTE, no el total:
              es el número que decide si se puede cerrar la venta. El total y
              lo ya recibido quedan de contexto abajo. */}
          <div className="rounded-xl bg-[#004A94] px-4 py-3 text-white">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/60">
              {esCredito ? 'A financiar' : vuelto > TOLERANCIA ? 'Vuelto' : 'Falta cobrar'}
            </p>
            <p className="text-[34px] font-bold leading-none tracking-tight">
              S/ {fmt(esCredito ? totalACobrar : vuelto > TOLERANCIA ? vuelto : Math.max(0, faltante))}
            </p>
            <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-[11px] text-white/80">
              <span>Total S/ {fmt(totalACobrar)}</span>
              {!esCredito && <span>Recibido S/ {fmt(totalPagado)}</span>}
            </div>
          </div>

          {!esCredito && (
            <div className="rounded-xl border border-[#d1e5ff] bg-white p-4">
              <p className="text-sm font-medium text-gray-800 mb-2">Pagos</p>
              <div className="flex flex-wrap gap-1.5">
                {METODOS.map(m => (
                  <button key={m} onClick={() => seleccionarMetodo(m)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${metodoActual === m ? 'border-[#437EFF] bg-[#437EFF]/10 text-[#437EFF]' : 'border-gray-200 text-gray-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {/* El monto y las dos acciones en UNA fila: el input se lleva lo
                  que sobra y los botones van fijos. La tarjeta vive en la
                  columna de 340 px, asi que el input queda corto a proposito —
                  un monto entra de sobra en ese ancho. */}
              <div className="mt-2 flex gap-1.5">
                <div className="relative min-w-0 flex-1">
                  {/* 🔴 `type="text"` y no `number`: varios navegadores móviles
                      IGNORAN `inputMode` sobre un input numérico y abren su
                      teclado igual, que es justo lo que el numpad viene a
                      evitar. Con text, `inputMode` manda. De paso se acaba el
                      clásico de la rueda del mouse cambiando el monto sin que
                      nadie la toque. El valor ya era string y se lee con
                      `parseFloat`, así que no cambia nada más. */}
                  <input className={inputClass + ' pr-8 text-right'} type="text" value={montoInput}
                    inputMode={verNumpad ? 'none' : 'decimal'}
                    onFocus={() => setCampoNumpad('monto')}
                    onChange={e => setMontoInput(e.target.value)} placeholder={`S/ ${fmt(Math.max(0, faltante))}`} />
                  {/* El numpad se fija por DISPOSITIVO: en la PC del mostrador
                      estorba, en una tablet es la única forma cómoda de tipear.
                      Arranca cerrado y se recuerda. */}
                  <button type="button" onMouseDown={e => e.preventDefault()}
                    onClick={() => guardarNumpad(!verNumpad)}
                    title={verNumpad ? 'Ocultar teclado numérico' : 'Mostrar teclado numérico'}
                    className={`absolute right-1 top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-md ${
                      verNumpad ? 'bg-[#004A94] text-white' : 'text-gray-400 hover:bg-gray-100'
                    }`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                    </svg>
                  </button>
                </div>
                <button onClick={() => agregarPago()} disabled={!montoInput || parseFloat(montoInput) <= 0}
                  className="inline-flex h-[30px] shrink-0 items-center rounded-md border border-[#437EFF] px-2.5 text-[10px] font-medium text-[#437EFF] transition-colors hover:bg-[#437EFF]/5 disabled:opacity-40">
                  Agregar pago
                </button>
                <button onClick={() => agregarPago(Math.max(0, faltante))} disabled={faltante <= TOLERANCIA}
                  className="inline-flex h-[30px] shrink-0 items-center rounded-md border border-green-500 px-2.5 text-[10px] font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-40">
                  Exacto
                </button>
              </div>

              {/* La referencia y el banco bajan a su propia fila: en la de arriba
                  ya no entran, y no siempre se piden. */}
              {(METODOS_DIGITALES.includes(metodoActual) || REQUIEREN_BANCO.includes(metodoActual)) && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {METODOS_DIGITALES.includes(metodoActual) && (
                    <input className={`${inputClass} col-span-2`} value={refInput} onChange={e => setRefInput(e.target.value)} placeholder="N° operación" />
                  )}
                  {REQUIEREN_BANCO.includes(metodoActual) && (
                    <input className={`${inputClass} col-span-2`} value={bancoInput} onChange={e => setBancoInput(e.target.value)} placeholder="Banco (BCP, Interbank...) *" />
                  )}
                </div>
              )}


              {/* Recibido, faltante y vuelto se fueron al display de arriba:
                  repetirlos acá era decir tres veces lo mismo en la misma
                  columna. El aviso de MIXTO ya vive en la lista de pagos. */}
            </div>
          )}

          {/* El numpad vive en el PANEL, no dentro de la tarjeta de Pagos, por
              dos motivos: escribe tanto el monto como el DNI/RUC según dónde
              esté el cursor, y en CRÉDITO la tarjeta de Pagos no se muestra —
              justo cuando el documento es obligatorio, porque no se le fía a
              un cliente sin identificar. */}
          {verNumpad && (
            campoNumpad === 'documento' ? (
              <Numpad
                titulo="DNI / RUC"
                value={documento}
                onChange={v => { setDocumento(v); setEsGenerico(false); }}
                decimales={0}
                acciones={[{ label: 'Buscar', onTap: () => buscarCliente(), destacado: true, enabled: !buscandoCliente }]}
              />
            ) : (
              <Numpad
                titulo="Monto del pago"
                value={montoInput}
                onChange={setMontoInput}
                quickAmounts={[10, 20, 50, 100, 200]}
                acciones={[
                  // "Exacto" cobra de una: completa el monto Y agrega el pago.
                  // Es el caso más común del mostrador —el cliente paga
                  // justo— y encadenar dos toques para algo que no se revisa
                  // era fricción.
                  {
                    label: 'Exacto',
                    onTap: () => agregarPago(Math.max(0, faltante)),
                    destacado: true,
                    enabled: faltante > TOLERANCIA,
                  },
                ]}
              />
            )
          )}

          {esCredito && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                  📅 Venta a crédito — sin pagos hoy. {numeroCuotas} pago{numeroCuotas > 1 ? 's' : ''} {labelFrecuencia(frecuenciaDias)}
                  {cuotas.length > 0 && `; la última vence el ${cuotas[cuotas.length - 1].fecha.toLocaleDateString('es-PE')}`}.
                </p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

          <button onClick={handleCobrar} disabled={isSubmitting || items.length === 0}
            className="w-full rounded-lg bg-green-600 px-4 py-3.5 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Procesando...' : esCredito ? `REGISTRAR CRÉDITO S/ ${fmt(totalACobrar)}` : totalACobrar <= TOLERANCIA ? 'EMITIR COMPROBANTE (pagado)' : `COBRAR S/ ${fmt(totalACobrar)}`}
          </button>
        </div>
      </div>

      {/* 409 PRECIO_DESACTUALIZADO */}
      {divergenciasPrecio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-amber-700">⚠ Precios actualizados</h3>
            <p className="mt-1 text-xs text-gray-500">Los precios cambiaron mientras armabas la venta:</p>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {divergenciasPrecio.map((d, i) => (
                <p key={i} className="text-xs text-gray-600">
                  <strong>{d.descripcion}</strong>: <span className="line-through text-gray-400">S/ {fmt(d.precioCliente)}</span> → <strong className="text-[#004A94]">S/ {fmt(d.precioServer)}</strong>
                </p>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDivergenciasPrecio(null)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={aplicarPreciosServer} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570]">Actualizar precios</button>
            </div>
          </div>
        </div>
      )}

      {/* 409 STOCK_INSUFICIENTE */}
      {divergenciasStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-red-700">⚠ Stock insuficiente</h3>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {divergenciasStock.map((d, i) => (
                <p key={i} className="text-xs text-gray-600"><strong>{d.descripcion}</strong>: pides {d.cantidadSolicitada}, hay {d.stockDisponible}</p>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDivergenciasStock(null)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={ajustarStockServer} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">Ajustar al disponible</button>
            </div>
          </div>
        </div>
      )}

      {/* Bancarización Ley 28194 */}
      {showBancarizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-amber-700">⚖ Ley 28194 — Bancarización</h3>
            <p className="mt-2 text-xs text-gray-600">
              La venta supera S/ {UMBRAL_BANCARIZACION_PEN} y se está pagando en <strong>efectivo</strong>. El cliente <strong>pierde el derecho a deducir el IGV</strong> de esta operación. ¿El cliente asume el riesgo y deseas continuar?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowBancarizacion(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => { setShowBancarizacion(false); construirYEnviar({ aceptaRiesgo: true, bajoCostoAuthId: pendingBajoCosto }); }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Producto pasado de fecha, y quien cobra puede autorizarlo. No se le
          piden credenciales, pero tiene que VERLO y confirmar: vender algo
          vencido es una decisión, no un trámite. */}
      {showAvisoVencido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-amber-700">
              ⚠ Producto pasado de su fecha
            </h3>
            <p className="mt-2 text-xs text-gray-600">
              Estás vendiendo mercadería que pasó su fecha de <strong>consumo
              preferente</strong>. Sigue siendo apta, pero perdió calidad.
            </p>
            <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-lg bg-amber-50 p-2.5">
              {lineasVencidas.map((l, i) => (
                <div key={`${l.lote}-${i}`} className="text-[11px] text-amber-900">
                  <span className="font-semibold">{l.descripcion}</span>
                  {l.unidades ? ` · ${l.unidades} ${l.unidades === 1 ? 'unidad' : 'unidades'}` : ''}
                  <span className="text-amber-700">
                    {' '}· lote {l.lote} · venció el{' '}
                    {new Date(l.vencio).toLocaleDateString('es-PE')}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              Queda registrado que vos lo autorizaste.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAvisoVencido(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowAvisoVencido(false);
                  construirYEnviar({ vencidoAuthId: userId });
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">
                Vender igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alta del cliente cuando la fuente oficial no lo tiene. Al crearlo
          queda SELECCIONADO: es para lo que se abrio. */}
      {dialogoPersona && (
        <ClientePersonaFormDialog
          isOpen
          initialDni={dialogoPersona}
          onSuccess={(_msg, creado) => {
            setDialogoPersona('');
            if (!creado) return;
            elegirCliente({
              id: creado.id,
              tipo: 'persona',
              nombre: creado.nombreCompleto || `${creado.nombres} ${creado.apellidos}`.trim(),
              documento: creado.dni ?? '',
            });
            setNoEncontrado('');
            setError('');
          }}
          onClose={() => setDialogoPersona('')}
        />
      )}
      {dialogoEmpresa && (
        <ClienteEmpresaFormDialog
          isOpen
          empresaId={empresaId}
          initialRuc={dialogoEmpresa}
          onSuccess={(_msg, creado) => {
            setDialogoEmpresa('');
            if (!creado) return;
            elegirCliente({
              id: creado.id,
              tipo: 'empresa',
              nombre: creado.razonSocial,
              documento: creado.numeroDocumento ?? '',
            });
            setNoEncontrado('');
            setError('');
          }}
          onClose={() => setDialogoEmpresa('')}
        />
      )}

      {/* Autorización venta bajo costo */}
      <AutorizacionDialog
        isOpen={showAutorizacionBC}
        operacion="VENTA_BAJO_COSTO"
        titulo="Autorizar venta bajo costo"
        descripcion="Hay líneas con margen negativo (precio < costo) fuera de liquidación. Requiere autorización de un administrador o gerente."
        onAuthorized={(auth) => { setShowAutorizacionBC(false); preCobro(auth.autorizadoPorId); }}
        onClose={() => setShowAutorizacionBC(false)}
      />

      {/* Autorización para vender algo pasado de su fecha de consumo
          preferente. Solo aparece para quien NO es gerente/admin: al que
          tiene el rol se lo autoriza solo y ni se entera. */}
      <AutorizacionDialog
        isOpen={showAutorizacionVenc}
        operacion="VENTA_BAJO_COSTO"
        titulo="Autorizar venta de producto pasado de fecha"
        descripcion={
          lineasVencidas.length
            ? `${lineasVencidas.map(l => `${l.descripcion} (lote ${l.lote})`).join(', ')} pasó su fecha de consumo preferente. Requiere autorización de un administrador o gerente.`
            : 'Hay producto pasado de su fecha de consumo preferente. Requiere autorización de un administrador o gerente.'
        }
        onAuthorized={(auth) => {
          setShowAutorizacionVenc(false);
          construirYEnviar({ vencidoAuthId: auth.autorizadoPorId });
        }}
        onClose={() => setShowAutorizacionVenc(false)}
      />
    </div>
  );
}
