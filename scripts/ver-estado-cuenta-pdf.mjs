// Renderiza el PDF de estado de cuenta con datos de ejemplo, para mirarlo sin
// levantar el dashboard. `jiti` ya está en node_modules (lo usa Next) y resuelve
// el alias `@`, así que carga el .ts sin compilar nada.
//
//   node scripts/ver-estado-cuenta-pdf.mjs [salida.pdf]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const jiti = createJiti(import.meta.url, { alias: { '@': path.join(raiz, 'src') } });

const { construirEstadoCuentaClientePdf } = await jiti.import(
  path.join(raiz, 'src/features/cuentas-cobrar/components/estado-cuenta-cliente-pdf.ts'),
);

const venta = (id, codigo, total, pagado, estado, dias) => ({
  ventaId: id,
  codigo,
  fechaVenta: '2026-08-20T10:00:00.000Z',
  total,
  totalPagado: pagado,
  saldoPendiente: total - pagado,
  estado,
  fechaVencimiento: '2026-09-19T10:00:00.000Z',
  diasVencimiento: dias,
  numeroCuotas: 0,
  totalMora: estado === 'VENCIDA' ? 12.5 : 0,
});

const data = {
  cliente: { id: 'c1', tipo: 'EMPRESA', nombre: 'DISTRIBUIDORA LOS ANDES S.A.C.', documento: '20481372823' },
  resumen: {
    saldoPendiente: 1430.4, totalVendido: 2830.4, totalAbonado: 1400,
    totalMora: 12.5, cantidadVentas: 3, ventasConSaldo: 2,
  },
  ventas: [
    venta('v1', 'VTA-SED-00000869', 1200, 400, 'PENDIENTE', 14),
    venta('v2', 'VTA-SED-00000871', 830.4, 200, 'VENCIDA', -6),
    venta('v3', 'VTA-SED-00000860', 800, 800, 'PAGADA', 0),
  ],
  abonos: [
    { id: 'a1', monto: 400, metodoPago: 'EFECTIVO', fuente: 'CAJA', fechaPago: '2026-08-25T10:00:00.000Z', ventaCodigo: 'VTA-SED-00000869' },
    { id: 'a2', monto: 200, metodoPago: 'YAPE', fuente: 'BANCO', fechaPago: '2026-08-28T10:00:00.000Z', ventaCodigo: 'VTA-SED-00000871' },
    { id: 'a3', monto: 800, metodoPago: 'TRANSFERENCIA', fuente: 'BANCO', fechaPago: '2026-08-21T10:00:00.000Z', ventaCodigo: 'VTA-SED-00000860' },
  ],
};

const linea = (id, descripcion, cantidad, precioUnitario) => ({
  id, descripcion, cantidad, precioUnitario, total: cantidad * precioUnitario,
});

const detalles = {
  v1: [
    linea('l1', 'EDREDÓN CARNERITO 1.5 PLAZAS', 8, 89.9),
    linea('l2', 'JUEGO DE SÁBANAS LISO 2 PLAZAS', 4, 99),
    linea('l3', 'ALMOHADA VISCO 50x70', 2, 45),
  ],
  v2: [
    linea('l4', 'FRAZADA POLAR CARNERITO CON UN NOMBRE MUY LARGO PARA VER CÓMO CORTA', 12, 59.9),
    linea('l5', 'ALGODÓN SILICONADO GRANEL', 14, 8),
  ],
};

const doc = await construirEstadoCuentaClientePdf(data, 'JAYLILAND S.A.C.', '20481372823', detalles);
const salida = process.argv[2] ?? path.join(raiz, 'estado-cuenta-demo.pdf');
fs.writeFileSync(salida, Buffer.from(doc.output('arraybuffer')));
console.log('escrito:', salida);
