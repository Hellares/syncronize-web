// Mete Amazon Ember (las mismas woff2 que sirve la web) dentro de cada artboard.
//
// El lienzo no tiene salida a la red salvo Google Fonts, así que una fuente
// propia solo entra como data: URI. Cada artboard corre en su propio iframe y
// no comparte nada con los demás: la fuente va repetida en los cuatro, no hay
// forma de compartirla.
//
//   node build.mjs      → lee *.dc.html de acá y escribe build/*.dc.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const fuentes = join(aqui, '..', '..', 'public', 'fonts');
const salida = join(aqui, 'build');

// Los rangos son los de globals.css: Medium cubre 350-599 y Bold 600-1000.
const caras = [
  { archivo: 'AmazonEmber-Medium.woff2', familia: 'Amazon Ember', peso: '350 599' },
  { archivo: 'AmazonEmber-Bold.woff2', familia: 'Amazon Ember', peso: '600 1000' },
  { archivo: 'AmazonEmber-Mono.woff2', familia: 'Amazon Ember Mono', peso: '400 700' },
];

const css = caras
  .map(({ archivo, familia, peso }) => {
    const b64 = readFileSync(join(fuentes, archivo)).toString('base64');
    return `@font-face{font-family:'${familia}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${peso};font-style:normal;font-display:block}`;
  })
  .join('\n');

mkdirSync(salida, { recursive: true });

let hechos = 0;
for (const nombre of readdirSync(aqui)) {
  if (!nombre.endsWith('.dc.html')) continue;
  const fuente = readFileSync(join(aqui, nombre), 'utf8');
  if (!fuente.includes('/*@FONTS@*/')) {
    console.error(`aviso: ${nombre} no tiene el marcador /*@FONTS@*/`);
  }
  writeFileSync(join(salida, nombre), fuente.replace('/*@FONTS@*/', css));
  hechos++;
}

copyFileSync(join(aqui, 'canvas.json'), join(salida, 'canvas.json'));
console.log(`${hechos} artboards con la fuente embebida en build/ (${Math.round(css.length / 1024)} KB de fuente por archivo)`);
