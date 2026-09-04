/**
 * Con qué nombre, logo y color se presenta la empresa ante el CLIENTE.
 *
 * 🔴 `Empresa.nombre` NO es el nombre comercial: el alta por RUC lo llena con
 * la razón social, y en prod las cuatro empresas lo tienen igual a
 * `razonSocial` ("JAYLI FLORES S.A.C."). Lo que el cliente tiene que leer es el
 * NOMBRE COMERCIAL —"JAYLILAND"—, que vive en
 * `ConfiguracionDocumentos.nombreComercial`.
 *
 * Todo lo que salga hacia afuera —el catálogo, la ficha de un producto, el
 * mensaje que los acompaña— resuelve su marca por acá, así el día que la
 * empresa cambie su identidad no queda una pantalla mostrando la razón social.
 * Es el equivalente de `core/services/identidad_comercial.dart` del app.
 */

import type { EmpresaInfo } from '@/core/types/empresa';
import { hexARgb } from '@/core/types/configuracion-documentos';
import * as cfgService from './services/configuracion-documentos-service';

export interface MarcaEmpresa {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sedeNombre?: string | null;
  textoPie?: string | null;
  /** `[r, g, b]` del color primario, que es lo que comen jsPDF y el canvas. */
  color: [number, number, number];
  logoUrl?: string | null;
}

/**
 * Pide la configuración de documentos y arma la marca.
 *
 * Va por la plantilla de COTIZACION porque es la que la empresa realmente
 * edita —no hay un tipo CATALOGO en `TipoDocumento`— y de ahí salen el nombre
 * comercial, el logo y los colores, que son globales. Con [sedeId] el backend
 * además resuelve la dirección y el teléfono de esa sede.
 *
 * Nunca lanza: si la llamada falla se cae a los datos de la empresa. Un
 * catálogo sin membrete perfecto es mejor que un botón que no hace nada.
 */
export async function resolverMarca(params: {
  empresa?: EmpresaInfo | null;
  sedeId?: string;
  /** El nombre de la sede que ya conoce la pantalla, por si el backend no lo trae. */
  sedeNombre?: string | null;
}): Promise<MarcaEmpresa> {
  const { empresa, sedeId, sedeNombre } = params;
  const cfg = await cfgService
    .getConfiguracionCompleta('COTIZACION', { formato: 'A4', sedeId })
    .catch(() => null);

  const c = cfg?.configuracion;
  const sede = cfg?.sede;
  const direccionSede = [sede?.direccion, sede?.distrito, sede?.provincia]
    .filter(Boolean)
    .join(', ');

  // 🔴 `??` no alcanza: un texto que el usuario borró llega como cadena VACÍA,
  // no como null, y dejaría el membrete sin nombre.
  const limpio = (v?: string | null) => {
    const t = (v ?? '').trim();
    return t || null;
  };

  return {
    nombre:
      limpio(c?.nombreComercial) ??
      limpio(empresa?.nombre) ??
      limpio(empresa?.razonSocial) ??
      'Catálogo',
    ruc: limpio(c?.ruc) ?? limpio(empresa?.ruc),
    telefono: limpio(c?.telefono),
    direccion: limpio(direccionSede) ?? limpio(c?.direccion),
    sedeNombre: limpio(sede?.nombre) ?? limpio(sedeNombre),
    textoPie: limpio(c?.textoPiePagina),
    // El logo de la PLANTILLA gana sobre el de la marca: un logo cuadrado sirve
    // para un ticket y se pierde en una cabecera A4, que pide uno apaisado.
    logoUrl: limpio(cfg?.plantilla?.logoUrl) ?? limpio(c?.logoUrl),
    color: hexARgb(cfg?.plantilla?.colorEncabezado || c?.colorPrimario || '#004A94'),
  };
}
